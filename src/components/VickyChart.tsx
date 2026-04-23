/**
 * VickyChart — Scale-F
 * Gráfico dinámico generado automáticamente por Vicky según los datos de la respuesta.
 * Soporta: línea, barras verticales, barras horizontales.
 */
import { useState } from 'react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { BarChart2, X, TrendingUp } from 'lucide-react';
import type { VickyChartData } from '@/data/mockData';

const COLORS = ['#818cf8', '#4ade80', '#38bdf8', '#f59e0b', '#f87171'];

interface VickyChartProps {
  chartData: VickyChartData;
}

function fmtValue(value: number, unit?: string): string {
  if (!unit) return value.toLocaleString('es-CO');
  if (unit === '%') return `${value.toFixed(1)}%`;
  if (unit === 'COP') {
    if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value.toLocaleString('es-CO')}`;
  }
  return `${value.toLocaleString('es-CO')} ${unit}`;
}

// Transformar los datos al formato que espera Recharts
function toRechartsData(chartData: VickyChartData) {
  return chartData.labels.map((label, i) => {
    const point: Record<string, string | number> = { label };
    chartData.datasets.forEach(ds => {
      point[ds.label] = ds.data[i] ?? 0;
    });
    return point;
  });
}

export function VickyChart({ chartData }: VickyChartProps) {
  const [visible, setVisible] = useState(true);
  const data = toRechartsData(chartData);
  const isHorizontal = chartData.type === 'bar-horizontal';

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
  }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border border-border bg-card p-3 text-xs shadow-xl">
        <p className="font-semibold text-foreground mb-1.5">{label}</p>
        {payload.map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span style={{ color: p.color }} className="font-medium">{p.name}</span>
            <span className="text-foreground font-bold">{fmtValue(p.value, chartData.unit)}</span>
          </div>
        ))}
      </div>
    );
  };

  if (!visible) return null;

  return (
    <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-primary" />
          <span className="text-xs font-semibold text-foreground">{chartData.title}</span>
          {chartData.unit && (
            <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
              {chartData.unit}
            </span>
          )}
        </div>
        <button
          onClick={() => setVisible(false)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={13} />
        </button>
      </div>

      {/* Gráfico */}
      <div className="p-3">
        <ResponsiveContainer width="100%" height={220}>
          {chartData.type === 'line' ? (
            <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="label"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tickFormatter={v => fmtValue(v, chartData.unit)}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                axisLine={false} tickLine={false} width={52}
              />
              <Tooltip content={<CustomTooltip />} />
              {chartData.datasets.length > 1 && <Legend formatter={v => <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>{v}</span>} />}
              {chartData.benchmark !== undefined && (
                <ReferenceLine
                  y={chartData.benchmark}
                  stroke="#f59e0b"
                  strokeDasharray="5 3"
                  label={{ value: chartData.benchmarkLabel || `Bm: ${fmtValue(chartData.benchmark, chartData.unit)}`, position: 'right', fontSize: 9, fill: '#f59e0b' }}
                />
              )}
              {chartData.datasets.map((ds, i) => (
                <Line
                  key={ds.label}
                  type="monotone"
                  dataKey={ds.label}
                  stroke={ds.color || COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3, fill: ds.color || COLORS[i % COLORS.length] }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          ) : (
            <BarChart
              data={data}
              layout={isHorizontal ? 'vertical' : 'horizontal'}
              margin={{ top: 5, right: 10, left: isHorizontal ? 100 : 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              {isHorizontal ? (
                <>
                  <XAxis type="number" tickFormatter={v => fmtValue(v, chartData.unit)} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="label" type="category" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={95} />
                </>
              ) : (
                <>
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => fmtValue(v, chartData.unit)} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={52} />
                </>
              )}
              <Tooltip content={<CustomTooltip />} />
              {chartData.datasets.length > 1 && <Legend formatter={v => <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>{v}</span>} />}
              {chartData.benchmark !== undefined && (
                <ReferenceLine
                  y={chartData.benchmark}
                  stroke="#f59e0b"
                  strokeDasharray="5 3"
                  label={{ value: chartData.benchmarkLabel || `Bm: ${fmtValue(chartData.benchmark, chartData.unit)}`, position: 'right', fontSize: 9, fill: '#f59e0b' }}
                />
              )}
              {chartData.datasets.map((ds, i) => (
                <Bar
                  key={ds.label}
                  dataKey={ds.label}
                  fill={ds.color || COLORS[i % COLORS.length]}
                  radius={isHorizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
                  maxBarSize={isHorizontal ? 20 : 40}
                />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      <p className="px-4 pb-2 text-[10px] text-muted-foreground/50">
        Generado automáticamente por Vicky · Scale-F
      </p>
    </div>
  );
}

// Botón "Ver Gráfico" que se muestra en los mensajes de Vicky con chartData
export function VickyChartToggle({ chartData }: VickyChartProps) {
  const [show, setShow] = useState(false);
  return (
    <div className="mt-2">
      <button
        onClick={() => setShow(v => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all"
      >
        <BarChart2 size={13} />
        {show ? 'Ocultar gráfico' : 'Ver gráfico'}
      </button>
      {show && <VickyChart chartData={chartData} />}
    </div>
  );
}
