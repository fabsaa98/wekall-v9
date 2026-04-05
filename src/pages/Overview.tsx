import { useState } from 'react';
import { ChevronDown, ChevronUp, Lightbulb, AlertTriangle, TrendingUp, TrendingDown, BarChart2, Loader2, Zap } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { KPICard } from '@/components/KPICard';
import { KPICardCompact } from '@/components/KPICardCompact';
import { useRole } from '@/contexts/RoleContext';
import { useClient } from '@/contexts/ClientContext';
import { proactiveInsights, buildKPIsFromCDR, buildConversationTrend } from '@/data/mockData';
import { useCDRData } from '@/hooks/useCDRData';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function Overview() {
  const { role } = useRole();
  const { clientConfig, clientBranding } = useClient();
  const navigate = useNavigate();
  const cdr = useCDRData();

  // Nombre del cliente dinámico
  const clientName = clientBranding?.company_name || clientConfig?.client_name || 'Crediminuto';

  const [briefExpanded, setBriefExpanded] = useState(false);

  const hora = new Date().getHours();
  const saludo = hora >= 6 && hora < 12 ? 'Buenos días' : hora >= 12 && hora < 19 ? 'Buenas tardes' : 'Buenas noches';

  const greetings: Record<string, string> = {
    'CEO': `${saludo}, CEO.`,
    'VP Ventas': `${saludo}, VP de Ventas.`,
    'VP CX': `${saludo}, VP de CX.`,
    'COO': `${saludo}, COO.`,
  };

  // Brief dinámico desde datos Supabase
  const latestFecha = cdr.latestDay?.fecha ?? '...';
  const latestLlamadas = cdr.latestDay?.total_llamadas?.toLocaleString('es-CO') ?? '...';
  const latestTasa = cdr.latestDay?.tasa_contacto_pct ?? 0;

  const briefs: Record<string, { short: string; full: string }> = {
    'CEO': {
      short: cdr.loading
        ? 'Cargando datos en tiempo real desde Supabase...'
        : `${clientName} procesó ${latestLlamadas} llamadas el ${latestFecha}. Tasa de contacto efectivo: ${latestTasa}% (promedio 7d: ${cdr.promedio7dTasa}%, promedio 30d: ${cdr.promedio30dTasa}%). Datos: CDR histórico 822 días, ene 2024 - abr 2026.`,
      full: `Contactos efectivos: ${cdr.latestDay?.contactos_efectivos?.toLocaleString('es-CO') ?? '...'} (${latestTasa}% del total). Delta vs promedio 7d: ${cdr.deltaTasa > 0 ? '+' : ''}${cdr.deltaTasa}pp. Fuente: Supabase — cdr_daily_metrics, 12 millones de registros.`,
    },
    'VP Ventas': {
      short: cdr.loading
        ? 'Cargando datos en tiempo real...'
        : `Volumen ${latestFecha}: ${latestLlamadas} llamadas. Tasa de contacto: ${latestTasa}% (promedio 7d: ${cdr.promedio7dTasa}%). Delta: ${cdr.deltaTasa > 0 ? '+' : ''}${cdr.deltaTasa}pp.`,
      full: `Promedio 30d: ${cdr.promedio30dTasa}% | Promedio 7d: ${cdr.promedio7dTasa}%. Datos reales desde Supabase — 822 días de CDR histórico.`,
    },
    'VP CX': {
      short: cdr.loading
        ? 'Cargando datos en tiempo real...'
        : `Contactos efectivos el ${latestFecha}: ${cdr.latestDay?.contactos_efectivos?.toLocaleString('es-CO') ?? '...'} de ${latestLlamadas} llamadas (${latestTasa}%). Datos: Supabase en tiempo real.`,
      full: `Promedio 7d tasa contacto: ${cdr.promedio7dTasa}% | Promedio 30d: ${cdr.promedio30dTasa}%. FCR y CSAT por agente requieren integración Engage360.`,
    },
    'COO': {
      short: cdr.loading
        ? 'Cargando datos en tiempo real...'
        : `Operación ${latestFecha}: ${latestLlamadas} llamadas. Tasa de contacto: ${latestTasa}% (${cdr.deltaTasa > 0 ? '+' : ''}${cdr.deltaTasa}pp vs promedio 7d de ${cdr.promedio7dTasa}%). AHT referencia: 8.1 min (benchmark Colombia: 7.8 min).`,
      full: `Datos en tiempo real desde Supabase — cdr_daily_metrics (822 días). Delta tasa 30d: ${cdr.promedio30dTasa}%. Utilización de agentes por día requiere datos Engage360.`,
    },
  };

  const brief = briefs[role] || briefs['CEO'];

  const iconMap = {
    warning: <AlertTriangle size={16} className="text-amber-400" />,
    success: <TrendingUp size={16} className="text-emerald-400" />,
    info: <BarChart2 size={16} className="text-blue-400" />,
  };

  const bgMap = {
    warning: 'border-amber-500/20 bg-amber-500/5',
    success: 'border-emerald-500/20 bg-emerald-500/5',
    info: 'border-blue-500/20 bg-blue-500/5',
  };

  // KPIs dinámicos desde Supabase
  const allKPIs = buildKPIsFromCDR(cdr.latestDay, cdr.sparklineTasa, cdr.sparklineVolumen, cdr.promedio7dTasa);
  const primaryKPIs = allKPIs.slice(0, 4);
  const secondaryKPIs = allKPIs.slice(4);

  // Trend chart desde datos Supabase
  const conversationTrend = buildConversationTrend(cdr.last7Days);

  // Loading skeleton
  if (cdr.loading) {
    return (
      <div className="p-6 flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 size={32} className="text-primary animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Cargando datos desde Supabase...</p>
          <p className="text-xs text-muted-foreground">CDR histórico 822 días · ene 2024 – abr 2026</p>
        </div>
      </div>
    );
  }

  // Error state
  if (cdr.error) {
    return (
      <div className="p-6 flex-1 flex items-center justify-center">
        <div className="text-center space-y-3 max-w-md">
          <AlertTriangle size={32} className="text-red-400 mx-auto" />
          <p className="text-sm font-semibold text-foreground">Error al conectar con Supabase</p>
          <p className="text-xs text-muted-foreground">{cdr.error}</p>
          <p className="text-xs text-muted-foreground">Verifica la conexión e intenta nuevamente.</p>
        </div>
      </div>
    );
  }

  // ─── Banner de anomalía ─────────────────────────────────────────────────────
  const anomaly = cdr.anomaly;
  const anomalyVickyQuestion = anomaly?.detected
    ? encodeURIComponent(
        anomaly.direction === 'down'
          ? `La tasa de contacto hoy (${anomaly.valorHoy}%) cayó ${anomaly.magnitude}pp por debajo del promedio 30 días (${anomaly.promedio30d}%). ¿Cuál es el diagnóstico y qué debemos hacer?`
          : `La tasa de contacto hoy (${anomaly.valorHoy}%) subió ${anomaly.magnitude}pp por encima del promedio 30 días (${anomaly.promedio30d}%). ¿Qué está generando esta mejora y cómo la sostenemos?`,
      )
    : '';

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto overflow-y-auto flex-1">

      {/* Banner de anomalía (si detectada) */}
      {anomaly?.detected && (
        <div className={cn(
          'animate-fade-slide-down rounded-xl border p-4 flex items-start gap-3',
          anomaly.direction === 'down'
            ? 'border-red-500/30 bg-red-500/10'
            : 'border-emerald-500/30 bg-emerald-500/10',
        )}>
          <div className={cn(
            'p-2 rounded-lg shrink-0',
            anomaly.direction === 'down' ? 'bg-red-500/20' : 'bg-emerald-500/20',
          )}>
            {anomaly.direction === 'down'
              ? <TrendingDown size={18} className="text-red-400" />
              : <TrendingUp size={18} className="text-emerald-400" />
            }
          </div>
          <div className="flex-1">
            <p className={cn(
              'text-sm font-bold',
              anomaly.direction === 'down' ? 'text-red-400' : 'text-emerald-400',
            )}>
              {anomaly.direction === 'down' ? '⚠️ Anomalía detectada' : '📈 Pico positivo detectado'}
              {' '}— Tasa de contacto {anomaly.direction === 'down' ? 'inusualmente baja' : 'inusualmente alta'}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
              Hoy: <strong className="text-foreground">{anomaly.valorHoy}%</strong> vs promedio 30d: {anomaly.promedio30d}%.
              Diferencia: <strong className="text-foreground">{anomaly.direction === 'down' ? '-' : '+'}{anomaly.magnitude}pp</strong> ({Math.abs(anomaly.zScore)} desviaciones estándar).
              {anomaly.direction === 'down'
                ? ' Posible incidencia operativa, falla de marcador o baja por día no hábil.'
                : ' La operación muestra un desempeño excepcional hoy.'}
            </p>
          </div>
          <button
            onClick={() => navigate(`/vicky?q=${anomalyVickyQuestion}`)}
            className={cn(
              'shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-all',
              anomaly.direction === 'down'
                ? 'border-red-500/30 text-red-400 bg-red-500/10 hover:bg-red-500/20'
                : 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20',
            )}
          >
            <Zap size={13} />
            Ver en Vicky
          </button>
        </div>
      )}

      {/* Executive Brief */}
      <div className="animate-fade-slide-down rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 rounded-lg bg-primary/15 mt-0.5">
              <Lightbulb size={16} className="text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-primary font-semibold uppercase tracking-widest mb-1">
                Executive Brief · {clientName} · {latestFecha} · Supabase en tiempo real
              </p>
              <p className="text-sm font-semibold text-foreground mb-1">{greetings[role]}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{brief.short}</p>
              {briefExpanded && (
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed animate-fade-in">
                  {brief.full}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setBriefExpanded(v => !v)}
            className="shrink-0 flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors mt-0.5"
          >
            {briefExpanded ? (
              <><ChevronUp size={14} /> Menos</>
            ) : (
              <><ChevronDown size={14} /> Ver análisis</>
            )}
          </button>
        </div>
      </div>

      {/* Primary KPIs */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
          KPIs Principales — Vista {role} · Datos Supabase en tiempo real
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {primaryKPIs.map((kpi, i) => (
            <KPICard
              key={kpi.id}
              kpi={kpi}
              className={`animate-stagger-${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Chart + Insights row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Area Chart */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Tendencia de Conversaciones</h2>
              <p className="text-xs text-muted-foreground">Últimos 7 días hábiles · Supabase en tiempo real</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-primary rounded-full inline-block" />
                Total
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-emerald-500 rounded-full inline-block" />
                Contactos efectivos
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={conversationTrend} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6334C0" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#6334C0" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gResolved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22C55E" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4E8EF" />
              <XAxis dataKey="day" tick={{ fill: '#3D4A60', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#3D4A60', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#FFFFFF', border: '1px solid #E4E8EF', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#12172A' }}
              />
              <Area type="monotone" dataKey="total" name="Total" stroke="#6334C0" strokeWidth={2} fill="url(#gTotal)" />
              <Area type="monotone" dataKey="resolved" name="Contactos" stroke="#22C55E" strokeWidth={2} fill="url(#gResolved)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Proactive Insights */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Insights del Día
          </h2>
          {proactiveInsights.map((insight) => (
            <div
              key={insight.id}
              className={cn('rounded-lg border p-4 cursor-pointer hover:brightness-110 transition-all', bgMap[insight.type])}
              onClick={() => navigate('/vicky', { state: { question: insight.question } })}
            >
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 shrink-0">{iconMap[insight.type]}</div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{insight.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{insight.description}</p>
                  <p className="mt-2 text-xs text-primary font-medium">{insight.action}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Secondary KPIs */}
      {secondaryKPIs.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Métricas Secundarias
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {secondaryKPIs.map((kpi, i) => (
              <KPICardCompact
                key={kpi.id}
                kpi={kpi}
                className={`animate-fade-slide-up animate-stagger-${i + 1}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
