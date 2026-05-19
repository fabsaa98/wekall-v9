// CustomerJourney.tsx — WeKall Intelligence
// Customer Journey Timeline across all channels

import { useState } from 'react';
import { Search, Loader2, AlertTriangle, CheckCircle2, XCircle, Clock, Phone, MessageCircle, Mail, Monitor, User } from 'lucide-react';
import { useClient } from '@/contexts/ClientContext';
import { cn } from '@/lib/utils';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Touchpoint {
  id: string;
  channel: 'voz' | 'whatsapp' | 'email' | 'chat';
  timestamp: string;
  agent_name: string;
  summary: string;
  resultado: 'exitoso' | 'fallido' | 'pendiente' | 'no_contacto';
}

interface Journey {
  journey_id: string;
  customer_id: string;
  touchpoints: Touchpoint[];
  inicio: string;
  fin: string;
  resultado: 'exitoso' | 'fallido' | 'pendiente' | 'abandonado';
  created_at: string;
}

// ─── Channel Icons & Colors ───────────────────────────────────────────────────

function getChannelIcon(channel: Touchpoint['channel']) {
  switch (channel) {
    case 'voz': return Phone;
    case 'whatsapp': return MessageCircle;
    case 'email': return Mail;
    case 'chat': return Monitor;
    default: return Phone;
  }
}

function getChannelColor(channel: Touchpoint['channel']) {
  switch (channel) {
    case 'voz': return 'text-blue-400 bg-blue-500/10';
    case 'whatsapp': return 'text-green-400 bg-green-500/10';
    case 'email': return 'text-purple-400 bg-purple-500/10';
    case 'chat': return 'text-orange-400 bg-orange-500/10';
    default: return 'text-slate-400 bg-slate-500/10';
  }
}

type ResultadoAny = Touchpoint['resultado'] | Journey['resultado'];

function getResultadoColor(resultado: ResultadoAny) {
  switch (resultado) {
    case 'exitoso': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    case 'fallido': return 'text-red-400 bg-red-500/10 border-red-500/20';
    case 'pendiente': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    case 'no_contacto': return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    case 'abandonado': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
    default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
  }
}

function getResultadoIcon(resultado: Touchpoint['resultado']) {
  switch (resultado) {
    case 'exitoso': return CheckCircle2;
    case 'fallido': return XCircle;
    case 'pendiente': return Clock;
    case 'no_contacto': return AlertTriangle;
    default: return Clock;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CustomerJourney() {
  const { clientId } = useClient();
  const [customerId, setCustomerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [journey, setJourney] = useState<Journey | null>(null);

  const handleSearch = async () => {
    if (!customerId.trim()) {
      setError('Por favor ingresa un ID de cliente');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setJourney(null);

      const PROXY = (import.meta.env.VITE_PROXY_URL || 'https://wekall-vicky-proxy.fabsaa98.workers.dev').replace(/\/$/, '');
      
      const resp = await fetch(`${PROXY}/rpc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          function: 'get_customer_journey',
          args: {
            p_customer_id: customerId.trim(),
            p_client_id: clientId,
          },
        }),
      });

      if (!resp.ok) throw new Error(`Error ${resp.status}`);
      
      const data = await resp.json();
      
      if (!data || data.length === 0) {
        setError('No se encontró un journey para este cliente');
        return;
      }

      // Parse touchpoints from JSONB
      const journeyData = data[0];
      setJourney({
        ...journeyData,
        touchpoints: typeof journeyData.touchpoints === 'string' 
          ? JSON.parse(journeyData.touchpoints) 
          : journeyData.touchpoints || [],
      });

    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error cargando journey');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1200px] mx-auto overflow-y-auto flex-1 w-full min-w-0">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/15 shrink-0">
          <User size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">Customer Journey</h1>
          <p className="text-xs text-muted-foreground">
            Timeline visual del recorrido de un cliente a través de todos los canales
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <label className="block">
          <span className="text-sm font-semibold text-foreground mb-2 block">
            ID de Cliente o Teléfono
          </span>
          <div className="flex gap-2">
            <input
              type="text"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ej: C001, +573101234567, 3101234567"
              className="flex-1 px-4 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className={cn(
                "px-6 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all",
                loading 
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Buscando...
                </>
              ) : (
                <>
                  <Search size={16} />
                  Buscar
                </>
              )}
            </button>
          </div>
        </label>

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-400" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
      </div>

      {/* Journey Timeline */}
      {journey && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-6">
          {/* Journey Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
            <div>
              <h2 className="text-base font-bold text-foreground">
                Cliente: {journey.customer_id}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                {journey.touchpoints.length} interacciones · 
                {new Date(journey.inicio).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })} - 
                {new Date(journey.fin).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <div className={cn(
              "px-4 py-2 rounded-lg border text-sm font-semibold",
              getResultadoColor(journey.resultado)
            )}>
              {journey.resultado === 'exitoso' && '✅ Exitoso'}
              {journey.resultado === 'fallido' && '❌ Fallido'}
              {journey.resultado === 'pendiente' && '⏳ Pendiente'}
              {journey.resultado === 'abandonado' && '⚠️ Abandonado'}
            </div>
          </div>

          {/* Timeline */}
          <div className="relative space-y-6">
            {/* Vertical line */}
            <div className="absolute left-5 top-4 bottom-4 w-0.5 bg-border" />

            {journey.touchpoints.map((tp, idx) => {
              const ChannelIcon = getChannelIcon(tp.channel);
              const ResultadoIcon = getResultadoIcon(tp.resultado);
              const isLast = idx === journey.touchpoints.length - 1;

              return (
                <div key={tp.id} className="relative flex gap-4">
                  {/* Icon */}
                  <div className={cn(
                    "relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                    getChannelColor(tp.channel)
                  )}>
                    <ChannelIcon size={18} />
                  </div>

                  {/* Content */}
                  <div className={cn(
                    "flex-1 rounded-lg border bg-card/50 p-4 space-y-2",
                    isLast ? "border-primary/30" : "border-border"
                  )}>
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">
                          {tp.channel === 'voz' && '📞 Llamada'}
                          {tp.channel === 'whatsapp' && '💬 WhatsApp'}
                          {tp.channel === 'email' && '📧 Email'}
                          {tp.channel === 'chat' && '💻 Chat'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          · {tp.agent_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {new Date(tp.timestamp).toLocaleString('es-CO', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        <div className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium",
                          getResultadoColor(tp.resultado)
                        )}>
                          <ResultadoIcon size={12} />
                          {tp.resultado}
                        </div>
                      </div>
                    </div>

                    {/* Summary */}
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      {tp.summary}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!journey && !error && !loading && (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <div className="p-4 rounded-full bg-muted w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Search size={28} className="text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-2">
            Busca un cliente para ver su journey
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Ingresa un ID de cliente o número de teléfono para visualizar todas sus interacciones
            a través de voz, WhatsApp, email y chat.
          </p>
        </div>
      )}
    </div>
  );
}
