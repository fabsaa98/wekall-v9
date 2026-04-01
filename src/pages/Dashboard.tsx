import {
  PhoneCall, Clock, Smiley, Microphone, SpeakerSlash, ArrowsClockwise, Bell,
  Target, Binoculars, ShieldWarning, CheckSquare, Timer, Question,
  CheckCircle, Warning, ArrowsCounterClockwise, Gauge, Heart, HourglassHigh,
  Handshake, UserCheck, ShieldCheck, TrendUp, Money, CalendarCheck,
  Sparkle, Storefront, Headset, CurrencyDollar,
} from '@phosphor-icons/react';
import { KPICard } from '@/components/KPICard';
import { KPICardCompact } from '@/components/KPICardCompact';
import { VerticalSection } from '@/components/VerticalSection';
import { VerticalBadge } from '@/components/VerticalBadge';
import { mockDashboardKPIs, mockCallsPerDay, mockSentimentDistribution, mockAgentStats, mockAIInsights } from '@/data/mockData';
import { verticalColors, type KPIMetric } from '@/types';
import { useDashboardKPIs, useCallsPerDay, useSentimentDistribution, useAgentStats, useAIInsights } from '@/hooks/useDashboard';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const iconMap: Record<string, React.ReactNode> = {
  PhoneCall: <PhoneCall size={24} weight="light" />,
  Clock: <Clock size={24} weight="light" />,
  Smiley: <Smiley size={24} weight="light" />,
  Microphone: <Microphone size={24} weight="light" />,
  SpeakerSlash: <SpeakerSlash size={24} weight="light" />,
  ArrowsClockwise: <ArrowsClockwise size={24} weight="light" />,
  Bell: <Bell size={24} weight="light" />,
  Warning: <Warning size={24} weight="light" />,
};

const compactIconMap: Record<string, React.ReactNode> = {
  Target: <Target size={20} weight="light" />,
  Binoculars: <Binoculars size={20} weight="light" />,
  ShieldWarning: <ShieldWarning size={20} weight="light" />,
  CheckSquare: <CheckSquare size={20} weight="light" />,
  Timer: <Timer size={20} weight="light" />,
  Question: <Question size={20} weight="light" />,
  CheckCircle: <CheckCircle size={20} weight="light" />,
  Warning: <Warning size={20} weight="light" />,
  ArrowsCounterClockwise: <ArrowsCounterClockwise size={20} weight="light" />,
  Gauge: <Gauge size={20} weight="light" />,
  Heart: <Heart size={20} weight="light" />,
  HourglassHigh: <HourglassHigh size={20} weight="light" />,
  Handshake: <Handshake size={20} weight="light" />,
  UserCheck: <UserCheck size={20} weight="light" />,
  ShieldCheck: <ShieldCheck size={20} weight="light" />,
  TrendUp: <TrendUp size={20} weight="light" />,
  Money: <Money size={20} weight="light" />,
  CalendarCheck: <CalendarCheck size={20} weight="light" />,
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function CompactKPIGrid({ metrics }: { metrics: KPIMetric[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {metrics.map((m) => (
        <KPICardCompact
          key={m.key}
          title={m.label}
          value={m.value}
          change={m.change}
          changeLabel={m.changeLabel}
          description={m.description}
          icon={compactIconMap[m.icon] || <PhoneCall size={20} weight="light" />}
          tooltip={m.tooltip}
        />
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { data: kpisData } = useDashboardKPIs();
  const { data: callsPerDayData } = useCallsPerDay();
  const { data: sentimentData } = useSentimentDistribution();
  const { data: agentStatsData } = useAgentStats();
  const { data: aiInsightsData } = useAIInsights();

  const kpis = kpisData ?? mockDashboardKPIs;
  const callsPerDay = callsPerDayData ?? [];
  const sentimentDistribution = sentimentData ?? [];
  const agentStats = agentStatsData ?? mockAgentStats;
  const aiInsights = aiInsightsData ?? mockAIInsights;



  return (
    <div className="space-y-6">
      {/* Sección 1 — KPIs Universales (siempre visibles) */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Indicadores Universales</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {kpis.universal.map((m) => (
            <KPICard
              key={m.key}
              title={m.label}
              value={m.value}
              change={m.change}
              changeLabel={m.changeLabel}
              description={m.description}
              icon={iconMap[m.icon] || <PhoneCall size={24} weight="light" />}
              invertColor={m.invertColor}
            />
          ))}
        </div>
      </div>

      {/* Sección 2 — KPIs por Vertical (3 secciones colapsables) */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">KPIs por Vertical</h3>

        <VerticalSection
          icon={<Storefront size={20} weight="light" />}
          name="Ventas"
          kpiCount={6}
          accentColor={verticalColors.ventas.accent}
        >
          <CompactKPIGrid metrics={kpis.ventas} />
        </VerticalSection>

        <VerticalSection
          icon={<Headset size={20} weight="light" />}
          name="Servicio CX"
          kpiCount={6}
          accentColor={verticalColors.servicio_cx.accent}
        >
          <CompactKPIGrid metrics={kpis.servicio_cx} />
        </VerticalSection>

        <VerticalSection
          icon={<CurrencyDollar size={20} weight="light" />}
          name="Cobranzas"
          kpiCount={6}
          accentColor={verticalColors.cobranzas.accent}
        >
          <CompactKPIGrid metrics={kpis.cobranzas} />
        </VerticalSection>
      </div>

      {/* Sección 3 — Gráficos */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-5 shadow-wk-sm">
          <h3 className="text-base font-medium text-card-foreground mb-4">Llamadas por día — últimos 30 días</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={callsPerDay}>
              <defs>
                <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C184FF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#C184FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#EDEEF2" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#676879' }} interval={4} />
              <YAxis tick={{ fontSize: 10, fill: '#676879' }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #DCDEE7', fontSize: 12 }} />
              <Area type="monotone" dataKey="calls" stroke="#6334C0" strokeWidth={2} fill="url(#colorCalls)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 shadow-wk-sm">
          <h3 className="text-base font-medium text-card-foreground mb-4">Distribución de Sentimiento</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={sentimentDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                {sentimentDistribution.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #DCDEE7', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            {sentimentDistribution.map(d => (
              <div key={d.name} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-[10px] text-muted-foreground">{d.name} ({d.value}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sección 4 — Top Agentes + Sección 5 — Insights AI */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-5 shadow-wk-sm">
          <h3 className="text-base font-medium text-card-foreground mb-4">Top Agentes</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-3 font-medium text-muted-foreground w-44">Agente</th>
                  <th className="pb-3 font-medium text-muted-foreground w-28">Vertical</th>
                  <th className="pb-3 font-medium text-muted-foreground w-20 whitespace-nowrap">Llamadas</th>
                  <th className="pb-3 font-medium text-muted-foreground w-24 whitespace-nowrap">Dur. Prom.</th>
                  <th className="pb-3 font-medium text-muted-foreground w-28 whitespace-nowrap">Talk/Listen</th>
                  <th className="pb-3 font-medium text-muted-foreground w-36 whitespace-nowrap">Sentimiento</th>
                  <th className="pb-3 font-medium text-muted-foreground">Temas Top</th>
                </tr>
              </thead>
              <tbody>
                {agentStats.map(a => (
                  <tr key={a.agent.name} className="border-b border-border/50 last:border-0">
                    <td className="py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {a.agent.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-medium text-card-foreground">{a.agent.name}</p>
                          <p className="text-[10px] text-muted-foreground">{a.agent.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <VerticalBadge vertical={a.vertical} />
                    </td>
                    <td className="py-3 text-card-foreground">{a.totalCalls}</td>
                    <td className="py-3 text-card-foreground">{formatDuration(a.avgDuration)}</td>
                    <td className="py-3 text-card-foreground font-medium">{a.talkToListenRatio}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 rounded-full bg-secondary overflow-hidden">
                          <div className="h-full rounded-full" style={{
                            width: `${a.sentimentScore}%`,
                            backgroundColor: a.sentimentScore >= 60 ? 'hsl(var(--wk-green))' : a.sentimentScore >= 20 ? '#f59e0b' : '#ef4444'
                          }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{a.sentimentScore}%</span>
                      </div>
                    </td>
                    <td className="py-3 max-w-[160px]">
                      <div className="flex flex-col gap-1">
                        {a.topTopics.slice(0, 2).map(t => (
                          <span key={t} className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground truncate block max-w-[150px]" title={t}>{t}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Insights AI */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-wk-sm">
          <div className="flex items-center gap-2 mb-4">
            <Sparkle size={20} weight="light" className="text-primary" />
            <h3 className="text-base font-medium text-card-foreground">Insights AI</h3>
          </div>
          <div className="space-y-3">
            {aiInsights.map(insight => (
              <div key={insight.id} className="rounded-lg bg-primary/5 p-3.5 border border-primary/10">
                <div className="flex items-start gap-2">
                  <Sparkle size={16} weight="light" className="text-primary mt-0.5 shrink-0" />
                  <div className="space-y-1.5">
                    <p className="text-sm text-card-foreground leading-relaxed">{insight.text}</p>
                    {insight.vertical && <VerticalBadge vertical={insight.vertical} />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
