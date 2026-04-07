import { useState } from 'react';
import {
  ChevronDown, ChevronUp, Lightbulb, AlertTriangle, TrendingUp, TrendingDown,
  BarChart2, Loader2, Zap, ArrowUp, ArrowDown, Calendar,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, ComposedChart, Line,
} from 'recharts';
import { KPICard } from '@/components/KPICard';
import { KPICardCompact } from '@/components/KPICardCompact';
import { useRole } from '@/contexts/RoleContext';
import { useClient } from '@/contexts/ClientContext';
import { buildKPIsFromCDR, buildConversationTrend } from '@/data/mockData';
import { useCDRData } from '@/hooks/useCDRData';
import { generateWeeklyInsight } from '@/lib/proactiveInsights';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { INDUSTRY_BENCHMARKS } from '@/data/benchmarks';

export default function Overview() {
  const { role } = useRole();
  const { clientConfig, clientBranding } = useClient();
  const navigate = useNavigate();
  const cdr = useCDRData();

  // Nombre del cliente dinámico
  const clientName = clientBranding?.company_name || clientConfig?.client_name || 'Crediminuto';

  const [briefExpanded, setBriefExpanded] = useState(false);
  const [drillDownMetric, setDrillDownMetric] = useState<string | null>(null);

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
    warning: <AlertTriangle size={16} className="text-sky-400" />,
    success: <TrendingUp size={16} className="text-emerald-400" />,
    info: <BarChart2 size={16} className="text-blue-400" />,
  };

  const bgMap = {
    warning: 'border-sky-500/20 bg-sky-500/5',
    success: 'border-emerald-500/20 bg-emerald-500/5',
    info: 'border-blue-500/20 bg-blue-500/5',
  };

  // KPIs dinámicos desde Supabase
  const allKPIs = buildKPIsFromCDR(cdr.latestDay, cdr.sparklineTasa, cdr.sparklineVolumen, cdr.promedio7dTasa);
  const primaryKPIs = allKPIs.slice(0, 4);
  const secondaryKPIs = allKPIs.slice(4);

  // Trend chart desde datos Supabase
  const conversationTrend = buildConversationTrend(cdr.last7Days);

  // Proactive insights dinámicos
  const dynamicInsights = generateWeeklyInsight(cdr.last7Days, cdr.last30Days, cdr.anomaly, clientName);

  // ── Forecast chart data ──────────────────────────────────────────────────
  const forecastChartData = [
    // Últimos 7 días históricos
    ...cdr.last7Days.map(d => ({
      fecha: d.fecha.slice(5),
      historico: d.tasa_contacto_pct,
      forecast: null as number | null,
      conf_low: null as number | null,
      conf_high: null as number | null,
      isHistorico: true,
    })),
    // Puente: el último día histórico aparece también como inicio del forecast
    ...(cdr.forecast.length > 0 && cdr.last7Days.length > 0 ? [{
      fecha: cdr.last7Days[cdr.last7Days.length - 1].fecha.slice(5),
      historico: cdr.last7Days[cdr.last7Days.length - 1].tasa_contacto_pct,
      forecast: cdr.last7Days[cdr.last7Days.length - 1].tasa_contacto_pct,
      conf_low: cdr.forecast[0]?.confidence_low ?? null,
      conf_high: cdr.forecast[0]?.confidence_high ?? null,
      isHistorico: false,
    }] : []),
    // Forecast 7 días
    ...cdr.forecast.map(f => ({
      fecha: f.fecha.slice(5),
      historico: null as number | null,
      forecast: f.predicted_tasa,
      conf_low: f.confidence_low,
      conf_high: f.confidence_high,
      isHistorico: false,
    })),
  ];

  // ── Comparativa semanal (esta semana vs semana anterior) ─────────────────
  const weeklyComparison = (() => {
    if (cdr.last30Days.length < 10) return null;
    // Semana actual: últimos 5 días hábiles (o menos si no hay)
    const all = [...cdr.last30Days].sort((a, b) => a.fecha.localeCompare(b.fecha));
    const thisWeek = all.slice(-5);
    const prevWeek = all.slice(-10, -5);
    if (thisWeek.length === 0 || prevWeek.length === 0) return null;

    const avgTasa = (arr: typeof thisWeek) =>
      Math.round(arr.reduce((s, d) => s + d.tasa_contacto_pct, 0) / arr.length * 10) / 10;
    const avgVol = (arr: typeof thisWeek) =>
      Math.round(arr.reduce((s, d) => s + d.total_llamadas, 0) / arr.length);

    const thisWeekTasa = avgTasa(thisWeek);
    const prevWeekTasa = avgTasa(prevWeek);
    const thisWeekVol = avgVol(thisWeek);
    const prevWeekVol = avgVol(prevWeek);

    const deltaTasa = Math.round((thisWeekTasa - prevWeekTasa) * 10) / 10;
    const deltaVol = thisWeekVol - prevWeekVol;
    const deltaVolPct = prevWeekVol > 0 ? Math.round(((thisWeekVol - prevWeekVol) / prevWeekVol) * 1000) / 10 : 0;

    // Día más productivo (mayor tasa de contacto) y más bajo de la semana actual
    const bestDay = thisWeek.reduce((a, b) => a.tasa_contacto_pct > b.tasa_contacto_pct ? a : b);
    const worstDay = thisWeek.reduce((a, b) => a.tasa_contacto_pct < b.tasa_contacto_pct ? a : b);

    return { thisWeekTasa, prevWeekTasa, deltaTasa, thisWeekVol, prevWeekVol, deltaVol, deltaVolPct, bestDay, worstDay };
  })();

  // Proyección promedio
  const forecastAvg = cdr.forecast.length > 0
    ? Math.round(cdr.forecast.reduce((s, f) => s + f.predicted_tasa, 0) / cdr.forecast.length * 10) / 10
    : null;
  const forecastVsHoy = forecastAvg !== null ? Math.round((forecastAvg - latestTasa) * 10) / 10 : null;

  // ── Drill-down data ──────────────────────────────────────────────────────
  const drillDownKPI = allKPIs.find(k => k.id === drillDownMetric);
  const drillDownBenchmark = INDUSTRY_BENCHMARKS['contact_center_cobranzas'];

  const spark30 = drillDownMetric === 'costo_contacto'
    ? cdr.last30Days.map((d, i) => ({ i, fecha: d.fecha.slice(5), v: d.tasa_contacto_pct }))
    : drillDownMetric === 'llamadas_dia'
    ? cdr.last30Days.map((d, i) => ({ i, fecha: d.fecha.slice(5), v: d.total_llamadas }))
    : drillDownMetric === 'contactos_efectivos'
    ? cdr.last30Days.map((d, i) => ({ i, fecha: d.fecha.slice(5), v: d.contactos_efectivos }))
    : [];

  const spark7 = spark30.slice(-7);
  const avg7 = spark7.length > 0 ? Math.round(spark7.reduce((s, d) => s + d.v, 0) / spark7.length * 10) / 10 : 0;
  const avg30 = spark30.length > 0 ? Math.round(spark30.reduce((s, d) => s + d.v, 0) / spark30.length * 10) / 10 : 0;
  const drillDelta = Math.round((avg7 - avg30) * 10) / 10;

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
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-[1400px] mx-auto overflow-y-auto flex-1 w-full min-w-0">

      {/* Banner de anomalía (si detectada) */}
      {anomaly?.detected && (
        <div className={cn(
          'animate-fade-slide-down rounded-xl border p-4 flex flex-col sm:flex-row items-start gap-3',
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
              onDrillDown={(metric) => setDrillDownMetric(metric)}
            />
          ))}
        </div>
      </div>

      {/* ── FORECASTING 7 DÍAS ─────────────────────────────────────────────── */}
      {cdr.forecast.length > 0 && (
        <div className="rounded-xl border border-primary/20 bg-card p-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Proyección 7 Días — Tasa de Contacto</h2>
              <p className="text-xs text-muted-foreground">Regresión lineal sobre últimos 30 días · Banda de confianza ±1 desv. estándar</p>
            </div>
            <div className="flex items-center gap-3 sm:shrink-0">
              {forecastAvg !== null && (
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Proyección promedio</p>
                  <div className="flex items-center gap-1 justify-end">
                    <span className="text-xl font-bold text-foreground">{forecastAvg}%</span>
                    {forecastVsHoy !== null && (
                      <span className={cn(
                        'flex items-center gap-0.5 text-xs font-semibold',
                        forecastVsHoy >= 0 ? 'text-emerald-400' : 'text-red-400',
                      )}>
                        {forecastVsHoy >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                        {Math.abs(forecastVsHoy)}pp
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">vs hoy ({latestTasa}%)</p>
                </div>
              )}
              <button
                onClick={() => navigate('/vicky?q=' + encodeURIComponent('Analiza el forecast de tasa de contacto para los próximos 7 días'))}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-primary/30 text-primary bg-primary/5 hover:bg-primary/15 transition-all"
              >
                <Zap size={12} />
                Analizar con Vicky
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-6 h-0.5 bg-primary rounded-full inline-block" />
              Histórico
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-6 h-0 border-t-2 border-dashed border-violet-400 inline-block" />
              Forecast
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-6 h-3 bg-violet-500/20 border border-violet-500/30 rounded-sm inline-block" />
              Banda de confianza
            </span>
          </div>

          <div className="h-48 sm:h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={forecastChartData} margin={{ top: 5, right: 10, bottom: 0, left: -15 }}>
              <defs>
                <linearGradient id="gForecastConf" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="fecha"
                tick={{ fill: '#9CA3AF', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#9CA3AF', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{ background: '#1A1F2E', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#F9FAFB' }}
                formatter={(value: number, name: string) => {
                  if (name === 'conf_high' || name === 'conf_low') return null;
                  return [`${value}%`, name === 'historico' ? 'Histórico' : 'Forecast'];
                }}
              />
              {/* Línea de referencia: promedio 30d */}
              <ReferenceLine
                y={cdr.promedio30dTasa}
                stroke="#6B7280"
                strokeDasharray="4 4"
                label={{ value: `Prom. 30d: ${cdr.promedio30dTasa}%`, fill: '#6B7280', fontSize: 10, position: 'insideTopRight' }}
              />
              {/* Banda de confianza: área entre conf_low y conf_high */}
              <Area
                type="monotone"
                dataKey="conf_high"
                stroke="none"
                fill="url(#gForecastConf)"
                fillOpacity={0.4}
                activeDot={false}
                legendType="none"
                baseValue="dataMin"
              />
              <Area
                type="monotone"
                dataKey="conf_low"
                stroke="none"
                fill="transparent"
                fillOpacity={1}
                activeDot={false}
                legendType="none"
                baseValue="dataMin"
              />
              {/* Línea histórico */}
              <Line
                type="monotone"
                dataKey="historico"
                stroke="#6334C0"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: '#6334C0' }}
                connectNulls={false}
              />
              {/* Línea forecast */}
              <Line
                type="monotone"
                dataKey="forecast"
                stroke="#A78BFA"
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={{ r: 3, fill: '#A78BFA', stroke: '#A78BFA' }}
                activeDot={{ r: 5, fill: '#A78BFA' }}
                connectNulls={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── COMPARATIVA SEMANAL (Sisense Weekly Digest) ───────────────────────── */}
      {weeklyComparison && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={15} className="text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Esta semana vs semana anterior</h2>
            <span className="text-xs text-muted-foreground ml-1">— últimos 5 días hábiles vs 5 anteriores</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Δ Tasa de contacto */}
            <div className="rounded-lg border border-border bg-secondary/20 p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Tasa de contacto</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-foreground">{weeklyComparison.thisWeekTasa}%</span>
                <span className={cn(
                  'flex items-center text-xs font-semibold',
                  weeklyComparison.deltaTasa >= 0 ? 'text-emerald-400' : 'text-red-400',
                )}>
                  {weeklyComparison.deltaTasa >= 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                  {Math.abs(weeklyComparison.deltaTasa)}pp
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Sem. ant.: {weeklyComparison.prevWeekTasa}%</p>
            </div>
            {/* Δ Volumen */}
            <div className="rounded-lg border border-border bg-secondary/20 p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Volumen llamadas</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-foreground">{weeklyComparison.thisWeekVol.toLocaleString('es-CO')}</span>
                <span className={cn(
                  'flex items-center text-xs font-semibold',
                  weeklyComparison.deltaVol >= 0 ? 'text-emerald-400' : 'text-red-400',
                )}>
                  {weeklyComparison.deltaVol >= 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                  {Math.abs(weeklyComparison.deltaVolPct)}%
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Sem. ant.: {weeklyComparison.prevWeekVol.toLocaleString('es-CO')}</p>
            </div>
            {/* Día más productivo */}
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
              <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider mb-1">🏆 Mejor día</p>
              <p className="text-sm font-bold text-foreground">{weeklyComparison.bestDay.fecha.slice(5)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{weeklyComparison.bestDay.tasa_contacto_pct}% contacto · {weeklyComparison.bestDay.total_llamadas.toLocaleString('es-CO')} llamadas</p>
            </div>
            {/* Día más bajo */}
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
              <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-1">📉 Día más bajo</p>
              <p className="text-sm font-bold text-foreground">{weeklyComparison.worstDay.fecha.slice(5)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{weeklyComparison.worstDay.tasa_contacto_pct}% contacto · {weeklyComparison.worstDay.total_llamadas.toLocaleString('es-CO')} llamadas</p>
            </div>
          </div>
        </div>
      )}

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
          <div className="h-44 sm:h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
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
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#1A1F2E', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#F9FAFB' }}
              />
              <Area type="monotone" dataKey="total" name="Total" stroke="#6334C0" strokeWidth={2} fill="url(#gTotal)" />
              <Area type="monotone" dataKey="resolved" name="Contactos" stroke="#22C55E" strokeWidth={2} fill="url(#gResolved)" />
            </AreaChart>
          </ResponsiveContainer>
          </div>
        </div>

        {/* Proactive Insights — dinámicos */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Insights del Período
          </h2>
          {dynamicInsights.map((insight, idx) => (
            <div
              key={idx}
              className={cn('rounded-lg border p-4 cursor-pointer hover:brightness-110 transition-all', bgMap[insight.type])}
              onClick={() => navigate('/vicky', { state: { question: insight.vickyQuery } })}
            >
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 shrink-0">{iconMap[insight.type]}</div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{insight.headline}</p>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{insight.body}</p>
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

      {/* ── DRILL-DOWN SHEET ─────────────────────────────────────────────────── */}
      <Sheet open={!!drillDownMetric} onOpenChange={(open) => !open && setDrillDownMetric(null)}>
        <SheetContent className="w-full sm:max-w-xl bg-card border-border overflow-y-auto">
          {drillDownKPI && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="text-foreground text-base">{drillDownKPI.title} — Análisis Detallado</SheetTitle>
              </SheetHeader>

              {/* Valor principal */}
              <div className="flex items-baseline gap-3 mb-4">
                <span className="text-4xl font-bold text-foreground">{drillDownKPI.value}</span>
                <span className="text-sm text-muted-foreground">{drillDownKPI.unit}</span>
              </div>

              {/* Estadísticas 7d / 30d */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: 'Promedio 7d', value: avg7, unit: drillDownKPI.unit },
                  { label: 'Promedio 30d', value: avg30, unit: drillDownKPI.unit },
                  { label: 'Delta 7d vs 30d', value: drillDelta, unit: 'pp', isColor: true },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-lg border border-border bg-secondary/30 p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{stat.label}</p>
                    <p className={cn(
                      'text-lg font-bold',
                      stat.isColor
                        ? drillDelta >= 0 ? 'text-emerald-400' : 'text-red-400'
                        : 'text-foreground',
                    )}>
                      {stat.isColor && drillDelta > 0 ? '+' : ''}{stat.value}{stat.unit}
                    </p>
                  </div>
                ))}
              </div>

              {/* Anomalía */}
              {anomaly?.detected && drillDownMetric === 'costo_contacto' && (
                <div className={cn(
                  'rounded-lg border p-3 mb-4 text-sm',
                  anomaly.direction === 'down'
                    ? 'border-red-500/30 bg-red-500/10 text-red-400'
                    : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
                )}>
                  <strong>Anomalía detectada</strong> — z-score: {anomaly.zScore}σ
                  <p className="text-xs text-muted-foreground mt-1">
                    Hoy: {anomaly.valorHoy}% vs promedio 30d: {anomaly.promedio30d}% ({anomaly.direction === 'down' ? '-' : '+'}{anomaly.magnitude}pp)
                  </p>
                </div>
              )}

              {/* Sparkline 30 días */}
              {spark30.length > 0 && (
                <div className="mb-5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Últimos 30 días</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={spark30} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                      <defs>
                        <linearGradient id="gDrillDown" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6334C0" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#6334C0" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="fecha" tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} interval={6} />
                      <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: '#1A1F2E', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                        labelStyle={{ color: '#F9FAFB' }}
                        formatter={(v: number) => [`${v}${drillDownKPI.unit || ''}`, drillDownKPI.title]}
                      />
                      <Area type="monotone" dataKey="v" stroke="#6334C0" strokeWidth={2} fill="url(#gDrillDown)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Benchmark de industria */}
              {drillDownMetric === 'costo_contacto' && drillDownBenchmark && (
                <div className="mb-5 rounded-lg border border-border bg-secondary/20 p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Benchmark de Industria</p>
                  <p className="text-xs text-muted-foreground mb-2">Cobranzas Colombia / Latam — Tasa de Contacto Efectivo</p>
                  {Object.entries(drillDownBenchmark.metrics.contactRate || {}).map(([region, data]) => (
                    <div key={region} className="flex items-center justify-between text-xs py-1 border-b border-border/50 last:border-0">
                      <span className="text-muted-foreground capitalize">{region}</span>
                      <span className="text-foreground">
                        P25: {data.p25}% · P50: {data.p50}% · P75: {data.p75}%
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Botón Vicky */}
              <button
                onClick={() => {
                  setDrillDownMetric(null);
                  navigate(
                    `/vicky?q=${encodeURIComponent(
                      `Diagnostica la métrica de ${drillDownKPI.title}: valor actual ${drillDownKPI.value}, promedio 7d ${avg7}${drillDownKPI.unit || ''}, promedio 30d ${avg30}${drillDownKPI.unit || ''}${anomaly?.detected && drillDownMetric === 'costo_contacto' ? `. Anomalía detectada: z-score ${anomaly.zScore}σ.` : ''}`
                    )}`
                  );
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all"
              >
                <Zap size={14} />
                Ver diagnóstico en Vicky
              </button>
            </>
          )}
        </SheetContent>
      </Sheet>

    </div>
  );
}
