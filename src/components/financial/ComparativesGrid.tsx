/**
 * ComparativesGrid — DoD, MoM, YoY, QoQ en grid 2×2
 * Scale-A Fase 2 (25 abril 2026)
 */
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { RecaudoDoD, RecaudoMoM, RecaudoYoY, RecaudoQoQ } from '@/types/financial-executive';

interface ComparativesGridProps {
  dod: RecaudoDoD | null;
  mom: RecaudoMoM[];
  yoy: RecaudoYoY[];
  qoq: RecaudoQoQ[];
  loading?: boolean;
}

function fmtCOP(n: number): string {
  if (Math.abs(n) >= 1_000_000_000) return `$${(n/1_000_000_000).toFixed(2)}B`;
  if (Math.abs(n) >= 1_000_000)     return `$${(n/1_000_000).toFixed(1)}M`;
  return `$${n.toLocaleString('es-CO')}`;
}

interface MetricBoxProps {
  title: string;
  value: string;
  change: number;
  changeLabel?: string;
  note?: string;
}

function MetricBox({ title, value, change, changeLabel, note }: MetricBoxProps) {
  const isPositive = change > 0;
  const isNeutral = change === 0;
  const Icon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;
  const colorClass = isNeutral 
    ? 'text-muted-foreground' 
    : isPositive 
      ? 'text-emerald-600 dark:text-emerald-400' 
      : 'text-red-600 dark:text-red-400';

  return (
    <div className="rounded-lg border border-border bg-card p-4 hover:bg-secondary/30 transition-colors">
      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
        {title}
      </div>
      <div className="text-2xl font-bold text-foreground mb-2">
        {value}
      </div>
      <div className={`flex items-center gap-1.5 text-sm ${colorClass}`}>
        <Icon className="h-4 w-4" />
        <span className="font-semibold">
          {isPositive ? '+' : ''}{change.toFixed(1)}%
        </span>
        {changeLabel && (
          <span className="text-muted-foreground text-xs ml-1">
            {changeLabel}
          </span>
        )}
      </div>
      {note && (
        <div className="mt-2 text-[10px] text-muted-foreground/60 italic">
          {note}
        </div>
      )}
    </div>
  );
}

export function ComparativesGrid({ dod, mom, yoy, qoq, loading = false }: ComparativesGridProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 shadow-wk-sm">
        <h3 className="text-sm font-semibold text-muted-foreground mb-4">Comparativas</h3>
        <div className="grid grid-cols-2 gap-3 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-secondary/50 rounded" />
          ))}
        </div>
      </div>
    );
  }

  const dodData = dod && dod.es_ayer ? dod : null;
  const momCurrent = mom.find(m => m.es_mes_actual);
  const yoyCurrent = yoy.find(y => y.es_year_actual);
  const qoqCurrent = qoq.find(q => q.es_quarter_actual);

  return (
    <div className="rounded-xl border border-border bg-gradient-to-br from-card to-secondary/30 p-5 shadow-wk-sm">
      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        Comparativas
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {/* DoD - Day-over-Day */}
        <MetricBox
          title="DoD (Ayer)"
          value={dodData ? fmtCOP(dodData.recaudo_cop) : 'N/D'}
          change={dodData?.dod_pct ?? 0}
          changeLabel="vs ant."
        />

        {/* MoM - Month-over-Month */}
        <MetricBox
          title="MoM (Mes actual)"
          value={momCurrent ? fmtCOP(momCurrent.recaudo_cop) : 'N/D'}
          change={momCurrent?.mom_pct ?? 0}
          changeLabel="vs mes ant."
          note={momCurrent && momCurrent.dias_laborables < 10 ? '(mes parcial)' : undefined}
        />

        {/* YoY - Year-over-Year */}
        <MetricBox
          title="YoY (2026)"
          value={yoyCurrent ? fmtCOP(yoyCurrent.recaudo_ytd_cop) : 'N/D'}
          change={yoyCurrent?.yoy_pct ?? 0}
          changeLabel="vs 2025"
        />

        {/* QoQ - Quarter-over-Quarter */}
        <MetricBox
          title={qoqCurrent ? `QoQ (${qoqCurrent.quarter})` : 'QoQ'}
          value={qoqCurrent ? fmtCOP(qoqCurrent.recaudo_cop) : 'N/D'}
          change={qoqCurrent?.qoq_pct ?? 0}
          changeLabel="vs Q ant."
        />
      </div>
    </div>
  );
}
