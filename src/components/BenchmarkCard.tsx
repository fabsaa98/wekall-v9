// Scale-H US-EI-009: Benchmark Comparator Card
// 01 de mayo de 2026

import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface BenchmarkCardProps {
  metric: string;
  currentValue: number;
  benchmarkValue: number;
  topQuartile?: number;
  bottomQuartile?: number;
  unit: string;
  source: string;
  gapPercent: number;
  position: 'above' | 'below' | 'inline';
}

export function BenchmarkCard({
  metric,
  currentValue,
  benchmarkValue,
  topQuartile,
  bottomQuartile,
  unit,
  source,
  gapPercent,
  position,
}: BenchmarkCardProps) {
  const metricLabel = getMetricLabel(metric);
  const maxValue = topQuartile || Math.max(currentValue, benchmarkValue) * 1.2;

  return (
    <div className="benchmark-card border rounded-lg p-4 bg-card hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-semibold text-sm">{metricLabel}</h4>
        <span
          className={cn(
            'px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1',
            position === 'above'
              ? 'bg-green-500/10 text-green-700 dark:text-green-400'
              : position === 'below'
              ? 'bg-red-500/10 text-red-700 dark:text-red-400'
              : 'bg-gray-500/10 text-gray-700 dark:text-gray-400'
          )}
        >
          {position === 'above' ? (
            <>
              <TrendingUp size={12} /> Por encima
            </>
          ) : position === 'below' ? (
            <>
              <TrendingDown size={12} /> Por debajo
            </>
          ) : (
            <>
              <Minus size={12} /> En línea
            </>
          )}
        </span>
      </div>

      {/* Gauge visual */}
      <div className="relative h-3 bg-gray-100 rounded-full mb-4 overflow-hidden">
        {/* Zones */}
        {bottomQuartile && (
          <div
            className="absolute h-full bg-red-100"
            style={{
              left: 0,
              width: `${(bottomQuartile / maxValue) * 100}%`,
            }}
          />
        )}
        {bottomQuartile && topQuartile && (
          <div
            className="absolute h-full bg-yellow-100"
            style={{
              left: `${(bottomQuartile / maxValue) * 100}%`,
              width: `${((topQuartile - bottomQuartile) / maxValue) * 100}%`,
            }}
          />
        )}
        {topQuartile && (
          <div
            className="absolute h-full bg-green-100"
            style={{
              left: `${(topQuartile / maxValue) * 100}%`,
              width: `${((maxValue - topQuartile) / maxValue) * 100}%`,
            }}
          />
        )}

        {/* Benchmark indicator (line) */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-gray-400"
          style={{ left: `${(benchmarkValue / maxValue) * 100}%` }}
          title={`Benchmark: ${benchmarkValue}${unit}`}
        />

        {/* Current value indicator (thick bar) */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded shadow-sm"
          style={{ left: `${(currentValue / maxValue) * 100}%` }}
          title={`Tu valor: ${currentValue}${unit}`}
        />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
        <div>
          <p className="text-muted-foreground text-xs mb-0.5">Tu performance</p>
          <p className="font-bold text-lg">
            {currentValue.toFixed(1)}
            <span className="text-xs font-normal text-muted-foreground ml-0.5">{unit}</span>
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs mb-0.5">Benchmark</p>
          <p className="font-semibold text-lg text-muted-foreground">
            {benchmarkValue.toFixed(1)}
            <span className="text-xs font-normal ml-0.5">{unit}</span>
          </p>
        </div>
        <div className="col-span-2">
          <p className="text-muted-foreground text-xs mb-0.5">Gap</p>
          <p
            className={cn(
              'font-bold text-lg',
              gapPercent > 0 ? 'text-green-600' : gapPercent < 0 ? 'text-red-600' : 'text-gray-600'
            )}
          >
            {gapPercent > 0 ? '+' : ''}
            {gapPercent.toFixed(1)}%
            {topQuartile && position === 'above' && currentValue < topQuartile && (
              <span className="text-xs font-normal text-muted-foreground ml-2">
                (Top: {topQuartile}
                {unit})
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Source */}
      <p className="text-[10px] text-muted-foreground mb-2 italic">Fuente: {source}</p>

      {/* Insight */}
      <div className="p-2 bg-secondary/50 rounded text-xs leading-relaxed">
        {position === 'above' ? (
          <p>
            ✅ Estás <strong>{Math.abs(gapPercent).toFixed(1)}%</strong> por encima del benchmark.{' '}
            {topQuartile && currentValue < topQuartile ? (
              <>
                Oportunidad: alcanzar top quartile ({topQuartile}
                {unit}) para destacar en la industria.
              </>
            ) : (
              'Excelente performance.'
            )}
          </p>
        ) : position === 'below' ? (
          <p>
            ⚠️ Estás <strong>{Math.abs(gapPercent).toFixed(1)}%</strong> por debajo del benchmark. Gap de{' '}
            <strong>
              {Math.abs(currentValue - benchmarkValue).toFixed(1)}
              {unit}
            </strong>
            . Prioriza mejoras en esta métrica.
          </p>
        ) : (
          <p>➡️ Tu performance está en línea con el benchmark de la industria.</p>
        )}
      </div>
    </div>
  );
}

function getMetricLabel(metric: string): string {
  const labels: Record<string, string> = {
    tasa_contacto: 'Tasa de Contacto',
    aht: 'AHT (Tiempo Promedio)',
    fcr: 'FCR (First Call Resolution)',
    csat: 'CSAT (Satisfacción)',
    nps: 'Net Promoter Score',
    abandono: 'Tasa de Abandono',
    conversion: 'Tasa de Conversión',
    tasa_promesa: 'Tasa de Promesa de Pago',
    costo_llamada: 'Costo por Llamada',
    tco: 'TCO (Total Cost of Ownership)',
    productividad: 'Productividad Agente',
    utilizacion: 'Utilización',
  };
  return labels[metric] || metric.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}
