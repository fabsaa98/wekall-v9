/**
 * RealTimeCard — Recaudo HOY en tiempo real
 * Scale-A Fase 2 (25 abril 2026)
 */
import { DollarSign, TrendingUp, CheckCircle2, Clock } from 'lucide-react';
import type { RecaudoHoy } from '@/types/financial-executive';

interface RealTimeCardProps {
  data: RecaudoHoy | null;
  loading?: boolean;
}

function fmtCOP(n: number): string {
  if (Math.abs(n) >= 1_000_000_000) return `$${(n/1_000_000_000).toFixed(2)}B`;
  if (Math.abs(n) >= 1_000_000)     return `$${(n/1_000_000).toFixed(1)}M`;
  return `$${n.toLocaleString('es-CO')}`;
}

function fmtUSD(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `USD $${(n/1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000)     return `USD $${(n/1_000).toFixed(1)}K`;
  return `USD $${n.toFixed(0)}`;
}

export function RealTimeCard({ data, loading = false }: RealTimeCardProps) {
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 shadow-wk-sm animate-pulse">
        <div className="h-4 bg-secondary/50 rounded w-1/2 mb-3" />
        <div className="h-8 bg-secondary/50 rounded w-3/4 mb-2" />
        <div className="h-6 bg-secondary/50 rounded w-1/2" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 shadow-wk-sm">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-muted-foreground">Recaudo HOY</h3>
        </div>
        <p className="text-xs text-muted-foreground">Sin datos disponibles</p>
      </div>
    );
  }

  const roiColor = data.roi > 3 
    ? 'text-emerald-700 dark:text-emerald-300' 
    : data.roi > 1 
      ? 'text-yellow-700 dark:text-yellow-300' 
      : 'text-red-600 dark:text-red-400';

  return (
    <div className="rounded-xl border border-border bg-gradient-to-br from-card to-secondary/30 p-5 shadow-wk-sm hover:shadow-wk-md transition-shadow">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Recaudo HOY</h3>
      </div>

      {/* Recaudo principal */}
      <div className="mb-3">
        <div className="text-3xl font-bold text-primary mb-1">
          {fmtCOP(data.recaudo_cop)}
        </div>
        <div className="text-sm text-muted-foreground">
          {fmtUSD(data.recaudo_usd)}
        </div>
      </div>

      {/* Promesas cumplidas */}
      <div className="flex items-center gap-2 mb-3 text-sm">
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        <span className="text-foreground font-medium">
          {data.promesas_cumplidas.toLocaleString('es-CO')} promesas cumplidas
        </span>
      </div>

      {/* ROI */}
      <div className="flex items-center gap-2 mb-4 text-sm">
        <TrendingUp className="h-4 w-4 text-primary" />
        <span className="text-muted-foreground">ROI:</span>
        <span className={`font-bold ${roiColor}`}>
          {data.roi.toFixed(1)}x
        </span>
      </div>

      {/* Timestamp */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-3 border-t border-border/50">
        <Clock className="h-3 w-3" />
        <span>Actualizado: {timeStr}</span>
      </div>
    </div>
  );
}
