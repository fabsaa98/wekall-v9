import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PhoneIncoming, PhoneOutgoing, Clock, Calendar } from '@phosphor-icons/react';
import { SearchBar } from '@/components/SearchBar';
import { SentimentBadge } from '@/components/SentimentBadge';
import { TagPill } from '@/components/TagPill';
import { useTranscriptions } from '@/hooks/useTranscriptions';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';


const callTypeLabels: Record<string, string> = {
  sale: 'Venta', support: 'Soporte', collection: 'Cobranza',
  informational: 'Informativa', complaint: 'Queja', other: 'Otro',
};

const statusConfig: Record<string, { label: string; classes: string }> = {
  completed: { label: 'Completado', classes: 'bg-wk-green/10 text-wk-green-dark' },
  processing: { label: 'Procesando', classes: 'bg-wk-yellow/10 text-wk-yellow-dark animate-pulse' },
  failed: { label: 'Error', classes: 'bg-wk-red/10 text-wk-red' },
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-4 animate-pulse">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-full bg-secondary" />
            <div className="h-4 w-32 rounded bg-secondary" />
          </div>
          <div className="h-3 w-full rounded bg-secondary mb-2" />
          <div className="h-3 w-3/4 rounded bg-secondary" />
        </div>
      ))}
    </div>
  );
}

export default function TranscriptionList() {
  // Feature 3: Read URL query params for drill-to-source navigation
  const [searchParams] = useSearchParams();
  const dateFilter = searchParams.get('date') || '';
  const agentFilter = searchParams.get('agent') || '';

  const [search, setSearch] = useState(() => {
    // Pre-populate search with agent name if provided via URL
    return agentFilter || '';
  });
  const [debouncedSearch, setDebouncedSearch] = useState(() => agentFilter || '');
  const [sentimentFilter, setSentimentFilter] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isError } = useTranscriptions({
    search: debouncedSearch,
    sentiment: sentimentFilter ?? undefined,
    limit: 50,
  });

  // Feature 3: Filter transcriptions by date if provided via URL
  const allTranscriptions = data?.data ?? [];
  const transcriptions = dateFilter
    ? allTranscriptions.filter(t => {
        const tDate = new Date(t.startedAt).toISOString().split('T')[0];
        return tDate === dateFilter;
      })
    : allTranscriptions;
  const sentimentOptions = ['positive', 'negative', 'neutral', 'mixed'] as const;

  return (
    <div className="space-y-4 p-4 sm:p-6 overflow-y-auto flex-1 w-full min-w-0">
      {/* Feature 3: Active filter banner (date or agent from URL) */}
      {(dateFilter || agentFilter) && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
          <span className="text-primary font-medium">
            {dateFilter && `📅 Filtrando por fecha: ${dateFilter}`}
            {agentFilter && `👤 Filtrando por agente: ${agentFilter}`}
          </span>
          <a href="/transcriptions" className="text-xs text-muted-foreground underline hover:text-foreground">
            Ver todos
          </a>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar en transcripciones..." className="flex-1" />
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSentimentFilter(null)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${!sentimentFilter ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-muted'}`}
          >
            Todos
          </button>
          {sentimentOptions.map(s => (
            <button key={s} onClick={() => setSentimentFilter(sentimentFilter === s ? null : s)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${sentimentFilter === s ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-muted'}`}
            >
              <SentimentBadge sentiment={s} size="sm" />
            </button>
          ))}
        </div>
      </div>

      {/* States */}
      {isLoading && <ListSkeleton />}

      {isError && (
        <div className="rounded-lg border border-wk-red/20 bg-wk-red/5 p-4 text-sm text-wk-red">
          No se pudo cargar las transcripciones. Verifica la conexión al servidor.
        </div>
      )}

      {/* List */}
      {!isLoading && !isError && (
        <div className="space-y-3">
          {transcriptions.map(t => {
            const st = statusConfig[t.status];
            return (
              <Link key={t.id} to={`/transcriptions/${t.id}`}
                className="block rounded-lg border border-border bg-card p-4 shadow-wk-xs transition-shadow hover:shadow-wk-md"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0">
                      {t.agent.name.split(' ').map((n: string) => n[0]).join('').slice(0,2)}
                    </div>
                    <span className="text-sm font-medium text-card-foreground">{t.agent.name}</span>
                    {t.direction === 'inbound' ? <PhoneIncoming size={14} className="text-wk-green" /> : <PhoneOutgoing size={14} className="text-wk-blue" />}
                    <span className="text-xs text-muted-foreground">→</span>
                    <span className="text-sm text-muted-foreground">{t.client.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <SentimentBadge sentiment={t.classification.sentiment} size="sm" />
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${st.classes}`}>{st.label}</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground italic line-clamp-2 mb-2">{t.summary}</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {t.tags.slice(0, 4).map((tag: { id: string; label: string; source: string }) => (
                    <TagPill key={tag.id} label={tag.label} source={tag.source} />
                  ))}
                  {t.tags.length > 4 && <span className="text-[10px] text-muted-foreground self-center">+{t.tags.length - 4} más</span>}
                </div>
                <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar size={12} weight="light" />{format(new Date(t.startedAt), "d MMM yyyy, HH:mm", { locale: es })}</span>
                  <span className="flex items-center gap-1"><Clock size={12} weight="light" />{formatDuration(t.duration)}</span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 font-medium">{callTypeLabels[t.classification.callType]}</span>
                </div>
              </Link>
            );
          })}
          {transcriptions.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No se encontraron transcripciones.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
