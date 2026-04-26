/**
 * SparklineTrend — Gráfico micro últimos 30 días con promedio móvil
 * Scale-A Fase 2 (25 abril 2026)
 */
import { TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { RecaudoSparkline } from '@/types/financial-executive';

interface SparklineTrendProps {
  data: RecaudoSparkline[];
  loading?: boolean;
}

function fmtCOP(n: number): string {
  if (Math.abs(n) >= 1_000_000_000) return `$${(n/1_000_000_000).toFixed(2)}B`;
  if (Math.abs(n) >= 1_000_000)     return `$${(n/1_000_000).toFixed(1)}M`;
  return `$${n.toLocaleString('es-CO')}`;
}

function CustomTooltip({ active, payload }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; dataKey: string }>;
}) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload as RecaudoSparkline;
  const fecha = new Date(data.fecha);
  const fechaLabel = `${fecha.getDate()}/${fecha.getMonth() + 1}`;

  return (
    <div className="rounded-lg border border-border bg-card p-3 text-xs shadow-xl">
      <p className="font-semibold text-foreground mb-1.5">{fechaLabel}</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Recaudo:</span>
          <span className="text-foreground font-bold">{fmtCOP(data.recaudo_cop)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Prom. 7d:</span>
          <span className="text-primary font-semibold">{fmtCOP(data.promedio_movil_7d)}</span>
        </div>
      </div>
    </div>
  );
}

export function SparklineTrend({ data, loading = false }: SparklineTrendProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 shadow-wk-sm animate-pulse">
        <div className="h-4 bg-secondary/50 rounded w-1/2 mb-3" />
        <div className="h-32 bg-secondary/50 rounded" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 shadow-wk-sm">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-muted-foreground">Tendencia 30 días</h3>
        </div>
        <p className="text-xs text-muted-foreground">Sin datos disponibles</p>
      </div>
    );
  }

  const promedioGlobal = data.length > 0 
    ? data.reduce((sum, d) => sum + d.promedio_movil_7d, 0) / data.length 
    : 0;

  return (
    <div className="rounded-xl border border-border bg-gradient-to-br from-card to-secondary/30 p-5 shadow-wk-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Tendencia 30 días</h3>
        </div>
        <div className="text-xs text-muted-foreground">
          {data.length} días
        </div>
      </div>

      {/* Chart */}
      <div className="h-32 -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="fecha" 
              hide 
            />
            <YAxis hide domain={['dataMin', 'dataMax']} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="recaudo_cop"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#sparklineGradient)"
              dot={false}
              activeDot={{ r: 4, fill: 'hsl(var(--primary))' }}
            />
            <Area
              type="monotone"
              dataKey="promedio_movil_7d"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={1}
              strokeDasharray="3 3"
              fill="none"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Stats */}
      <div className="mt-4 pt-3 border-t border-border/50 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Promedio móvil 7d:</span>
          <span className="font-semibold text-foreground">
            {fmtCOP(promedioGlobal)}
          </span>
        </div>
      </div>
    </div>
  );
}
