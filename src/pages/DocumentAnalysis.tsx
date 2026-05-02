import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload, FileAudio, FileText, FileSpreadsheet, Image as ImageIcon,
  Loader2, Zap, CheckCircle, AlertCircle, X, Brain, MessageCircle, HelpCircle,
  TrendingUp, Lightbulb, Target, Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { detectOperationType, detectRegion, generateBenchmarkContext } from '@/data/benchmarks';
import { useClient } from '@/contexts/ClientContext';
import { useCDRData } from '@/hooks/useCDRData';
import { saveExecutiveInsight, getExecutiveInsights, deleteExecutiveInsight, type ExecutiveInsight, type Comment } from '@/lib/executiveInsights';
import { formatRelativeTime, groupByDate, getDateGroupLabel, type DateGroup } from '@/lib/dateUtils';
import { BenchmarkCard } from '@/components/BenchmarkCard';
import { CommentSection } from '@/components/CommentSection';

const PROXY_URL = import.meta.env.VITE_PROXY_URL || '';

type FileType = 'audio' | 'pdf' | 'excel' | 'csv' | 'word' | 'image' | 'whatsapp' | 'unknown';
type ProcessStatus = 'idle' | 'extracting' | 'analyzing' | 'done' | 'error';

interface WhatsAppMeta {
  participants: string[];
  messageCount: number;
}

interface BenchmarkMetric {
  metric: string;
  benchmark_value: number;
  benchmark_source: string;
  top_quartile?: number;
  bottom_quartile?: number;
  unit: string;
  current_value?: number;
  gap_percent?: number;
  position?: 'above' | 'below' | 'inline';
}

interface ProcessedDoc {
  id?: string; // US-EI-006: Supabase ID (si está guardado)
  fileName: string;
  fileType: FileType;
  extractedText: string;
  analysis: string;
  executiveBrief?: string; // US-EI-004: Executive Brief (100 palabras)
  sources?: string[];
  benchmarks?: BenchmarkMetric[]; // US-EI-009: Benchmarks extraídos
  comments?: { notes: Comment[] }; // US-EI-013: Comentarios
  error?: string;
  whatsappMeta?: WhatsAppMeta;
  createdAt?: string; // US-EI-006: Timestamp de creación
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
  // Worker local bundleado (UAT Mejora #2 - elimina dependencia CDN)
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/legacy/build/pdf.worker.min.js',
    import.meta.url
  ).toString();
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

// US-EI-009: Helper para obtener valor de métrica del CDR
function getCDRMetricValue(metric: string, cdrData: any): number | null {
  if (!cdrData?.latestDay) return null;
  
  const metricMap: Record<string, string> = {
    'tasa_contacto': 'tasa_contacto_pct',
    'aht': 'aht_minutos',
    'fcr': 'fcr_pct',
    'csat': 'csat_pct',
    'nps': 'nps',
    'abandono': 'abandono_pct',
    'conversion': 'conversion_pct',
    'tasa_promesa': 'tasa_promesa_pct',
  };
  
  const cdrKey = metricMap[metric];
  if (!cdrKey) return null;
  
  const value = cdrData.latestDay[cdrKey];
  return typeof value === 'number' ? value : null;
}

async function analyzeWithVicky(
  extractedContent: string,
  fileType: FileType,
  fileName: string,
  cdrContext: string,
  clientName: string,
  clientIndustry: string,
  clientCountry: string,
  cdrData: any,
  whatsappMeta?: WhatsAppMeta,
): Promise<{ analysis: string; executiveBrief: string; sources: string[]; benchmarks?: BenchmarkMetric[] }> {
  if (!PROXY_URL) {
    return {
      analysis: 'No hay conexión con el proxy de Vicky. Configura VITE_PROXY_URL en los secrets de GitHub.',
      executiveBrief: '',
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
⚠️ REGLA CRÍTICA DE RELEVANCIA:
ANTES de analizar, VALIDA que el documento tenga relación directa con:

✅ DOCUMENTOS ACEPTADOS (Categorías amplias):

1. OPERACIÓN DE CONTACT CENTER:
   - Transcripciones de llamadas, grabaciones, análisis de voz
   - Reportes de KPIs: AHT, FCR, CSAT, NPS, tasa de contacto, conversión
   - Métricas de agentes: productividad, performance, rankings
   - Campañas: cobranzas, ventas, retención, outbound/inbound
   - Scripts, objeciones, argumentarios, playbooks
   - Análisis de conversaciones, sentiment analysis

2. ESTRATEGIA Y NEGOCIO:
   - Frameworks estratégicos (SWOT, Canvas, OKRs, Balanced Scorecard)
   - Planes comerciales, estrategias de go-to-market
   - Business cases, ROI analysis, propuestas de valor
   - Informes ejecutivos, presentaciones para junta directiva
   - Roadmaps de producto/servicio

3. BENCHMARKS E INDUSTRIA:
   - Benchmarks de industria (contact center, BPO, ${clientIndustry})
   - Estudios de mercado, análisis competitivo
   - Best practices de CX, ventas, cobranzas
   - White papers, case studies, research reports
   - Tendencias de industria, innovación en CC

4. FINANCIERO Y OPERATIVO:
   - Informes financieros: P&L, balance, flujo de caja
   - Presupuestos, forecasts, proyecciones
   - Análisis de costos operativos (costo por llamada, CAC, LTV)
   - Reportes de eficiencia, utilización de recursos
   - Business intelligence dashboards

5. TECNOLOGÍA Y HERRAMIENTAS:
   - Documentación de CRM, telephony, omnicanalidad
   - Manuales de herramientas (Salesforce, Genesys, Five9, etc.)
   - Arquitectura de soluciones, integraciones
   - Reportes de IA/automatización (chatbots, voicebots)
   - Data analytics, BI tools

6. PROCESOS Y CALIDAD:
   - Manuales de procesos, SOPs, workflows
   - Quality assurance reports, auditorías
   - Compliance, regulaciones (GDPR, PCI-DSS, etc.)
   - Training materials, onboarding guides
   - Políticas de servicio al cliente

7. RECURSOS HUMANOS:
   - Evaluaciones de desempeño de agentes
   - Planes de capacitación, desarrollo de talento
   - Org charts, estructura de equipos
   - Engagement surveys, clima laboral
   - Compensation & benefits (si relacionado con performance)

8. CLIENTES Y MERCADO:
   - Customer journey maps, voice of customer
   - Análisis de churn, retención, lifetime value
   - Segmentación de clientes, personas
   - Net Promoter Score (NPS) reports
   - Feedback de clientes, encuestas

❌ DOCUMENTOS RECHAZADOS (Ejemplos):
- Exámenes médicos, recetas, historias clínicas
- Facturas/gastos personales del CEO
- Trámites legales/notariales personales
- Documentos familiares, escolares (hijos)
- Contenido de entretenimiento sin relación laboral
- Manuales de productos no relacionados con CC

SI EL DOCUMENTO NO TIENE RELACIÓN:
Responde EXACTAMENTE:
"❌ Este documento no tiene relación con la operación del contact center ni con el negocio de ${clientName}.

Vicky Insights analiza documentos estratégicos y operativos como:
• Operación de CC (KPIs, transcripciones, campañas)
• Estrategia y frameworks (SWOT, OKRs, business cases)
• Benchmarks e industria (${clientIndustry}, best practices)
• Informes financieros (P&L, ROI, costos operativos)
• Tecnología y herramientas (CRM, IA, analytics)
• Procesos y calidad (SOPs, QA, compliance)
• Recursos humanos (performance, capacitación)
• Clientes y mercado (NPS, churn, journey maps)

Por favor, sube un documento relacionado con tu operación para que pueda cruzarlo con los datos del CDR y generar insights accionables."

NO intentes forzar análisis de documentos irrelevantes. Rechaza educadamente.

---

SI EL DOCUMENTO SÍ ES RELEVANTE:
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

  // US-EI-004: Generar Executive Brief (100 palabras máximo)
  let executiveBrief = '';
  
  // Solo generar brief si el análisis NO es rechazo
  if (!analysis.startsWith('❌')) {
    const briefPrompt = `Genera un EXECUTIVE BRIEF de máximo 100 palabras que responda:

1. ¿Qué documento se analizó? (tipo, fuente, fecha si aplica)
2. ¿Cuál es el hallazgo clave? (1 insight principal)
3. ¿Qué acción recomiendas? (1 recomendación concreta)
4. ¿Cómo se conecta con los datos del CDR? (1 dato de contexto)

Formato: Párrafo ejecutivo fluido, sin bullets. Directo, accionable, CEO-ready.

Análisis completo:
${analysis.slice(0, 2000)}`;

    const briefRes = await fetch(`${PROXY_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'Eres un executive assistant que genera briefs concisos para CEOs.' },
          { role: 'user', content: briefPrompt },
        ],
        max_tokens: 200,
        temperature: 0.3,
      }),
    });

    if (briefRes.ok) {
      const briefData = await briefRes.json() as { choices?: Array<{ message?: { content?: string } }> };
      executiveBrief = briefData.choices?.[0]?.message?.content || '';
    }
  }

  // US-EI-009: Extraer benchmarks del documento
  let benchmarks: BenchmarkMetric[] = [];
  
  // Solo extraer benchmarks si el análisis NO es rechazo y el documento menciona métricas
  if (!analysis.startsWith('❌') && extractedContent.length > 200) {
    const benchmarkPrompt = `Del siguiente documento, extrae TODAS las métricas de benchmark mencionadas.

Retorna un JSON válido con este formato exacto:
{
  "metrics": [
    {
      "metric": "tasa_contacto",
      "benchmark_value": 60,
      "benchmark_source": "promedio industria LATAM 2024",
      "top_quartile": 75,
      "bottom_quartile": 45,
      "unit": "%"
    }
  ]
}

Métricas válidas: tasa_contacto, aht, fcr, csat, nps, abandono, conversion, tasa_promesa, costo_llamada, tco, productividad, utilizacion

Si NO hay benchmarks numéricos en el documento, retorna: { "metrics": [] }

Documento:
${extractedContent.slice(0, 4000)}`;

    try {
      const benchmarkRes = await fetch(`${PROXY_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: 'Eres un extractor de métricas. Retorna solo JSON válido, sin texto adicional.' },
            { role: 'user', content: benchmarkPrompt },
          ],
          max_tokens: 500,
          temperature: 0.1,
        }),
      });

      if (benchmarkRes.ok) {
        const benchmarkData = await benchmarkRes.json() as { choices?: Array<{ message?: { content?: string } }> };
        const benchmarkText = benchmarkData.choices?.[0]?.message?.content || '{}';
        
        // Parse JSON (puede venir con markdown fences)
        const jsonMatch = benchmarkText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as { metrics: any[] };
          
          if (parsed.metrics && Array.isArray(parsed.metrics)) {
            // Cruzar con CDR actual para calcular gap
            benchmarks = parsed.metrics.map((bm: any) => {
              const currentValue = getCDRMetricValue(bm.metric, cdrData);
              const gap = currentValue !== null 
                ? ((currentValue - bm.benchmark_value) / bm.benchmark_value) * 100
                : 0;
              const position = currentValue !== null
                ? currentValue > bm.benchmark_value ? 'above' as const
                  : currentValue < bm.benchmark_value ? 'below' as const
                  : 'inline' as const
                : 'inline' as const;
              
              return {
                metric: bm.metric,
                benchmark_value: bm.benchmark_value,
                benchmark_source: bm.benchmark_source || 'documento',
                top_quartile: bm.top_quartile,
                bottom_quartile: bm.bottom_quartile,
                unit: bm.unit,
                current_value: currentValue || undefined,
                gap_percent: currentValue !== null ? gap : undefined,
                position: currentValue !== null ? position : undefined,
              };
            });
          }
        }
      }
    } catch (err) {
      console.error('[Benchmarks] Error extracting:', err);
      // No-op: benchmarks optional, analysis continues
    }
  }

  return {
    analysis,
    executiveBrief,
    sources: [`WeKall CDR · ${clientName}`, `Documento: ${fileName}`],
    benchmarks: benchmarks.length > 0 ? benchmarks : undefined,
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
  const clientName = clientConfig?.client_name || clientConfig?.client_id || 'tu empresa';
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
  const [loading, setLoading] = useState(true);
  const [fileTypeFilter, setFileTypeFilter] = useState<FileType | 'all'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // US-EI-006: Cargar historial desde Supabase al montar
  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const loadHistory = async () => {
      if (!clientConfig?.client_id) {
        // Timeout de seguridad: si después de 3s no hay clientConfig, dejar de esperar
        timeoutId = setTimeout(() => {
          if (mounted) {
            console.warn('[DocumentAnalysis] Timeout cargando clientConfig — modo sin historial');
            setLoading(false);
          }
        }, 3000);
        return;
      }

      clearTimeout(timeoutId);

      try {
        const insights = await getExecutiveInsights(clientConfig.client_id);
        
        if (!mounted) return;

        const loadedDocs: ProcessedDoc[] = insights.map((insight) => ({
          id: insight.id,
          fileName: insight.file_name,
          fileType: insight.file_type as FileType,
          extractedText: insight.extracted_text || '',
          analysis: insight.analysis,
          executiveBrief: insight.executive_brief,
          sources: insight.sources,
          benchmarks: insight.benchmarks?.metrics, // US-EI-009
          comments: insight.comments, // US-EI-013
          whatsappMeta: insight.whatsapp_participants ? {
            participants: insight.whatsapp_participants,
            messageCount: insight.whatsapp_message_count || 0,
          } : undefined,
          createdAt: insight.created_at,
        }));

        setDocs(loadedDocs);
        setLoading(false);
      } catch (err) {
        console.error('[DocumentAnalysis] Error cargando historial:', err);
        if (mounted) setLoading(false);
      }
    };

    loadHistory();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [clientConfig?.client_id]);

  const processFile = useCallback(async (file: File) => {
    setStatus('extracting');
    setCurrentFile(file.name);
    setError('');

    let fileType = detectFileType(file);
    let extractedText = '';
    let whatsappMeta: WhatsAppMeta | undefined;

    // Validaciones de tamaño frontend (UAT Mejora #1)
    const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25 MB
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB

    try {
      // Validar tamaño antes de procesar
      if (fileType === 'audio' && file.size > MAX_AUDIO_SIZE) {
        throw new Error('El archivo de audio supera el límite de 25 MB. Por favor, comprime el archivo o sube uno más pequeño.');
      }
      
      if (fileType === 'image' && file.size > MAX_IMAGE_SIZE) {
        throw new Error('La imagen supera el límite de 10 MB. Por favor, reduce la resolución o comprime el archivo.');
      }

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
            // Validación mejorada para WhatsApp (UAT Mejora #4)
            throw new Error(
              'El archivo TXT no tiene formato de chat WhatsApp válido.\n\n' +
              'Para exportar un chat:\n' +
              '1. Abre WhatsApp > Chat deseado\n' +
              '2. Toca los 3 puntos (Menú) > Más > Exportar chat\n' +
              '3. Selecciona "Sin multimedia"\n' +
              '4. Guarda el archivo .txt y súbelo aquí\n\n' +
              'Formato esperado: [DD/MM/YY, HH:MM:SS] Nombre: Mensaje'
            );
          }
          break;
        }
        default:
          throw new Error('Tipo de archivo no soportado. Usa: Audio, PDF, Excel, CSV, Word, Imagen o Chat WhatsApp (.txt).');
      }

      setStatus('analyzing');
      const { analysis, executiveBrief, sources, benchmarks } = await analyzeWithVicky(extractedText, fileType, file.name, CDR_CONTEXT, clientName, clientIndustry, clientCountry, cdr, whatsappMeta);

      // US-EI-006: Guardar en Supabase
      let savedInsight: ExecutiveInsight | null = null;
      if (clientConfig?.client_id && !analysis.startsWith('❌')) {
        savedInsight = await saveExecutiveInsight({
          client_id: clientConfig.client_id,
          file_name: file.name,
          file_type: fileType,
          file_size_bytes: file.size,
          extracted_text: fileType === 'image' ? '[Imagen procesada por GPT-4o Vision]' : extractedText,
          analysis,
          executive_brief: executiveBrief,
          benchmarks: benchmarks && benchmarks.length > 0 ? { metrics: benchmarks } : undefined, // US-EI-009
          whatsapp_participants: whatsappMeta?.participants,
          whatsapp_message_count: whatsappMeta?.messageCount,
          sources,
        });
      }

      const doc: ProcessedDoc = {
        id: savedInsight?.id,
        fileName: file.name,
        fileType,
        extractedText: fileType === 'image' ? '[Imagen procesada por GPT-4o Vision]' : extractedText,
        analysis,
        executiveBrief,
        sources,
        benchmarks, // US-EI-009
        whatsappMeta,
        createdAt: savedInsight?.created_at || new Date().toISOString(),
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
          <h1 className="text-base font-bold text-foreground">Executive Insights</h1>
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

          {/* Supported formats con tooltips (UAT Mejora #5) */}
          <div className="px-4 pb-4">
            <div className="flex items-center gap-1.5 mb-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Formatos soportados</p>
              <div className="group relative">
                <HelpCircle size={12} className="text-muted-foreground/60 cursor-help" />
                <div className="hidden group-hover:block absolute left-0 top-full mt-1 z-50 w-64 rounded-lg border border-border bg-card p-3 shadow-xl">
                  <p className="text-xs font-semibold text-foreground mb-1.5">ℹ️ Información</p>
                  <div className="space-y-1 text-[10px] text-muted-foreground">
                    <p>🎵 Audio: Máx 25 MB</p>
                    <p>📝 PDF: Máx 20 páginas</p>
                    <p>🖼️ Imagen: Máx 10 MB</p>
                    <p>💬 WhatsApp: Formato [DD/MM/YY, HH:MM:SS]</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              {[
                { 
                  icon: <FileAudio size={13} className="text-blue-400" />, 
                  label: 'Audio', 
                  desc: 'MP3, WAV, M4A → Whisper AI', 
                  available: true,
                  tooltip: 'Máximo 25 MB. Transcripción automática en español.'
                },
                { 
                  icon: <FileText size={13} className="text-red-400" />, 
                  label: 'PDF', 
                  desc: 'Extracción automática de texto', 
                  available: true,
                  tooltip: 'Máximo 20 páginas, 15k caracteres.'
                },
                { 
                  icon: <FileSpreadsheet size={13} className="text-green-400" />, 
                  label: 'Excel / CSV', 
                  desc: 'Análisis de datos y tablas', 
                  available: true,
                  tooltip: 'Lee todas las hojas. Máximo 15k caracteres.'
                },
                { 
                  icon: <FileText size={13} className="text-blue-500" />, 
                  label: 'Word', 
                  desc: 'Documentos .docx', 
                  available: true,
                  tooltip: 'Recomendado: Convertir a PDF para mejores resultados.'
                },
                { 
                  icon: <ImageIcon size={13} className="text-sky-600" />, 
                  label: 'Imágenes', 
                  desc: 'JPG, PNG → GPT-4o Vision', 
                  available: true,
                  tooltip: 'Máximo 10 MB. Análisis visual con IA.'
                },
                { 
                  icon: <MessageCircle size={13} className="text-green-500" />, 
                  label: 'Chat WhatsApp', 
                  desc: 'Exportación .txt de conversaciones', 
                  available: true,
                  tooltip: 'Formato: [DD/MM/YY, HH:MM:SS] Nombre: Mensaje'
                },
              ].map(({ icon, label, desc, available, tooltip }) => (
                <div key={label} className="group/item relative flex items-center gap-2">
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
                  {/* Tooltip hover */}
                  <div className="hidden group-hover/item:block absolute left-0 top-full mt-1 z-50 w-56 rounded-lg border border-border bg-card p-2 shadow-xl">
                    <p className="text-[10px] text-foreground">{tooltip}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* History */}
          {loading && (
            <div className="px-4 pb-4 border-t border-border pt-4">
              <div className="flex items-center justify-center gap-2 py-4">
                <Loader2 size={14} className="animate-spin text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground">Cargando historial...</p>
              </div>
            </div>
          )}
          {!loading && docs.length > 0 && (() => {
            // US-EI-007: Filtrar documentos
            const filtered = fileTypeFilter === 'all' 
              ? docs 
              : docs.filter(d => d.fileType === fileTypeFilter);
            
            // US-EI-007: Agrupar por fecha
            const grouped = groupByDate(filtered);
            const groupOrder: DateGroup[] = ['today', 'yesterday', 'thisWeek', 'thisMonth', 'older'];
            
            return (
              <div className="px-4 pb-4 border-t border-border pt-4">
                {/* Header con count + filtro */}
                <div className="flex flex-col gap-2 mb-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                      Analizados ({filtered.length})
                    </p>
                    <div className="flex items-center gap-2">
                      {docs.length > 5 && fileTypeFilter !== 'all' && (
                        <button
                          onClick={() => setFileTypeFilter('all')}
                          className="text-[9px] text-primary hover:underline"
                        >
                          Limpiar
                        </button>
                      )}
                      {docs.length > 10 && (
                        <button
                          onClick={() => window.location.href = '/executive-insights/history'}
                          className="text-[9px] text-primary hover:underline font-semibold"
                        >
                          Ver todos →
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Filtro por tipo */}
                  {docs.length > 3 && (
                    <div className="flex flex-wrap gap-1">
                      <button
                        onClick={() => setFileTypeFilter('all')}
                        className={cn(
                          'px-2 py-1 rounded text-[9px] font-medium transition-colors',
                          fileTypeFilter === 'all'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                        )}
                      >
                        Todos
                      </button>
                      {['audio', 'pdf', 'excel', 'word', 'image', 'whatsapp'].map((type) => {
                        const count = docs.filter(d => d.fileType === type).length;
                        if (count === 0) return null;
                        return (
                          <button
                            key={type}
                            onClick={() => setFileTypeFilter(type as FileType)}
                            className={cn(
                              'px-2 py-1 rounded text-[9px] font-medium transition-colors',
                              fileTypeFilter === type
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                            )}
                          >
                            {fileTypeLabel(type as FileType)} ({count})
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Grupos por fecha */}
                <div className="space-y-4">
                  {groupOrder.map((group) => {
                    const groupDocs = grouped[group];
                    if (groupDocs.length === 0) return null;

                    return (
                      <div key={group}>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                          {getDateGroupLabel(group)}
                        </p>
                        <div className="space-y-1.5">
                          {groupDocs.map((doc, i) => (
                            <div key={doc.id || i} className="relative group">
                              <button
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
                                  <p className="text-[10px] text-muted-foreground">
                                    {doc.createdAt && formatRelativeTime(doc.createdAt)}
                                  </p>
                                </div>
                                {/* US-EI-007: Badge Aprobado/Rechazado */}
                                {doc.analysis.startsWith('❌') ? (
                                  <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold bg-destructive/15 text-destructive border border-destructive/30">
                                    Rechazado
                                  </span>
                                ) : (
                                  <CheckCircle size={12} className="text-green-400 shrink-0" />
                                )}
                              </button>
                              {/* Botón eliminar (visible on hover) */}
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  // US-EI-006: Soft-delete en Supabase si tiene ID
                                  if (doc.id) {
                                    await deleteExecutiveInsight(doc.id);
                                  }
                                  setDocs(prev => prev.filter(d => d.id !== doc.id));
                                  if (selectedDoc === doc) setSelectedDoc(null);
                                }}
                                className="absolute top-1/2 -translate-y-1/2 right-2 hidden group-hover:flex items-center justify-center w-6 h-6 rounded-full bg-destructive/10 hover:bg-destructive/20 border border-destructive/30 transition-all"
                                title="Eliminar documento"
                              >
                                <X size={12} className="text-destructive" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Right: Analysis panel */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedDoc && !isProcessing && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-6 px-6">
              {/* Hero Section */}
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                <Brain size={32} className="text-primary" />
              </div>
              <div className="max-w-2xl">
                <h2 className="text-2xl font-bold text-foreground">Executive Insights</h2>
                <p className="text-base text-muted-foreground mt-2 leading-relaxed">
                  Sube documentos estratégicos. Vicky cruza con tus datos del CDR y genera insights accionables para decisiones de negocio.
                </p>
              </div>

              {/* Value Props */}
              <div className="grid grid-cols-3 gap-4 mt-2 max-w-3xl w-full">
                {[
                  { icon: TrendingUp, title: 'Compara vs Benchmarks', desc: 'Identifica gaps y oportunidades vs industria' },
                  { icon: Lightbulb, title: 'Insights Accionables', desc: 'Recomendaciones concretas, no solo data' },
                  { icon: Target, title: 'ROI Estimado', desc: 'Impacto financiero proyectado' },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4">
                    <Icon size={24} className="text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                    <p className="text-xs text-muted-foreground text-center leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>

              {/* Document Types */}
              <div className="max-w-4xl w-full mt-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Documentos que puedes analizar:</h3>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { icon: '📊', label: 'Frameworks', examples: 'SWOT, Canvas, OKRs' },
                    { icon: '📈', label: 'Benchmarks', examples: 'Gartner, Forrester, McKinsey' },
                    { icon: '💰', label: 'Financieros', examples: 'P&L, ROI, presupuestos' },
                    { icon: '🔍', label: 'Mercado', examples: 'Competencia, tendencias' },
                    { icon: '📑', label: 'Contratos', examples: 'SLAs, acuerdos clave' },
                    { icon: '🎯', label: 'Estrategias', examples: 'Go-to-market, roadmaps' },
                    { icon: '✨', label: 'Best Practices', examples: 'Case studies, white papers' },
                    { icon: '🎤', label: 'Transcripciones', examples: 'Keynotes, webinars' },
                  ].map(({ icon, label, examples }) => (
                    <div key={label} className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-card p-3 hover:border-primary/30 transition-colors">
                      <span className="text-2xl">{icon}</span>
                      <h4 className="text-xs font-semibold text-foreground">{label}</h4>
                      <p className="text-[10px] text-muted-foreground text-center">{examples}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              {/* Indicador de progreso mejorado (UAT Mejora #3) */}
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 relative">
                <Loader2 size={28} className="text-primary animate-spin" />
                {/* Pulse ring animation */}
                <div className="absolute inset-0 rounded-2xl border-2 border-primary/30 animate-ping" />
              </div>
              <div className="text-center max-w-md">
                <p className="text-base font-semibold text-foreground">
                  {status === 'extracting' ? '🔍 Extrayendo contenido del documento...' : '🧠 Vicky cruzando con datos del CDR...'}
                </p>
                <p className="text-sm text-muted-foreground mt-1 truncate px-4">{currentFile}</p>
                {/* Descripción del paso actual */}
                <p className="text-xs text-muted-foreground/80 mt-2 leading-relaxed">
                  {status === 'extracting' 
                    ? 'Procesando archivo y extrayendo texto...'
                    : 'Analizando contenido con GPT-4o e integrando datos del CDR...'}
                </p>
              </div>
              {/* Progress steps con iconos */}
              <div className="flex gap-3">
                {[
                  { label: 'Extracción', active: status === 'extracting', icon: '📝' },
                  { label: 'Análisis CDR', active: status === 'analyzing', icon: '📊' },
                  { label: 'Insights', active: false, icon: '✨' },
                ].map((step, i) => (
                  <div key={step.label} className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all',
                    step.active
                      ? 'border-primary bg-primary/10 text-primary shadow-sm scale-105'
                      : i < (['extracting', 'analyzing'].indexOf(status) + 1)
                      ? 'border-green-500/30 bg-green-500/10 text-green-400'
                      : 'border-border text-muted-foreground',
                  )}>
                    <span>{step.icon}</span>
                    <span>{step.label}</span>
                    {step.active && <Loader2 size={12} className="animate-spin ml-1" />}
                    {!step.active && i < (['extracting', 'analyzing'].indexOf(status) + 1) && (
                      <CheckCircle size={12} className="text-green-400 ml-1" />
                    )}
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

              {/* US-EI-004: Executive Brief Card */}
              {selectedDoc.executiveBrief && (
                <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <Brain size={14} className="text-blue-500" />
                      </div>
                      <span className="text-sm font-bold text-blue-500">Executive Brief</span>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedDoc.executiveBrief!);
                        // TODO: Mostrar toast "Copiado"
                      }}
                      className="px-3 py-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 transition-colors flex items-center gap-1.5 text-xs font-medium text-blue-600"
                      title="Copiar al portapapeles"
                    >
                      <CheckCircle size={12} />
                      Copiar
                    </button>
                  </div>
                  <div className="text-sm text-foreground leading-relaxed">
                    {selectedDoc.executiveBrief}
                  </div>
                  <div className="mt-3 pt-3 border-t border-blue-500/15 flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span>≈ {selectedDoc.executiveBrief.split(' ').length} palabras</span>
                    <span>•</span>
                    <span>≈ {Math.ceil(selectedDoc.executiveBrief.split(' ').length / 200)} min lectura</span>
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

              {/* US-EI-009: Benchmarks comparison */}
              {selectedDoc.benchmarks && selectedDoc.benchmarks.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <TrendingUp className="text-primary" size={18} />
                    Comparación vs Benchmarks
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedDoc.benchmarks.map((bm, i) => (
                      <BenchmarkCard key={i} {...bm} />
                    ))}
                  </div>
                </div>
              )}

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

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
                >
                  <Upload size={15} />
                  Analizar otro documento
                </button>
                <button
                  onClick={() => {
                    if (!selectedDoc) return;
                    import('@/lib/exportPDF').then(({ exportToPDF }) => {
                      exportToPDF({
                        fileName: selectedDoc.fileName,
                        fileType: selectedDoc.fileType,
                        clientName: clientName,
                        executiveBrief: selectedDoc.executiveBrief,
                        analysis: selectedDoc.analysis,
                        benchmarks: selectedDoc.benchmarks,
                        sources: selectedDoc.sources,
                        createdAt: selectedDoc.createdAt || new Date().toISOString(),
                      });
                    });
                  }}
                  className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <Download size={15} />
                  Exportar PDF
                </button>
                <button
                  onClick={async () => {
                    if (!selectedDoc?.id) return;
                    const shareUrl = `${window.location.origin}/share/${selectedDoc.id}`;
                    try {
                      await navigator.clipboard.writeText(shareUrl);
                      alert('✅ Link copiado al portapapeles\n\nPuedes compartir este análisis con cualquier persona.');
                    } catch (err) {
                      prompt('Copia este link:', shareUrl);
                    }
                  }}
                  disabled={!selectedDoc?.id}
                  className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <MessageCircle size={15} />
                  Compartir
                </button>
                <button
                  onClick={() => { setSelectedDoc(null); setStatus('idle'); }}
                  className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <X size={15} />
                  Limpiar
                </button>
              </div>

              {/* US-EI-013: Comments section */}
              {selectedDoc.id && (
                <CommentSection
                  docId={selectedDoc.id}
                  comments={selectedDoc.comments}
                  currentUser={clientConfig?.uploaded_by || 'CEO'}
                  onCommentAdded={(newComments) => {
                    setSelectedDoc({ ...selectedDoc, comments: newComments });
                    setDocs(prev => prev.map(d => d.id === selectedDoc.id ? { ...d, comments: newComments } : d));
                  }}
                />
              )}

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
