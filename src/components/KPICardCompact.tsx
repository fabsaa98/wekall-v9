import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KPIData } from '@/data/mockData';

interface KPICardCompactProps {
  kpi: KPIData;
  className?: string;
  style?: React.CSSProperties;
}

export function KPICardCompact({ kpi, className, style }: KPICardCompactProps) {
  const isPositive = kpi.change >= 0;
  const isGood = kpi.invertColor ? !isPositive : isPositive;

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card p-3.5 flex items-center justify-between gap-3 hover:border-primary/30 transition-all',
        className,
      )}
      style={style}
    >
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest truncate">
          {kpi.title}
        </p>
        <p className="mt-0.5 text-lg font-bold text-foreground">{kpi.value}</p>
      </div>

      <div className={cn(
        'flex items-center gap-0.5 text-xs font-semibold shrink-0',
        isGood ? 'text-emerald-400' : 'text-red-400',
      )}>
        {isPositive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
        <span>{kpi.changeLabel}</span>
      </div>
    </div>
  );
}
