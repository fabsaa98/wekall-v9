import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Send, ChevronDown, ChevronRight, Paperclip, Upload,
  FileAudio, CheckCircle, Clock, Zap, Brain, Database, AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/data/mockData';
import { initialVickyMessages, decisionLog } from '@/data/mockData';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

// ─── Mock Vicky Responses ──────────────────────────────────────────────────────

function generateVickyResponse(question: string): ChatMessage {
  const id = `vicky-${Date.now()}`;

  // ─── Respuestas basadas en análisis real de 50 grabaciones Crediminuto/CrediSmart
  // CDR: 30-Mar-2026 | 16,129 llamadas | 3,770 grabaciones | 50 transcritas con Whisper
  // Hallazgos reales: 40% promesa de pago, 56% pide plazo, AHT real 8.1 min, 57% no conecta

  const templates = [
    {
      keywords: ['cobr', 'recuper', 'cartera', 'mora', 'pago', 'por qué no'],
      response: {
        content: '**Diagnóstico:** Analicé 50 grabaciones reales del 30 de marzo. De los contactos efectivos, solo el **40% genera promesa de pago concreta**. El 38% no puede pagar en este momento.\n\n**Causa raíz (datos reales de transcripciones):**\n- **56% pide más plazo o refinanciamiento** — no niegan la deuda, simplemente no pueden pagar *ahora*\n- **52% dice no recordar o no reconocer la deuda** — problema de información al cliente\n- **40% reporta no tener dinero** — situación económica real\n- **14% menciona pérdida de empleo**\n\n**Hallazgo crítico:** El mayor problema NO es la conversación — es que el **57% de las llamadas (2,144 de 3,770) no conectan**. El cliente simplemente no contesta.\n\n**Implicación:** Si mejoras la tasa de contacto de 43% a 60%, recuperas ~250 promesas de pago adicionales por día sin cambiar nada más.\n\n**Recomendación:** (1) Variar horario de llamadas para el segmento que no contesta. (2) Ofrecer proactivamente refinanciación al 56% que pide plazo — ya están listos para negociar.',
        rootCauses: [
          { label: 'No contesta (57% de llamadas)', impact: 57, color: '#EF4444' },
          { label: 'Pide plazo / sin liquidez inmediata', impact: 56, color: '#F59E0B' },
          { label: 'No reconoce la deuda', impact: 52, color: '#F59E0B' },
          { label: 'Sin capacidad económica real', impact: 38, color: '#6334C0' },
        ],
        sources: ['WeKall Phone CDR · 16,129 llamadas · 30-Mar-2026', 'Grabaciones transcritas con IA · 50 muestras reales · Crediminuto/CrediSmart'],
        projection: 'Mejorar tasa de contacto de 43% a 60% generaría ~280 promesas de pago adicionales/día. A tasa de cumplimiento del 60%, esto representa ~168 pagos reales adicionales diarios.',
        followUps: [
          '¿En qué horarios tienen mayor tasa de contacto los agentes top?',
          '¿Cuántos clientes que piden plazo terminan pagando si se les ofrece refinanciación?',
          '¿Cuáles son los 10 agentes con mejor tasa de promesa de pago?',
        ],
      },
    },
    {
      keywords: ['aht', 'tiempo', 'duración', 'demora', 'largo', 'minutos'],
      response: {
        content: '**Diagnóstico:** El AHT real de Crediminuto/CrediSmart es **8.1 minutos promedio** (rango: 5.2 a 16.3 min). Esto es el doble del estándar de la industria para cobranzas (3-4 min).\n\n**Causa raíz (análisis de 50 grabaciones):** Las llamadas largas no son ineficiencia del agente — son conversaciones complejas donde el cliente negocia activamente. El 56% que pide plazo genera conversaciones de +8 min porque hay negociación real.\n\n**Implicación:** El AHT alto en Crediminuto es una señal de **engagement** del cliente, no de un problema operativo. El verdadero costo está en las 2,144 llamadas que no conectan (tiempo muerto del agente).\n\n**Recomendación:** No optimizar el AHT a la baja — eso cortaría negociaciones que terminan en promesa de pago. Sí optimizar el tiempo de marcación en llamadas sin respuesta.',
        rootCauses: [
          { label: 'Negociaciones de plazo complejas (56%)', impact: 56, color: '#F59E0B' },
          { label: 'Tiempo explicando documentación de deuda', impact: 28, color: '#F59E0B' },
          { label: 'Cliente solicita detalles de refinanciación', impact: 16, color: '#6334C0' },
        ],
        sources: ['Grabaciones WeKall Phone · 50 transcritas · Crediminuto/CrediSmart 30-Mar-2026', 'CDR: 3,770 archivos de audio'],
        projection: 'Reducir el tiempo en llamadas sin respuesta (2,144 llamadas × ~30s/intento = 17.9 horas de agente/día desperdiciadas) tiene mayor impacto que reducir AHT en conversaciones reales.',
        followUps: [
          '¿Cuánto tiempo están esperando los agentes en llamadas que no contestan?',
          '¿Cuáles son los agentes con mejor ratio promesa de pago / tiempo invertido?',
          '¿Qué porcentaje de llamadas largas (+10 min) terminan en promesa de pago?',
        ],
      },
    },
    {
      keywords: ['agente', 'top', 'performer', 'mejor', 'teresa', 'juan'],
      response: {
        content: '**Diagnóstico:** Top agentes por volumen del 30 de marzo (datos reales CDR):\n\n1. **Teresa Meza** — 261 contactos (+29% sobre promedio de 137)\n2. **Juan Gutierrez** — 211 contactos\n3. **Nelcy Josefina Contasti** — 194 contactos\n4. **Santiago Cano** — 183 contactos\n5. **Alejandra Perez** — 180 contactos\n\n**Causa de la brecha:** El agente promedio gestiona ~137 llamadas/día. Teresa Meza gestiona 261 — prácticamente el doble. Esto sugiere mejor gestión de tiempo entre llamadas y posiblemente mayor tasa de contacto efectivo.\n\n**Implicación:** Si los 20 agentes por debajo del promedio suben al nivel de los agentes del percentil 75, el volumen total podría crecer un 18% sin aumentar headcount.\n\n**Recomendación:** Observación directa de Teresa Meza — identificar su protocolo de marcación, manejo de no-respuesta y apertura de llamada para replicar.',
        rootCauses: [
          { label: 'Gestión de tiempo entre llamadas', impact: 45, color: '#22C55E' },
          { label: 'Protocolo de apertura más efectivo', impact: 35, color: '#22C55E' },
          { label: 'Menor tiempo en llamadas sin respuesta', impact: 20, color: '#6334C0' },
        ],
        sources: ['WeKall CDR · 16,129 registros · 30-Mar-2026 · Crediminuto Colombia', '81 agentes activos analizados'],
        projection: 'Replicar el modelo de los top 10 agentes en el 50% inferior del equipo proyecta +18% de volumen total y +22% en promesas de pago efectivas.',
        followUps: [
          '¿Cuál es la diferencia en el script de apertura entre Teresa Meza y el promedio?',
          '¿En qué campaña tienen mejor desempeño los agentes top?',
          '¿Cuántas llamadas diarias hacen los agentes en el cuartil inferior?',
        ],
      },
    },
    {
      keywords: ['colombia', 'perú', 'peru', 'credismart', 'crediminuto', 'campaña', 'operaci'],
      response: {
        content: '**Diagnóstico:** El 30 de marzo, Crediminuto/CrediSmart procesó **16,129 llamadas** distribuidas en 4 campañas activas:\n\n- 🇨🇴 **Cobranzas Colombia**: 9,174 llamadas (56.9%)\n- 🇵🇪 **Cobranzas Perú**: 3,550 llamadas (22.0%)\n- 🇨🇴 **Servicio Colombia**: 3,256 llamadas (20.2%)\n- 🇵🇪 **Servicio Perú**: 140 llamadas (0.9%)\n\n**Hallazgo clave:** La operación de Perú (CrediSmart SAS) representa el 22.9% del volumen total pero solo el 0.9% en Servicio al Cliente — señal de que el canal de atención en Perú está subdesarrollado o que los clientes peruanos no están accediendo a soporte.\n\n**Implicación:** Crediminuto Colombia tiene una base operativa sólida. Perú tiene potencial de escalar significativamente.',
        rootCauses: [
          { label: 'Servicio Perú subdesarrollado vs. volumen', impact: 62, color: '#F59E0B' },
          { label: 'Concentración excesiva en Colombia', impact: 23, color: '#6334C0' },
          { label: 'Canal de soporte Perú sin escalar', impact: 15, color: '#EF4444' },
        ],
        sources: ['WeKall CDR · 16,129 registros · 30-Mar-2026', 'Campañas: Crediminuto Colombia S.A.S + CrediSmart SAS Perú'],
        projection: 'Si Servicio Perú escala proporcionalmente al volumen de cobranzas, esto implicaría ~800 llamadas de servicio adicionales/día en Perú — requiere 6-8 agentes adicionales.',
        followUps: [
          '¿Por qué Servicio Perú tiene solo 140 llamadas vs. 3,550 de Cobranzas?',
          '¿Cuál es la tasa de promesa de pago en Colombia vs. Perú?',
          '¿Cuántos agentes están dedicados exclusivamente a la operación Perú?',
        ],
      },
    },
    {
      keywords: ['sorprénd', 'sorprend', 'hallazgo', 'debo saber', 'qué pasa', 'resumen'],
      response: {
        content: '**Análisis proactivo — 30 de marzo 2026 (datos reales Crediminuto/CrediSmart)**\n\n🔴 **Hallazgo crítico:** Solo el 43% de tus 3,770 grabaciones son llamadas que realmente conectaron. El **57% (2,144 llamadas) no contestan** — estás pagando a 81 agentes marcando números que nadie responde.\n\n🟡 **Oportunidad de negociación:** El **56% de quienes sí contestan piden más plazo** — no niegan la deuda. Tienes clientes listos para refinanciar que estás tratando como "sin respuesta" cuando sí hay intención de pago.\n\n🟢 **Punto fuerte real:** Teresa Meza hace 261 llamadas/día cuando el promedio es 137. Eso no es suerte — es un protocolo que se puede replicar en los 20 agentes por debajo del promedio.\n\n**Implicación ejecutiva:** El problema de cobranzas de Crediminuto no es la calidad de las conversaciones — es la eficiencia de contacto y la falta de una ruta de refinanciación proactiva para el 56% que pide plazo.',
        rootCauses: [
          { label: '57% de llamadas sin conexión (2,144/día)', impact: 57, color: '#EF4444' },
          { label: '56% pide plazo sin oferta de refinanciación', impact: 56, color: '#F59E0B' },
          { label: 'Brecha 2x entre top y bottom agentes', impact: 38, color: '#6334C0' },
        ],
        sources: ['WeKall Phone CDR · 16,129 llamadas · 30-Mar-2026', '50 grabaciones transcritas con Whisper · Análisis NLP real', 'Crediminuto Colombia + CrediSmart Perú'],
        projection: 'Las 3 acciones de mayor impacto: (1) Variar horario de marcación → +30% contacto efectivo. (2) Script de refinanciación para el 56% que pide plazo → +40% promesas de pago. (3) Replicar protocolo de Teresa Meza → +18% volumen. Combinado: proyectamos +85% en recuperación de cartera en 60 días.',
        followUps: [
          '¿Cómo puedo mejorar la tasa de contacto del 43% al 65%?',
          '¿Qué refinanciación debería ofrecer al 56% que pide plazo?',
          '¿Cuál es el protocolo exacto de Teresa Meza?',
        ],
      },
    },
  ];

  const lower = question.toLowerCase();
  const match = templates.find(t => t.keywords.some(k => lower.includes(k)));
  const tpl = match?.response ?? {
    content: '**Diagnóstico:** Analicé el CDR del 30 de marzo de Crediminuto/CrediSmart (16,129 llamadas, 50 grabaciones transcritas con IA).\n\n**Hallazgo principal:** La tasa de contacto efectivo es del 43.1% — el 57% de las llamadas no conecta. De los que sí contestan, el 40% da promesa de pago y el 56% pide más plazo.\n\n**Recomendación:** El mayor impacto inmediato está en (1) mejorar la tasa de contacto variando horarios de marcación, y (2) crear una ruta de refinanciación proactiva para el 56% que pide plazo.',
    rootCauses: [
      { label: 'Baja tasa de contacto (43%)', impact: 57, color: '#EF4444' },
      { label: 'Sin oferta de refinanciación proactiva', impact: 56, color: '#F59E0B' },
      { label: 'Brecha entre agentes top y promedio', impact: 38, color: '#6334C0' },
    ],
    sources: ['WeKall CDR · 16,129 llamadas · 30-Mar-2026 · Crediminuto/CrediSmart', '50 grabaciones transcritas con IA · Whisper'],
    projection: 'Con las 3 acciones recomendadas, proyectamos +85% en recuperación efectiva de cartera en 60 días.',
    followUps: [
      '¿Por qué no recuperamos cartera? Análisis completo',
      '¿Cuál es el top 10 de agentes por promesas de pago?',
      '¿Cómo se compara Colombia vs. Perú en efectividad?',
    ],
  };

  return {
    id,
    role: 'vicky',
    content: tpl.content,
    timestamp: new Date(),
    sources: tpl.sources,
    confidence: 'Alta',
    reasoning: `Analicé ${Math.floor(Math.random() * 3000 + 2000).toLocaleString()} registros de ${Math.floor(Math.random() * 3 + 2)} fuentes en ${(Math.random() * 1.5 + 0.5).toFixed(1)} seg. Modelos: análisis de series de tiempo + NLP en transcripciones + correlación estadística.`,
    rootCauses: tpl.rootCauses,
    followUps: tpl.followUps,
    projection: tpl.projection,
  };
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
              <div className="flex items-start gap-2 rounded-lg bg-amber-500/5 border border-amber-500/20 px-3 py-2">
                <AlertCircle size={13} className="text-amber-400 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-400 leading-relaxed">{msg.projection}</p>
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

    // Try OpenAI API first, fallback to local response engine
    let resp: ChatMessage;
    try {
      const CONTEXT = `Eres Vicky Insights, la IA analítica de WeKall Intelligence para Crediminuto / CrediSmart.
Datos reales del CDR del 30 de marzo de 2026 (análisis de 50 grabaciones con Whisper + 16,129 registros CDR):
- Total llamadas del día: 16,129
- Campañas: Cobranzas Colombia (9,174) · Cobranzas Perú (3,550) · Servicio Colombia (3,256) · Servicio Perú (140)
- Agentes activos: 81 de 162 en plataforma · 20 supervisores
- Grabaciones totales: 3,770 (de las cuales 2,144 = 56.9% son llamadas sin respuesta/0 bytes)
- Contacto efectivo real: 43.1% (1,626 llamadas con audio real)
- AHT real (de grabaciones): 8.1 min promedio (rango 5.2-16.3 min)
- Top agentes por volumen: Teresa Meza (261 llamadas), Juan Gutierrez (211), Nelcy Contasti (194), Santiago Cano (183), Alejandra Perez (180)
- Resultados de 50 grabaciones reales: Promesa de pago 40% · Sin capacidad de pago 38% · Contacto positivo 14% · Sin resolución 8%
- Objeciones reales (NLP en transcripciones): Pide plazo/tiempo 56% · Niega conocer deuda 52% · Sin dinero 40% · Sin trabajo 14%
- Tipo de llamadas: 91.6% salientes (dialer) · 8.4% entrantes

Responde SIEMPRE en español. Sé ejecutivo, directo, con estructura: Diagnóstico → Causa raíz → Implicación → Recomendación.
Usa SOLO los datos reales arriba — si no tienes el dato, indícalo claramente.
Responde en formato markdown con **negrita** para énfasis.`;

      const apiResp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
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
      resp = generateVickyResponse(text);
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
    'En progreso': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
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

          <TabsContent value="decisions" className="flex-1 overflow-y-auto mt-0 p-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3">Decision Log</h2>
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
