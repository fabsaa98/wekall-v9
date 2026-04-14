/**
 * VickyChatHistory — Panel de historial de conversaciones con Vicky.
 * Extraído de VickyInsights.tsx (M-2 refactor) para mantener el componente principal manejable.
 */
import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, History, Loader2 } from 'lucide-react';
import { getVickyHistory, type VickyConversation } from '@/lib/supabase';

interface VickyChatHistoryProps {
  sessionId: string;
  clientId: string;
  onReload: (question: string) => void;
}

export function VickyChatHistory({ sessionId, clientId, onReload }: VickyChatHistoryProps) {
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
        Últimas {history.length} conversaciones · tabla{' '}
        <code className="bg-secondary px-1 rounded">vicky_conversations</code>
      </p>
      {history.map((conv, i) => {
        const ts = conv.created_at ? new Date(conv.created_at) : null;
        const timeStr = ts
          ? ts.toLocaleString('es-CO', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
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
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full border font-semibold ${
                        conv.confidence === 'Alta'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                      }`}
                    >
                      {conv.confidence}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onReload(conv.question);
                  }}
                  className="text-[10px] px-2 py-1 rounded border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
                  title="Recargar pregunta en el chat"
                >
                  Recargar
                </button>
                {isOpen ? (
                  <ChevronDown size={14} className="text-muted-foreground" />
                ) : (
                  <ChevronRight size={14} className="text-muted-foreground" />
                )}
              </div>
            </button>

            {/* Contenido colapsable */}
            {isOpen && (
              <div className="border-t border-border p-3 space-y-2 animate-fade-in">
                <div className="flex gap-2">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase shrink-0 mt-0.5">
                    Pregunta
                  </span>
                  <p className="text-xs text-foreground leading-relaxed">{conv.question}</p>
                </div>
                <div className="flex gap-2">
                  <span className="text-[10px] font-semibold text-primary uppercase shrink-0 mt-0.5">
                    Vicky
                  </span>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-6">
                    {conv.answer}
                  </p>
                </div>
                {conv.sources && conv.sources.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {conv.sources.map((s, si) => (
                      <span
                        key={si}
                        className="px-1.5 py-0.5 rounded-full bg-secondary text-[10px] text-muted-foreground border border-border"
                      >
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
