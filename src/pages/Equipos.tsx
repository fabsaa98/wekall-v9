import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { PageTabs, PageTabsBar } from '@/components/PageTabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useAgentsData, type AgentSummary } from '@/hooks/useAgentsData';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Loader2, AlertTriangle, Users, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Mini Sparkline ─────────────────────────────────────────────────
interface LineDotProps {
  cx?: number;
  cy?: number;
  index?: number;
  value?: number;
}

function AgentSparkline({ data, trend }: { data: number[]; trend: 'up' | 'down' | 'stable' }) {
  if (!data || data.length < 2) {
    return <span className="text-[10px] text-muted-foreground">—</span>;
  }
  const chartData = data.map((v, i) => ({ i, v }));
  const color = trend === 'up' ? '#22C55E' : trend === 'down' ? '#EF4444' : '#6B7280';

  // Max/min dots — agent sparkline: more calls = better (not inverted)
  const hasEnough = data.length >= 3;
  const maxIdx = hasEnough ? chartData.reduce((best, d, i, arr) => d.v > arr[best].v ? i : best, 0) : -1;
  const minIdx = hasEnough ? chartData.reduce((best, d, i, arr) => d.v < arr[best].v ? i : best, 0) : -1;
  const showDots = hasEnough && maxIdx !== minIdx;

  return (
    <div title={`Últimos ${data.length} días: ${data.join(', ')}%`}>
      <LineChart width={64} height={28} data={chartData} margin={{ top: 8, right: 2, bottom: 0, left: 2 }}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          isAnimationActive={false}
          activeDot={false}
          dot={showDots ? (props: LineDotProps) => {
            const { cx, cy, index, value } = props;
            const isMax = index === maxIdx;
            const isMin = index === minIdx;
            if (!isMax && !isMin) return <g key={index} />;
            const dotColor = isMax ? '#22c55e' : '#ef4444';
            const fmt = typeof value === 'number'
              ? (value % 1 === 0 ? String(value) : value.toFixed(1))
              : String(value);
            return (
              <g key={index}>
                <circle cx={cx} cy={cy} r={2.5} fill={dotColor} stroke="none" />
                <text
                  x={cx}
                  y={isMax ? cy - 4 : cy + 10}
                  textAnchor="middle"
                  fontSize={7}
                  fill={dotColor}
                  fontWeight="600"
                >
                  {fmt}
                </text>
              </g>
            );
          } : false}
        />
      </LineChart>
    </div>
  );
}

// ─── Configuración por área ───────────────────────────────────────────────────

type AreaKPIKey = 'avg_tasa_contacto' | 'avg_tasa_promesa' | 'avg_csat' | 'avg_aht_segundos' | 'avg_fcr' | 'avg_escalaciones';

interface AreaKPIConfig {
  label: string;
  key: AreaKPIKey;
  format: (v: number) => string;
  benchmark: number;
  invertGood?: boolean;
}

const areaConfig: Record<string, {
  kpis: AreaKPIConfig[];
  description: string;
}> = {
  'Cobranzas': {
    description: 'Recuperación de cartera — efectividad y compliance · Crediminuto Colombia',
    kpis: [
      { label: 'Tasa Contacto', key: 'avg_tasa_contacto', format: v => `${v.toFixed(1)}%`, benchmark: 43 },
      { label: 'Tasa Promesa', key: 'avg_tasa_promesa', format: v => `${v.toFixed(1)}%`, benchmark: 40 },
      { label: 'CSAT Promedio', key: 'avg_csat', format: v => `${v.toFixed(1)}/5`, benchmark: 3.8 },
      { label: 'Escalaciones', key: 'avg_escalaciones', format: v => `${v.toFixed(1)}%`, benchmark: 8, invertGood: true },
    ],
  },
  'Ventas': {
    description: 'Equipo comercial — conversión y calidad de venta',
    kpis: [
      { label: 'Tasa Contacto', key: 'avg_tasa_contacto', format: v => `${v.toFixed(1)}%`, benchmark: 40 },
      { label: 'CSAT Promedio', key: 'avg_csat', format: v => `${v.toFixed(1)}/5`, benchmark: 4.0 },
      { label: 'FCR Promedio', key: 'avg_fcr', format: v => `${v.toFixed(0)}%`, benchmark: 72 },
      { label: 'AHT Promedio', key: 'avg_aht_segundos', format: v => `${Math.floor(v / 60)}m ${Math.round(v % 60)}s`, benchmark: 300, invertGood: true },
    ],
  },
  'CX': {
    description: 'Servicio al cliente — satisfacción y resolución',
    kpis: [
      { label: 'FCR Promedio', key: 'avg_fcr', format: v => `${v.toFixed(0)}%`, benchmark: 75 },
      { label: 'CSAT Promedio', key: 'avg_csat', format: v => `${v.toFixed(1)}/5`, benchmark: 4.2 },
      { label: 'Escalaciones', key: 'avg_escalaciones', format: v => `${v.toFixed(1)}%`, benchmark: 6, invertGood: true },
      { label: 'AHT Promedio', key: 'avg_aht_segundos', format: v => `${Math.floor(v / 60)}m ${Math.round(v % 60)}s`, benchmark: 280, invertGood: true },
    ],
  },
  'Ops': {
    description: 'Operaciones — eficiencia y procesos',
    kpis: [
      { label: 'FCR Promedio', key: 'avg_fcr', format: v => `${v.toFixed(0)}%`, benchmark: 78 },
      { label: 'CSAT Promedio', key: 'avg_csat', format: v => `${v.toFixed(1)}/5`, benchmark: 4.1 },
      { label: 'AHT Promedio', key: 'avg_aht_segundos', format: v => `${Math.floor(v / 60)}m ${Math.round(v % 60)}s`, benchmark: 260, invertGood: true },
      { label: 'Escalaciones', key: 'avg_escalaciones', format: v => `${v.toFixed(1)}%`, benchmark: 5, invertGood: true },
    ],
  },
};

function avgAgents(agents: AgentSummary[], key: AreaKPIKey): number {
  if (agents.length === 0) return 0;
  return agents.reduce((s, a) => s + (a[key] as number), 0) / agents.length;
}

// ─── Skeleton de carga ────────────────────────────────────────────────────────

function EquiposSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-[240px] rounded-xl" />
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-10 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Fila de agente ───────────────────────────────────────────────────────────

function AgentRow({ agent, rank }: { agent: AgentSummary; rank: number }) {
  const navigate = useNavigate();
  const TrendIcon = agent.trend === 'up' ? TrendingUp : agent.trend === 'down' ? TrendingDown : Minus;
  const trendColor = agent.trend === 'up' ? 'text-emerald-400' : agent.trend === 'down' ? 'text-red-400' : 'text-muted-foreground';
  const trendLabel = agent.trend === 'up' ? 'Subiendo' : agent.trend === 'down' ? 'Bajando' : 'Estable';

  const initials = agent.agent_name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <tr className="border-b border-border hover:bg-secondary/50 transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
            rank === 1 ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' :
            rank === 2 ? 'bg-slate-500/20 text-slate-300 border border-slate-500/30' :
            rank === 3 ? 'bg-orange-800/20 text-orange-400 border border-orange-500/30' :
            'bg-primary/10 text-primary border border-primary/20',
          )}>
            {initials}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground capitalize">{agent.agent_name.toLowerCase()}</p>
            <p className="text-[11px] text-muted-foreground">ID {agent.agent_id} · {agent.days_count} días</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-4 text-sm text-foreground">{agent.avg_fcr.toFixed(0)}%</td>
      <td className="py-3 px-4 text-sm text-foreground">{agent.avg_csat.toFixed(1)}/5</td>
      <td className="py-3 px-4 text-sm text-foreground">
        {Math.floor(agent.avg_aht_segundos / 60)}m {Math.round(agent.avg_aht_segundos % 60)}s
      </td>
      <td className="py-3 px-4 text-sm text-foreground">{agent.avg_tasa_contacto.toFixed(1)}%</td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <AgentSparkline data={agent.sparkline7d} trend={agent.trend} />
          <div className={cn('flex items-center gap-1 text-xs font-medium', trendColor)}>
            <TrendIcon size={12} />
            {agent.trend_delta !== 0 && (
              <span className="text-[10px]">{agent.trend_delta > 0 ? '+' : ''}{agent.trend_delta}pp</span>
            )}
          </div>
          {/* Feature 3: Drill-to-source — ver llamadas del agente */}
          <button
            onClick={() => navigate(`/transcriptions?agent=${encodeURIComponent(agent.agent_name)}`)}
            title="Ver llamadas de este agente"
            className="ml-1 p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          >
            <ExternalLink size={12} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Panel de área ────────────────────────────────────────────────────────────

function AreaPanel({ area, agents }: { area: string; agents: AgentSummary[] }) {
  const config = areaConfig[area] ?? areaConfig['Cobranzas'];

  // Ordenar por tasa_contacto descendente (más efectivos primero)
  const sorted = [...agents].sort((a, b) => b.avg_tasa_contacto - a.avg_tasa_contacto);

  const chartData = sorted.slice(0, 8).map(a => ({
    name: a.agent_name.split(' ')[0],
    fcr: Math.round(a.avg_fcr),
    csat: Math.round(a.avg_csat * 20), // escalar a 100
    rawCsat: a.avg_csat,
    tc: Math.round(a.avg_tasa_contacto),
  }));

  if (agents.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-12 text-center space-y-3">
        <Users size={32} className="mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No hay datos de agentes para el área <strong>{area}</strong> en los últimos 30 días.
        </p>
        <p className="text-xs text-muted-foreground">
          Ejecuta el script <code className="bg-secondary px-1 rounded">scripts/seed_agents.py</code> para cargar datos sintéticos,
          o espera a que Supabase reciba datos reales de la operación.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{config.description}</p>

      {/* KPIs del área */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {config.kpis.map((kpi) => {
          const value = avgAgents(agents, kpi.key);
          const isGood = kpi.invertGood ? value <= kpi.benchmark : value >= kpi.benchmark;
          const diff = kpi.benchmark !== 0
            ? ((value - kpi.benchmark) / kpi.benchmark * 100).toFixed(1)
            : '0';
          return (
            <div key={kpi.label} className="rounded-xl border border-border bg-card p-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{kpi.label}</p>
              <p className="mt-1 text-xl font-bold text-foreground">{kpi.format(value)}</p>
              <p className={cn(
                'mt-0.5 text-xs font-medium',
                isGood ? 'text-emerald-400' : 'text-red-400',
              )}>
                {isGood ? '↑' : '↓'} {Math.abs(Number(diff))}% vs benchmark
              </p>
            </div>
          );
        })}
      </div>

      {/* Gráfico */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">
          Tasa de Contacto por Agente (Top {Math.min(8, sorted.length)}) — últimos 30 días
        </h3>
        <div className="h-44 sm:h-[180px]"><ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E4E8EF" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: '#3D4A60', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#3D4A60', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 70]} />
            <Tooltip
              contentStyle={{ background: '#FFFFFF', border: '1px solid #E4E8EF', borderRadius: 8, fontSize: 12 }}
              formatter={(v: number) => [`${v}%`, 'Tasa Contacto']}
            />
            <Bar dataKey="tc" radius={[4, 4, 0, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={i === 0 ? '#6334C0' : 'rgba(99,52,192,0.4)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer></div>
      </div>

      {/* Tabla de agentes */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Agentes del Área · {agents.length} activos
          </h3>
          <span className="text-[10px] text-muted-foreground">Promedios últimos 30 días · Supabase</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2.5 px-4 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Agente</th>
                <th className="py-2.5 px-4 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">FCR</th>
                <th className="py-2.5 px-4 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">CSAT</th>
                <th className="py-2.5 px-4 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">AHT</th>
                <th className="py-2.5 px-4 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tasa Contacto</th>
                <th className="py-2.5 px-4 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tendencia 7d ↗</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((agent, i) => (
                <AgentRow key={agent.agent_id} agent={agent} rank={i + 1} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Equipos() {
  const { loading, error, agents, areas, lastUpdated } = useAgentsData();

  // El área activa: priorizar "Cobranzas" si existe, sino la primera
  const defaultArea = areas.includes('Cobranzas') ? 'Cobranzas' : (areas[0] ?? 'Cobranzas');
  const [areaTab, setAreaTab] = useState<string | null>(null);
  const activeArea = areaTab ?? defaultArea;

  // Agentes de la campaña activa (Cobranzas tiene todos los agentes reales)
  // Si no hay datos en Supabase, mostrar el área Cobranzas con estado vacío
  const displayAreas = areas.length > 0 ? areas : ['Cobranzas'];
  const agentsInArea = agents.filter(a => a.area === activeArea);

  return (
    <div className="p-4 sm:p-6 max-w-[1200px] mx-auto space-y-4 sm:space-y-6 overflow-y-auto flex-1 w-full min-w-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Equipos</h1>
          <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-2">
            {loading ? (
              <><Loader2 size={12} className="animate-spin" /> Cargando datos desde Supabase...</>
            ) : error ? (
              <span className="text-red-400 flex items-center gap-1">
                <AlertTriangle size={12} /> Error Supabase: {error}
              </span>
            ) : agents.length === 0 ? (
              <>Sin datos en Supabase — ejecuta scripts/seed_agents.py para cargar datos de prueba</>
            ) : (
              <>Performance por área · {agents.length} agentes activos · datos al {lastUpdated}</>
            )}
          </p>
        </div>
      </div>

      <Tabs value={activeArea} onValueChange={v => setAreaTab(v)}>
        <PageTabsBar>
          <PageTabs
            activeTab={activeArea}
            onChange={v => setAreaTab(v)}
            tabs={displayAreas.map(area => ({
              value: area,
              label: area,
              badge: area === activeArea
                ? <span className="px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">
                    {agents.filter(a => a.area === area).length}
                  </span>
                : undefined,
            }))}
          />
        </PageTabsBar>

        {displayAreas.map(area => (
          <TabsContent key={area} value={area} className="mt-6">
            {loading ? (
              <EquiposSkeleton />
            ) : (
              <AreaPanel area={area} agents={agents.filter(a => a.area === area)} />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
