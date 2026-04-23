import { useState } from 'react';
import {
  ChevronDown, ChevronUp, Lightbulb, AlertTriangle, TrendingUp, TrendingDown,
  BarChart2, Loader2, Zap, ArrowUp, ArrowDown, Calendar, FileText, Activity, Phone,
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
import { useAgentKPIs } from '@/hooks/useAgentKPIs';
import { useAgentKPIs } from '@/hooks/useAgentKPIs';
import { generateWeeklyInsight } from '@/lib/proactiveInsights';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { INDUSTRY_BENCHMARKS } from '@/data/benchmarks';
import { PageSkeleton } from '@/components/PageSkeleton';

// ─── Recharts dot render prop types ──────────────────────────────────────
interface ChartDotProps {
  cx?: number;
  cy?: number;
  index?: number;
  value?: number;
  payload?: Record<string, unknown>;
}

interface TrendItem {
  day: string;
  total?: number;
  resolved?: number;
  [key: string]: unknown;
}

// ─── Export Dashboard PDF ─────────────────────────────────────────────────────────
interface KPIExport {
  label: string;
  value: string;
  delta?: string;
  deltaPositive?: boolean;
}

function exportDashboardPDF(kpis: KPIExport[], insight: string, clientName: string) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const fecha = new Date().toLocaleDateString('es-CO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>WeKall Intelligence — Reporte Ejecutivo</title>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; max-width: 900px; margin: 40px auto; color: #12172A; }
        h1 { color: #6334C0; font-size: 22px; border-bottom: 3px solid #6334C0; padding-bottom: 10px; }
        h2 { color: #374151; font-size: 16px; margin-top: 24px; }
        .kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 20px 0; }
        .kpi { background: #F4F6FB; border-radius: 8px; padding: 16px; border-left: 4px solid #6334C0; }
        .kpi-value { font-size: 28px; font-weight: bold; color: #6334C0; }
        .kpi-label { font-size: 12px; color: #6B7280; margin-top: 4px; }
        .insight { background: #F0FDF4; border: 1px solid #86EFAC; border-radius: 8px; padding: 16px; margin: 16px 0; }
        .footer { margin-top: 40px; font-size: 11px; color: #9CA3AF; border-top: 1px solid #E5E7EB; padding-top: 12px; }
        @media print { body { margin: 20px; } .kpis { grid-template-columns: repeat(2, 1fr); } }
      </style>
    </head>
    <body>
      <h1>WeKall Intelligence — Reporte Ejecutivo</h1>
      <p style="color:#9CA3AF;font-size:13px">${clientName} · ${fecha}</p>

      <h2>KPIs del Día</h2>
      <div class="kpis">
        ${kpis.map(k => `
          <div class="kpi">
            <div class="kpi-value">${k.value}</div>
            <div class="kpi-label">${k.label}</div>
            ${k.delta ? `<div style="font-size:11px;color:${k.deltaPositive ? '#16A34A' : '#DC2626'};margin-top:4px">${k.delta}</div>` : ''}
          </div>
        `).join('')}
      </div>

      ${insight ? `
        <h2>Insight Proactivo de la Semana</h2>
        <div class="insight">${insight.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')}</div>
      ` : ''}

      <div class="footer">
        Generado por WeKall Intelligence · ${new Date().toLocaleString('es-CO')} · Datos en tiempo real desde Supabase CDR
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}

export default function Overview() {
  const { role } = useRole();
  const { clientConfig, clientBranding } = useClient();
  const navigate = useNavigate();
  const cdr = useCDRData();
  const agentKPIs = useAgentKPIs(7);

  // Nombre del cliente dinámico
  const clientName = clientBranding?.company_name || clientConfig?.client_name || 'WeKall Intelligence';

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
        : `${clientName} procesó ${latestLlamadas} llamadas el ${latestFecha}. Tasa de contacto efectivo: ${latestTasa}% (promedio 7d: ${cdr.promedio7dTasa}%, promedio 30d: ${cdr.promedio30dTasa}%). Datos: CDR histórico del cliente en tiempo real.`,
      full: `Contactos efectivos: ${cdr.latestDay?.contactos_efectivos?.toLocaleString('es-CO') ?? '...'} (${latestTasa}% del total). Delta vs promedio 7d: ${cdr.deltaTasa > 0 ? '+' : ''}${cdr.deltaTasa}pp. Fuente: Supabase — cdr_daily_metrics en tiempo real.`,
    },
    'VP Ventas': {
      short: cdr.loading
        ? 'Cargando datos en tiempo real...'
        : `Volumen ${latestFecha}: ${latestLlamadas} llamadas. Tasa de contacto: ${latestTasa}% (promedio 7d: ${cdr.promedio7dTasa}%). Delta: ${cdr.deltaTasa > 0 ? '+' : ''}${cdr.deltaTasa}pp.`,
      full: `Promedio 30d: ${cdr.promedio30dTasa}% | Promedio 7d: ${cdr.promedio7dTasa}%. Datos reales desde Supabase — CDR histórico del cliente.`,
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
      full: `Datos en tiempo real desde Supabase — cdr_daily_metrics del cliente. Delta tasa 30d: ${cdr.promedio30dTasa}%. Utilización de agentes por día requiere datos Engage360.`,
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

  // ── Helpers: filtro de días atípicos ──────────────────────────────────────
  // Regla: domingos siempre excluidos. Sábados si volumen < 40% de la mediana del bloque.
  const filtrarDiasHabiles = (days: typeof cdr.last30Days) => {
    // 1. Excluir domingos siempre
    const sinDomingos = days.filter(d => new Date(d.fecha + 'T12:00:00').getDay() !== 0);
    // 2. Calcular mediana del bloque sin domingos
    const vols = [...sinDomingos.map(d => d.total_llamadas)].sort((a, b) => a - b);
    const mediana = vols.length > 0 ? vols[Math.floor(vols.length / 2)] : 0;
    const umbralSabado = mediana * 0.40;
    // 3. Excluir sábados que caen muy por debajo
    return sinDomingos.filter(d => {
      const dow = new Date(d.fecha + 'T12:00:00').getDay();
      if (dow === 6 && d.total_llamadas < umbralSabado) return false;
      return true;
    });
  };

  // ── Comparativa semanal (esta semana vs semana anterior) ─────────────────
  const weeklyComparison = (() => {
    if (cdr.last30Days.length < 10) return null;
    const all = [...cdr.last30Days].sort((a, b) => a.fecha.localeCompare(b.fecha));
    // Filtrar días atípicos antes de comparar
    const hábiles = filtrarDiasHabiles(all);
    if (hábiles.length < 6) return null;
    const thisWeek = hábiles.slice(-5);
    const prevWeek = hábiles.slice(-10, -5);
    if (thisWeek.length === 0 || prevWeek.length === 0) return null;

    const avgTasa = (arr: typeof thisWeek) =>
      Math.round(arr.reduce((s, d) => s + d.tasa_contacto_pct, 0) / arr.length * 10) / 10;
    const avgVol = (arr: typeof thisWeek) =>
      Math.round(arr.reduce((s, d) => s + d.total_llamadas, 0) / arr.length);

    const thisWeekTasa = avgTasa(thisWeek);
    const prevWeekTasa = avgTasa(prevWeek);
    const thisWeekVol  = avgVol(thisWeek);
    const prevWeekVol  = avgVol(prevWeek);

    const deltaTasa   = Math.round((thisWeekTasa - prevWeekTasa) * 10) / 10;
    const deltaVol    = thisWeekVol - prevWeekVol;
    const deltaVolPct = prevWeekVol > 0 ? Math.round(((thisWeekVol - prevWeekVol) / prevWeekVol) * 1000) / 10 : 0;
    const bestDay     = thisWeek.reduce((a, b) => a.tasa_contacto_pct > b.tasa_contacto_pct ? a : b);
    const worstDay    = thisWeek.reduce((a, b) => a.tasa_contacto_pct < b.tasa_contacto_pct ? a : b);

    return { thisWeekTasa, prevWeekTasa, deltaTasa, thisWeekVol, prevWeekVol, deltaVol, deltaVolPct, bestDay, worstDay };
  })();

  // ── MTD: Mes hasta la fecha vs mismo período mes anterior ─────────────────
  const mtdComparison = (() => {
    if (cdr.last30Days.length < 5) return null;
    const today = new Date();
    const dayOfMonth = today.getDate(); // ej: 22 si hoy es 22 abril
    const thisMonth  = today.getMonth();   // 0-indexed
    const thisYear   = today.getFullYear();

    // Mes actual: días 1 al 'dayOfMonth' del mes corriente
    const mtdCurrent = cdr.last30Days.filter(d => {
      const dd = new Date(d.fecha + 'T12:00:00');
      return dd.getMonth() === thisMonth && dd.getFullYear() === thisYear && dd.getDate() <= dayOfMonth;
    });

    // Mes anterior: días 1 al 'dayOfMonth' del mes anterior (apples-to-apples)
    const prevMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const prevYear  = thisMonth === 0 ? thisYear - 1 : thisYear;
    const mtdPrev   = cdr.last30Days.filter(d => {
      const dd = new Date(d.fecha + 'T12:00:00');
      return dd.getMonth() === prevMonth && dd.getFullYear() === prevYear && dd.getDate() <= dayOfMonth;
    });

    if (mtdCurrent.length === 0) return null;

    // Filtrar días atípicos en ambos períodos
    const curHábiles  = filtrarDiasHabiles(mtdCurrent);
    const prevHábiles = filtrarDiasHabiles(mtdPrev);

    const sumVol  = (arr: typeof mtdCurrent) => arr.reduce((s, d) => s + d.total_llamadas, 0);
    const avgTasa = (arr: typeof mtdCurrent) => arr.length > 0
      ? Math.round(arr.reduce((s, d) => s + d.tasa_contacto_pct, 0) / arr.length * 10) / 10 : 0;

    const curTasa    = avgTasa(curHábiles.length > 0 ? curHábiles : mtdCurrent);
    const prevTasa   = avgTasa(prevHábiles.length > 0 ? prevHábiles : mtdPrev);
    const curVol     = sumVol(mtdCurrent);
    const prevVol    = sumVol(mtdPrev);
    const deltaTasa  = Math.round((curTasa - prevTasa) * 10) / 10;
    const deltaVol   = curVol - prevVol;
    const deltaVolPct = prevVol > 0 ? Math.round(((curVol - prevVol) / prevVol) * 1000) / 10 : 0;
    const diasCur    = curHábiles.length || mtdCurrent.length;
    const diasPrev   = prevHábiles.length || mtdPrev.length;

    const mesNombre  = today.toLocaleString('es-CO', { month: 'long' });
    const mesAnteriorNombre = new Date(prevYear, prevMonth, 1).toLocaleString('es-CO', { month: 'long' });

    return { curTasa, prevTasa, deltaTasa, curVol, prevVol, deltaVol, deltaVolPct, diasCur, diasPrev, dayOfMonth, mesNombre, mesAnteriorNombre };
  })();

  // Proyección promedio
  const forecastAvg = cdr.forecast.length > 0
    ? Math.round(cdr.forecast.reduce((s, f) => s + f.predicted_tasa, 0) / cdr.forecast.length * 10) / 10
    : null;
  const forecastVsHoy = forecastAvg !== null ? Math.round((forecastAvg - latestTasa) * 10) / 10 : null;

  // Forecast max/min dot indices (offset by historical + bridge points)
  const forecastOnlyValues = cdr.forecast.map(f => f.predicted_tasa);
  const forecastOffset = cdr.last7Days.length + (cdr.forecast.length > 0 && cdr.last7Days.length > 0 ? 1 : 0);
  const forecastMaxLocalIdx = forecastOnlyValues.length >= 2
    ? forecastOnlyValues.reduce((best, v, i, arr) => v > arr[best] ? i : best, 0)
    : -1;
  const forecastMinLocalIdx = forecastOnlyValues.length >= 2
    ? forecastOnlyValues.reduce((best, v, i, arr) => v < arr[best] ? i : best, 0)
    : -1;
  const forecastMaxIdx = forecastMaxLocalIdx >= 0 ? forecastOffset + forecastMaxLocalIdx : -1;
  const forecastMinIdx = forecastMinLocalIdx >= 0 ? forecastOffset + forecastMinLocalIdx : -1;
  const showForecastDots = forecastMaxIdx >= 0 && forecastMinIdx >= 0 && forecastMaxIdx !== forecastMinIdx;

  // ── Drill-down data ──────────────────────────────────────────────────────
  const drillDownKPI = allKPIs.find(k => k.id === drillDownMetric);
  const drillDownBenchmark = INDUSTRY_BENCHMARKS['contact_center_cobranzas'];

  const spark30 = drillDownMetric === 'costo_contacto'
    ? cdr.last30Days.map((d, i) => ({ i, fecha: d.fecha.slice(5), v: d.tasa_contacto_pct }))
    : drillDownMetric === 'llamadas_dia'
    ? cdr.last30Days.map((d, i) => ({ i, fecha: d.fecha.slice(5), v: d.total_llamadas }))
    : drillDownMetric === 'contactos_efectivos'
    ? cdr.last30Days.map((d, i) => ({ i, fecha: d.fecha.slice(5), v: d.contactos_efectivos }))
    : drillDownMetric === 'aht_real'
    ? cdr.last30Days.map((d, i) => ({ i, fecha: d.fecha.slice(5), v: d.aht_minutos ?? 0 })).filter(d => d.v > 0)
    : drillDownMetric === 'tasa_contacto'
    ? cdr.last30Days.map((d, i) => ({ i, fecha: d.fecha.slice(5), v: d.tasa_contacto_pct }))
    : [];

  const spark7 = spark30.slice(-7);
  const avg7 = spark7.length > 0 ? Math.round(spark7.reduce((s, d) => s + d.v, 0) / spark7.length * 10) / 10 : 0;
  const avg30 = spark30.length > 0 ? Math.round(spark30.reduce((s, d) => s + d.v, 0) / spark30.length * 10) / 10 : 0;
  const drillDelta = Math.round((avg7 - avg30) * 10) / 10;

  // Loading skeleton
  if (cdr.loading) {
    return <PageSkeleton rows={3} />;
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

  // Preparar KPIs para PDF
  const kpisParaPDF: KPIExport[] = primaryKPIs.map(k => ({
    label: k.title,
    value: k.value,
    delta: k.changeLabel || undefined,
    deltaPositive: k.change >= 0 && !k.invertColor,
  }));

  // Insight para PDF: primer insight dinámico (si existe)
  const insightParaPDF = dynamicInsights.length > 0
    ? `${dynamicInsights[0].headline}\n${dynamicInsights[0].body}\n${dynamicInsights[0].action}`
    : '';

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-[1400px] mx-auto overflow-y-auto flex-1 w-full min-w-0">

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{clientName} · datos en tiempo real</p>
        </div>
        <button
          onClick={() => exportDashboardPDF(kpisParaPDF, insightParaPDF, clientName)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <FileText size={13} />
          Exportar PDF
        </button>
      </div>

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
          <div className="flex flex-col gap-2 shrink-0">
            <button
              onClick={() => navigate(`/vicky?q=${anomalyVickyQuestion}`)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-all',
                anomaly.direction === 'down'
                  ? 'border-red-500/30 text-red-400 bg-red-500/10 hover:bg-red-500/20'
                  : 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20',
              )}
            >
              <Zap size={13} />
              Ver en Vicky
            </button>
            {/* Feature 3: Drill-to-source — ver transcripciones del día de la anomalía */}
            {cdr.latestDay?.fecha && (
              <button
                onClick={() => navigate('/transcriptions?date=' + cdr.latestDay!.fecha + '&filter=fallidas')}
                className="text-xs text-muted-foreground underline hover:text-foreground transition-colors text-center"
              >
                Ver transcripciones del día →
              </button>
            )}
          </div>
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

          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
              Embudo de Gestión — Cobranza
            </h2>
            {(() => {
              const diasConRpc = cdr.last30Days.filter(d => d.rpc_contactos != null && (d.rpc_contactos ?? 0) > 0);
              if (diasConRpc.length === 0 || (clientConfig?.industry || '') === 'fintech_pagos') return null;
              const avgRpcRate = Math.round(diasConRpc.reduce((s, d) => s + (d.rpc_rate_pct || 0), 0) / diasConRpc.length * 10) / 10;
              const avgPtpRate = Math.round(diasConRpc.reduce((s, d) => s + (d.ptp_rate_pct || 0), 0) / diasConRpc.length * 10) / 10;
              const latestRpc = cdr.latestDay?.rpc_rate_pct ?? null;
              const latestPtp = cdr.latestDay?.ptp_rate_pct ?? null;
              const rpcHoy = cdr.latestDay?.rpc_contactos || 0;
              const ptpHoy = cdr.latestDay?.ptp_contactos || 0;
              const totalHoy = cdr.latestDay?.total_llamadas || 0;
              const rpcPct = (latestRpc && latestRpc > 0 ? latestRpc : avgRpcRate) || 0;
              const ptpPct = (latestPtp && latestPtp > 0 ? latestPtp : avgPtpRate) || 0;
              const rpcAbs = latestRpc && latestRpc > 0 ? rpcHoy : Math.round(totalHoy * rpcPct / 100);
              const ptpAbs = latestPtp && latestPtp > 0 ? ptpHoy : Math.round(rpcAbs * ptpPct / 100);
              const isHistoric = !latestRpc || latestRpc === 0;
              return (
                <FunnelCobranza
                  totalHoy={totalHoy}
                  rpcPct={rpcPct}
                  rpcAbs={rpcAbs}
                  ptpPct={ptpPct}
                  ptpAbs={ptpAbs}
                  isHistoric={isHistoric}
                  diasConRpc={diasConRpc}
                />
              );
            })()}
          </div>
      {/* ── FORECASTING 7 DÍAS ─────────────────────────────────────────────── */}
      {cdr.forecast.length > 0 && (
        <div className="rounded-xl border border-primary/20 bg-card p-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Proyección 7 Días — Tasa de Contacto</h2>
              <p className="text-xs text-muted-foreground">Suavizado exponencial + tendencia amortiguada · Feriados y días atípicos excluidos · Banda creciente de confianza</p>
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
                        itemStyle={{ color: '#F9FAFB' }}
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
                activeDot={{ r: 5, fill: '#A78BFA' }}
                connectNulls={false}
                dot={showForecastDots ? ( props: ChartDotProps) => {
                  const { cx, cy, index, payload } = props;
                  const value = payload?.forecast;
                  const isMax = index === forecastMaxIdx;
                  const isMin = index === forecastMinIdx;
                  if (!isMax && !isMin) return <g key={`fd-${index}`} />;
                  const color = isMax ? '#22c55e' : '#ef4444';
                  const fmt = typeof value === 'number'
                    ? (value % 1 === 0 ? String(value) : value.toFixed(1))
                    : String(value ?? '');
                  return (
                    <g key={`fd-${index}`}>
                      <circle cx={cx} cy={cy} r={4} fill={color} stroke="none" />
                      <text
                        x={cx}
                        y={isMax ? cy - 10 : cy + 13}
                        textAnchor="middle"
                        fontSize={9}
                        fill={color}
                        fontWeight={700}
                      >
                        {fmt}%
                      </text>
                    </g>
                  );
                } : { r: 3, fill: '#A78BFA', stroke: '#A78BFA' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── COMPARATIVA SEMANAL (Sisense Weekly Digest) ───────────────────────── */}
      {/* Semana vs anterior + MTD — mismo layout de 2 columnas */}
      {(weeklyComparison || mtdComparison) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* ── Semana actual vs semana anterior ── */}
          {weeklyComparison && (
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Calendar size={15} className="text-primary" />
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Esta semana vs semana anterior</h2>
                  <p className="text-xs text-muted-foreground">Últimos 5 días hábiles vs 5 anteriores</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                {/* Δ Tasa */}
                <div className="rounded-lg bg-secondary/50 p-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Tasa de contacto</p>
                  <p className="text-2xl font-bold text-foreground">{weeklyComparison.thisWeekTasa}%</p>
                  <span className={cn('flex items-center text-xs font-semibold mt-0.5', weeklyComparison.deltaTasa >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {weeklyComparison.deltaTasa >= 0 ? <ArrowUp size={11}/> : <ArrowDown size={11}/>}{Math.abs(weeklyComparison.deltaTasa)}pp
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-1">Sem. ant.: {weeklyComparison.prevWeekTasa}%</p>
                </div>
                {/* Δ Volumen */}
                <div className="rounded-lg bg-secondary/50 p-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Volumen llamadas</p>
                  <p className="text-2xl font-bold text-foreground">{weeklyComparison.thisWeekVol.toLocaleString('es-CO')}</p>
                  <span className={cn('flex items-center text-xs font-semibold mt-0.5', weeklyComparison.deltaVol >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {weeklyComparison.deltaVol >= 0 ? <ArrowUp size={11}/> : <ArrowDown size={11}/>}{Math.abs(weeklyComparison.deltaVolPct)}%
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-1">Sem. ant.: {weeklyComparison.prevWeekVol.toLocaleString('es-CO')}</p>
                </div>
              </div>
              {/* Mejor/Peor día en fila */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider mb-1">🏆 Mejor día</p>
                  <p className="text-sm font-bold text-foreground">{weeklyComparison.bestDay.fecha.slice(5)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{weeklyComparison.bestDay.tasa_contacto_pct}% · {weeklyComparison.bestDay.total_llamadas.toLocaleString('es-CO')} llamadas</p>
                </div>
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                  <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-1">📉 Día más bajo</p>
                  <p className="text-sm font-bold text-foreground">{weeklyComparison.worstDay.fecha.slice(5)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{weeklyComparison.worstDay.tasa_contacto_pct}% · {weeklyComparison.worstDay.total_llamadas.toLocaleString('es-CO')} llamadas</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Mes hasta la fecha vs mes anterior ── */}
          {mtdComparison && (
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-base">📅</span>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Mes hasta la fecha vs mes anterior</h2>
                  <p className="text-xs text-muted-foreground capitalize">{mtdComparison.mesNombre} 1–{mtdComparison.dayOfMonth} ({mtdComparison.diasCur} días hábiles) vs mismo período de {mtdComparison.mesAnteriorNombre}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-secondary/50 p-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Tasa de contacto</p>
                  <p className="text-2xl font-bold text-foreground">{mtdComparison.curTasa}%</p>
                  <span className={`flex items-center text-xs font-semibold mt-0.5 ${mtdComparison.deltaTasa >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {mtdComparison.deltaTasa >= 0 ? '↑' : '↓'}{Math.abs(mtdComparison.deltaTasa)}pp
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-1 capitalize">Mes ant.: {mtdComparison.prevTasa}%</p>
                </div>
                <div className="rounded-lg bg-secondary/50 p-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Volumen llamadas</p>
                  <p className="text-2xl font-bold text-foreground">{mtdComparison.curVol.toLocaleString('es-CO')}</p>
                  <span className={`flex items-center text-xs font-semibold mt-0.5 ${mtdComparison.deltaVolPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {mtdComparison.deltaVolPct >= 0 ? '↑' : '↓'}{Math.abs(mtdComparison.deltaVolPct)}%
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-1">Mes ant.: {mtdComparison.prevVol.toLocaleString('es-CO')}</p>
                </div>
              </div>
            </div>
          )}

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
                        itemStyle={{ color: '#F9FAFB' }}
              />
              <Area type="monotone" dataKey="total" name="Total" stroke="#6334C0" strokeWidth={2} fill="url(#gTotal)" dot={(() => {
                const totalVals = conversationTrend.map((d: TrendItem) => d.total ?? 0);
                const hasEnough = totalVals.length >= 3;
                const maxIdx = hasEnough ? totalVals.reduce((best: number, v: number, i: number) => v > totalVals[best] ? i : best, 0) : -1;
                const minIdx = hasEnough ? totalVals.reduce((best: number, v: number, i: number) => v < totalVals[best] ? i : best, 0) : -1;
                const showDots = hasEnough && maxIdx !== minIdx;
                if (!showDots) return false;
                return (props: ChartDotProps) => {
                  const { cx, cy, index, value } = props;
                  const isMax = index === maxIdx;
                  const isMin = index === minIdx;
                  if (!isMax && !isMin) return <g key={index} />;
                  const color = isMax ? '#22c55e' : '#ef4444';
                  const fmt = typeof value === 'number' ? (value % 1 === 0 ? String(value) : value.toFixed(1)) : String(value);
                  return (
                    <g key={index}>
                      <circle cx={cx} cy={cy} r={3.5} fill={color} stroke="none" />
                      <text x={cx} y={isMax ? cy - 7 : cy + 13} textAnchor="middle" fontSize={9} fill={color} fontWeight="600">{fmt}</text>
                    </g>
                  );
                };
              })()} activeDot={false} />
              <Area type="monotone" dataKey="resolved" name="Contactos" stroke="#22C55E" strokeWidth={2} fill="url(#gResolved)" dot={(() => {
                const resolvedVals = conversationTrend.map((d: TrendItem) => d.resolved ?? 0);
                const hasEnough = resolvedVals.length >= 3;
                const maxIdx = hasEnough ? resolvedVals.reduce((best: number, v: number, i: number) => v > resolvedVals[best] ? i : best, 0) : -1;
                const minIdx = hasEnough ? resolvedVals.reduce((best: number, v: number, i: number) => v < resolvedVals[best] ? i : best, 0) : -1;
                const showDots = hasEnough && maxIdx !== minIdx;
                if (!showDots) return false;
                return (props: ChartDotProps) => {
                  const { cx, cy, index, value } = props;
                  const isMax = index === maxIdx;
                  const isMin = index === minIdx;
                  if (!isMax && !isMin) return <g key={index} />;
                  const color = isMax ? '#22c55e' : '#ef4444';
                  const fmt = typeof value === 'number' ? (value % 1 === 0 ? String(value) : value.toFixed(1)) : String(value);
                  return (
                    <g key={index}>
                      <circle cx={cx} cy={cy} r={3.5} fill={color} stroke="none" />
                      <text x={cx} y={isMax ? cy - 7 : cy + 13} textAnchor="middle" fontSize={9} fill={color} fontWeight="600">{fmt}</text>
                    </g>
                  );
                };
              })()} activeDot={false} />
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

      {/* ── KPIs CX + Ventas + Operaciones (agents_performance) ─────────────── */}
      {!agentKPIs.loading && (
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            KPIs de Calidad — CSAT · FCR · Escalaciones · Conversión · Costo/Llamada
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">

            {/* CSAT promedio — VP CX */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">CSAT Promedio</p>
              <p className="text-2xl font-bold text-foreground">
                {agentKPIs.csatPromedio > 0 ? agentKPIs.csatPromedio.toFixed(1) + '/5' : '—'}
              </p>
              <p className="text-[11px] text-muted-foreground">Últimos 7 días · agentes activos</p>
            </div>

            {/* FCR promedio — VP CX */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">FCR (First Contact Resolution)</p>
              <p className="text-2xl font-bold text-foreground">
                {agentKPIs.fcrPromedio > 0 ? agentKPIs.fcrPromedio.toFixed(1) + '%' : '—'}
              </p>
              <p className="text-[11px] text-muted-foreground">Resolución en primer contacto</p>
            </div>

            {/* Escalaciones promedio — VP CX */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Escalaciones</p>
              <p className={cn(
                'text-2xl font-bold',
                agentKPIs.escalacionesPromedio > 10 ? 'text-red-400' : 'text-foreground',
              )}>
                {agentKPIs.escalacionesPromedio > 0 ? agentKPIs.escalacionesPromedio.toFixed(1) + '%' : '—'}
              </p>
              <p className="text-[11px] text-muted-foreground">% llamadas escaladas · 7 días</p>
            </div>

            {/* Tasa de Conversión (proxy tasa_promesa) — VP Ventas */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Tasa de Conversión <span className="normal-case font-normal text-muted-foreground">(proxy)</span></p>
              <p className="text-2xl font-bold text-foreground">
                {agentKPIs.tasaPromesaPromedio > 0 ? agentKPIs.tasaPromesaPromedio.toFixed(1) + '%' : '—'}
              </p>
              <p className="text-[11px] text-muted-foreground">Tasa promesa/cierre · 7 días</p>
            </div>

            {/* Costo por llamada — VP Operaciones */}
            {(() => {
              const totalLlamadasMes = cdr.last30Days.length > 0
                ? cdr.last30Days.reduce((s, d) => s + d.total_llamadas, 0)
                : 0;
              const diasHabiles = 22;
              const promedioLlamadasDia = totalLlamadasMes > 0
                ? totalLlamadasMes / cdr.last30Days.length
                : 0;
              const llamadasMes = Math.round(promedioLlamadasDia * diasHabiles);
              const nomina = clientConfig?.nomina_total_mes;
              const costoXLlamada = nomina && llamadasMes > 0
                ? Math.round(nomina / llamadasMes)
                : null;
              return (
                <div className="rounded-xl border border-border bg-card p-4 space-y-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Costo / Llamada</p>
                  <p className="text-2xl font-bold text-foreground">
                    {costoXLlamada !== null ? `COP $${costoXLlamada.toLocaleString('es-CO')}` : '—'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {nomina ? `Nómina $${nomina.toLocaleString('es-CO')} / ${llamadasMes.toLocaleString('es-CO')} llamadas` : 'Configura nómina en Ajustes'}
                  </p>
                </div>
              );
            })()}

          </div>
        </div>
      )}

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

      {/* ── KPIs OPERACIONES — Ocupación Estimada + Llamadas/Hora (Sprint 2B) ─── */}
      {!agentKPIs.loading && agentKPIs.agentesActivos > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            KPIs Operaciones (VP Ops) · Engage360 · {agentKPIs.agentesActivos} agentes
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Ocupación Estimada */}
            <div className={cn(
              'rounded-xl border bg-card p-4 space-y-1',
              agentKPIs.ocupacionPromedio > 90 ? 'border-red-500/30' :
              agentKPIs.ocupacionPromedio >= 75 ? 'border-emerald-500/30' :
              'border-border',
            )}>
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-primary" />
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Ocupación Estimada</p>
              </div>
              <p className={cn(
                'text-2xl font-bold',
                agentKPIs.ocupacionPromedio > 90 ? 'text-red-400' :
                agentKPIs.ocupacionPromedio >= 75 ? 'text-emerald-400' :
                'text-foreground',
              )}>
                {agentKPIs.ocupacionPromedio.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">Benchmark COPC: 75–85%</p>
              <p className={cn(
                'text-[10px] font-medium',
                agentKPIs.ocupacionPromedio > 90 ? 'text-red-400' :
                agentKPIs.ocupacionPromedio >= 75 ? 'text-emerald-400' :
                'text-sky-400',
              )}>
                {agentKPIs.ocupacionPromedio > 90 ? '⚠️ Riesgo burnout' :
                 agentKPIs.ocupacionPromedio >= 75 ? '✅ Rango óptimo' :
                 '↓ Bajo benchmark'}
              </p>
            </div>

            {/* Llamadas por Hora */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-1">
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-primary" />
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Llamadas / Hora</p>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {agentKPIs.llamadasXHoraPromedio.toFixed(1)}
              </p>
              <p className="text-xs text-muted-foreground">Benchmark COPC: 14–18 llamadas/h</p>
              <p className="text-[10px] font-medium text-muted-foreground">
                Top: {agentKPIs.llamadasXHoraMax.toFixed(1)} · Mín: {agentKPIs.llamadasXHoraMin.toFixed(1)}
              </p>
            </div>

            {/* CSAT Promedio */}
            <div className={cn(
              'rounded-xl border bg-card p-4 space-y-1',
              agentKPIs.csatPromedio < 3.5 ? 'border-red-500/30' :
              agentKPIs.csatPromedio >= 4.0 ? 'border-emerald-500/30' :
              'border-border',
            )}>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">CSAT Equipo</p>
              <p className={cn(
                'text-2xl font-bold',
                agentKPIs.csatPromedio < 3.5 ? 'text-red-400' :
                agentKPIs.csatPromedio >= 4.0 ? 'text-emerald-400' :
                'text-foreground',
              )}>
                {agentKPIs.csatPromedio.toFixed(1)}/5
              </p>
              <p className="text-xs text-muted-foreground">Benchmark: ≥4.0/5</p>
              <p className={cn(
                'text-[10px] font-medium',
                agentKPIs.csatPromedio < 3.5 ? 'text-red-400' : 'text-emerald-400',
              )}>
                {agentKPIs.csatPromedio < 3.5 ? '⚠️ Bajo umbral' : '✅ Buen nivel'}
              </p>
            </div>

            {/* FCR Promedio */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">FCR Equipo</p>
              <p className="text-2xl font-bold text-foreground">
                {agentKPIs.fcrPromedio.toFixed(0)}%
              </p>
              <p className="text-xs text-muted-foreground">Benchmark COPC: ≥75%</p>
              <p className={cn(
                'text-[10px] font-medium',
                agentKPIs.fcrPromedio >= 75 ? 'text-emerald-400' : 'text-sky-400',
              )}>
                {agentKPIs.fcrPromedio >= 75 ? '✅ Cumple' : '↓ Por mejorar'}
              </p>
            </div>
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
                        itemStyle={{ color: '#F9FAFB' }}
                        formatter={(v: number) => [`${v}${drillDownKPI.unit || ''}`, drillDownKPI.title]}
                      />
                      <Area type="monotone" dataKey="v" stroke="#6334C0" strokeWidth={2} fill="url(#gDrillDown)" activeDot={false} dot={(() => {
                        const vals = spark30.map(d => d.v);
                        const hasEnough = vals.length >= 3;
                        // invertColor: usar la propiedad del KPI (no hardcodear por id)
                        const invertColor = drillDownKPI?.invertColor === true;
                        const maxIdx = hasEnough ? vals.reduce((best, v, i) => v > vals[best] ? i : best, 0) : -1;
                        const minIdx = hasEnough ? vals.reduce((best, v, i) => v < vals[best] ? i : best, 0) : -1;
                        const showDots = hasEnough && maxIdx !== minIdx;
                        if (!showDots) return false;
                        // maxColor: verde si higher=mejor, rojo si lower=mejor
                        const maxColor = invertColor ? '#ef4444' : '#22c55e';
                        const minColor = invertColor ? '#22c55e' : '#ef4444';
                        return (props: ChartDotProps) => {
                          const { cx, cy, index, payload } = props;
                          const isMax = index === maxIdx;
                          const isMin = index === minIdx;
                          if (!isMax && !isMin) return <g key={index} />;
                          const rawVal = payload?.v;
                          const color = isMax ? maxColor : minColor;
                          const fmt = typeof rawVal === 'number' ? (rawVal % 1 === 0 ? String(rawVal) : rawVal.toFixed(1)) : String(rawVal ?? '');
                          return (
                            <g key={index}>
                              <circle cx={cx} cy={cy} r={4} fill={color} stroke="none" />
                              <text x={cx} y={isMax ? cy - 10 : cy + 14} textAnchor="middle" fontSize={10} fill={color} fontWeight="700">{fmt}</text>
                            </g>
                          );
                        };
                      })()} />
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
