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

  const templates = [
    {
      keywords: ['escalac', 'escal'],
      response: {
        content: '**Diagnóstico:** Las escalaciones en CX subieron 22% entre 14h-16h, concentradas en consultas de facturación no resueltas en primer contacto.\n\n**Causa raíz:** 3 tipos de consulta representan el 67% del volumen de escalaciones. El agente promedio tarda 8.2 min en estas consultas vs. 3.4 min en el resto.\n\n**Implicación:** Si esto continúa, proyectamos un impacto de -0.3 pts en CSAT del área en los próximos 7 días.\n\n**Recomendación:** Implementar quick-reference guide para las top 3 consultas. Reducción estimada de escalaciones: 40% en 2 semanas.',
        rootCauses: [
          { label: 'Consultas de facturación sin guía', impact: 67, color: '#EF4444' },
          { label: 'Falta de herramienta de búsqueda rápida', impact: 18, color: '#F59E0B' },
          { label: 'Agentes nuevos sin capacitación específica', impact: 15, color: '#6C37BE' },
        ],
        sources: ['WeKall Engage360 · 4,832 registros · Hoy', 'WeKall Phone · 2,140 llamadas · Hoy'],
        projection: 'Si no se actúa en 48h, proyectamos CSAT del área bajando a 3.8/5 (-0.5 pts) y escalaciones llegando al 14%.',
        followUps: [
          '¿Cuáles son exactamente las 3 consultas con más escalaciones?',
          '¿Qué agentes tienen el mayor índice de escalaciones?',
          '¿Cómo puedo crear una alerta automática para esto?',
        ],
      },
    },
    {
      keywords: ['csat', 'satisfacc', 'puntaje'],
      response: {
        content: '**Diagnóstico:** CSAT general en 4.3/5, pero hay dispersión significativa entre áreas. CX lidera con 4.6, mientras Cobranzas está en 3.1 — por debajo del umbral de alerta (3.5).\n\n**Causa raíz:** El área de Cobranzas tiene el lenguaje de comunicación más formal y menos empático según análisis de transcripciones. El CSAT cae principalmente después de llamadas de +6 minutos.\n\n**Implicación:** 23% de los clientes contactados por Cobranzas reportan intención de cambio de proveedor en 90 días.\n\n**Recomendación:** Taller de comunicación empática para el equipo de Cobranzas + revisión del script de apertura.',
        rootCauses: [
          { label: 'Lenguaje poco empático en Cobranzas', impact: 52, color: '#EF4444' },
          { label: 'Llamadas largas sin resolución', impact: 31, color: '#F59E0B' },
          { label: 'Horario de contacto inadecuado', impact: 17, color: '#6C37BE' },
        ],
        sources: ['WeKall Phone · 3,218 grabaciones · Esta semana', 'Engage360 · 890 encuestas post-contacto'],
        projection: 'Si el CSAT de Cobranzas no sube a 3.5 en 30 días, riesgo de pérdida del 8% de clientes en cobranza activa.',
        followUps: [
          '¿Cuáles son los agentes con CSAT más bajo en Cobranzas?',
          '¿Qué frases específicas están correlacionadas con CSAT bajo?',
          '¿Cuánto CSAT necesito para recuperar el NPS de 45?',
        ],
      },
    },
    {
      keywords: ['convers', 'ventas', 'venta', 'ratio'],
      response: {
        content: '**Diagnóstico:** Tasa de conversión en 23.6%, +2.1pp sobre la semana anterior. El equipo supera el benchmark de industria (+4.8pp sobre promedio sectorial).\n\n**Causa raíz del éxito:** Carlos M. tiene el mayor tiempo en escucha activa (62% del tiempo de llamada vs. 44% del equipo). Sus tasas de conversión en objeción de precio son 2.3x el promedio.\n\n**Implicación:** Si replicas el modelo de Carlos en el top 50% del equipo, podrías aumentar la conversión total un 8-11pp.\n\n**Recomendación:** Extraer y compartir best practices de Carlos M. Implementar peer-coaching semanal.',
        rootCauses: [
          { label: 'Escucha activa superior (Carlos M.)', impact: 58, color: '#22C55E' },
          { label: 'Mejor manejo de objeciones de precio', impact: 28, color: '#22C55E' },
          { label: 'Cierre más temprano en el journey', impact: 14, color: '#6C37BE' },
        ],
        sources: ['WeKall Phone · 1,842 llamadas de ventas · Semana actual', 'WeKall Notes · 420 notas de agentes'],
        projection: 'Proyección a 30 días con peer-coaching implementado: conversión estimada de 27.8% (+4.2pp).',
        followUps: [
          '¿Cuáles son las frases de apertura con mayor tasa de conversión?',
          '¿En qué momento del journey se pierden más leads?',
          '¿Cómo está la conversión por canal (Phone vs. Messenger)?',
        ],
      },
    },
    {
      keywords: ['aht', 'tiempo', 'duración', 'demora'],
      response: {
        content: '**Diagnóstico:** AHT promedio en 4m 32s, mejora de 18s respecto a la semana pasada. Sin embargo, el turno tarde (14h-22h) tiene un AHT de 6m 24s — 40% sobre el objetivo.\n\n**Causa raíz:** Las consultas de facturación en turno tarde toman 2.8x más tiempo porque los asesores no tienen acceso rápido al historial de pagos. El sistema de búsqueda requiere 3 pasos para llegar a esa información.\n\n**Implicación:** El turno tarde genera el 45% del costo operativo con solo el 32% del volumen.\n\n**Recomendación:** Integrar búsqueda de historial en el panel principal de Engage360. ROI estimado: reducción de 22% en AHT turno tarde en 2 semanas.',
        rootCauses: [
          { label: 'Acceso lento a historial de facturación', impact: 49, color: '#F59E0B' },
          { label: 'Transferencias internas entre áreas', impact: 33, color: '#EF4444' },
          { label: 'Consultas técnicas sin documentación', impact: 18, color: '#6C37BE' },
        ],
        sources: ['WeKall Engage360 · 2,650 sesiones · Semana actual', 'WeKall Phone · 4,832 grabaciones'],
        projection: 'Con la integración de historial, proyectamos AHT en turno tarde bajando a 4m 45s en 30 días (-26%).',
        followUps: [
          '¿Cuánto costaría integrar la búsqueda en Engage360?',
          '¿Cuáles son los agentes con mejor AHT en turno tarde?',
          '¿Qué porcentaje de llamadas tiene AHT mayor a 8 minutos?',
        ],
      },
    },
  ];

  const lower = question.toLowerCase();
  const match = templates.find(t => t.keywords.some(k => lower.includes(k)));
  const tpl = match?.response ?? {
    content: '**Diagnóstico:** Analicé tus datos de conversaciones de esta semana y encontré patrones interesantes en tu operación.\n\n**Hallazgo clave:** Tu FCR en 78.4% está por encima del benchmark de industria, pero hay una brecha de 18pp entre tu mejor y peor agente que representa una oportunidad de mejora significativa.\n\n**Recomendación:** El mayor impacto a corto plazo estaría en elevar el FCR de tus agentes en el cuartil inferior al nivel del segundo cuartil — esto podría mejorar el CSAT general en +0.4 pts.',
    rootCauses: [
      { label: 'Brecha entre mejores y peores agentes', impact: 55, color: '#F59E0B' },
      { label: 'Procesos no estandarizados por área', impact: 30, color: '#EF4444' },
      { label: 'Falta de feedback en tiempo real', impact: 15, color: '#6C37BE' },
    ],
    sources: ['WeKall Phone · 12,483 conversaciones · Esta semana', 'Engage360 · Todos los canales'],
    projection: 'Estandarizar los procesos del cuartil top podría mejorar el NPS de 42 a 54 en los próximos 90 días.',
    followUps: [
      '¿Cuáles son mis 3 oportunidades de mejora más importantes esta semana?',
      '¿Cuánto revenue generé vs. el mes pasado?',
      '¿Qué área tiene mayor riesgo operativo hoy?',
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

    // Simulate AI response delay
    await new Promise(r => setTimeout(r, 1200 + Math.random() * 800));
    const resp = generateVickyResponse(text);
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
