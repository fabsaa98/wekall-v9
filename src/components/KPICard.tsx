import { TrendingUp, TrendingDown, Minus, ZoomIn } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import type { KPIData } from '@/data/mockData';
import { InfoTooltip } from '@/components/InfoTooltip';

interface KPICardProps {
  kpi: KPIData;
  className?: string;
  style?: React.CSSProperties;
  onDrillDown?: (metric: string) => void;
}

export function KPICard({ kpi, className, style, onDrillDown }: KPICardProps) {
  const isPositive = kpi.change >= 0;
  const isGood = kpi.invertColor ? !isPositive : isPositive;

  const sparkData = kpi.sparkline.map((v, i) => ({ i, v }));
  const vsPositive = kpi.vsIndustry >= 0;

  // Sparkline max/min dots
  const hasEnoughSparkData = sparkData.length >= 3;
  const sparkMaxIdx = hasEnoughSparkData
    ? sparkData.reduce((best, d, i, arr) => d.v > arr[best].v ? i : best, 0)
    : -1;
  const sparkMinIdx = hasEnoughSparkData
    ? sparkData.reduce((best, d, i, arr) => d.v < arr[best].v ? i : best, 0)
    : -1;
  const showSparkDots = hasEnoughSparkData && sparkMaxIdx !== sparkMinIdx;
  const sparkMaxColor = kpi.invertColor ? '#ef4444' : '#22c55e';
  const sparkMinColor = kpi.invertColor ? '#22c55e' : '#ef4444';

  return (
    <div
      className={cn(
        'kpi-card rounded-xl border border-border bg-card p-5 flex flex-col gap-3 animate-fade-slide-up relative group',
        onDrillDown ? 'cursor-pointer hover:border-primary/40 transition-all' : 'cursor-default',
        className,
      )}
      style={style}
      onClick={() => onDrillDown?.(kpi.id)}
    >
      {/* Drill-down icon */}
      {onDrillDown && (
        <button
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20"
          onClick={(e) => { e.stopPropagation(); onDrillDown(kpi.id); }}
          title="Ver análisis detallado"
          aria-label="Drill-down"
        >
          <ZoomIn size={14} />
        </button>
      )}

      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest truncate flex items-center gap-1">
            {kpi.title}
            {kpi.description && (
              <InfoTooltip text={kpi.description} size={11} position="top" />
            )}
          </p>
          <p className="mt-1.5 text-[28px] font-bold text-foreground leading-none tracking-tight">
            {kpi.value}
          </p>
        </div>

        {/* Sparkline */}
        <div className="w-20 h-10 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={{ top: 8, right: 2, bottom: 0, left: 2 }}>
              <defs>
                <linearGradient id={`sg-${kpi.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6334C0" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#6334C0" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke="#6334C0"
                strokeWidth={1.5}
                fill={`url(#sg-${kpi.id})`}
                activeDot={false}
                dot={showSparkDots ? (props: any) => {
                  const { cx, cy, index, value } = props;
                  const isMax = index === sparkMaxIdx;
                  const isMin = index === sparkMinIdx;
                  if (!isMax && !isMin) return <g key={index} />;
                  const color = isMax ? sparkMaxColor : sparkMinColor;
                  const fmt = typeof value === 'number'
                    ? (value % 1 === 0 ? String(value) : value.toFixed(1))
                    : String(value);
                  return (
                    <g key={index}>
                      <circle cx={cx} cy={cy} r={3} fill={color} stroke="none" />
                      <text
                        x={cx}
                        y={isMax ? cy - 5 : cy + 11}
                        textAnchor="middle"
                        fontSize={7}
                        fill={color}
                        fontWeight="600"
                      >
                        {fmt}
                      </text>
                    </g>
                  );
                } : false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* Trend */}
        <div className={cn(
          'flex items-center gap-1 text-xs font-semibold',
          isGood ? 'text-emerald-400' : 'text-red-400',
        )}>
          {Math.abs(kpi.change) < 0.1
            ? <Minus size={13} />
            : isPositive ? <TrendingUp size={13} /> : <TrendingDown size={13} />
          }
          <span>{kpi.changeLabel}</span>
          <span className="font-normal text-muted-foreground ml-0.5">vs sem. ant. (N/D)</span>
        </div>

        {/* vs Industria badge */}
        {kpi.vsIndustry === 0 ? (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-slate-500/10 text-slate-400 border-slate-500/20">
            N/D vs industria
          </div>
        ) : (
          <div className={cn(
            'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border',
            vsPositive
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-red-500/10 text-red-400 border-red-500/20',
          )}>
            {kpi.vsIndustry > 0 ? '+' : ''}{kpi.vsIndustry.toFixed(1)}pp vs industria
          </div>
        )}
      </div>
    </div>
  );
}
