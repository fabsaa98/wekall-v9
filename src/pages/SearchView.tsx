import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MagnifyingGlass, Download, Calendar, Clock } from '@phosphor-icons/react';
import { SentimentBadge } from '@/components/SentimentBadge';
import { useTranscriptions } from '@/hooks/useTranscriptions';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function highlightText(text: string, query: string) {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="bg-wk-yellow-light/50 rounded px-0.5">{part}</mark>
      : part
  );
}

export default function SearchView() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  const enabled = debouncedQuery.length >= 2;
  const { data, isLoading } = useTranscriptions({
    search: debouncedQuery,
    limit: 100,
  });

  const results = enabled ? (data?.data ?? []) : [];

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="mx-auto max-w-2xl text-center">
        <div className="relative">
          <MagnifyingGlass size={24} weight="light" className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Buscar en todas las transcripciones... ej: cancelar, factura, queja"
            className="w-full rounded-xl border border-input bg-card px-12 py-4 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-wk-sm"
          />
        </div>
      </div>

      {/* Loading */}
      {enabled && isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-4 h-24 animate-pulse" />
          ))}
        </div>
      )}

      {/* Results */}
      {enabled && !isLoading && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted-foreground">{results.length} resultado{results.length !== 1 ? 's' : ''} para "{debouncedQuery}"</p>
            {results.length > 0 && (
              <button onClick={() => toast.success('CSV exportado')} className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-card-foreground hover:bg-secondary">
                <Download size={14} weight="light" /> Exportar CSV
              </button>
            )}
          </div>
          <div className="space-y-3">
            {results.map(t => {
              const matchingSegment = t.transcript?.find(seg => seg.text.toLowerCase().includes(debouncedQuery.toLowerCase()));
              return (
                <Link key={t.id} to={`/transcriptions/${t.id}`}
                  className="block rounded-lg border border-border bg-card p-4 shadow-wk-xs transition-shadow hover:shadow-wk-md"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-card-foreground">{t.agent.name} → {t.client.name}</p>
                    <SentimentBadge sentiment={t.classification.sentiment} size="sm" />
                  </div>
                  {matchingSegment && (
                    <p className="text-sm text-muted-foreground mb-2">
                      "...{highlightText(matchingSegment.text, debouncedQuery)}..."
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground italic line-clamp-1 mb-2">{t.summary}</p>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar size={12} />{format(new Date(t.startedAt), "d MMM yyyy", { locale: es })}</span>
                    <span className="flex items-center gap-1"><Clock size={12} />{formatDuration(t.duration)}</span>
                  </div>
                </Link>
              );
            })}
            {results.length === 0 && (
              <div className="py-16 text-center">
                <MagnifyingGlass size={48} weight="light" className="mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No se encontraron resultados para "{debouncedQuery}"</p>
              </div>
            )}
          </div>
        </div>
      )}

      {!enabled && (
        <div className="py-16 text-center">
          <MagnifyingGlass size={48} weight="light" className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-base font-medium text-foreground mb-1">Busca en todas tus transcripciones</p>
          <p className="text-sm text-muted-foreground">Escribe al menos 2 caracteres para comenzar la búsqueda</p>
        </div>
      )}
    </div>
  );
}
