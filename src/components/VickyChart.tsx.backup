/**
 * VickyChart — Scale-F v2
 * Toolkit de gráficos ejecutivos para Vicky Insights.
 * Tipos: line, bar, bar-horizontal, pie (dona)
 */
import { useState } from 'react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Cell, PieChart, Pie,
} from 'recharts';
import { BarChart2, X, TrendingUp, ChevronDown } from 'lucide-react';
import type { VickyChartData } from '@/data/mockData';

// Paleta WeKall Intelligence
const PALETTE = ['#818cf8', '#4ade80', '#38bdf8', '#f59e0b', '#f87171', '#a78bfa', '#34d399', '#60a5fa'];

interface VickyChartProps {
  chartData: VickyChartData;
}

function fmtValue(value: number, unit?: string): string {
  if (!unit || unit === 'ocurrencias' || unit === 'llamadas') {
    if (Math.abs(value) >= 1_000_000) return `${(value/1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000) return `${(value/1_000).toFixed(1)}K`;
    return value.toLocaleString('es-CO');
  }
  if (unit === '%') return `${value.toFixed(1)}%`;
  if (unit === 'COP') {
    if (Math.abs(value) >= 1_000_000) return `$${(value/1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000) return `$${(value/1_000).toFixed(0)}K`;
    return `$${value.toLocaleString('es-CO')}`;
  }
  return `${value.toLocaleString('es-CO')}`;
}

function toRechartsData(chartData: VickyChartData) {
  return chartData.labels.map((label, i) => {
    const point: Record<string, string | number> = { label };
    chartData.datasets.forEach(ds => { point[ds.label] = ds.data[i] ?? 0; });
    return point;
  });
}

// Tooltip personalizado
function VickyTooltip({ active, payload, label, unit }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  unit?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-3 text-xs shadow-xl max-w-[200px]">
      <p className="font-semibold text-foreground mb-1.5 break-words">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <span style={{ color: p.color }} className="font-medium truncate">{p.name}</span>
          <span className="text-foreground font-bold shrink-0">{fmtValue(p.value, unit)}</span>
        </div>
      ))}
    </div>
  );
}

// Label para pie chart
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: {
  cx: number; cy: number; midAngle: number;
  innerRadius: number; outerRadius: number; percent: number; name: string;
}) {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight="600">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export function VickyChart({ chartData }: VickyChartProps) {
  const data = toRechartsData(chartData);
  const isPie = chartData.type === 'pie';
  const isHorizontal = chartData.type === 'bar-horizontal';
  const isLine = chartData.type === 'line';

  // Para pie chart, transformar datos
  const pieData = isPie ? chartData.labels.map((label, i) => ({
    name: label,
    value: chartData.datasets[0]?.data[i] ?? 0,
  })) : [];

  return (
    <div className="mt-3 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50">
        <div className="flex items-center gap-2 min-w-0">
          <TrendingUp size={13} className="text-primary shrink-0" />
          <span className="text-xs font-semibold text-foreground truncate">{chartData.title}</span>
          {chartData.unit && chartData.unit !== 'ocurrencias' && (
            <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded shrink-0">
              {chartData.unit}
            </span>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground/40 ml-2 shrink-0">Vicky · Scale-F</span>
      </div>

      {/* Chart */}
      <div className="p-3">
        {isPie ? (
          // ── Pie / Dona ──────────────────────────────────────────────────
          <div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  labelLine={false}
                  label={PieLabel}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number, name: string) => [fmtValue(v, chartData.unit), name]} />
              </PieChart>
            </ResponsiveContainer>
            {/* Leyenda manual */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 px-2 pb-1 justify-center">
              {pieData.map((item, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
                  <span className="truncate max-w-[120px]">{item.name}</span>
                  <span className="font-semibold text-foreground">{fmtValue(item.value, chartData.unit)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : isHorizontal ? (
          // ── Barras Horizontales (ranking) ────────────────────────────────
          <ResponsiveContainer width="100%" height={Math.max(200, chartData.labels.length * 36)}>
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 40, left: 8, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" tickFormatter={v => fmtValue(v, chartData.unit)}
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="label" type="category"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false} tickLine={false} width={110}
                tickFormatter={v => v.length > 18 ? v.slice(0, 18) + '…' : v}
              />
              <Tooltip content={<VickyTooltip unit={chartData.unit} />} />
              {chartData.benchmark !== undefined && (
                <ReferenceLine x={chartData.benchmark} stroke="#f59e0b" strokeDasharray="5 3"
                  label={{ value: chartData.benchmarkLabel || `Bm ${fmtValue(chartData.benchmark, chartData.unit)}`, position: 'top', fontSize: 9, fill: '#f59e0b' }} />
              )}
              {chartData.datasets.map((ds, i) => (
                <Bar key={ds.label} dataKey={ds.label} radius={[0, 6, 6, 0]} maxBarSize={22}
                  label={{ position: 'right', fontSize: 10, fill: 'hsl(var(--muted-foreground))', formatter: (v: number) => fmtValue(v, chartData.unit) }}>
                  {data.map((_, j) => (
                    <Cell key={j} fill={ds.color || PALETTE[i % PALETTE.length]} fillOpacity={j === 0 ? 1 : 0.7} />
                  ))}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : isLine ? (
          // ── Línea (tendencia temporal) ────────────────────────────────────
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => fmtValue(v, chartData.unit)}
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={48} />
              <Tooltip content={<VickyTooltip unit={chartData.unit} />} />
              {chartData.datasets.length > 1 && <Legend formatter={v => <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>{v}</span>} />}
              {chartData.benchmark !== undefined && (
                <ReferenceLine y={chartData.benchmark} stroke="#f59e0b" strokeDasharray="5 3"
                  label={{ value: chartData.benchmarkLabel || `Bm ${fmtValue(chartData.benchmark, chartData.unit)}`, position: 'insideTopRight', fontSize: 9, fill: '#f59e0b' }} />
              )}
              {chartData.datasets.map((ds, i) => (
                <Line key={ds.label} type="monotone" dataKey={ds.label}
                  stroke={ds.color || PALETTE[i % PALETTE.length]} strokeWidth={2.5}
                  dot={{ r: 4, fill: ds.color || PALETTE[i % PALETTE.length], strokeWidth: 0 }}
                  activeDot={{ r: 6, strokeWidth: 0 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          // ── Barras Verticales (comparación) ──────────────────────────────
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => fmtValue(v, chartData.unit)}
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={48} />
              <Tooltip content={<VickyTooltip unit={chartData.unit} />} />
              {chartData.datasets.length > 1 && <Legend formatter={v => <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>{v}</span>} />}
              {chartData.benchmark !== undefined && (
                <ReferenceLine y={chartData.benchmark} stroke="#f59e0b" strokeDasharray="5 3"
                  label={{ value: chartData.benchmarkLabel || `Bm`, position: 'right', fontSize: 9, fill: '#f59e0b' }} />
              )}
              {chartData.datasets.map((ds, i) => (
                <Bar key={ds.label} dataKey={ds.label} radius={[6, 6, 0, 0]} maxBarSize={48}
                  fill={ds.color || PALETTE[i % PALETTE.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// Botón toggle
export function VickyChartToggle({ chartData }: VickyChartProps) {
  const [show, setShow] = useState(true); // mostrar por defecto
  return (
    <div className="mt-2">
      <button
        onClick={() => setShow(v => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all"
      >
        <BarChart2 size={13} />
        {show ? 'Ocultar gráfico' : 'Ver gráfico'}
        <ChevronDown size={12} className={`transition-transform ${show ? 'rotate-180' : ''}`} />
      </button>
      {show && <VickyChart chartData={chartData} />}
    </div>
  );
}
