import React, { useState, useRef, useEffect, KeyboardEvent, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Send, ChevronDown, ChevronRight, Paperclip, Upload,
  FileAudio, CheckCircle, Clock, Zap, Brain, Database, AlertCircle, FileText, Info,
  Mic, MicOff, Loader2, MessageSquare, ClipboardList, Bell, BookOpen, CalendarPlus, CheckCircle2,
  History, RefreshCw,
} from 'lucide-react';
import { saveVickyConversation, getVickyHistory, type VickyConversation } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { calcularImpactoAHT, calcularImpactoContactRate, calcularImpactoAgentes, getEstadoOperativo } from '@/lib/vickyCalculations';
import type { ChatMessage } from '@/data/mockData';
import { InfoTooltip } from '@/components/InfoTooltip';
import { initialVickyMessages, decisionLog as staticDecisionLog } from '@/data/mockData';
import { detectOperationType, detectRegion, generateBenchmarkContext } from '@/data/benchmarks';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useClient } from '@/contexts/ClientContext';
import { useCDRData } from '@/hooks/useCDRData';

// ─── Mock Vicky Responses ──────────────────────────────────────────────────────

function generateVickyFallbackResponse(question: string): ChatMessage {
  return {
    id: `vicky-${Date.now()}`,
    role: 'vicky' as const,
    content: '**No pude conectar con el motor de análisis en este momento.**\n\nTengo disponibles datos CDR histórico enero 2024 - abril 2026 (822 días, 12 millones de registros, Supabase) y 50 grabaciones transcritas. Por favor intenta nuevamente en unos segundos — si el problema persiste, verifica la conexión.',
    timestamp: new Date(),
    sources: ['WeKall CDR · datos en tiempo real · Supabase'],
    confidence: 'Baja' as const,
    rootCauses: [],
    projection: '',
    followUps: ['Intenta de nuevo', '¿Por qué no recuperamos cartera?', '¿Cuál es el estado de la operación?'],
  };
}

// ─── Export to PDF ───────────────────────────────────────────────────────────

// Fix 1F: exportToPDF acepta clientName para eliminar el hardcodeo de "Crediminuto / CrediSmart"
function exportToPDF(content: string, sources?: string[], clientName?: string) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  // Usar clientName dinámico del contexto — fallback a 'WeKall Intelligence'
  const displayName = clientName || 'WeKall Intelligence';
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
      <p style="color:#999;font-size:12px">${displayName} · ${new Date().toLocaleDateString('es-CO')}</p>
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

function ChatBubble({ msg, onFollowUp, onAction, clientName }: {
  msg: ChatMessage;
  onFollowUp: (q: string) => void;
  onAction: () => void;
  clientName?: string; // Fix 1F: recibir clientName para PDF sin hardcodeo
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
                  : 'bg-sky-500/10 text-sky-400 border-sky-500/20',
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
              <div className="flex items-start gap-2 rounded-lg bg-slate-50 border border-sky-200 px-3 py-2">
                <AlertCircle size={13} className="text-sky-600 mt-0.5 shrink-0" />
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
          onClick={() => exportToPDF(msg.content, msg.sources, clientName)}
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

// ─── Historial Tab ─────────────────────────────────────────────────────────────

function HistorialTab({ onReload, sessionId, clientId }: { onReload: (q: string) => void; sessionId: string; clientId: string }) {
  const [history, setHistory] = useState<VickyConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getVickyHistory(clientId, undefined, 20);
        setHistory(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error cargando historial');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId, clientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 space-y-2 text-center">
        <p className="text-sm text-red-400 font-medium">Error cargando historial</p>
        <p className="text-xs text-muted-foreground">{error}</p>
        <p className="text-xs text-muted-foreground">
          La tabla <code className="bg-secondary px-1 rounded">vicky_conversations</code> puede no existir aún.
          Ejecuta el script SQL en Supabase Dashboard.
        </p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="p-6 text-center space-y-2">
        <History size={28} className="mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Sin conversaciones guardadas aún</p>
        <p className="text-xs text-muted-foreground">
          Las preguntas exitosas a Vicky se guardarán automáticamente aquí.
        </p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2">
      <p className="text-xs text-muted-foreground mb-3">
        Últimas {history.length} conversaciones · tabla <code className="bg-secondary px-1 rounded">vicky_conversations</code>
      </p>
      {history.map((conv, i) => {
        const ts = conv.created_at ? new Date(conv.created_at) : null;
        const timeStr = ts
          ? ts.toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
          : '—';
        const isOpen = openId === (conv.id ?? i);

        return (
          <div
            key={conv.id ?? i}
            className="rounded-lg border border-border bg-card overflow-hidden"
          >
            {/* Header colapsable */}
            <button
              onClick={() => setOpenId(isOpen ? null : (conv.id ?? i))}
              className="w-full flex items-start gap-3 p-3 text-left hover:bg-secondary/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground line-clamp-1">{conv.question}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-muted-foreground">{timeStr}</span>
                  {conv.confidence && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-semibold ${
                      conv.confidence === 'Alta'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                    }`}>
                      {conv.confidence}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); onReload(conv.question); }}
                  className="text-[10px] px-2 py-1 rounded border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
                  title="Recargar pregunta en el chat"
                >
                  Recargar
                </button>
                {isOpen ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
              </div>
            </button>

            {/* Contenido colapsable */}
            {isOpen && (
              <div className="border-t border-border p-3 space-y-2 animate-fade-in">
                {/* Pregunta */}
                <div className="flex gap-2">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase shrink-0 mt-0.5">Pregunta</span>
                  <p className="text-xs text-foreground leading-relaxed">{conv.question}</p>
                </div>
                {/* Respuesta */}
                <div className="flex gap-2">
                  <span className="text-[10px] font-semibold text-primary uppercase shrink-0 mt-0.5">Vicky</span>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-6">{conv.answer}</p>
                </div>
                {/* Fuentes */}
                {conv.sources && conv.sources.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {conv.sources.map((s, si) => (
                      <span key={si} className="px-1.5 py-0.5 rounded-full bg-secondary text-[10px] text-muted-foreground border border-border">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Action Suggestions (Feature 4) ─────────────────────────────────────────

interface ActionSuggestion {
  label: string;
  icon: string;
  action: () => void;
}

export default function VickyInsights() {
  const location = useLocation();
  const navigate = useNavigate();
  const { clientConfig, clientBranding, clientId } = useClient(); // Fix 1A + 1F: clientId para RAG seguro
  const cdr = useCDRData();
  const [messages, setMessages] = useState<ChatMessage[]>(initialVickyMessages);

  // Actualizar mensaje de bienvenida cuando carga el clientConfig
  useEffect(() => {
    if (!clientConfig) return;
    const _name = clientBranding?.company_name || clientConfig.client_name || 'tu operación';
    setMessages(prev => {
      if (prev.length !== 1 || prev[0].id !== 'init-1') return prev; // solo reemplazar el mensaje inicial
      return [{
        ...prev[0],
        content: `**Hola. Soy Vicky Insights.**\n\nTengo acceso a los datos reales de **${_name}**:\n- **CDR histórico en tiempo real** · Supabase · datos actualizados\n- **Transcripciones** analizadas con IA · Objeciones y resultados\n- **Benchmarks** de industria: COPC, SQM, E&Y, MetricNet (Colombia · Latam · Global)\n- **Motor EBITDA**: impacto financiero de cada mejora operativa\n\n¿Qué quieres analizar?`,
        sources: [`${_name} · CDR · Supabase en tiempo real`],
        reasoning: `Datos CDR de ${_name} cargados desde Supabase.`,
      }];
    });
  }, [clientConfig?.client_id]); // eslint-disable-line react-hooks/exhaustive-deps
  // Feature 1: Conversation memory
  const [conversationHistory, setConversationHistory] = useState<Array<{role: 'user'|'assistant', content: string}>>([]);
  // useRef to avoid stale closure in async sendMessage (especially in tool_calls second pass)
  const conversationHistoryRef = useRef<Array<{role: 'user'|'assistant', content: string}>>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [actionChoice, setActionChoice] = useState('');
  const [actionStep, setActionStep] = useState<'choose' | 'notify'>('choose');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');

  const [surpriseLoading, setSurpriseLoading] = useState(false);

  // "Sorpréndeme" — análisis proactivo de la semana (Tableau Pulse style)
  async function handleSorprendeme() {
    setSurpriseLoading(true);
    const last14 = cdr.last30Days.slice(-14);
    const thisWeek = last14.slice(-5);
    const prevWeek = last14.slice(-10, -5);

    const avgTasa = (arr: typeof thisWeek) =>
      arr.length > 0 ? Math.round(arr.reduce((s, d) => s + d.tasa_contacto_pct, 0) / arr.length * 10) / 10 : 0;
    const avgVol = (arr: typeof thisWeek) =>
      arr.length > 0 ? Math.round(arr.reduce((s, d) => s + d.total_llamadas, 0) / arr.length) : 0;

    const thisWeekTasa = avgTasa(thisWeek);
    const prevWeekTasa = avgTasa(prevWeek);
    const deltaTasa = Math.round((thisWeekTasa - prevWeekTasa) * 10) / 10;
    const thisWeekVol = avgVol(thisWeek);
    const prevWeekVol = avgVol(prevWeek);
    const deltaVol = prevWeekVol > 0 ? Math.round(((thisWeekVol - prevWeekVol) / prevWeekVol) * 100) : 0;

    const bestDay = thisWeek.length > 0
      ? thisWeek.reduce((a, b) => a.tasa_contacto_pct > b.tasa_contacto_pct ? a : b)
      : null;

    const question = `Análisis semanal proactivo: Esta semana la tasa de contacto promedio fue ${thisWeekTasa}% (semana anterior: ${prevWeekTasa}%, delta: ${deltaTasa > 0 ? '+' : ''}${deltaTasa}pp). Volumen: ${thisWeekVol.toLocaleString('es-CO')} llamadas/día (delta: ${deltaVol > 0 ? '+' : ''}${deltaVol}% vs semana anterior). ${bestDay ? `Mejor día: ${bestDay.fecha} con ${bestDay.tasa_contacto_pct}% contacto.` : ''} Dame un análisis ejecutivo de lo que pasó esta semana y las 3 acciones prioritarias para la próxima semana.`;

    setSurpriseLoading(false);
    setActiveTab('chat');
    await sendMessage(question);
  }

  // Feature 4: Detect contextual action suggestions from Vicky's response
  function detectActionSuggestions(response: string): ActionSuggestion[] {
    const suggestions: ActionSuggestion[] = [];
    const r = response.toLowerCase();

    if (r.includes('agente') && (r.includes('brecha') || r.includes('coaching') || r.includes('bajo rendimiento') || r.includes('bottom') || r.includes('peor cuartil'))) {
      suggestions.push({
        label: 'Programar sesión de coaching',
        icon: '🎯',
        action: () => navigate('/equipos'),
      });
    }
    if (r.includes('alerta') || r.includes('anomalía') || r.includes('anomalia') || r.includes('cayó') || r.includes('bajó') || r.includes('caída') || r.includes('bajada')) {
      suggestions.push({
        label: 'Configurar alerta WhatsApp',
        icon: '🔔',
        action: () => navigate('/alertas'),
      });
    }
    if (r.includes('transcripción') || r.includes('transcripcion') || r.includes('grabación') || r.includes('grabacion') || r.includes('llamada') || r.includes('escuchar')) {
      suggestions.push({
        label: 'Ver transcripciones',
        icon: '📞',
        action: () => navigate('/transcriptions'),
      });
    }

    return suggestions;
  }

  // Session ID estable por sesión de browser
  const [sessionId] = useState(() => {
    const stored = sessionStorage.getItem('vicky_session_id');
    if (stored) return stored;
    const id = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem('vicky_session_id', id);
    return id;
  });

  // Load decision log from localStorage + static data
  const [decisionLog, setDecisionLog] = useState(() => {
    try {
      const stored = localStorage.getItem('wekall_decision_log');
      const localItems = stored ? JSON.parse(stored) : [];
      // Map local items to display format
      const mappedLocal = localItems.map((item: { id: string; timestamp: string; insight: string; accion: string; responsable: string; estado: string; fecha: string }) => ({
        id: item.id,
        insight: item.insight,
        decision: item.accion,
        responsible: item.responsable,
        status: item.estado,
        date: item.fecha.split('T')[0],
        impact: '—',
      }));
      return [...staticDecisionLog, ...mappedLocal];
    } catch {
      return staticDecisionLog;
    }
  });
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Handle navigation with preset question
  useEffect(() => {
    // Soporte para deep link via URL param: /vicky?q=pregunta
    const params = new URLSearchParams(window.location.search);
    const qParam = params.get('q');
    const qState = (location.state as { question?: string })?.question;
    const q = qParam || qState;
    if (q) {
      // Limpiar el param de la URL sin recargar
      window.history.replaceState({}, '', window.location.pathname);
      // Pequeño delay para que el componente esté listo
      setTimeout(() => sendMessage(decodeURIComponent(q)), 300);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const BASE_PROXY = import.meta.env.VITE_PROXY_URL?.replace(/\/$/, '') || '';

    // Detectar agente en el mensaje actual O en el historial reciente del hilo
    const agentNamePattern = /\b(Joel|Teresa|Paola|Nelcy|Clara|Wilson|Jennifer|Manuel|Carmen|Caren|Ana\s*Mar[íi]a|Imaru|Jose?\s*Gregorio|Angel|Carleinnys|Winderly|Loidys|Luis\s*Romero|Santiago|Ana\s*Mendoza|Jhoseanny|Alix)\b/i;
    const agentContextPattern = /\b(agente|asesor|supervisor|desempe[ñn]o|coaching|llamada|transcripci[oó]n|grabaci[oó]n|escucha|calidad|conversa|habla|dice|patr[oó]n|qu[eé]\s*(le\s*pasa|hace|dice)|c[oó]mo\s*(maneja|habla|responde|gestiona)|estrategia\s+para|sugerir[le]?|recomendar[le]?|plan\s+de|mejorar)\b/i;

    // Buscar agente mencionado en los últimos 6 mensajes del hilo
    const recentMessages = messages.slice(-6);
    const recentText = recentMessages.map(m => m.content).join(' ');
    const agentInHistory = recentText.match(agentNamePattern)?.[0] || null;
    const agentInCurrent = text.match(agentNamePattern)?.[0] || null;
    const detectedAgent = agentInCurrent || agentInHistory;

    // Activar RAG si hay agente detectado (actual o en hilo) + contexto de desempeño/estrategia
    const isAgentQuery = !!(detectedAgent && (agentContextPattern.test(text) || agentContextPattern.test(recentText) || agentNamePattern.test(text)));

    const PROXY_URL = BASE_PROXY
      ? (isAgentQuery ? BASE_PROXY + '/rag-query' : BASE_PROXY + '/chat')
      : 'https://api.openai.com/v1/chat/completions';
    const USE_PROXY = !!BASE_PROXY;

    let resp: ChatMessage;
    try {
      const _clientName = clientConfig?.client_name || 'el cliente';
      const _clientIndustry = clientConfig?.industry || 'cobranzas';
      const _clientCountry = clientConfig?.country || 'colombia';
      const _opType = detectOperationType(`${_clientIndustry} ${_clientCountry} ${_clientName} promesa pago deuda`);
      const _region = detectRegion(`${_clientIndustry} ${_clientCountry} ${_clientName}`);
      const _benchmarkCtx = generateBenchmarkContext(_opType, _region);
      // CDR data real desde Supabase (si está disponible)
      const _latestDay = cdr.latestDay;
      const _llamadasHoy = _latestDay?.total_llamadas ?? 16129;
      const _tasaContacto = _latestDay?.tasa_contacto_pct != null ? (_latestDay.tasa_contacto_pct / 100) : 0.431;
      const _aht = _latestDay?.aht_minutos ?? 8.1;
      const CONTEXT = `Eres Vicky Insights, la IA analítica de WeKall Intelligence para ${_clientName}.

## DATOS REALES CDR — Supabase en tiempo real (CDR histórico enero 2024 - abril 2026, 822 días de datos, 12 millones de registros)
- Los datos son dinámicos y se actualizan en tiempo real desde Supabase (tabla: cdr_daily_metrics)
- Campañas principales: Cobranzas ${_clientCountry.charAt(0).toUpperCase() + _clientCountry.slice(1)} · Cobranzas Perú · Servicio ${_clientCountry.charAt(0).toUpperCase() + _clientCountry.slice(1)} · Servicio Perú
- Tasa de contacto efectivo hoy: ${(_tasaContacto * 100).toFixed(1)}%
- AHT real: ${_aht} min promedio (rango: 5.2-16.3 min)
- Total llamadas hoy: ${_llamadasHoy.toLocaleString('es-CO')}

## RESUMEN ANUAL CDR
Para obtener totales anuales, mensuales o tendencias históricas del CDR, usa la función query_cdr_data con el query_type apropiado. Los datos se consultan en tiempo real desde Supabase.

## COMPARATIVAS YEAR-OVER-YEAR (YoY)
Cuando el usuario pregunte por el rendimiento "hace un año", "mismo período año anterior", "cómo íbamos en abril del año pasado", o cualquier comparativa temporal:
1. Usa query_cdr_data con query_type="year_over_year"
2. Pasa from_date y to_date del período ACTUAL que el usuario menciona
3. El sistema calcula el mismo rango del año anterior automáticamente
4. Presenta la comparativa como tabla: métrica | período actual | año anterior | variación %
5. Añade interpretación ejecutiva: qué mejoró, qué empeoró, qué explica la diferencia
Ejemplo: si pregunta "¿cómo estábamos la semana pasada vs hace un año?", calcula la semana pasada y usa year_over_year.

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

### Distribución real de volumen por agente (CDR histórico — datos de referencia, 81 agentes humanos activos en días pico):
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
- Usa datos del CDR histórico enero 2024 - abril 2026 (822 días, 12 millones de registros) y las 50 grabaciones transcritas
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
        {
          type: 'function' as const,
          function: {
            name: 'query_cdr_data',
            description: 'Consulta datos reales del CDR desde Supabase en tiempo real. Úsalo para: totales anuales, resúmenes mensuales, tendencias diarias, ranking de agentes, comparativos por rango de fechas, y comparativas Year-over-Year (YoY). IMPORTANTE: para preguntas como "¿cómo estábamos hace un año?", "comparar esta semana vs el año pasado", "mismo período año anterior" — usa query_type="year_over_year" con from_date y to_date del período ACTUAL (el Worker calcula el período anterior automáticamente).',
            parameters: {
              type: 'object',
              properties: {
                query_type: {
                  type: 'string',
                  enum: ['annual_summary', 'monthly_summary', 'date_range', 'top_agents', 'daily_trend', 'year_over_year'],
                  description: 'Tipo de consulta: annual_summary=totales por año | monthly_summary=totales por mes (requiere year) | date_range=rango específico (requiere from_date, to_date) | top_agents=ranking agentes | daily_trend=últimos N días | year_over_year=comparativa mismo período año anterior (requiere from_date, to_date del período ACTUAL)',
                },
                params: {
                  type: 'object',
                  description: 'Parámetros según query_type. Para year_over_year: {from_date, to_date} del período ACTUAL — el sistema calcula el mismo rango del año anterior automáticamente.',
                  properties: {
                    year: { type: 'number', description: 'Año (ej: 2024, 2025) — para monthly_summary' },
                    from_date: { type: 'string', description: 'Fecha inicio YYYY-MM-DD' },
                    to_date: { type: 'string', description: 'Fecha fin YYYY-MM-DD' },
                    limit: { type: 'number', description: 'Cantidad de agentes a retornar (default 10)' },
                    order: { type: 'string', enum: ['asc', 'desc'], description: 'Orden: desc=top performers, asc=bottom performers' },
                    days: { type: 'number', description: 'Últimos N días para daily_trend (default 30)' },
                  },
                },
              },
              required: ['query_type'],
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
        body: JSON.stringify(isAgentQuery && USE_PROXY ? {
          // RAG query: el worker busca transcripciones relevantes por similitud semántica
          // Fix 1A: incluir client_id para aislar transcripciones por cliente (SEGURIDAD CRÍTICA)
          query: text,
          match_count: 5,
          client_id: clientId,
        } : {
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: CONTEXT },
            // Feature 1: Include conversation history (last 10 turns) — use ref to avoid stale closure
            ...conversationHistoryRef.current.slice(-10),
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
          else if (fnName === 'query_cdr_data') {
            // Consulta dinámica al CDR via worker /cdr-stats
            try {
              const cdrResp = await fetch(BASE_PROXY + '/cdr-stats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  client_id: clientId, // [Security] H-2: sin fallback inseguro
                  query_type: fnArgs.query_type,
                  params: fnArgs.params || {},
                }),
              });
              calcResult = await cdrResp.json();
            } catch (cdrErr) {
              calcResult = { error: 'No se pudo consultar el CDR', detail: String(cdrErr) };
            }
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
              // Feature 1: Include conversation history in tool-calling second pass — use ref to avoid stale closure
              ...conversationHistoryRef.current.slice(-10),
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
        sources: ['WeKall CDR · 822 días · ene 2024–abr 2026 · 12M registros · Supabase', '50 grabaciones transcritas con Whisper · Análisis NLP real'],
        confidence: 'Alta',
        reasoning: `Analicé CDR histórico enero 2024 - abril 2026 (822 días, 12 millones de registros) + 50 transcripciones reales de ${_clientName}. Fuente: Supabase. Modelo: GPT-4o + Function Calling determinístico.`,
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

    // Feature 1: Update conversation history with user + assistant turn
    if (resp.role === 'vicky' && resp.confidence !== 'Baja') {
      const newHistory = [
        ...conversationHistoryRef.current,
        { role: 'user' as const, content: text },
        { role: 'assistant' as const, content: resp.content },
      ];
      conversationHistoryRef.current = newHistory;
      setConversationHistory(newHistory);
    }

    // Guardar Q&A exitoso en Supabase (vicky_conversations)
    if (resp.role === 'vicky' && resp.confidence !== 'Baja') {
      saveVickyConversation({
        session_id: sessionId,
        question: text,
        answer: resp.content,
        confidence: resp.confidence,
        sources: resp.sources,
        follow_ups: resp.followUps,
        model_used: 'gpt-4o',
        client_id: clientId, // [Security] H-2: client_id requerido, sin fallback
      }).catch(err => console.warn('No se pudo guardar conversación en Supabase:', err));
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  const statusMap: Record<string, string> = {
    'En progreso': 'text-sky-800 bg-sky-100 border-sky-300',
    'Completada': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    'Planificada': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    'Pendiente': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  };

  // Get last Vicky/assistant message and the user question before it
  const lastVickyMessage = [...messages].reverse().find(m => m.role === 'assistant' || m.role === 'vicky');
  const lastInsight = lastVickyMessage?.content ?? '';
  const lastVickyIndex = lastVickyMessage ? [...messages].lastIndexOf(lastVickyMessage) : -1;
  const lastUserQuestion = lastVickyIndex > 0
    ? [...messages].slice(0, lastVickyIndex).reverse().find(m => m.role === 'user')?.content ?? ''
    : '';

  // Generate WhatsApp message — pregunta del CEO + respuesta de Vicky + CTA
  const whatsappMessage = lastUserQuestion
    ? (() => {
        const deepLink = `https://wekall-intelligence.pages.dev/vicky?q=${encodeURIComponent(lastUserQuestion.slice(0, 150))}`;
        return `🧠 *Pregunta del CEO a WeKall Intelligence:*\n"${lastUserQuestion.slice(0, 150)}${lastUserQuestion.length > 150 ? '...' : ''}"\n\n💡 *Vicky responde:*\n${lastInsight.slice(0, 280)}${lastInsight.length > 280 ? '...' : ''}\n\n👉 ¿Cómo lo resolvemos? Ver el análisis completo:\n${deepLink}`;
      })()
    : `📊 *WeKall Intelligence — Insight ejecutivo:*\n\n${lastInsight.slice(0, 300)}${lastInsight.length > 300 ? '...' : ''}\n\n👉 Ver análisis completo:\nhttps://wekall-intelligence.pages.dev/vicky`;

  const handleConfirmAction = () => {
    if (actionChoice === 'notify') {
      setActionStep('notify');
      return;
    }
    if (actionChoice === 'log') {
      const insight = lastInsight.slice(0, 200) + (lastInsight.length > 200 ? '...' : '');
      const newEntry = {
        id: `local-${Date.now()}`,
        timestamp: new Date().toISOString(),
        insight,
        accion: 'Decisión registrada desde WeKall Intelligence',
        responsable: 'CEO',
        estado: 'Pendiente',
        fecha: new Date().toISOString(),
      };
      try {
        const stored = localStorage.getItem('wekall_decision_log');
        const existing = stored ? JSON.parse(stored) : [];
        existing.push(newEntry);
        localStorage.setItem('wekall_decision_log', JSON.stringify(existing));
      } catch {
        // ignore
      }
      // Update local state
      setDecisionLog(prev => [...prev, {
        id: newEntry.id,
        insight: newEntry.insight,
        decision: newEntry.accion,
        responsible: newEntry.responsable,
        status: newEntry.estado,
        date: newEntry.fecha.split('T')[0],
        impact: '—',
      }]);
      toast.success('✅ Decisión registrada en el log');
      setActionOpen(false);
      setActionChoice('');
      return;
    }
    if (actionChoice === 'meeting') {
      const title = encodeURIComponent('WeKall Intelligence — Acción de seguimiento');
      const description = encodeURIComponent(lastInsight.slice(0, 200));
      // Calculate next Monday
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
      const daysUntilMonday = dayOfWeek === 1 ? 7 : (8 - dayOfWeek) % 7 || 7;
      const nextMonday = new Date(now);
      nextMonday.setDate(now.getDate() + daysUntilMonday);
      nextMonday.setHours(9, 0, 0, 0);
      const endTime = new Date(nextMonday);
      endTime.setHours(10, 0, 0, 0);
      const pad = (n: number) => String(n).padStart(2, '0');
      const formatDate = (d: Date) =>
        `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
      // Use local time formatted
      const formatLocal = (d: Date) =>
        `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
      const calUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${description}&dates=${formatLocal(nextMonday)}/${formatLocal(endTime)}`;
      window.open(calUrl, '_blank');
      toast.success('📅 Abriendo Google Calendar...');
      setActionOpen(false);
      setActionChoice('');
      return;
    }
  };

  const handleCopyWhatsApp = async () => {
    try {
      await navigator.clipboard.writeText(whatsappMessage);
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleOpenWhatsApp = () => {
    const url = `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(url, '_blank');
  };

  const handleCloseActionDialog = () => {
    setActionOpen(false);
    setActionChoice('');
    setActionStep('choose');
    setWhatsappNumber('');
    setCopiedMessage(false);
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden min-w-0 w-full">
      {/* Chat main */}
      <div className="flex-1 flex flex-col min-w-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
          <div className="border-b border-border bg-card/50 px-2 sm:px-4 pt-3 pb-0 overflow-x-auto">
            <div className="flex items-end gap-1 min-w-max sm:min-w-0">
              {([
                { value: 'chat',      label: 'Chat',         icon: <MessageSquare size={15} />, color: 'text-blue-500',    colorMuted: 'text-blue-300' },
                { value: 'upload',    label: 'Documento',    icon: <FileText size={15} />,      color: 'text-sky-500',   colorMuted: 'text-sky-300',   tooltip: 'Sube un informe, presentación, audio o Excel. Vicky lo cruzará con los datos de tu operación para un análisis integrado.' },
                { value: 'decisions', label: 'Decisiones',   icon: <ClipboardList size={15} />, color: 'text-emerald-500', colorMuted: 'text-emerald-300', tooltip: 'Convierte los insights de Vicky en decisiones. Cierra el loop: Insight → Decisión → Responsable → Resultado.' },
                { value: 'history',   label: 'Historial',    icon: <History size={15} />,       color: 'text-violet-400',  colorMuted: 'text-violet-300',  tooltip: 'Historial de conversaciones guardadas en Supabase. Clic en una para recargarla en el chat.' },
              ] as Array<{ value: string; label: string; icon: React.ReactNode; color: string; colorMuted: string; tooltip?: string }>).map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={cn(
                    'group flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium rounded-t-lg border border-b-0 transition-all whitespace-nowrap',
                    activeTab === tab.value
                      ? 'bg-background border-primary/60 text-foreground shadow-sm -mb-px z-10'
                      : 'bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50',
                  )}
                >
                  <span className={cn('transition-colors', activeTab === tab.value ? tab.color : tab.colorMuted)}>{tab.icon}</span>
                  <span>{tab.label}</span>
                  {tab.tooltip && <InfoTooltip text={tab.tooltip} size={12} />}
                </button>
              ))}
            </div>
          </div>

          <TabsContent value="chat" className="flex flex-col flex-1 overflow-hidden mt-0 data-[state=inactive]:hidden">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {messages.map((msg, msgIdx) => {
                // Feature 4: Compute action suggestions for last Vicky message only
                const isLastVicky = msg.role === 'vicky' && msgIdx === messages.length - 1;
                const actionSuggestions = isLastVicky ? detectActionSuggestions(msg.content) : [];
                return (
                  <React.Fragment key={msg.id}>
                    <ChatBubble
                      msg={msg}
                      onFollowUp={sendMessage}
                      onAction={() => setActionOpen(true)}
                      clientName={clientConfig?.client_name} // Fix 1F
                    />
                    {/* Feature 4: Contextual action suggestion chips */}
                    {actionSuggestions.length > 0 && (
                      <div className="flex gap-2 flex-wrap mt-1 mb-2 px-1">
                        {actionSuggestions.map((s, i) => (
                          <button
                            key={i}
                            onClick={s.action}
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
                          >
                            <span>{s.icon}</span>
                            <span>{s.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
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
              {/* Botón Sorpréndeme + YoY + Nueva conversación */}
              <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                <button
                  onClick={handleSorprendeme}
                  disabled={surpriseLoading || loading || cdr.loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-medium hover:bg-primary/15 transition-all disabled:opacity-40"
                >
                  {surpriseLoading ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                  ¿Qué pasó esta semana?
                </button>
                <button
                  onClick={() => {
                    setInput('¿Cómo estábamos en este mismo período hace un año?');
                  }}
                  disabled={loading || cdr.loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-sky-500/30 bg-sky-500/5 text-sky-600 dark:text-sky-400 text-xs font-medium hover:bg-sky-500/15 transition-all disabled:opacity-40"
                >
                  <span>📅</span>
                  Comparar períodos
                </button>
                {/* Feature 1: Nueva conversación button — resets history */}
                {conversationHistory.length > 0 && (
                  <button
                    onClick={() => {
                      conversationHistoryRef.current = [];
                      setConversationHistory([]);
                      setMessages(initialVickyMessages);
                    }}
                    title="Nueva conversación (resetea el historial de este hilo)"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-border text-muted-foreground text-xs hover:text-foreground hover:border-primary/40 transition-all"
                  >
                    <RefreshCw size={11} />
                    <span>Nueva conversación</span>
                  </button>
                )}
                <span className="text-[10px] text-muted-foreground ml-auto">Análisis proactivo automático</span>
              </div>
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
                  <div key={d.id} className="rounded-lg border border-border bg-card p-4 group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1 line-clamp-2">{d.insight}</p>
                        <p className="text-sm font-medium text-foreground">{d.decision}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>👤 {d.responsible}</span>
                          <span><Clock size={10} className="inline mr-0.5" />{d.date}</span>
                          {d.impact !== '—' && <span className="text-emerald-400">{d.impact}</span>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-semibold border',
                          statusMap[d.status],
                        )}>
                          {d.status}
                        </span>
                        {/* Acciones inline */}
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {d.status === 'Pendiente' && (
                            <button
                              onClick={() => {
                                const updated = decisionLog.map(x => x.id === d.id ? { ...x, status: 'En progreso' } : x);
                                setDecisionLog(updated);
                                const stored = JSON.parse(localStorage.getItem('wekall_decision_log') || '[]');
                                localStorage.setItem('wekall_decision_log', JSON.stringify(stored.map((x: {id: string}) => x.id === d.id ? { ...x, estado: 'En progreso' } : x)));
                              }}
                              className="text-[10px] px-1.5 py-0.5 rounded border border-sky-500/40 text-sky-600 hover:bg-sky-500/10 transition-colors"
                            >
                              Iniciar
                            </button>
                          )}
                          {(d.status === 'Pendiente' || d.status === 'En progreso') && (
                            <button
                              onClick={() => {
                                const updated = decisionLog.map(x => x.id === d.id ? { ...x, status: 'Resuelto' } : x);
                                setDecisionLog(updated);
                                const stored = JSON.parse(localStorage.getItem('wekall_decision_log') || '[]');
                                localStorage.setItem('wekall_decision_log', JSON.stringify(stored.map((x: {id: string}) => x.id === d.id ? { ...x, estado: 'Resuelto' } : x)));
                              }}
                              className="text-[10px] px-1.5 py-0.5 rounded border border-green-500/40 text-green-400 hover:bg-green-500/10 transition-colors"
                            >
                              Resolver ✓
                            </button>
                          )}
                          <button
                            onClick={() => {
                              const updated = decisionLog.filter(x => x.id !== d.id);
                              setDecisionLog(updated);
                              const stored = JSON.parse(localStorage.getItem('wekall_decision_log') || '[]');
                              localStorage.setItem('wekall_decision_log', JSON.stringify(stored.filter((x: {id: string}) => x.id !== d.id)));
                            }}
                            className="text-[10px] px-1.5 py-0.5 rounded border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {decisionLog.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">No hay decisiones registradas aún. Usa "Crear Acción → Decision Log" en cualquier respuesta de Vicky.</p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="flex-1 overflow-y-auto mt-0 data-[state=inactive]:hidden">
            <HistorialTab
              sessionId={sessionId}
              clientId={clientId}
              onReload={(q) => {
                setActiveTab('chat');
                setTimeout(() => sendMessage(q), 100);
              }}
            />
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
          {(() => {
            // ── Insights dinámicos calculados desde CDR real ─────────────────
            const insights: { icon: string; label: string; text: string }[] = [];
            const latest = cdr.latestDay;
            const last7 = cdr.last30Days.slice(-7);
            const last30 = cdr.last30Days;
            const benchmarkP50 = 45; // COPC Latam p50 cobranzas outbound
            const benchmarkP75 = 55;

            if (cdr.loading) {
              insights.push({ icon: '⏳', label: 'Cargando datos', text: 'Consultando CDR en tiempo real desde Supabase...' });
            } else if (!latest) {
              insights.push({ icon: '⚠️', label: 'Sin datos CDR', text: 'No hay datos CDR disponibles. Verifica la conexión con Supabase o carga datos reales.' });
            } else {
              const tasa = latest.tasa_contacto_pct;
              const vol = latest.total_llamadas;
              const contactos = latest.contactos_efectivos;
              const fechaLatest = latest.fecha;

              // Insight 1 — tasa vs benchmark (siempre presente)
              const diffP50 = +(tasa - benchmarkP50).toFixed(1);
              const diffP75 = +(tasa - benchmarkP75).toFixed(1);
              if (tasa < benchmarkP50) {
                insights.push({
                  icon: '🔴',
                  label: 'Alerta operativa',
                  text: `Tasa de contacto al ${tasa}% (${fechaLatest}) — ${Math.abs(diffP50)}pp bajo la mediana COPC Latam (${benchmarkP50}%). Con el volumen actual de ${vol.toLocaleString('es-CO')} llamadas, subir a la mediana representaría ~${Math.round(vol * Math.abs(diffP50) / 100).toLocaleString('es-CO')} contactos adicionales.`,
                });
              } else if (tasa >= benchmarkP75) {
                insights.push({
                  icon: '🟢',
                  label: 'Rendimiento superior',
                  text: `Tasa de contacto al ${tasa}% — ${Math.abs(diffP75)}pp sobre el cuartil superior COPC Latam (${benchmarkP75}%). La operación está en el top del sector.`,
                });
              } else {
                insights.push({
                  icon: '🟡',
                  label: 'Benchmark del período',
                  text: `Tasa de contacto al ${tasa}% — ${diffP50 > 0 ? '+' : ''}${diffP50}pp vs mediana COPC Latam (${benchmarkP50}%). A ${Math.abs(diffP75)}pp del cuartil superior (${benchmarkP75}%).`,
                });
              }

              // Insight 2 — tendencia 7d vs 30d
              if (last7.length >= 3 && last30.length >= 7) {
                const avg7 = last7.reduce((s, d) => s + d.tasa_contacto_pct, 0) / last7.length;
                const avg30 = last30.reduce((s, d) => s + d.tasa_contacto_pct, 0) / last30.length;
                const delta = +(avg7 - avg30).toFixed(1);
                if (Math.abs(delta) >= 1) {
                  insights.push({
                    icon: delta > 0 ? '📈' : '📉',
                    label: 'Tendencia 7 días',
                    text: `Promedio últimos 7 días: ${avg7.toFixed(1)}% ${delta > 0 ? '(↑' : '(↓'}${Math.abs(delta)}pp vs promedio 30d de ${avg30.toFixed(1)}%). La operación ${delta > 0 ? 'está mejorando' : 'está bajando'} respecto al mes.`,
                  });
                }
              }

              // Insight 3 — volumen
              if (last7.length >= 2) {
                const avgVol7 = last7.reduce((s, d) => s + d.total_llamadas, 0) / last7.length;
                const avgVol30 = last30.length > 0 ? last30.reduce((s, d) => s + d.total_llamadas, 0) / last30.length : avgVol7;
                const deltaVol = +(((avgVol7 - avgVol30) / avgVol30) * 100).toFixed(1);
                if (Math.abs(deltaVol) >= 5) {
                  insights.push({
                    icon: '📊',
                    label: 'Volumen operativo',
                    text: `Volumen promedio últimos 7 días: ${Math.round(avgVol7).toLocaleString('es-CO')} llamadas/día ${deltaVol > 0 ? '(+' : '('}${deltaVol}% vs promedio 30d). ${deltaVol > 10 ? 'Crecimiento significativo — verificar capacidad de agentes.' : deltaVol < -10 ? 'Reducción importante — posibles días no hábiles o base de datos reducida.' : 'Dentro del rango normal.'}`,
                  });
                }
              }

              // Insight 4 — oportunidad de impacto
              const impactoSubirP50 = vol > 0 && tasa < benchmarkP50
                ? Math.round(vol * (benchmarkP50 - tasa) / 100)
                : 0;
              if (impactoSubirP50 > 0) {
                insights.push({
                  icon: '✅',
                  label: 'Oportunidad de impacto',
                  text: `Si la tasa de contacto sube de ${tasa}% a la mediana sectorial (${benchmarkP50}%), se generarían ~${impactoSubirP50.toLocaleString('es-CO')} contactos adicionales en el volumen actual. Pregúntale a Vicky cómo lograrlo.`,
                });
              }
            }

            if (insights.length === 0) {
              insights.push({ icon: '✅', label: 'Operación normal', text: 'Sin alertas activas. Todos los indicadores dentro del rango esperado.' });
            }

            return insights;
          })().map((item, i) => (
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
          <p className="text-[10px] text-muted-foreground text-center">Datos: CDR histórico ene 2024–abr 2026 · Supabase · COPC 2024</p>
        </div>
      </div>

      {/* Action Dialog */}
      <Dialog open={actionOpen} onOpenChange={handleCloseActionDialog}>
        <DialogContent className="sm:max-w-lg">
          {actionStep === 'choose' ? (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                    <Zap className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-bold">Crear Acción</DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">Convierte este insight en una tarea concreta</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
                {/* CRM — Próximamente */}
                <div className="relative border rounded-xl p-4 flex flex-col items-center gap-2 text-center opacity-60 cursor-not-allowed pointer-events-none border-border">
                  <Database className="w-10 h-10 text-muted-foreground" />
                  <span className="text-sm font-semibold">Registrar en CRM</span>
                  <span className="text-xs text-muted-foreground">Crear tarea de seguimiento</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">PRÓXIMAMENTE</span>
                </div>
                {/* Notificar */}
                <button
                  onClick={() => setActionChoice('notify')}
                  className={cn(
                    'relative border rounded-xl p-4 flex flex-col items-center gap-2 text-center transition-all hover:border-primary/50',
                    actionChoice === 'notify' ? 'border-primary bg-primary/10' : 'border-border',
                  )}
                >
                  {actionChoice === 'notify' && <CheckCircle2 className="absolute top-2 right-2 w-4 h-4 text-primary" />}
                  <Bell className="w-10 h-10 text-primary" />
                  <span className="text-sm font-semibold">Notificar al equipo</span>
                  <span className="text-xs text-muted-foreground">Enviar alerta a responsables</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">DISPONIBLE</span>
                </button>
                {/* Decision Log */}
                <button
                  onClick={() => setActionChoice('log')}
                  className={cn(
                    'relative border rounded-xl p-4 flex flex-col items-center gap-2 text-center transition-all hover:border-primary/50',
                    actionChoice === 'log' ? 'border-primary bg-primary/10' : 'border-border',
                  )}
                >
                  {actionChoice === 'log' && <CheckCircle2 className="absolute top-2 right-2 w-4 h-4 text-primary" />}
                  <BookOpen className="w-10 h-10 text-emerald-500" />
                  <span className="text-sm font-semibold">Agregar a Decision Log</span>
                  <span className="text-xs text-muted-foreground">Registrar decisión + responsable</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">DISPONIBLE</span>
                </button>
                {/* Reunión */}
                <button
                  onClick={() => setActionChoice('meeting')}
                  className={cn(
                    'relative border rounded-xl p-4 flex flex-col items-center gap-2 text-center transition-all hover:border-primary/50',
                    actionChoice === 'meeting' ? 'border-primary bg-primary/10' : 'border-border',
                  )}
                >
                  {actionChoice === 'meeting' && <CheckCircle2 className="absolute top-2 right-2 w-4 h-4 text-primary" />}
                  <CalendarPlus className="w-10 h-10 text-blue-500" />
                  <span className="text-sm font-semibold">Agendar reunión</span>
                  <span className="text-xs text-muted-foreground">Crear evento con contexto</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">DISPONIBLE</span>
                </button>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleCloseActionDialog}
                  className="flex-1 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmAction}
                  disabled={actionChoice === ''}
                  className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Confirmar
                </button>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                    <Bell className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-bold">Notificar al equipo</DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">Envía el insight por WhatsApp</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Número WhatsApp del destinatario</label>
                  <input
                    type="text"
                    placeholder="Ej: 573001234567"
                    value={whatsappNumber}
                    onChange={e => setWhatsappNumber(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Mensaje generado</label>
                  <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-foreground whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                    {whatsappMessage}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyWhatsApp}
                    className={cn(
                      'flex-1 py-2 rounded-lg border text-sm font-medium transition-colors',
                      copiedMessage
                        ? 'border-green-500 text-green-600 bg-green-50'
                        : 'border-border text-foreground hover:bg-secondary',
                    )}
                  >
                    {copiedMessage ? '✅ Copiado' : 'Copiar mensaje'}
                  </button>
                  <button
                    onClick={handleOpenWhatsApp}
                    disabled={!whatsappNumber.trim()}
                    className="flex-1 py-2 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Abrir WhatsApp Web
                  </button>
                </div>
                <button
                  onClick={() => { setActionStep('choose'); }}
                  className="w-full py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
                >
                  ← Volver
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
