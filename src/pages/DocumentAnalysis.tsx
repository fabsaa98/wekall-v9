import React, { useState, useRef, useCallback } from 'react';
import {
  Upload, FileAudio, FileText, FileSpreadsheet, Image as ImageIcon,
  Loader2, Zap, CheckCircle, AlertCircle, X, Brain, MessageCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { detectOperationType, detectRegion, generateBenchmarkContext } from '@/data/benchmarks';
import { useClient } from '@/contexts/ClientContext';
import { useCDRData } from '@/hooks/useCDRData';

const PROXY_URL = import.meta.env.VITE_PROXY_URL || '';

type FileType = 'audio' | 'pdf' | 'excel' | 'csv' | 'word' | 'image' | 'whatsapp' | 'unknown';
type ProcessStatus = 'idle' | 'extracting' | 'analyzing' | 'done' | 'error';

interface WhatsAppMeta {
  participants: string[];
  messageCount: number;
}

interface ProcessedDoc {
  fileName: string;
  fileType: FileType;
  extractedText: string;
  analysis: string;
  sources?: string[];
  error?: string;
  whatsappMeta?: WhatsAppMeta;
}

function detectFileType(file: File): FileType {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  if (type.startsWith('audio/') || /\.(mp3|wav|m4a|ogg|flac|webm|mp4)$/.test(name)) return 'audio';
  if (type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  if (type.includes('spreadsheet') || type.includes('excel') || /\.(xlsx|xls)$/.test(name)) return 'excel';
  if (type === 'text/csv' || name.endsWith('.csv')) return 'csv';
  if (type.includes('wordprocessingml') || name.endsWith('.docx') || name.endsWith('.doc')) return 'word';
  if (type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/.test(name)) return 'image';
  // .txt files — WhatsApp detection happens after reading content
  if (name.endsWith('.txt') || name.endsWith('.json')) return 'whatsapp';
  return 'unknown';
}

function isWhatsAppChat(text: string): boolean {
  return /\[\d{1,2}\/\d{1,2}\/\d{2,4},\s*\d{1,2}:\d{2}:\d{2}\]/.test(text);
}

function parseWhatsAppChat(text: string): { parsed: string; participants: string[]; messageCount: number } {
  const lines = text.split('\n').filter(l => l.trim());
  const pattern = /\[[\d/,\s:]+\]\s([^:]+):\s(.+)/;
  const participants = new Set<string>();
  const messages: string[] = [];

  for (const line of lines) {
    const match = line.match(pattern);
    if (match) {
      participants.add(match[1].trim());
      messages.push(`${match[1].trim()}: ${match[2].trim()}`);
    }
  }

  return {
    parsed: messages.join('\n'),
    participants: Array.from(participants),
    messageCount: messages.length,
  };
}

function fileTypeIcon(ft: FileType) {
  switch (ft) {
    case 'audio': return <FileAudio size={20} className="text-blue-400" />;
    case 'pdf': return <FileText size={20} className="text-red-400" />;
    case 'excel':
    case 'csv': return <FileSpreadsheet size={20} className="text-green-400" />;
    case 'word': return <FileText size={20} className="text-blue-500" />;
    case 'image': return <ImageIcon size={20} className="text-sky-600" />;
    case 'whatsapp': return <MessageCircle size={20} className="text-green-500" />;
    default: return <FileText size={20} className="text-muted-foreground" />;
  }
}

function fileTypeLabel(ft: FileType): string {
  switch (ft) {
    case 'audio': return 'Audio → Whisper';
    case 'pdf': return 'PDF → Extracción';
    case 'excel': return 'Excel → SheetJS';
    case 'csv': return 'CSV → Tabla';
    case 'word': return 'Word → Texto';
    case 'image': return 'Imagen → GPT-4o Vision';
    case 'whatsapp': return 'Chat WhatsApp → Parser';
    default: return 'Documento';
  }
}

async function extractExcelCSV(file: File): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const XLSX = await import('xlsx') as any;
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const results: string[] = [];
  for (const sheetName of wb.SheetNames as string[]) {
    const ws = wb.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(ws);
    if ((csv as string).trim()) {
      results.push(`=== Hoja: ${sheetName} ===\n${csv}`);
    }
  }
  return results.join('\n\n').slice(0, 15000);
}

async function extractPDF(file: File): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf') as any;
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: buffer });
  const pdf = await loadingTask.promise;
  const textParts: string[] = [];
  for (let i = 1; i <= Math.min(pdf.numPages, 20); i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pageText = content.items.map((item: any) => (item.str as string) || '').join(' ');
    textParts.push(`[Página ${i}]\n${pageText}`);
  }
  return textParts.join('\n\n').slice(0, 15000);
}

async function extractWord(file: File): Promise<string> {
  try {
    const buffer = await file.arrayBuffer();
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const raw = decoder.decode(buffer);
    const matches = raw.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
    const text = matches
      .map((m: string) => m.replace(/<w:t[^>]*>/, '').replace(/<\/w:t>/, ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (text.length > 100) return text.slice(0, 15000);
    return 'No se pudo extraer texto. Convierte a PDF para mejores resultados.';
  } catch {
    return 'Error al procesar Word. Por favor convierte a PDF.';
  }
}

async function extractAudio(file: File): Promise<string> {
  if (!PROXY_URL) throw new Error('VITE_PROXY_URL no configurado');
  const formData = new FormData();
  formData.append('file', file, file.name);
  formData.append('model', 'whisper-1');
  formData.append('language', 'es');
  const res = await fetch(`${PROXY_URL}/transcribe`, { method: 'POST', body: formData });
  if (!res.ok) throw new Error(`Error Whisper: ${res.status}`);
  const data = await res.json() as { text?: string };
  if (!data.text) throw new Error('Whisper no devolvió transcripción');
  return data.text;
}

async function extractImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// CDR_CONTEXT se construye dinámicamente dentro del componente usando datos reales de Supabase
// Ver buildCDRContext() en el componente DocumentAnalysis

async function analyzeWithVicky(
  extractedContent: string,
  fileType: FileType,
  fileName: string,
  cdrContext: string,
  clientName: string,
  clientIndustry: string,
  clientCountry: string,
  whatsappMeta?: WhatsAppMeta,
): Promise<{ analysis: string; sources: string[] }> {
  if (!PROXY_URL) {
    return {
      analysis: 'No hay conexión con el proxy de Vicky. Configura VITE_PROXY_URL en los secrets de GitHub.',
      sources: [],
    };
  }

  const isImage = fileType === 'image';
  const isWhatsApp = fileType === 'whatsapp';
  const opType = detectOperationType(`${clientIndustry} ${clientCountry} ${clientName} promesa pago deuda`);
  const region = detectRegion(`${clientIndustry} ${clientCountry} ${clientName}`);
  const benchmarkCtx = generateBenchmarkContext(opType, region);

  const whatsappExtra = isWhatsApp
    ? `\nEste es un chat de WhatsApp exportado. Analiza: tono de la conversación, problemas mencionados por el cliente, cómo respondió el agente, si se resolvió el problema, y recomendaciones para el agente.`
    : '';

  const systemPrompt = `Eres Vicky Insights, la IA analítica de WeKall Intelligence para ${clientName}.

Tu misión es analizar documentos que el CEO sube y cruzarlos con los datos operativos reales del contact center.

${cdrContext}

${benchmarkCtx}
${whatsappExtra}
INSTRUCCIONES:
1. Analiza el contenido del documento adjunto
2. Identifica elementos relevantes para la operación de cobranzas o servicio
3. Cruza hallazgos del documento con los datos del CDR
4. Da recomendaciones concretas y accionables para el CEO
5. Responde en prosa ejecutiva fluida, sin bullets ni headers markdown. Usa párrafos.
6. Sé directo y conciso — el CEO quiere insight, no resumen
7. Si el documento tiene datos numéricos, compáralos con el CDR
8. Máximo 400 palabras`;

  // Build messages with proper typing for fetch body
  const messages: Array<{ role: string; content: string | Array<{type: string; text?: string; image_url?: {url: string; detail: string}}> }> = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: isImage
        ? [
            {
              type: 'text',
              text: `El CEO subió una imagen "${fileName}". Analízala y cruza lo que ves con los datos operativos del CDR. ¿Qué insights estratégicos extraes?`,
            },
            {
              type: 'image_url',
              image_url: { url: extractedContent, detail: 'high' },
            },
          ]
        : isWhatsApp && whatsappMeta
          ? `El CEO subió el chat de WhatsApp "${fileName}". Chat de WhatsApp entre: ${whatsappMeta.participants.join(', ')}. ${whatsappMeta.messageCount} mensajes.\n\n---\n${extractedContent.slice(0, 8000)}\n---\n\nAnaliza y cruza con datos del CDR. Insights y recomendaciones accionables.`
          : `El CEO subió "${fileName}" (${fileType}). Contenido extraído:\n\n---\n${extractedContent.slice(0, 8000)}\n---\n\nAnaliza y cruza con datos del CDR. Insights y recomendaciones accionables.`,
    },
  ];

  const body = {
    model: 'gpt-4o',
    messages,
    max_tokens: 600,
    temperature: 0.4,
  };

  const res = await fetch(`${PROXY_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Error proxy: ${res.status} — ${err}`);
  }

  const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
  const analysis = data.choices?.[0]?.message?.content || 'Sin respuesta de Vicky.';
  return {
    analysis,
    sources: [`WeKall CDR · ${clientName}`, `Documento: ${fileName}`],
  };
}

const ACCEPTED_TYPES = [
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a',
  'audio/flac', 'audio/mp4', 'audio/webm',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'text/plain',
  'application/json',
].join(',');

export default function DocumentAnalysis() {
  const { clientConfig } = useClient();
  const cdr = useCDRData();
  const clientName = clientConfig?.client_name || 'WeKall Intelligence';
  const clientIndustry = clientConfig?.industry || 'cobranzas';
  const clientCountry = clientConfig?.country || 'colombia';

  // CDR_CONTEXT dinámico: datos reales de Supabase o fallback genérico
  const CDR_CONTEXT = cdr.latestDay
    ? `## DATOS CDR — WeKall / ${clientName} — ${cdr.latestDay.fecha}
- Total llamadas: ${cdr.latestDay.total_llamadas?.toLocaleString('es-CO') ?? 'N/D'} | Campañas activas
- Agentes activos: ${cdr.latestDay.agentes_activos ?? 'N/D'}
- Tasa de contacto efectivo: ${cdr.latestDay.tasa_contacto_pct?.toFixed(1) ?? 'N/D'}%
- AHT real: ${cdr.latestDay.aht_minutos?.toFixed(1) ?? 'N/D'} min promedio
- Promesa de pago: 40% de contactos efectivos
- Objeción principal: "Pido más plazo" (56%), "No reconozco la deuda" (52%)
- Top performer: Teresa Meza. Bottom: Paola Joya.`
    : `## DATOS CDR — WeKall / ${clientName}
- Datos CDR histórico disponibles en Supabase (tabla: cdr_daily_metrics)
- Industria: ${clientIndustry} | País: ${clientCountry}
- Contacta al equipo técnico para verificar la conexión con Supabase.`;

  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<ProcessStatus>('idle');
  const [currentFile, setCurrentFile] = useState<string>('');
  const [docs, setDocs] = useState<ProcessedDoc[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<ProcessedDoc | null>(null);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    setStatus('extracting');
    setCurrentFile(file.name);
    setError('');

    let fileType = detectFileType(file);
    let extractedText = '';
    let whatsappMeta: WhatsAppMeta | undefined;

    try {
      switch (fileType) {
        case 'audio':
          extractedText = await extractAudio(file);
          break;
        case 'pdf':
          extractedText = await extractPDF(file);
          break;
        case 'excel':
        case 'csv':
          extractedText = await extractExcelCSV(file);
          break;
        case 'word':
          extractedText = await extractWord(file);
          break;
        case 'image':
          extractedText = await extractImage(file);
          break;
        case 'whatsapp': {
          const rawText = await file.text();
          if (isWhatsAppChat(rawText)) {
            const parsed = parseWhatsAppChat(rawText);
            extractedText = parsed.parsed;
            whatsappMeta = { participants: parsed.participants, messageCount: parsed.messageCount };
          } else {
            // Plain text file, not a WhatsApp chat — treat as generic text
            fileType = 'unknown';
            extractedText = rawText.slice(0, 15000);
          }
          break;
        }
        default:
          throw new Error('Tipo de archivo no soportado. Usa: Audio, PDF, Excel, CSV, Word, Imagen o Chat WhatsApp (.txt).');
      }

      setStatus('analyzing');
      const { analysis, sources } = await analyzeWithVicky(extractedText, fileType, file.name, CDR_CONTEXT, clientName, clientIndustry, clientCountry, whatsappMeta);

      const doc: ProcessedDoc = {
        fileName: file.name,
        fileType,
        extractedText: fileType === 'image' ? '[Imagen procesada por GPT-4o Vision]' : extractedText,
        analysis,
        sources,
        whatsappMeta,
      };

      setDocs(prev => [doc, ...prev]);
      setSelectedDoc(doc);
      setStatus('done');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      setError(msg);
      setStatus('error');
    }
  }, [CDR_CONTEXT, clientName, clientIndustry, clientCountry]);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    processFile(files[0]);
  }, [processFile]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);

  const isProcessing = status === 'extracting' || status === 'analyzing';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-card shrink-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 border border-primary/20">
          <Brain size={18} className="text-primary" />
        </div>
        <div>
          <h1 className="text-base font-bold text-foreground">Análisis de Documentos</h1>
          <p className="text-xs text-muted-foreground">Vicky cruza tu documento con los datos del CDR para análisis estratégico integrado</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Left panel: Upload + History */}
        <div className="flex flex-col md:w-80 w-full shrink-0 border-b md:border-b-0 md:border-r border-border overflow-y-auto max-h-[45vh] md:max-h-none">
          <div className="p-4">
            <div
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onClick={() => !isProcessing && fileInputRef.current?.click()}
              className={cn(
                'relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all select-none',
                dragging
                  ? 'border-primary bg-primary/10 scale-[1.02]'
                  : 'border-border hover:border-primary/50 hover:bg-secondary/50',
                isProcessing && 'pointer-events-none opacity-60',
              )}
            >
              {isProcessing ? (
                <>
                  <Loader2 size={32} className="text-primary animate-spin" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {status === 'extracting' ? 'Extrayendo contenido...' : 'Vicky analizando...'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">{currentFile}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
                    <Upload size={22} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Arrastra o haz clic</p>
                    <p className="text-xs text-muted-foreground mt-1">Audio · PDF · Excel · CSV · Word · Imagen · Chat WhatsApp</p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-1 mt-1">
                    {['MP3', 'PDF', 'XLSX', 'CSV', 'DOCX', 'PNG', 'TXT'].map(fmt => (
                      <span key={fmt} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-secondary border border-border text-muted-foreground">
                        {fmt}
                      </span>
                    ))}
                  </div>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept={ACCEPTED_TYPES}
                onChange={e => handleFiles(e.target.files)}
              />
            </div>

            {status === 'error' && error && (
              <div className="mt-2 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2">
                <AlertCircle size={14} className="text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive">{error}</p>
              </div>
            )}
          </div>

          {/* Supported formats */}
          <div className="px-4 pb-4">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Formatos soportados</p>
            <div className="space-y-1.5">
              {[
                { icon: <FileAudio size={13} className="text-blue-400" />, label: 'Audio', desc: 'MP3, WAV, M4A → Whisper AI', available: true },
                { icon: <FileText size={13} className="text-red-400" />, label: 'PDF', desc: 'Extracción automática de texto', available: true },
                { icon: <FileSpreadsheet size={13} className="text-green-400" />, label: 'Excel / CSV', desc: 'Análisis de datos y tablas', available: true },
                { icon: <FileText size={13} className="text-blue-500" />, label: 'Word', desc: 'Documentos .docx', available: true },
                { icon: <ImageIcon size={13} className="text-sky-600" />, label: 'Imágenes', desc: 'JPG, PNG → GPT-4o Vision', available: true },
                { icon: <MessageCircle size={13} className="text-green-500" />, label: 'Chat WhatsApp', desc: 'Exportación .txt de conversaciones', available: true },
              ].map(({ icon, label, desc, available }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="shrink-0">{icon}</span>
                  <div className="flex-1">
                    <span className="text-[11px] font-semibold text-foreground">{label}: </span>
                    <span className="text-[11px] text-muted-foreground">{desc}</span>
                  </div>
                  {available && (
                    <span className="ml-auto shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-500/15 text-green-500 border border-green-500/30">
                      DISPONIBLE
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* History */}
          {docs.length > 0 && (
            <div className="px-4 pb-4 border-t border-border pt-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Analizados</p>
              <div className="space-y-1.5">
                {docs.map((doc, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedDoc(doc)}
                    className={cn(
                      'w-full flex items-center gap-2 rounded-lg border p-2.5 text-left transition-all',
                      selectedDoc === doc
                        ? 'border-primary/40 bg-primary/10'
                        : 'border-border hover:border-primary/20 hover:bg-secondary/50',
                    )}
                  >
                    {fileTypeIcon(doc.fileType)}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground truncate">{doc.fileName}</p>
                      <p className="text-[10px] text-muted-foreground">{fileTypeLabel(doc.fileType)}</p>
                    </div>
                    <CheckCircle size={12} className="text-green-400 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Analysis panel */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedDoc && !isProcessing && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                <Zap size={28} className="text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Vicky Document Intelligence</h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-md">
                  Sube cualquier documento — Vicky extrae el contenido y lo cruza con los datos del CDR para análisis estratégico integrado.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-2 max-w-sm w-full">
                {[
                  { emoji: '🎧', text: 'Audio de llamada → Vicky analiza objeciones vs. tu CDR' },
                  { emoji: '📊', text: 'Reporte Excel → Vicky cruza con tus KPIs operativos' },
                  { emoji: '📄', text: 'PDF de estrategia → Vicky extrae insights accionables' },
                  { emoji: '🖼️', text: 'Captura de pantalla → GPT-4o Vision lee y analiza' },
                ].map(({ emoji, text }) => (
                  <div key={emoji} className="flex items-start gap-2 rounded-lg border border-border bg-card p-3">
                    <span className="text-lg shrink-0">{emoji}</span>
                    <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                <Loader2 size={28} className="text-primary animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-base font-semibold text-foreground">
                  {status === 'extracting' ? '🔍 Extrayendo contenido del documento...' : '🧠 Vicky cruzando con datos del CDR...'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{currentFile}</p>
              </div>
              <div className="flex gap-2">
                {(['Extracción', 'Análisis CDR', 'Insights'] as const).map((step, i) => (
                  <div key={step} className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                    (i === 0 && status === 'extracting') || (i === 1 && status === 'analyzing')
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground',
                  )}>
                    {step}
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedDoc && !isProcessing && (
            <div className="space-y-5 max-w-3xl">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary border border-border">
                  {fileTypeIcon(selectedDoc.fileType)}
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">{selectedDoc.fileName}</h2>
                  <p className="text-xs text-muted-foreground">{fileTypeLabel(selectedDoc.fileType)} · Analizado por Vicky Insights</p>
                </div>
                <div className="ml-auto flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-1">
                  <CheckCircle size={12} className="text-green-400" />
                  <span className="text-[11px] font-semibold text-green-400">Análisis completo</span>
                </div>
              </div>

              {selectedDoc.whatsappMeta && (
                <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <MessageCircle size={14} className="text-green-500" />
                    <span className="text-xs font-semibold text-green-500">Chat WhatsApp</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Participantes: </span>
                    {selectedDoc.whatsappMeta.participants.join(', ')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Mensajes: </span>
                    {selectedDoc.whatsappMeta.messageCount}
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <Zap size={12} className="text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-primary">Análisis de Vicky Insights</span>
                </div>
                <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {selectedDoc.analysis}
                </div>
                {selectedDoc.sources && (
                  <div className="mt-4 pt-3 border-t border-primary/15">
                    <p className="text-[10px] text-muted-foreground">
                      <span className="font-semibold">Fuentes:</span> {selectedDoc.sources.join(' · ')}
                    </p>
                  </div>
                )}
              </div>

              {selectedDoc.extractedText && selectedDoc.fileType !== 'image' && (
                <details className="rounded-xl border border-border overflow-hidden">
                  <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer bg-secondary/50 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    <FileText size={14} />
                    Contenido extraído del documento
                    <span className="ml-auto text-xs font-normal text-muted-foreground">
                      {selectedDoc.extractedText.length.toLocaleString()} caracteres
                    </span>
                  </summary>
                  <div className="p-4">
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto">
                      {selectedDoc.extractedText}
                    </pre>
                  </div>
                </details>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
                >
                  <Upload size={15} />
                  Analizar otro documento
                </button>
                <button
                  onClick={() => { setSelectedDoc(null); setStatus('idle'); }}
                  className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <X size={15} />
                  Limpiar
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept={ACCEPTED_TYPES}
                onChange={e => handleFiles(e.target.files)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
