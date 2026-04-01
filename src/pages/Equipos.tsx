import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { agentsData, type Agent } from '@/data/mockData';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

type Area = 'Ventas' | 'CX' | 'Cobranzas' | 'Ops';

const AREAS: Area[] = ['Ventas', 'CX', 'Cobranzas', 'Ops'];

const areaConfig: Record<Area, {
  kpis: { label: string; key: keyof Agent; format: (v: number) => string; benchmark: number; invertGood?: boolean }[];
  description: string;
}> = {
  'Ventas': {
    description: 'Equipo comercial — conversión y calidad de venta',
    kpis: [
      { label: 'Conversión Promedio', key: 'conversions', format: v => `${v.toFixed(1)}%`, benchmark: 20 },
      { label: 'CSAT Promedio', key: 'csat', format: v => `${v.toFixed(1)}/5`, benchmark: 4.0 },
      { label: 'FCR Promedio', key: 'fcr', format: v => `${v.toFixed(0)}%`, benchmark: 72 },
      { label: 'AHT Promedio', key: 'aht', format: v => `${Math.floor(v / 60)}m ${v % 60}s`, benchmark: 300, invertGood: true },
    ],
  },
  'CX': {
    description: 'Servicio al cliente — satisfacción y resolución',
    kpis: [
      { label: 'FCR Promedio', key: 'fcr', format: v => `${v.toFixed(0)}%`, benchmark: 75 },
      { label: 'CSAT Promedio', key: 'csat', format: v => `${v.toFixed(1)}/5`, benchmark: 4.2 },
      { label: 'Escalaciones', key: 'escalations', format: v => `${v.toFixed(1)}%`, benchmark: 6, invertGood: true },
      { label: 'AHT Promedio', key: 'aht', format: v => `${Math.floor(v / 60)}m ${v % 60}s`, benchmark: 280, invertGood: true },
    ],
  },
  'Cobranzas': {
    description: 'Recuperación de cartera — efectividad y compliance',
    kpis: [
      { label: 'Efectividad Cobro', key: 'conversions', format: v => `${v.toFixed(1)}%`, benchmark: 35 },
      { label: 'CSAT Promedio', key: 'csat', format: v => `${v.toFixed(1)}/5`, benchmark: 3.5 },
      { label: 'FCR Promedio', key: 'fcr', format: v => `${v.toFixed(0)}%`, benchmark: 65 },
      { label: 'Escalaciones', key: 'escalations', format: v => `${v.toFixed(1)}%`, benchmark: 10, invertGood: true },
    ],
  },
  'Ops': {
    description: 'Operaciones — eficiencia y procesos',
    kpis: [
      { label: 'FCR Promedio', key: 'fcr', format: v => `${v.toFixed(0)}%`, benchmark: 78 },
      { label: 'CSAT Promedio', key: 'csat', format: v => `${v.toFixed(1)}/5`, benchmark: 4.1 },
      { label: 'AHT Promedio', key: 'aht', format: v => `${Math.floor(v / 60)}m ${v % 60}s`, benchmark: 260, invertGood: true },
      { label: 'Escalaciones', key: 'escalations', format: v => `${v.toFixed(1)}%`, benchmark: 5, invertGood: true },
    ],
  },
};

function avg(agents: Agent[], key: keyof Agent): number {
  if (agents.length === 0) return 0;
  return agents.reduce((s, a) => s + (a[key] as number), 0) / agents.length;
}

function AgentRow({ agent, rank }: { agent: Agent; rank: number }) {
  const TrendIcon = agent.trend === 'up' ? TrendingUp : agent.trend === 'down' ? TrendingDown : Minus;
  const trendColor = agent.trend === 'up' ? 'text-emerald-400' : agent.trend === 'down' ? 'text-red-400' : 'text-muted-foreground';

  const initials = agent.name.split(' ').map(w => w[0]).join('').slice(0, 2);

  return (
    <tr className="border-b border-border hover:bg-secondary/50 transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
            rank === 1 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
            rank === 2 ? 'bg-slate-500/20 text-slate-300 border border-slate-500/30' :
            rank === 3 ? 'bg-orange-800/20 text-orange-400 border border-orange-500/30' :
            'bg-primary/10 text-primary border border-primary/20',
          )}>
            {initials}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{agent.name}</p>
            <p className="text-[11px] text-muted-foreground">{agent.role}</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-4 text-sm text-foreground">{agent.fcr}%</td>
      <td className="py-3 px-4 text-sm text-foreground">{agent.csat}/5</td>
      <td className="py-3 px-4 text-sm text-foreground">{Math.floor(agent.aht / 60)}m {agent.aht % 60}s</td>
      <td className="py-3 px-4">
        <div className={cn('flex items-center gap-1 text-xs font-medium', trendColor)}>
          <TrendIcon size={13} />
          <span className="capitalize">{agent.trend === 'up' ? 'Subiendo' : agent.trend === 'down' ? 'Bajando' : 'Estable'}</span>
        </div>
      </td>
    </tr>
  );
}

function AreaPanel({ area }: { area: Area }) {
  const agents = agentsData.filter(a => a.area === area);
  const config = areaConfig[area];
  const sorted = [...agents].sort((a, b) => {
    if (area === 'Ventas' || area === 'Cobranzas') return b.conversions - a.conversions;
    return b.fcr - a.fcr;
  });

  const chartData = sorted.slice(0, 5).map(a => ({
    name: a.name.split(' ')[0],
    fcr: a.fcr,
    csat: a.csat * 20, // scale to 100
    rawCsat: a.csat,
  }));

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{config.description}</p>

      {/* Area KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {config.kpis.map((kpi) => {
          const value = avg(agents, kpi.key);
          const isGood = kpi.invertGood ? value <= kpi.benchmark : value >= kpi.benchmark;
          const diff = ((value - kpi.benchmark) / kpi.benchmark * 100).toFixed(1);
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

      {/* Chart */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">FCR por Agente (Top 5)</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} domain={[50, 100]} />
            <Tooltip
              contentStyle={{ background: '#181824', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
              formatter={(v: number) => [`${v}%`, 'FCR']}
            />
            <Bar dataKey="fcr" radius={[4, 4, 0, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={i === 0 ? '#6334C0' : 'rgba(99,52,192,0.4)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Agents table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Agentes del Área</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2.5 px-4 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Agente</th>
                <th className="py-2.5 px-4 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">FCR</th>
                <th className="py-2.5 px-4 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">CSAT</th>
                <th className="py-2.5 px-4 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">AHT</th>
                <th className="py-2.5 px-4 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tendencia</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((agent, i) => (
                <AgentRow key={agent.id} agent={agent} rank={i + 1} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function Equipos() {
  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Equipos</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Performance por área · {agentsData.length} agentes activos
        </p>
      </div>

      <Tabs defaultValue="Ventas">
        <TabsList className="h-9">
          {AREAS.map(area => (
            <TabsTrigger key={area} value={area} className="text-sm">
              {area}
            </TabsTrigger>
          ))}
        </TabsList>
        {AREAS.map(area => (
          <TabsContent key={area} value={area} className="mt-6">
            <AreaPanel area={area} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
