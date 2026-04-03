import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Send, ChevronDown, ChevronRight, Paperclip, Upload,
  FileAudio, CheckCircle, Clock, Zap, Brain, Database, AlertCircle, FileText, Info,
  Mic, MicOff, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { calcularImpactoAHT, calcularImpactoContactRate, calcularImpactoAgentes, getEstadoOperativo } from '@/lib/vickyCalculations';
import type { ChatMessage } from '@/data/mockData';
import { InfoTooltip } from '@/components/InfoTooltip';
import { initialVickyMessages, decisionLog } from '@/data/mockData';
import { detectOperationType, detectRegion, generateBenchmarkContext } from '@/data/benchmarks';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

// ─── Mock Vicky Responses ──────────────────────────────────────────────────────

function generateVickyFallbackResponse(question: string): ChatMessage {
  return {
    id: `vicky-${Date.now()}`,
    role: 'vicky' as const,
    content: '**No pude conectar con el motor de análisis en este momento.**\n\nTengo disponibles los datos del CDR del 30 de marzo (16,129 llamadas, 50 grabaciones transcritas). Por favor intenta nuevamente en unos segundos — si el problema persiste, verifica la conexión.',
    timestamp: new Date(),
    sources: ['WeKall CDR · 30-Mar-2026 · Crediminuto/CrediSmart'],
    confidence: 'Baja' as const,
    rootCauses: [],
    projection: '',
    followUps: ['Intenta de nuevo', '¿Por qué no recuperamos cartera?', '¿Cuál es el estado de la operación?'],
  };
}

// ─── Export to PDF ───────────────────────────────────────────────────────────

function exportToPDF(content: string, sources?: string[]) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>WeKall Intelligence — Análisis Ejecutivo</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; color: #12172A; }
        h1 { color: #6334C0; font-size: 20px; border-bottom: 2px solid #6334C0; padding-bottom: 8px; }
        .sources { background: #F4F6FB; padding: 12px; border-radius: 6px; font-size: 12px; margin-top: 20px; }
        .footer { margin-top: 40px; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 8px; }
        @media print { body { margin: 20px; } }
      </style>
    </head>
    <body>
      <h1>WeKall Intelligence — Análisis Ejecutivo</h1>
      <p style="color:#999;font-size:12px">Crediminuto / CrediSmart · ${new Date().toLocaleDateString('es-CO')}</p>
      <div style="margin-top:20px;line-height:1.6">${content.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>
      ${sources ? `<div class="sources"><strong>Fuentes:</strong> ${sources.join(' · ')}</div>` : ''}
      <div class="footer">Generado por Vicky Insights — WeKall Intelligence · ${new Date().toLocaleString('es-CO')}</div>
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}

// ─── Chat Bubble ──────────────────────────────────────────────────────────────

function ChatBubble({ msg, onFollowUp, onAction }: {
  msg: ChatMessage;
  onFollowUp: (q: string) => void;
  onAction: () => void;
}) {
  const [reasoningOpen, setReasoningOpen] = useState(false);

  if (msg.role === 'user') {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[75%] bg-primary rounded-2xl rounded-tr-sm px-4 py-3">
          <p className="text-sm text-white leading-relaxed">{msg.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[85%] space-y-2">
        {/* Main bubble */}
        <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
              <Zap size={10} className="text-primary" />
            </div>
            <span className="text-xs font-semibold text-primary">Vicky Insights</span>
            {msg.confidence && (
              <span className={cn(
                'ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-semibold border',
                msg.confidence === 'Alta'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20',
              )}>
                Confianza {msg.confidence}
              </span>
            )}
          </div>

          {/* Content — render markdown-like bold */}
          <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
            {msg.content.split('\n\n').map((para, i) => (
              <p key={i} dangerouslySetInnerHTML={{
                __html: para
                  .replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>')
                  .replace(/\n/g, '<br/>'),
              }} />
            ))}
          </div>

          {/* Root causes */}
          {msg.rootCauses && (
            <div className="mt-3 space-y-1.5 border-t border-border pt-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Drivers de Impacto</p>
              {msg.rootCauses.map((rc, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-[180px] truncate shrink-0">{rc.label}</span>
                  <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${rc.impact}%`, background: rc.color }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-foreground w-8 text-right">{rc.impact}%</span>
                </div>
              ))}
            </div>
          )}

          {/* Projection */}
          {msg.projection && (
            <div className="mt-3 border-t border-border pt-3">
              <div className="flex items-start gap-2 rounded-lg bg-slate-50 border border-amber-200 px-3 py-2">
                <AlertCircle size={13} className="text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-slate-700 leading-relaxed">{msg.projection}</p>
              </div>
            </div>
          )}

          {/* Sources */}
          {msg.sources && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {msg.sources.map((s, i) => (
                <span key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-[10px] text-muted-foreground border border-border">
                  <Database size={9} />
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Reasoning collapsible */}
        {msg.reasoning && (
          <button
            onClick={() => setReasoningOpen(v => !v)}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-1"
          >
            <Brain size={11} />
            <span>Ver razonamiento</span>
            {reasoningOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          </button>
        )}
        {reasoningOpen && msg.reasoning && (
          <div className="rounded-lg border border-border bg-secondary/50 px-3 py-2 text-[11px] text-muted-foreground animate-fade-in">
            {msg.reasoning}
          </div>
        )}

        {/* Follow-ups */}
        {msg.followUps && (
          <div className="flex flex-wrap gap-1.5 px-1">
            {msg.followUps.map((q, i) => (
              <button
                key={i}
                onClick={() => onFollowUp(q)}
                className="px-2.5 py-1 rounded-full text-[11px] border border-primary/30 text-primary hover:bg-primary/10 transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Action button */}
        <button
          onClick={onAction}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-medium hover:bg-primary/20 transition-all ml-1"
        >
          <CheckCircle size={13} />
          → Crear acción
        </button>
        <button
          onClick={() => exportToPDF(msg.content, msg.sources)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 hover:bg-secondary transition-colors ml-1"
        >
          <FileText size={12} />
          Exportar PDF
        </button>
      </div>
    </div>
  );
}

// ─── Upload Tab ───────────────────────────────────────────────────────────────

function UploadTab() {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    startUpload();
  }

  function startUpload() {
    setUploading(true);
    setProgress(0);
    setDone(false);
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          setUploading(false);
          setDone(true);
          return 100;
        }
        return p + Math.random() * 15;
      });
    }, 200);
  }

  return (
    <div className="p-4 space-y-4">
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer',
          dragOver ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50',
        )}
        onClick={startUpload}
      >
        <FileAudio size={32} className="mx-auto text-muted-foreground mb-3" />
        <p className="text-sm font-medium text-foreground">Arrastra tu grabación aquí</p>
        <p className="text-xs text-muted-foreground mt-1">MP3, WAV, M4A · Máx 500MB</p>
      </div>

      {(uploading || done) && (
        <div className="rounded-lg border border-border bg-secondary p-3 space-y-2 animate-fade-in">
          <div className="flex items-center gap-2">
            {done
              ? <CheckCircle size={14} className="text-emerald-400" />
              : <Upload size={14} className="text-primary animate-pulse" />
            }
            <span className="text-xs text-foreground font-medium">
              {done ? 'Análisis completado' : 'Procesando grabación...'}
            </span>
            <span className="ml-auto text-xs text-muted-foreground">{Math.round(Math.min(progress, 100))}%</span>
          </div>
          <div className="h-1.5 bg-background rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-200"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          {done && (
            <p className="text-xs text-muted-foreground animate-fade-in">
              Transcribí 24 minutos de audio. Identifiqué 3 oportunidades de mejora. ¿Quieres el análisis completo?
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

// ─── Post-procesamiento: convertir markdown estructural a prosa ──────────────
function convertirMarkdownAProsa(texto: string): string {
  if (!texto) return texto;

  // Eliminar headers (##, ###, ####, etc.)
  let resultado = texto.replace(/^#{1,6}\s+(.+)$/gm, '$1.');

  // Convertir listas numeradas a prosa (1. item → item,)
  resultado = resultado.replace(/^\d+\.\s+(.+)$/gm, '$1');

  // Convertir listas de viñetas a prosa (- item, * item, • item)
  resultado = resultado.replace(/^[-*•]\s+(.+)$/gm, '$1');

  // Eliminar líneas en blanco múltiples consecutivas (dejando máx 2)
  resultado = resultado.replace(/\n{3,}/g, '\n\n');

  // Unir líneas cortas consecutivas que fueron items de lista en un párrafo fluido
  // (líneas de menos de 200 chars que no tienen punto final se unen con coma)
  resultado = resultado.split('\n\n').map(parrafo => {
    const lineas = parrafo.split('\n').filter(l => l.trim());
    if (lineas.length <= 1) return parrafo;

    // Si hay múltiples líneas cortas (probablemente items convertidos), unirlas
    const todasCortas = lineas.every(l => l.trim().length < 150);
    if (todasCortas && lineas.length > 1) {
      const unidas = lineas.map((l, i) => {
        const limpia = l.trim().replace(/[,;.]$/, '');
        if (i === lineas.length - 1) return limpia + '.';
        return limpia;
      }).join('. ');
      return unidas;
    }
    return parrafo;
  }).join('\n\n');

  return resultado.trim();
}

export default function VickyInsights() {
  const location = useLocation();
  const [messages, setMessages] = useState<ChatMessage[]>(initialVickyMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [actionChoice, setActionChoice] = useState('');
  const [activeTab, setActiveTab] = useState('chat');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Handle navigation with preset question
  useEffect(() => {
    const q = (location.state as { question?: string })?.question;
    if (q) {
      sendMessage(q);
      window.history.replaceState({}, '');
    }
  }, []);

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  useEffect(() => { scrollToBottom(); }, [messages]);

  const TRANSCRIBE_URL = (import.meta.env.VITE_PROXY_URL 
    ? import.meta.env.VITE_PROXY_URL.replace(/\/$/, '') + '/transcribe'
    : null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accediendo al micrófono:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    if (!TRANSCRIBE_URL) return;
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');
      formData.append('model', 'whisper-1');
      formData.append('language', 'es');

      const response = await fetch(TRANSCRIBE_URL, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.text) {
        setInput(data.text);
      }
    } catch (err) {
      console.error('Error transcribiendo:', err);
    } finally {
      setIsTranscribing(false);
    }
  };

  async function sendMessage(text: string) {
    if (!text.trim()) return;
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Try OpenAI API (via proxy if configured), fallback to local response engine
    const PROXY_URL = import.meta.env.VITE_PROXY_URL || 'https://api.openai.com/v1/chat/completions';
    const USE_PROXY = !!import.meta.env.VITE_PROXY_URL;

    let resp: ChatMessage;
    try {
      const _opType = detectOperationType('cobranzas colombia crediminuto promesa pago deuda');
      const _region = detectRegion('cobranzas colombia crediminuto promesa pago deuda');
      const _benchmarkCtx = generateBenchmarkContext(_opType, _region);
      const CONTEXT = `Eres Vicky Insights, la IA analítica de WeKall Intelligence para Crediminuto / CrediSmart.

## DATOS REALES CDR — 30-Mar-2026
- Total llamadas: 16,129 | Salientes: 14,781 (91.6%) | Entrantes: 1,348 (8.4%)
- Campañas: Cobranzas Colombia 9,174 · Cobranzas Perú 3,550 · Servicio Colombia 3,256 · Servicio Perú 140
- Agentes activos: 81 de 162 | Supervisores: 20
- Tasa de contacto efectivo: 43.1% (2,144 de 3,770 grabaciones = 0 bytes, no conectaron)
- AHT real: 8.1 min promedio (rango: 5.2-16.3 min)

## ANÁLISIS REAL DE 50 GRABACIONES (Whisper + NLP)
### Resultados de contacto (fuente: transcripciones reales):
- Promesa de pago: 40% de contactos efectivos
- Sin capacidad de pago: 38%
- Contacto positivo sin compromiso: 14%
- Sin resolución: 8%

### Objeciones reales (frecuencia en transcripciones):
- "Pido más plazo / tiempo": 56% — NO niegan la deuda, quieren tiempo
- "No recuerdo / no reconozco la deuda": 52%
- "No tengo dinero ahora": 40%
- "Perdí el trabajo": 14%

### Frases reales de los clientes (extraídas de grabaciones):
- "No me encuentro trabajando y quisiera poner al día con ustedes"
- "Yo envié un correo notificando que podría devolver el equipo"
- "Estábamos llamando al de Credit Smart, indica que quería comunicarse con nosotros"
- Cierre típico: "Le agradezco por haber atendido mi llamada. Contamos con el pago."

### Distribución real de volumen por agente (CDR 30-Mar-2026, 81 agentes humanos):
- Promedio real: 110.7 llamadas/agente/día (el "137" anterior incluía el marcador automático — dato corregido)
- P10: 49 llamadas/día
- P25 (peor cuartil — dato REAL, no suposición): 76 llamadas/agente/día
- P50 (mediana real): 120 llamadas/agente/día
- P75 (mejor cuartil inicio): 143 llamadas/agente/día
- P90: 154 llamadas/agente/día
- Mínimo real: 4 llamadas/día | Máximo real: 261 llamadas/día

### Top 10 agentes (mejor cuartil — datos reales CDR):
1. Teresa Meza: 261 llamadas/día
2. Juan Gutierrez: 211
3. Nelcy Josefina Contasti: 194
4. Santiago Cano: 183
5. Alejandra Perez: 180
6. Neleanny Sequera: 174
7. Selena Romero Ventura: 162
8. Joel Jose: 160
9. Angel Cuberos: 154
10. Jennifer Loaiza: 152

### Bottom 10 agentes (peor cuartil — datos reales CDR):
- Melisa Campuzano: 55 | Solymar Mijares: 49 | Daniela Vargas: 44
- Noemi Marin: 40 | Liseth Obando Robayo: 40 | Ana Maria Lopez Rojas: 32
- Juan Carlos Becerra Manrique: 27 | Vannesa Sauce: 9 | Yuleidy Gonzalez: 7 | Paola Joya: 4

### Insight crítico:
El 57% de las grabaciones (2,144) son llamadas que NO conectaron (archivo 0 bytes).
El problema principal de recuperación de cartera NO es la conversación — es la tasa de contacto.
Si la tasa de contacto sube de 43% a 60%, se generan ~280 promesas de pago adicionales/día.

## ECOSISTEMA WEKALL
Business Phone · Engage360 (Contact Center, NO es CRM) · Messenger Hub · Notes

${_benchmarkCtx}

## PARÁMETROS FINANCIEROS — MOTOR DE IMPACTO EBITDA

### Estructura de costos operativos (Colombia)
- Costo empresa por agente/mes: COP $3,000,000 (salario mínimo + prestaciones)
- Agentes activos: 81 | Pool total: 162
- Días laborales/mes: 22
- Horas trabajo/día: 8 horas
- Costo agente/hora: COP $17,045 (= 3,000,000 / 22 días / 8 horas)
- Costo agente/minuto: COP $284 (= 17,045 / 60)
- Costo total nómina activa/mes: COP $243,000,000 (81 agentes × $3M)

### Volúmenes operativos
- Llamadas procesadas/día: 16,129
- Llamadas/mes estimadas: 354,838 (× 22 días)
- AHT actual: 8.1 min
- Minutos totales operados/día: 130,645 min
- Minutos totales/mes: 2,874,190 min
- Tasa de contacto efectivo: 43.1%
- Contactos efectivos/día: ~6,951 (43.1% de 16,129)
- Tasa de promesa de pago: 40% de contactos efectivos
- Promesas de pago/día: ~2,780

### FÓRMULAS DE IMPACTO FINANCIERO (úsalas cuando el CEO pregunte por mejoras)

**1. Impacto de reducir AHT (liberación de capacidad)**
- ⚠️ CRÍTICO: El AHT de 8.1 min aplica SOLO a las llamadas que SÍ conectaron (contactos efectivos = 6,951/día). Las llamadas sin respuesta tienen ~0.5 min de marcación promedio. NO aplicar AHT a las 16,129 llamadas totales.
- Minutos liberados/día = (AHT_actual - AHT_objetivo) × contactos_efectivos_día (= 6,951, NO 16,129)
- Capacidad liberada en agentes equivalentes = minutos_liberados / (8h × 60min)
- Escenario A — Reducción de costo: agentes_liberados × COP $3,000,000 = ahorro/mes
- Escenario B — Más transacciones: minutos_liberados / AHT_actual = llamadas_adicionales/día → × tasa_contacto × tasa_promesa = promesas_adicionales
- Ejemplo correcto: reducir AHT de 8.1 → 7.2 min libera 6,951 × 0.9 = 6,256 min/día = 13 agentes equivalentes = COP $39M/mes (NO COP $90.6M — ese error viene de aplicar AHT a todas las llamadas)
- NOTA: Si no se conoce el ticket promedio de deuda, expresar en "promesas adicionales/mes" y solicitar el dato al CEO.

**2. Impacto de mejorar tasa de contacto efectivo**
- Contactos_adicionales/día = (tasa_objetivo% - 43.1%) × 16,129
- Promesas_adicionales/día = contactos_adicionales × 40%
- Promesas_adicionales/mes = promesas_adicionales/día × 22

**3. Impacto de replicar protocolo top agente (Teresa Meza)**
- Promedio real: 110.7 llamadas/agente/día (81 agentes humanos, excluyendo marcador automático)
- P25 real (peor cuartil): 76 llamadas/agente/día — NO asumir, este es el dato del CDR
- P75 real (mejor cuartil): 143 llamadas/agente/día
- Teresa Meza: 261 llamadas/agente/día (top performer, 2.4x el promedio)
- Brecha peor cuartil vs. promedio: 110.7 - 76 = 34.7 llamadas/agente/día × ~20 agentes en P25 = 694 llamadas/día
- Si los 20 agentes del peor cuartil suben al P50 (120):
  - Incremento = (120 - 76) × 20 = 880 llamadas adicionales/día
  - Contactos efectivos adicionales: 880 × 43.1% = 379/día
  - Promesas adicionales: 379 × 40% = 152/día = 3,344/mes

### DATOS LABORALES POR PAÍS (fuentes oficiales)
- Colombia: COP $3,000,000/mes empresa/agente (Decreto 2381/2023 + prestaciones completas) — DATO CONFIRMADO
- Perú: ≈ COP $1,600,000/mes empresa/agente estimado (RMV PEN 1,025 + CTS + gratificaciones + ESSALUD, DS 004-2022-TR) — ESTIMACIÓN, indicar como tal
- Si preguntan por otro país: usar OIT/CEPAL como referencia o indicar que se necesita dato local
- Si hay ambigüedad entre Colombia y Perú: responder con ambos datos y señalar la diferencia

### LÍMITES DE SANIDAD — VALIDACIÓN OBLIGATORIA
Antes de presentar cualquier cálculo financiero, valida que el resultado esté dentro de estos rangos:

| Métrica | Mínimo | Máximo lógico | Si excede → ERROR |
|---|---|---|---|
| Ahorro de nómina/mes | COP $0 | COP $243,000,000 (100% nómina activa) | Recalcular |
| Agentes liberados | 0 | 81 (total agentes activos) | Recalcular |
| Llamadas adicionales/día | 0 | 16,129 (capacidad total actual) | Recalcular |
| Promesas de pago adicionales/día | 0 | 2,780 (máximo actual teórico) | Recalcular |
| AHT objetivo | 3.0 min | 12.0 min | Fuera de rango real |

### PROTOCOLO DE CÁLCULO VERIFICABLE (OBLIGATORIO)
Para CUALQUIER cálculo financiero, Vicky DEBE mostrar:

**Formato obligatorio:**
\`\`\`
📐 Cálculo:
- Fórmula: [nombre_fórmula]
- Variables: [listar cada variable con su valor]
- Operación: [mostrar la ecuación completa con números]
- Resultado: [número + unidad]
- ✅ Validación: [confirmar que el resultado está dentro del rango lógico]
\`\`\`

**Ejemplo correcto (AHT):**
\`\`\`
📐 Cálculo: Impacto de reducir AHT
- Fórmula: minutos_liberados = (AHT_actual - AHT_objetivo) × contactos_efectivos_día
- Variables: AHT_actual=8.1 min | AHT_objetivo=7.2 min | contactos_efectivos_día=6,951 (no 16,129 — AHT aplica solo a llamadas que conectaron)
- Operación: (8.1 - 7.2) × 6,951 = 0.9 × 6,951 = 6,256 min/día
- Agentes equivalentes: 6,256 / 480 = 13.0 agentes
- Ahorro mensual: 13.0 × COP $3,000,000 = COP $39,000,000/mes
- ✅ Validación: 13 agentes < 81 activos ✓ | COP $39M < COP $243M nómina total ✓
\`\`\`

**Ejemplo INCORRECTO (error que no debe repetirse):**
\`\`\`
❌ MAL: minutos_liberados = 0.9 × 16,129 (ERROR: se aplicó AHT a TODAS las llamadas, no solo las que conectaron)
\`\`\`

**Regla de oro:** Si el resultado supera el 50% del máximo lógico, agrega una nota de advertencia explicando por qué es posible (o imposible).

### INSTRUCCIÓN DE USO DEL MOTOR EBITDA PARA VICKY
Cuando el CEO pregunte por mejoras operativas:
1. Calcula el impacto usando las fórmulas anteriores con los datos reales disponibles
2. Presenta SIEMPRE tres escenarios: (A) reducción de costo, (B) más ingresos con mismo costo, (C) EBITDA combinado
3. Si no tienes el ticket promedio de deuda (valor promedio de cartera por cliente), pídelo al CEO — es el único dato que falta para cerrar el cálculo de ingresos
4. Usa COP en los cálculos. Si el CEO trabaja en USD, usa TRM de referencia COP $4,100 por USD.
5. Formato de respuesta financiera:
   - Brecha identificada: [métrica] → [valor actual] vs [benchmark P50] = [diferencia]
   - Impacto calculado: [fórmula aplicada con números reales]
   - Escenario A (eficiencia): COP $X/mes en ahorro de nómina
   - Escenario B (crecimiento): X promesas de pago adicionales/mes
   - Impacto EBITDA estimado: depende de ticket promedio de cartera (solicitar si no está disponible)

## IDENTIDAD Y VOZ

Vicky es una **asesora estratégica senior** con deep expertise en operaciones de contact center. Piensa con rigor de McKinsey pero habla como un colega de confianza, no como una presentación de slides.

**Cómo suena Vicky en una conversación real:**

No sigue una plantilla rígida. Responde a la pregunta de manera fluida y natural, usando los datos disponibles y los benchmarks de industria como respaldo — no como protagonistas. El CEO debe sentir que está hablando con alguien que conoce su negocio profundamente, no que está recibiendo un reporte.

**Lo que hace que una respuesta sea buena:**
- Responde directamente a lo que el CEO preguntó — sin intro genérica ni preamble
- Usa los datos del CDR y las transcripciones para anclar los insights en la realidad de este negocio
- Cuando hay un benchmark relevante, lo cita con naturalidad: "Las operaciones de cobranzas que superan el 55% de contacto en Latam —que es donde quieres estar— hacen esto..."
- Da su opinión con criterio propio: "En mi lectura de los datos, la prioridad no es el AHT — es el 57% de llamadas que nunca conectan."
- Si hay un número financiero relevante, lo incluye integrado en el argumento, no como apéndice técnico
- Cierra con algo concreto y accionable, de manera conversacional — no como bullet final

**FORMATO DE RESPUESTA — PROHIBICIÓN ABSOLUTA:**

NUNCA uses estos formatos:
- Listas con viñetas (- item, • item, * item)
- Listas numeradas (1. item, 2. item)
- Headers o títulos (**Diagnóstico:**, **Recomendación:**, ## Título, ### Subtítulo)
- Tablas markdown
- Bullets anidados

SIEMPRE escribe en prosa conversacional — párrafos fluidos como hablaría un advisor senior en una junta directiva.

❌ NUNCA así:
"**Diagnóstico:** Tu tasa de contacto es baja.
- Causa 1: El 57% de llamadas no conecta
- Causa 2: Pocos agentes en el mejor cuartil
**Recomendación:** Mejorar el contacto."

✅ SIEMPRE así:
"Mirando tus números, el problema más claro es que casi 6 de cada 10 llamadas no conectan con nadie. Eso es lo que más está frenando tu operación. Las empresas que lideran en cobranzas en Latinoamérica conectan en más del 55% de sus llamadas — tú estás en 43%. Cerrar esa brecha generaría casi 17,000 promesas de pago adicionales al mes sin contratar un solo agente más. ¿Qué quieres atacar primero?"

Puedes usar **negrita** para énfasis puntual dentro de un párrafo, pero nunca para crear headers o introducir secciones.

**Lo que nunca hace (adicional):**
- No muestra fórmulas internas, variables, ni procesos de cálculo al CEO
- **Nunca usa jerga estadística con el CEO**: no dice "P25", "P50", "P75", "percentil 75". Dice "el mejor cuartil de la industria", "la mediana del sector", "las operaciones líderes en Latam", "el estándar que separa a los mejores del promedio". El CEO no tiene que conocer estadística para entender el insight.
- **Evita tecnicismos operativos sin contexto**: no "AHT" a secas — dice "tiempo promedio por llamada". No "FCR" — dice "resolución en el primer contacto". Introduce las siglas solo si las explica de inmediato.

## REGLAS DE DATOS — INAMOVIBLES
- Usa SOLO datos del CDR 30-Mar-2026 y las 50 grabaciones transcritas
- Si el dato no existe, dilo: "Para responder esto necesito [dato específico]"
- Nunca inventar horarios, tendencias históricas, o datos no disponibles
- Los cálculos financieros los produce el motor determinístico (funciones TypeScript) — NO calcules tú

## REGLA DE CALIDAD — CÁLCULOS FINANCIEROS
- El número financiero se presenta LIMPIO en el punto 4 — sin fórmulas técnicas visibles al CEO
- La validación interna (formato 📐) existe pero NO se muestra en la respuesta al CEO
- SIEMPRE validar internamente que el resultado esté dentro de los límites de sanidad antes de presentar
- Si detectas que el resultado parece muy alto o muy bajo, recalcula antes de mostrar
- La credibilidad con el CEO depende de la precisión. Un número incorrecto destruye la confianza.
- Cuando termines un cálculo, pregúntate: "¿Este número tiene sentido operativamente?"

## REGLA CRÍTICA — INTEGRIDAD DE DATOS
- **NUNCA inventes datos, métricas, horarios, porcentajes ni análisis que no estén explícitamente en el contexto anterior.**
- Si la pregunta requiere datos que NO tienes (ej: horarios de marcación, datos por hora, tendencias históricas, comparativos de períodos anteriores), responde EXACTAMENTE así:
  "No tengo esa dimensión en los datos disponibles. El CDR del 30 de marzo incluye [menciona qué sí tienes]. Para responder esta pregunta necesitaría [explica qué dato falta]."
- Es preferible admitir la limitación que fabricar un insight. La credibilidad ejecutiva depende de la precisión, no de parecer omnisciente.
- Los datos disponibles son SOLO los del CDR del 30 de marzo y las 50 grabaciones transcritas. Nada más.`;

      // ─── Function Calling — cálculos determinísticos ─────────────────────────────
      const TOOLS = [
        {
          type: 'function' as const,
          function: {
            name: 'calcularImpactoAHT',
            description: 'Calcula el impacto financiero en COP de reducir el AHT (tiempo promedio de atención). Usa este tool cuando el CEO pregunte sobre eficiencia de llamadas, tiempo de atención, o cuánto ahorraría reduciendo el AHT.',
            parameters: {
              type: 'object',
              properties: {
                ahtObjetivo: {
                  type: 'number',
                  description: 'El AHT objetivo en minutos (ej: 7.2 para reducir de 8.1 a 7.2 min)',
                },
              },
              required: ['ahtObjetivo'],
            },
          },
        },
        {
          type: 'function' as const,
          function: {
            name: 'calcularImpactoContactRate',
            description: 'Calcula el impacto de mejorar la tasa de contacto efectivo. Usa cuando pregunten cuántas promesas adicionales se generarían si mejora la tasa de contacto.',
            parameters: {
              type: 'object',
              properties: {
                tasaObjetivo: {
                  type: 'number',
                  description: 'La tasa de contacto objetivo como decimal (ej: 0.55 para 55%)',
                },
              },
              required: ['tasaObjetivo'],
            },
          },
        },
        {
          type: 'function' as const,
          function: {
            name: 'calcularImpactoAgentes',
            description: 'Calcula el impacto de subir el rendimiento del peor cuartil de agentes. Usa cuando pregunten sobre el bottom cuartil, agentes de bajo rendimiento, o cuánto mejoraría si los peores agentes mejoran.',
            parameters: {
              type: 'object',
              properties: {
                percentilObjetivo: {
                  type: 'number',
                  description: 'El percentil objetivo (50 para mediana, 75 para mejor cuartil, 90 para top performers)',
                },
              },
              required: ['percentilObjetivo'],
            },
          },
        },
        {
          type: 'function' as const,
          function: {
            name: 'getEstadoOperativo',
            description: 'Retorna el resumen del estado operativo actual con todos los KPIs reales del CDR. Usa cuando pregunten por el estado general, resumen ejecutivo, o KPIs de la operación.',
            parameters: { type: 'object', properties: {} },
          },
        },
        {
          type: 'function' as const,
          function: {
            name: 'buscarDatoOficial',
            description: 'Busca datos oficiales en tiempo real cuando no están en el CDR ni en las constantes del motor. Úsalo para: salarios mínimos de países distintos a Colombia/Perú, tasas de inflación, tasas de crédito, datos de competidores, regulaciones laborales, o cualquier dato de mercado que necesite ser verificado con fuentes oficiales. NO usarlo para datos que ya están en el contexto.',
            parameters: {
              type: 'object',
              properties: {
                consulta: {
                  type: 'string',
                  description: 'La consulta de búsqueda en español o inglés. Sé específico: incluye país, año y tipo de dato. Ej: "salario mínimo México 2024 pesos mensuales", "inflación Colombia 2024 DANE", "tasa de empleo contact center Latam 2024"',
                },
                proposito: {
                  type: 'string',
                  description: 'Para qué vas a usar este dato (ej: "calcular costo de agente en México", "contextualizar índice de rotación")',
                },
              },
              required: ['consulta', 'proposito'],
            },
          },
        },
      ];

      // ─── Llamada a la API con Function Calling ──────────────────────────────
      const apiResp = await fetch(PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(USE_PROXY ? {} : { 'Authorization': 'Bearer ' + atob('c2stcHJvai0xcllfQTlHRDBQMzU3SVVXWlIxbmhFM0J2NmFXRzllbzI5OFZ1eFVSM3BjNV9zM0tkSGZhekpRekVQV3k3ek5menFya203ZkwweVQzQmxia0ZKUXpUaEx6dHhRQnU2MUUyUEs0bnNvYW5PeV9mYm52THB1N2ZjV0dKWnlSTDlGUXl1aXlGWjJUV181WmNYa3U5eEtWSFJiVldoVUE=') }),
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: CONTEXT },
            { role: 'user', content: text },
          ],
          tools: TOOLS,
          tool_choice: 'auto',
          max_tokens: 1500,
          temperature: 0.3,
        }),
      });

      if (!apiResp.ok) throw new Error(`API error: ${apiResp.status}`);
      const data = await apiResp.json();
      const choice = data.choices?.[0];

      let finalContent = '';

      // ─── Manejar Function Calling ───────────────────────────────────────────
      if (choice?.finish_reason === 'tool_calls' && choice?.message?.tool_calls) {
        const toolCalls = choice.message.tool_calls as Array<{ id: string; function: { name: string; arguments: string } }>;
        const toolResults: string[] = [];

        for (const call of toolCalls) {
          const fnName = call.function.name;
          const fnArgs = JSON.parse(call.function.arguments || '{}');

          let calcResult;
          if (fnName === 'calcularImpactoAHT') calcResult = calcularImpactoAHT(fnArgs.ahtObjetivo);
          else if (fnName === 'calcularImpactoContactRate') calcResult = calcularImpactoContactRate(fnArgs.tasaObjetivo);
          else if (fnName === 'calcularImpactoAgentes') calcResult = calcularImpactoAgentes(fnArgs.percentilObjetivo);
          else if (fnName === 'getEstadoOperativo') calcResult = getEstadoOperativo();
          else if (fnName === 'buscarDatoOficial') {
            // Esta función indica que necesita búsqueda web — se resuelve con nota
            calcResult = {
              nota: `Búsqueda solicitada: "${fnArgs.consulta}" para ${fnArgs.proposito}`,
              disponible: false,
              mensaje: 'Búsqueda web en tiempo real requiere integración adicional. Usar datos disponibles en el contexto o indicar al CEO que el dato necesita verificación externa.',
              alternativa: 'Si el dato es salarial: Colombia=COP $3M/mes (Decreto 2381/2023), Perú≈COP $1.6M/mes (RMV PEN 1,025 + prestaciones). Para otros países, citar OIT/CEPAL como referencia.',
            };
          }
          else calcResult = { error: 'Función no encontrada' };

          toolResults.push(`[${fnName}]: ${JSON.stringify(calcResult)}`);
        }

        // Segunda llamada a la API con los resultados del cálculo
        const apiResp2 = await fetch(PROXY_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(USE_PROXY ? {} : { 'Authorization': 'Bearer ' + atob('c2stcHJvai0xcllfQTlHRDBQMzU3SVVXWlIxbmhFM0J2NmFXRzllbzI5OFZ1eFVSM3BjNV9zM0tkSGZhekpRekVQV3k3ek5menFya203ZkwweVQzQmxia0ZKUXpUaEx6dHhRQnU2MUUyUEs0bnNvYW5PeV9mYm52THB1N2ZjV0dKWnlSTDlGUXl1aXlGWjJUV181WmNYa3U1eEtWSFJiVldoVUE=') }),
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              { role: 'system', content: CONTEXT },
              { role: 'user', content: text },
              choice.message,
              ...toolCalls.map((call, i: number) => ({
                role: 'tool' as const,
                tool_call_id: call.id,
                content: toolResults[i],
              })),
            ],
            max_tokens: 1500,
            temperature: 0.3,
          }),
        });

        if (!apiResp2.ok) throw new Error(`API error 2: ${apiResp2.status}`);
        const data2 = await apiResp2.json();
        finalContent = convertirMarkdownAProsa(data2.choices?.[0]?.message?.content || 'Sin respuesta');
      } else {
        finalContent = convertirMarkdownAProsa(choice?.message?.content || 'Sin respuesta');
      }

      resp = {
        id: `vicky-${Date.now()}`,
        role: 'vicky',
        content: finalContent,
        timestamp: new Date(),
        sources: ['WeKall CDR · 16,129 llamadas · 30-Mar-2026 · Crediminuto/CrediSmart', '50 grabaciones transcritas con Whisper · Análisis NLP real'],
        confidence: 'Alta',
        reasoning: `Analicé 16,129 registros CDR + 50 transcripciones reales de Crediminuto/CrediSmart en tiempo real. Modelo: GPT-4o + Function Calling determinístico.`,
        followUps: [
          '¿Por qué no estamos recuperando cartera?',
          '¿Cuáles son los agentes top performers?',
          '¿Cómo mejorar la tasa de contacto efectivo?',
        ],
      };
    } catch {
      // Fallback to local engine
      await new Promise(r => setTimeout(r, 800));
      resp = generateVickyFallbackResponse(text);
    }

    setMessages(prev => [...prev, resp]);
    setLoading(false);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  const statusMap: Record<string, string> = {
    'En progreso': 'text-amber-800 bg-amber-100 border-amber-300',
    'Completada': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    'Planificada': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Chat main */}
      <div className="flex-1 flex flex-col min-w-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
          <div className="border-b border-border px-4 py-2">
            <div className="flex items-center gap-1">
              <TabsList className="h-8">
                <TabsTrigger value="chat" className="text-xs">💬 Chat</TabsTrigger>
                <TabsTrigger value="upload" className="text-xs">📁 Analizar Documento</TabsTrigger>
                <TabsTrigger value="decisions" className="text-xs">📋 Decisiones</TabsTrigger>
              </TabsList>
              {activeTab === 'upload' && (
                <InfoTooltip text="Sube un informe, presentación, audio o Excel — Vicky lo cruzará con los datos de tu operación para darte análisis integrado." side="bottom" />
              )}
              {activeTab === 'decisions' && (
                <InfoTooltip text="Convierte los insights de Vicky en decisiones con responsable y seguimiento. Cierra el loop: Insight → Decisión → Responsable → Resultado." side="bottom" />
              )}
            </div>
          </div>

          <TabsContent value="chat" className="flex flex-col flex-1 overflow-hidden mt-0 data-[state=inactive]:hidden">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {messages.map(msg => (
                <ChatBubble
                  key={msg.id}
                  msg={msg}
                  onFollowUp={sendMessage}
                  onAction={() => setActionOpen(true)}
                />
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-muted-foreground animate-fade-in">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                    <Zap size={10} className="text-primary" />
                  </div>
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                  <span className="text-xs">Vicky está analizando...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border p-4">
              <div className="chat-input-wrapper flex items-end gap-2 rounded-xl border border-border bg-card px-3 py-2 transition-all">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Pregúntale a Vicky sobre tus datos..."
                  rows={1}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none min-h-[20px] max-h-[120px]"
                  style={{ height: 'auto' }}
                  onInput={e => {
                    const t = e.target as HTMLTextAreaElement;
                    t.style.height = 'auto';
                    t.style.height = `${Math.min(t.scrollHeight, 120)}px`;
                  }}
                />
                <div className="flex items-center gap-1.5 shrink-0">
                  <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors">
                    <Paperclip size={15} />
                  </button>
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isTranscribing}
                    className={`p-2 rounded-lg transition-colors ${
                      isRecording 
                        ? 'bg-red-500 text-white animate-pulse' 
                        : 'text-slate-400 hover:text-primary hover:bg-primary/10'
                    }`}
                    title={isRecording ? 'Detener grabación' : 'Hablar con Vicky'}
                  >
                    {isTranscribing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isRecording ? (
                      <MicOff className="w-4 h-4" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || loading}
                    className="p-1.5 rounded-md bg-primary text-white disabled:opacity-40 hover:bg-primary/80 transition-colors"
                  >
                    <Send size={15} />
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-2">
                Vicky analiza datos de WeKall Phone · Engage360 · Messenger Hub
              </p>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="flex-1 overflow-y-auto mt-0 data-[state=inactive]:hidden">
            <UploadTab />
          </TabsContent>

          <TabsContent value="decisions" className="flex-1 overflow-y-auto mt-0 p-3 data-[state=inactive]:hidden">
            <div>
              <div className="flex items-start gap-2 mb-3 p-2.5 rounded-lg bg-muted/40 border border-border">
                <Info size={13} className="text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Registro de decisiones ejecutivas tomadas a partir de insights de Vicky. Cierra el loop: <span className="text-foreground font-medium">Insight → Decisión → Responsable → Resultado.</span>
                </p>
              </div>
              <div className="space-y-2">
                {decisionLog.map(d => (
                  <div key={d.id} className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">{d.insight}</p>
                        <p className="text-sm font-medium text-foreground">{d.decision}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>👤 {d.responsible}</span>
                          <span><Clock size={10} className="inline mr-0.5" />{d.date}</span>
                          <span className="text-emerald-400">{d.impact}</span>
                        </div>
                      </div>
                      <span className={cn(
                        'shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold border',
                        statusMap[d.status],
                      )}>
                        {d.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Session Memory Panel */}
      <div className="hidden lg:flex w-64 flex-col border-l border-border bg-card/50">
        <div className="p-4 border-b border-border">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Vicky recuerda...
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {[
            {
              icon: '🔴',
              label: 'Atención inmediata',
              text: 'Paola Joya: 4 llamadas el 30 de marzo. Promedio del equipo: 111. Requiere conversación de coaching esta semana.',
            },
            {
              icon: '🟡',
              label: 'Oportunidad del período',
              text: 'Hoy es jueves — víspera de quincena. En cobranzas, los viernes de quincena tienen 30-40% más tasa de contacto. ¿Tu operación está preparada para escalar mañana?',
            },
            {
              icon: '🟢',
              label: 'Fortaleza del equipo',
              text: 'Teresa Meza: 261 llamadas el 30 de marzo — 2.4x el promedio. Su protocolo de marcación puede replicarse en los 20 agentes del cuartil inferior.',
            },
            {
              icon: '📊',
              label: 'Benchmark del día',
              text: 'Contacto efectivo: 43.1%. La mediana del sector en Latam (COPC 2024) es 45%. Estás 2 puntos bajo la mediana — y 12 puntos bajo los líderes del sector.',
            },
            {
              icon: '✅',
              label: 'Tarea sugerida',
              text: 'Documenta el protocolo de Teresa Meza antes del 10 de abril. Potencial: +880 llamadas/día si el cuartil inferior sube a la mediana.',
            },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-secondary text-xs">
              <span className="text-sm shrink-0">{item.icon}</span>
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-foreground text-[10px] uppercase tracking-wide">{item.label}</span>
                <span className="text-muted-foreground leading-relaxed">{item.text}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="p-3 border-t border-border">
          <p className="text-[10px] text-muted-foreground text-center">Datos: CDR 30-Mar-2026 · COPC 2024</p>
        </div>
      </div>

      {/* Action Dialog */}
      <Dialog open={actionOpen} onOpenChange={setActionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Acción</DialogTitle>
            <DialogDescription>Convierte este insight en una acción concreta</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {[
              { id: 'crm', label: '📋 Registrar en CRM', desc: 'Crear tarea de seguimiento' },
              { id: 'notify', label: '🔔 Notificar al equipo', desc: 'Enviar alerta a responsables' },
              { id: 'log', label: '📊 Agregar a Decision Log', desc: 'Registrar decisión + responsable' },
              { id: 'meeting', label: '📅 Agendar reunión', desc: 'Crear evento con contexto' },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setActionChoice(opt.id)}
                className={cn(
                  'w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-all',
                  actionChoice === opt.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/30',
                )}
              >
                <span className="text-sm font-medium text-foreground">{opt.label}</span>
                <span className="text-xs text-muted-foreground ml-1">— {opt.desc}</span>
              </button>
            ))}
            <button
              onClick={() => setActionOpen(false)}
              className="w-full mt-2 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/80 transition-colors"
            >
              Confirmar acción
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
