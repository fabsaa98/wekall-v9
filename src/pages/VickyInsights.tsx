import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Send, ChevronDown, ChevronRight, Paperclip, Upload,
  FileAudio, CheckCircle, Clock, Zap, Brain, Database, AlertCircle, FileText, Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/data/mockData';
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

export default function VickyInsights() {
  const location = useLocation();
  const [messages, setMessages] = useState<ChatMessage[]>(initialVickyMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [actionChoice, setActionChoice] = useState('');
  const [activeTab, setActiveTab] = useState('chat');
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

### Top agentes por volumen (datos reales CDR):
1. Teresa Meza: 261 llamadas (vs. promedio 137 = +90%)
2. Juan Gutierrez: 211
3. Nelcy Josefina Contasti: 194
4. Santiago Cano: 183
5. Alejandra Perez: 180

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
- Minutos liberados/día = (AHT_actual - AHT_objetivo) × llamadas/día
- Capacidad liberada en agentes equivalentes = minutos_liberados / (8h × 60min)
- Escenario A — Reducción de costo: agentes_liberados × COP $3,000,000 = ahorro/mes
- Escenario B — Más transacciones: minutos_liberados / AHT_actual = llamadas_adicionales/día → × tasa_contacto × tasa_promesa = promesas_adicionales
- NOTA: Si no se conoce el ticket promedio de deuda, expresar en "promesas adicionales/mes" y solicitar el dato al CEO.

**2. Impacto de mejorar tasa de contacto efectivo**
- Contactos_adicionales/día = (tasa_objetivo% - 43.1%) × 16,129
- Promesas_adicionales/día = contactos_adicionales × 40%
- Promesas_adicionales/mes = promesas_adicionales/día × 22

**3. Impacto de replicar protocolo top agente (Teresa Meza)**
- Promedio actual: 137 llamadas/agente/día
- Teresa Meza: 261 llamadas/agente/día
- Brecha: 124 llamadas/agente/día
- Si los 20 agentes bajo promedio suben al percentil 75 (183 llamadas):
  - Incremento = (183-137) × 20 agentes = 920 llamadas adicionales/día
  - En contactos efectivos: 920 × 43.1% = 397 contactos adicionales/día
  - En promesas: 397 × 40% = 159 promesas adicionales/día = 3,498/mes

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

## CÓMO RESPONDER PREGUNTAS — PROTOCOLO OBLIGATORIO

Vicky es un analista de BI ejecutivo de clase mundial. Para CADA pregunta del CEO:

**PASO 1 — Entiende la pregunta real:**
- No respondas con datos genéricos si la pregunta es específica
- Si preguntan "¿qué protocolo usa Teresa Meza?", responde sobre el PROTOCOLO, no sobre el ranking
- Si preguntan "¿cuánto cuesta X?", calcula el número en COP con el motor EBITDA
- Si preguntan "¿por qué pasa X?", da causa raíz con datos, no descripción del síntoma

**PASO 2 — Usa SOLO datos disponibles:**
- CDR 30-Mar-2026: 16,129 llamadas, volúmenes por agente y campaña
- 50 grabaciones transcritas: frases reales, objeciones, resultados de contacto
- Benchmarks: P25/P50/P75 por industria y región
- Motor EBITDA: fórmulas de impacto en COP con parámetros reales
- Si el dato no existe en estas fuentes → dilo explícitamente

**PASO 3 — Estructura siempre así:**
1. Diagnóstico: ¿qué muestra el dato real?
2. Causa raíz: ¿por qué pasa eso? (con evidencia del CDR o transcripciones)
3. Benchmark: ¿cómo se compara vs. industria? (P25/P50/P75)
4. Impacto EBITDA: ¿cuánto vale mejorar esto en COP? (usa el motor)
5. Recomendación: acción específica y ejecutable

**PASO 4 — Sobre preguntas sin datos:**
- Sobre protocolos específicos de agentes: "El CDR muestra el volumen de Teresa Meza (261 llamadas/día vs. promedio 137), pero no tenemos grabaciones de su metodología específica. Para saberlo: observación directa + grabación de sus llamadas con Whisper."
- Sobre horarios: "El CDR no tiene timestamp por llamada. Para este análisis necesito el CDR completo con hora de inicio de cada llamada."

## INSTRUCCIONES
- Responde SIEMPRE en español ejecutivo
- Estructura: Diagnóstico → Causa raíz → Implicación → Recomendación
- Cita datos reales cuando los tengas
- Cuando sea relevante, cita frases reales de las grabaciones entre comillas
- Si el CEO pregunta sobre agentes, cita a Teresa Meza, Juan Gutierrez, etc. por nombre
- Sé directo, sin relleno — nivel C-suite
- Usa markdown con **negrita** para énfasis

## REGLA CRÍTICA — INTEGRIDAD DE DATOS
- **NUNCA inventes datos, métricas, horarios, porcentajes ni análisis que no estén explícitamente en el contexto anterior.**
- Si la pregunta requiere datos que NO tienes (ej: horarios de marcación, datos por hora, tendencias históricas, comparativos de períodos anteriores), responde EXACTAMENTE así:
  "No tengo esa dimensión en los datos disponibles. El CDR del 30 de marzo incluye [menciona qué sí tienes]. Para responder esta pregunta necesitaría [explica qué dato falta]."
- Es preferible admitir la limitación que fabricar un insight. La credibilidad ejecutiva depende de la precisión, no de parecer omnisciente.
- Los datos disponibles son SOLO los del CDR del 30 de marzo y las 50 grabaciones transcritas. Nada más.`;

      const apiResp = await fetch(PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(USE_PROXY ? {} : { 'Authorization': 'Bearer ' + atob('c2stcHJvai0xcllfQTlHRDBQMzU3SVVXWlIxbmhFM0J2NmFXRzllbzI5OFZ1eFVSM3BjNV9zM0tkSGZhekpRekVQV3k3ek5menFya203ZkwweVQzQmxia0ZKUXpUaEx6dHhRQnU2MUUyUEs0bnNvYW5PeV9mYm52THB1N2ZjV0dKWnlSTDlGUXl1aXlGWjJUV181WmNYa3U5eEtWSFJiVldoVUE=') }),
        },
        body: JSON.stringify({
          model: 'gpt-5',
          messages: [
            { role: 'system', content: CONTEXT },
            { role: 'user', content: text },
          ],
          max_tokens: 800,
          temperature: 0.3,
        }),
      });

      if (apiResp.ok) {
        const data = await apiResp.json();
        const aiContent = data.choices?.[0]?.message?.content ?? '';
        resp = {
          id: `vicky-${Date.now()}`,
          role: 'vicky',
          content: aiContent,
          timestamp: new Date(),
          sources: ['WeKall CDR · 16,129 llamadas · 30-Mar-2026 · Crediminuto/CrediSmart', '50 grabaciones transcritas con Whisper · Análisis NLP real'],
          confidence: 'Alta',
          reasoning: `Analicé 16,129 registros CDR + 50 transcripciones reales de Crediminuto/CrediSmart en tiempo real. Modelo: GPT-4o mini + contexto de datos reales.`,
          followUps: [
            '¿Por qué no estamos recuperando cartera?',
            '¿Cuáles son los agentes top performers?',
            '¿Cómo mejorar la tasa de contacto efectivo?',
          ],
        };
      } else {
        throw new Error('API error');
      }
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
            <TabsList className="h-8">
              <TabsTrigger value="chat" className="text-xs">💬 Chat</TabsTrigger>
              <TabsTrigger value="upload" className="text-xs">🎙️ Analizar Grabación</TabsTrigger>
              <TabsTrigger value="decisions" className="text-xs">📋 Decision Log</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="chat" className="flex flex-col flex-1 overflow-hidden mt-0">
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

          <TabsContent value="upload" className="flex-1 overflow-y-auto mt-0">
            <UploadTab />
          </TabsContent>

          <TabsContent value="decisions" className="flex-1 overflow-y-auto mt-0 p-3">
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
            { icon: '📊', text: 'FCR cayó 3pp en Messenger Hub esta semana' },
            { icon: '⚠️', text: 'CSAT de Cobranzas en zona de alerta (3.1/5)' },
            { icon: '🏆', text: 'Carlos M. lidera conversión con 31.2%' },
            { icon: '📈', text: 'Volumen proyectado +35% el viernes' },
            { icon: '🎯', text: 'KPI prioritario para CEO: NPS +12% vs industria' },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-secondary text-xs">
              <span className="text-sm shrink-0">{item.icon}</span>
              <span className="text-muted-foreground leading-relaxed">{item.text}</span>
            </div>
          ))}
        </div>
        <div className="p-3 border-t border-border">
          <p className="text-[10px] text-muted-foreground text-center">Contexto de sesión activo</p>
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
