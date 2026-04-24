/**
 * FinancialIntelligence — V22 (reescritura completa, 20 abr 2026)
 * Consistente con Overview/KPICard: sparklines, Executive Brief, vs-industria,
 * paleta dark unificada, banner estimativos minimalista.
 */
import { useEffect, useState } from 'react';
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle, Loader2,
  Upload, CheckCircle2, XCircle, Info, FileText, Zap,
} from 'lucide-react';
import {
  AreaChart, Area, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ComposedChart, BarChart, Cell,
} from 'recharts';
import { KPICard } from '@/components/KPICard';
import { useClient } from '@/contexts/ClientContext';
import type { KPIData } from '@/data/mockData';
import { useRef } from 'react';

// ─── Proxy ─────────────────────────────────────────────────────────────────────
const PROXY_URL = (import.meta.env.VITE_PROXY_URL || 'https://wekall-vicky-proxy.fabsaa98.workers.dev').replace(/\/$/, '');

async function proxyQuery<T>(payload: object): Promise<T> {
  const resp = await fetch(`${PROXY_URL}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({})) as Record<string, string>;
    throw new Error(err.error || `query_error_${resp.status}`);
  }
  return resp.json() as Promise<T>;
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const TICKET_PROMEDIO_COP = 160_000;
const TASA_CUMPLIMIENTO   = 0.60;
const TASA_PROMESA        = 0.40;
// Defaults — se sobreescriben con datos reales de client_labor_costs
const DEFAULT_costoAgenteMes = 3_000_000; // COP — fallback cuando no hay client_labor_costs
const DEFAULT_agentesActivos  = 81;         // fallback cuando no hay client_labor_costs
const DIAS_LABORALES_MES  = 22;

// Benchmarks industria cobranzas LATAM (COPC 2024)
const BM_TASA_CONTACTO_PCT  = 22.5;   // %
const BM_TASA_PROMESA_PCT   = 35.0;   // % contactos efectivos
const BM_TASA_CUMPLIM_PCT   = 55.0;   // % promesas cumplidas
// Scale-G Fix #4 (21 abr 2026) — renombrado: BM_COSTO_CC_PCT ≤15% es saludable
const BM_COSTO_CC_PCT       = 15.0;   // % costo CC / recaudo — benchmark saludable ≤15%

// ─── Types ─────────────────────────────────────────────────────────────────────
interface CDRDaily {
  fecha: string;
  total_llamadas: number;
  contactos_efectivos: number;
}

// Scale-A (23 abr 2026) — PTP/RPC reales de Supabase
interface CDRPTPRow {
  fecha: string;
  ptp_contactos: number | null;
  ptp_rate_pct: number | null;
  rpc_contactos: number | null;
  rpc_rate_pct: number | null;
  total_llamadas: number;
}

interface MonthlyFinancial {
  mes: string;
  mesLabel: string;
  recaudo: number;
  costoOp: number;
  margen: number;
  margenPct: number;
  promesas: number;
  llamadas: number;
  contactos: number;
  tasaContacto: number;
}

interface CampaignRow {
  campana: string;
  tipo: 'cobranza' | 'servicio';
  moneda: 'COP' | 'PEN';
  llamadas: number;
  contactos: number;
  promesasEst: number;
  recaudoEst: number;
  pctTotal: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function fmtCOP(n: number): string {
  if (Math.abs(n) >= 1_000_000_000) return `$${(n/1_000_000_000).toFixed(2)}B`;
  if (Math.abs(n) >= 1_000_000)     return `$${(n/1_000_000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}M`;
  return `$${n.toLocaleString('es-CO')}`;
}

function fmtCOPFull(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  return `${sign}COP $${abs.toLocaleString('es-CO')}`;
}

function mesLabel(ym: string): string {
  const [year, month] = ym.split('-').map(Number);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

// Scale-G Fix #1 (21 abr 2026) — tipo cobranza/servicio; servicio NO suma recaudo
// CAMPANAS_DIST es dinámico según el cliente — se define por industria en el componente
// Para cobranza (credismart): Colombia 55% + Perú 25% + Servicio 20%
// Para fintech_pagos (bold): Servicio inbound 100%
const CAMPANAS_COBRANZA = [
  { name: 'Cobranzas Colombia', pct: 0.55, tipo: 'cobranza' as const, moneda: 'COP' as const },
  { name: 'Cobranzas Perú',     pct: 0.25, tipo: 'cobranza' as const, moneda: 'PEN' as const },
  { name: 'Servicio CO',        pct: 0.12, tipo: 'servicio' as const, moneda: 'COP' as const },
  { name: 'Servicio PE',        pct: 0.08, tipo: 'servicio' as const, moneda: 'COP' as const },
];
const CAMPANAS_FINTECH = [
  { name: 'Soporte y Servicio', pct: 0.70, tipo: 'servicio' as const, moneda: 'COP' as const },
  { name: 'Ventas / Activación', pct: 0.20, tipo: 'servicio' as const, moneda: 'COP' as const },
  { name: 'Retención',          pct: 0.10, tipo: 'servicio' as const, moneda: 'COP' as const },
];
const COBRANZA_PCT = 0.80;

// Scale-G Fix #2v2 (21 abr 2026) — Normalización a USD con tasas vigentes Banco Central
// Colombia: TRM promedio abril 2026 = 3,634 COP/USD (Banco de la República, fuente: dolar.wilkinsonpc.com.co)
// Perú: TC promedio abril 2026 = 3.42 PEN/USD (BCRP interbancario, promedio 1-20 abr)
const USD_COP = 3634;   // TRM promedio abr 2026 — Banco de la República Colombia
const USD_PEN = 3.42;   // TC promedio abr 2026 — BCRP Perú (interbancario)
const TICKET_PEN = 150; // Ticket promedio Perú en soles — estimado conservador (equiv. ~USD $44, similar CO)
                         // Pendiente validar con transcripciones reales de Perú (21 abr 2026)

function toUSD(amount: number, moneda: 'COP' | 'PEN'): number {
  return moneda === 'COP' ? amount / USD_COP : amount / USD_PEN;
}

function fmtUSD(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `USD $${(n/1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000)     return `USD $${(n/1_000).toFixed(1)}K`;
  return `USD $${n.toFixed(0)}`;
}

// ─── Custom Tooltip ────────────────────────────────────────────────────────────
function FinancialTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; fill?: string; stroke?: string; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-3 text-xs shadow-xl">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span style={{ color: p.fill || p.stroke || p.color }} className="font-medium">{p.name}</span>
          <span className="text-foreground font-bold">{fmtCOP(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Executive Brief ──────────────────────────────────────────────────────────
function ExecutiveBrief({
  recaudoHoy, recaudoMes, margenMes, tendenciaPct, hasRealData,
  tasaContacto, mesLabel, industry, costoOpMes,
  hasPtpData = false, mesPtpContacts = 0, todayPtpContacts = 0, roiValue = 0,
}: {
  recaudoHoy: number; recaudoMes: number; margenMes: number;
  tendenciaPct: number; hasRealData: boolean; tasaContacto: number; mesLabel: string; industry?: string; costoOpMes: number;
  hasPtpData?: boolean; mesPtpContacts?: number; todayPtpContacts?: number; roiValue?: number;
}) {
  const isFintech = industry === 'fintech_pagos';
  // costoPct = costo CC como % del recaudo
  const costoPct   = recaudoMes > 0 && costoOpMes > 0 ? (costoOpMes / recaudoMes) * 100 : 0;
  const margenOk   = costoPct <= BM_COSTO_CC_PCT; // ≤15% = eficiente
  const tcVsBm     = tasaContacto - BM_TASA_CONTACTO_PCT;
  const tendOk     = tendenciaPct >= 0;

  const statusColor = margenOk ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-600 dark:text-red-400';
  const statusText  = margenOk ? 'Costo CC dentro de benchmark' : 'Costo CC supera benchmark';

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start gap-2 mb-3">
        <FileText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div>
          <h2 className="text-sm font-semibold text-foreground">Executive Brief — {mesLabel}</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">Síntesis ejecutiva · {hasRealData ? 'Datos reales' : hasPtpData ? 'PTP real + estimativo' : 'Estimativos CDR'}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <div className={`h-2 w-2 rounded-full ${margenOk ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse`} />
        <span className={`text-sm font-bold ${statusColor}`}>{statusText}</span>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">
        En <span className="text-foreground font-medium">{mesLabel}</span> la operación{' '}
        {tendOk
          ? <>muestra una tendencia <span className="text-emerald-700 dark:text-emerald-300 font-semibold">positiva de +{tendenciaPct.toFixed(1)}%</span> vs. el mes anterior.</>
          : <>registra una caída de <span className="text-red-400 font-semibold">{tendenciaPct.toFixed(1)}%</span> vs. el mes anterior.</>
        }{' '}
        {isFintech ? (
          <>
            El volumen de atención muestra una tasa de contacto de{' '}
            <span className="text-foreground font-semibold">{tasaContacto.toFixed(1)}%</span>.{' '}
            La tasa de contacto{' '}
            {tcVsBm >= 0
              ? <><span className="text-green-700 dark:text-green-300 font-semibold">supera el benchmark</span> en +{tcVsBm.toFixed(1)}pp ({tasaContacto.toFixed(1)}% vs {BM_TASA_CONTACTO_PCT}% COPC LATAM).</>
              : <><span className="text-amber-700 dark:text-amber-300 font-semibold">está {Math.abs(tcVsBm).toFixed(1)}pp por debajo</span> del benchmark ({tasaContacto.toFixed(1)}% vs {BM_TASA_CONTACTO_PCT}% COPC LATAM).</>
            }{' '}
            Proyección diaria: <span className="text-foreground font-semibold">{(13059/30).toFixed(0)} llamadas</span> estimadas hoy.
          </>
        ) : (
          <>
            {/* Scale-A (23 abr 2026) — Texto dinámico con PTP real */}
            {hasPtpData && mesPtpContacts > 0 ? (
              <>
                Hoy: <span className="text-foreground font-semibold">{todayPtpContacts.toLocaleString('es-CO')} promesas de pago</span>{' '}
                <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-500 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-800 dark:text-emerald-200 uppercase tracking-wide">PTP real</span>.{' '}
                Recaudo estimado mes:{' '}
                <span className="text-foreground font-semibold">{fmtCOP(recaudoMes)}</span>
                {roiValue > 0 && <>{'. '}ROI operación:{' '}<span className={`font-semibold ${roiValue > 3 ? 'text-emerald-700 dark:text-emerald-300' : roiValue > 1 ? 'text-yellow-700 dark:text-yellow-300' : 'text-red-600 dark:text-red-400'}`}>{roiValue.toFixed(1)}x</span></>}.{' '}
                El costo CC representa{' '}
                <span className={`font-semibold ${margenOk ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-600 dark:text-red-400'}`}>
                  {costoPct.toFixed(1)}% del recaudo
                </span>{' '}
                {margenOk ? `(benchmark: ≤${BM_COSTO_CC_PCT}%).` : `— por encima del benchmark de ≤${BM_COSTO_CC_PCT}%.`}
              </>
            ) : (
              <>
                {/* Scale-G Fix #3 (21 abr 2026) — solo campañas cobranza, contactos efectivos */}
                El recaudo {hasRealData ? 'real' : 'estimado'} acumulado{' '}
                <span className="text-muted-foreground/80">(solo campañas cobranza, contactos efectivos)</span>{' '}
                asciende a{' '}
                <span className="text-foreground font-semibold">{fmtUSD(toUSD(recaudoMes, 'COP'))}</span>{' '}
                <span className="text-muted-foreground/60 text-[11px]">≈ {fmtCOP(recaudoMes)} COP</span>.
                El costo del contact center representa{' '}
                <span className={`font-semibold ${margenOk ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-600 dark:text-red-400'}`}>
                  {costoPct.toFixed(1)}% del recaudo
                </span>{' '}
                {margenOk
                  ? `(benchmark saludable: ≤${BM_COSTO_CC_PCT}%).`
                  : `— por encima del benchmark de ≤${BM_COSTO_CC_PCT}%.`
                }{' '}
                La tasa de contacto{' '}
                {tcVsBm >= 0
                  ? <><span className="text-green-700 dark:text-green-300 font-semibold">supera el benchmark</span> en +{tcVsBm.toFixed(1)}pp ({tasaContacto.toFixed(1)}% vs {BM_TASA_CONTACTO_PCT}% COPC LATAM).</>
                  : <><span className="text-amber-700 dark:text-amber-300 font-semibold">está {Math.abs(tcVsBm).toFixed(1)}pp por debajo</span> del benchmark ({tasaContacto.toFixed(1)}% vs {BM_TASA_CONTACTO_PCT}% COPC LATAM).</>
                }{' '}
                Proyección diaria: <span className="text-foreground font-semibold">{fmtUSD(toUSD(recaudoHoy, 'COP'))}</span> de recaudo hoy.
              </>
            )}
          </>
        )}
      </p>

      {/* Scale-A (23 abr 2026) — Banner dinámico fuente de datos */}
      <p className="mt-3 text-[11px] leading-relaxed border-t border-border/50 pt-3">
        {isFintech
          ? <span className="text-muted-foreground/50">Datos basados en CDR histórico del cliente. Tasa de contacto = llamadas completadas / total llamadas.</span>
          : hasPtpData
            ? <span className="text-muted-foreground">✅ Basado en tipificación real del agente (PTP). Recaudo proyectado, no confirmado.</span>
            : <span className="text-muted-foreground/50">⚠️ Estimativo — sin datos de tipificación para este período. Basado en contactos efectivos.</span>
        }
      </p>

      {!margenOk && !isFintech && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-orange-500/10 border border-orange-500/20 p-3">
          <Zap className="h-3.5 w-3.5 text-orange-400 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-900 dark:text-amber-100 leading-relaxed">
            <strong>Atención:</strong> El costo del CC supera el benchmark de ≤{BM_COSTO_CC_PCT}%. Conectar datos reales de recaudo para diagnóstico preciso.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function FinancialIntelligence() {
  const { clientId, clientConfig } = useClient();
  // Campañas dinámicas según industria del cliente
  const CAMPANAS_DIST = clientConfig?.industry === 'fintech_pagos' ? CAMPANAS_FINTECH : CAMPANAS_COBRANZA;

  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [hasRealData, setHasRealData] = useState(false);
  // Scale-A (23 abr 2026) — PTP/RPC reales
  const [hasPtpData,  setHasPtpData]  = useState(false);
  const [todayPtpContacts, setTodayPtpContacts] = useState(0);
  const [mesPtpContacts,   setMesPtpContacts]   = useState(0);
  const [cppValue,         setCppValue]         = useState(0);   // Costo por Promesa
  const [roiValue,         setRoiValue]         = useState(0);   // ROI de Operación

  const [monthlyData,       setMonthlyData]       = useState<MonthlyFinancial[]>([]);
  const [todayRecaudo,      setTodayRecaudo]      = useState(0);
  const [mesActualRecaudo,  setMesActualRecaudo]  = useState(0);
  const [mesAnteriorRecaudo,setMesAnteriorRecaudo]= useState(0);
  const [campaigns,         setCampaigns]         = useState<CampaignRow[]>([]);
  const [kpis,              setKpis]              = useState<KPIData[]>([]);
  const [avgTasaContacto,   setAvgTasaContacto]   = useState(0);
  const [costoAgenteMes,    setCostoAgenteMes]    = useState(DEFAULT_costoAgenteMes);  // desde client_labor_costs
  const [agentesActivos,    setAgentesActivos]    = useState(DEFAULT_agentesActivos);  // desde client_labor_costs
  const costoOpMes = costoAgenteMes * agentesActivos; // calculado dinámico

  // Upload state
  const [uploading,    setUploading]    = useState(false);
  const [uploadResult, setUploadResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [previewRows,  setPreviewRows]  = useState<Record<string, string | number>[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!clientId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  async function load() {
    try {
      setLoading(true);
      setError(null);

      // 0. Cargar costos laborales del cliente (client_labor_costs)
      try {
        const laborRows = await proxyQuery<Array<{costo_agente_mes: number; agentes_activos: number}>>({
          table: 'client_labor_costs',
          select: 'costo_agente_mes,agentes_activos',
          filters: { 'client_id': `eq.${clientId}` },
          order: 'vigente_desde.desc',
          limit: 1,
        });
        if (Array.isArray(laborRows) && laborRows.length > 0) {
          setCostoAgenteMes(laborRows[0].costo_agente_mes || 0);
          setAgentesActivos(laborRows[0].agentes_activos || 0);
        }
      } catch { /* sin datos de costos */ }

      // 1. Try real financial_results
      let realRows: Array<{ fecha: string; monto_recaudado_cop: number }> = [];
      try {
        const result = await proxyQuery<typeof realRows>({
          table: 'financial_results',
          select: 'fecha,monto_recaudado_cop',
          filters: { 'client_id': `eq.${clientId}` },
          order: 'fecha.asc',
          limit: 10000,
        });
        if (Array.isArray(result) && result.length > 0) {
          realRows = result;
          setHasRealData(true);
        }
      } catch { setHasRealData(false); }

      // 2. Always fetch CDR daily
      const hace400 = new Date();
      hace400.setDate(hace400.getDate() - 400);
      const fmt = (d: Date) => d.toISOString().split('T')[0];

      const cdrData = await proxyQuery<CDRDaily[]>({
        table: 'cdr_daily_metrics',
        select: 'fecha,total_llamadas,contactos_efectivos',
        filters: { 'client_id': `eq.${clientId}`, 'fecha': `gte.${fmt(hace400)}` },
        order: 'fecha.asc',
        limit: 1000,
      });

      if (!cdrData?.length) {
        setError('Sin datos CDR disponibles para este cliente.');
        return;
      }

      // Scale-A (23 abr 2026) — Fetch PTP/RPC reales del CDR
      let ptpRows: CDRPTPRow[] = [];
      const ptpByMonth: Record<string, number> = {};
      try {
        const ptpResult = await proxyQuery<CDRPTPRow[]>({
          table: 'cdr_daily_metrics',
          select: 'fecha,ptp_contactos,ptp_rate_pct,rpc_contactos,rpc_rate_pct,total_llamadas',
          filters: { 'client_id': `eq.${clientId}` },
          order: 'fecha.desc',
          limit: 60,
        });
        if (Array.isArray(ptpResult) && ptpResult.length > 0) {
          const hasValidPtp = ptpResult.some(r => r.ptp_contactos !== null && r.ptp_contactos > 0);
          if (hasValidPtp) {
            ptpRows = ptpResult;
            setHasPtpData(true);
            // Aggregate PTP by month
            for (const r of ptpRows) {
              const ym = r.fecha.slice(0, 7);
              ptpByMonth[ym] = (ptpByMonth[ym] || 0) + (r.ptp_contactos || 0);
            }
          } else {
            setHasPtpData(false);
          }
        } else {
          setHasPtpData(false);
        }
      } catch { setHasPtpData(false); }

      // 3. Group by month
      const byMonth: Record<string, { llamadas: number; contactos: number }> = {};
      for (const row of cdrData) {
        const ym = row.fecha.slice(0, 7);
        if (!byMonth[ym]) byMonth[ym] = { llamadas: 0, contactos: 0 };
        byMonth[ym].llamadas  += row.total_llamadas;
        byMonth[ym].contactos += row.contactos_efectivos;
      }

      const allMonths = Object.keys(byMonth).sort();
      const last12    = allMonths.slice(-12);

      // 4. Today metrics
      const sortedDays = [...cdrData].sort((a, b) => b.fecha.localeCompare(a.fecha));
      const todayRow   = sortedDays[0];
      // Scale-G Fix #1 (21 abr 2026) — Solo contactos campañas cobranza (COBRANZA_PCT=0.80)
      const todayProm  = todayRow ? Math.round(todayRow.contactos_efectivos * COBRANZA_PCT * TASA_PROMESA) : 0;
      // Scale-A (23 abr 2026) — Usar PTP real si disponible
      const todayPtp = ptpRows.length > 0 ? (ptpRows[0]?.ptp_contactos || 0) : 0;
      const todayRec = todayPtp > 0
        ? Math.round(todayPtp * TICKET_PROMEDIO_COP * TASA_CUMPLIMIENTO)
        : Math.round(todayProm * TICKET_PROMEDIO_COP * TASA_CUMPLIMIENTO);
      setTodayRecaudo(todayRec);
      if (todayPtp > 0) setTodayPtpContacts(todayPtp);

      // 5. Build monthly financial
      const financial: MonthlyFinancial[] = last12.map(ym => {
        const m        = byMonth[ym];
        const promesas = Math.round(m.contactos * TASA_PROMESA);
        // Scale-G Fix #1 (21 abr 2026) — recaudo solo campañas cobranza (COBRANZA_PCT=0.80)
        // Scale-A (23 abr 2026) — priorizar PTP real > datos reales > estimativo
        const monthPtp = ptpByMonth[ym] || 0;
        let recaudo = monthPtp > 0
          ? Math.round(monthPtp * TICKET_PROMEDIO_COP * TASA_CUMPLIMIENTO)
          : Math.round(Math.round(m.contactos * COBRANZA_PCT * TASA_PROMESA) * TICKET_PROMEDIO_COP * TASA_CUMPLIMIENTO);

        if (realRows.length > 0) {
          const mReal = realRows.filter(r => r.fecha.slice(0, 7) === ym);
          if (mReal.length > 0) recaudo = mReal.reduce((s, r) => s + r.monto_recaudado_cop, 0);
        }

        const margen    = recaudo - costoOpMes;
        // Scale-G Fix #4 (21 abr 2026) — margenPct = costo CC como % del recaudo
        // Cap a 200% para evitar barras que explotan cuando recaudo es muy bajo (mes parcial)
        const margenPctRaw = recaudo > 0 ? (costoOpMes / recaudo) * 100 : 0;
        const margenPct = Math.min(margenPctRaw, 200);
        const tasaContacto = m.llamadas > 0 ? (m.contactos / m.llamadas) * 100 : 0;

        return {
          mes: ym,
          mesLabel: mesLabel(ym),
          recaudo,
          costoOp: costoOpMes,
          margen,
          margenPct,
          promesas,
          llamadas: m.llamadas,
          contactos: m.contactos,
          tasaContacto,
        };
      });

      setMonthlyData(financial);

      // 6. Current / previous month
      // Scale-G Fix #data (21 abr 2026): usar último mes con datos suficientes.
      // curYM puede tener datos parciales (mes en curso) → usar lastM como mes principal.
      const now       = new Date();
      const curYM     = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      // El "mes actual" para KPIs = último mes en financial con datos razonables
      // Si el último mes ES el mes en curso (datos parciales), preferir el anterior
      const lastFinancialMonth = financial[financial.length - 1];
      const secondLastMonth    = financial[financial.length - 2];
      // Si el último mes tiene recaudo < 10% del penúltimo → es parcial, usar penúltimo
      const usarMesAnterior =
        lastFinancialMonth && secondLastMonth &&
        lastFinancialMonth.mes === curYM &&
        secondLastMonth.recaudo > 0 &&
        lastFinancialMonth.recaudo < secondLastMonth.recaudo * 0.30;
      const curMonth  = usarMesAnterior ? secondLastMonth : lastFinancialMonth;
      const prevMonth = usarMesAnterior ? financial[financial.length - 3] : secondLastMonth;
      setMesActualRecaudo(curMonth?.recaudo ?? 0);
      setMesAnteriorRecaudo(prevMonth?.recaudo ?? 0);

      // 7. Avg tasa contacto (last 3 months)
      const last3 = financial.slice(-3);
      const avgTC  = last3.length > 0
        ? last3.reduce((s, m) => s + m.tasaContacto, 0) / last3.length
        : 0;
      setAvgTasaContacto(avgTC);

      // Scale-A (23 abr 2026) — Calcular PTP del mes actual para CPP y ROI
      const now2 = new Date();
      const curYM2 = `${now2.getFullYear()}-${String(now2.getMonth() + 1).padStart(2, '0')}`;
      // Usar el mes principal (puede ser mes anterior si el actual es parcial)
      const mainMonth = financial[financial.length - 1];
      const secondLast = financial[financial.length - 2];
      const isCurrentPartial = mainMonth && secondLast && mainMonth.mes === curYM2 &&
        secondLast.recaudo > 0 && mainMonth.recaudo < secondLast.recaudo * 0.30;
      const kpiMonth = isCurrentPartial ? secondLast : mainMonth;
      const kpiMonthPtp = kpiMonth ? (ptpByMonth[kpiMonth.mes] || 0) : 0;
      setMesPtpContacts(kpiMonthPtp);
      // CPP = costo_operativo / ptp_contactos
      const localCostoOpMes = costoAgenteMes * agentesActivos;
      if (kpiMonthPtp > 0 && localCostoOpMes > 0) {
        setCppValue(localCostoOpMes / kpiMonthPtp);
      } else {
        setCppValue(0);
      }
      // ROI = recaudo_estimado_ptp / costo_operativo
      if (localCostoOpMes > 0 && kpiMonthPtp > 0) {
        const recaudoConPtp = kpiMonthPtp * TICKET_PROMEDIO_COP * TASA_CUMPLIMIENTO;
        setRoiValue(recaudoConPtp / localCostoOpMes);
      } else {
        setRoiValue(0);
      }

      // Scale-G Fix #1+2b (21 abr 2026) — recaudoEst en moneda local correcta por campaña
      // Colombia: ticket en COP → recaudoEst en COP → toUSD con USD_COP
      // Perú: ticket en PEN → recaudoEst en PEN → toUSD con USD_PEN
      // Servicio: recaudoEst = 0 (sin recaudo directo)
      const lastM = financial[financial.length - 1];
      if (lastM) {
        setCampaigns(CAMPANAS_DIST.map(camp => {
          const llamadas    = Math.round(lastM.llamadas  * camp.pct);
          const contactos   = Math.round(lastM.contactos * camp.pct);
          const promesasEst = Math.round(lastM.promesas  * camp.pct);
          const ticket      = camp.moneda === 'PEN' ? TICKET_PEN : TICKET_PROMEDIO_COP;
          const recaudoEst  = camp.tipo === 'servicio'
            ? 0
            : Math.round(promesasEst * ticket * TASA_CUMPLIMIENTO);
          return { campana: camp.name, tipo: camp.tipo, moneda: camp.moneda, llamadas, contactos, promesasEst, recaudoEst, pctTotal: camp.pct * 100 };
        }));
      }

      // 9. Build KPIData for KPICard (sparklines from monthly recaudo/margen)
      const spark = financial.slice(-7).map(m => m.recaudo / 1_000_000); // en millones
      const sparkMargen = financial.slice(-7).map(m => m.margenPct);
      const sparkTC = financial.slice(-7).map(m => m.tasaContacto);
      const curRec  = curMonth?.recaudo ?? 0;
      const prevRec = prevMonth?.recaudo ?? 0;
      const tendPct = prevRec > 0 ? ((curRec - prevRec) / prevRec) * 100 : 0;
      // Scale-G Fix #4 (21 abr 2026) — curCostoPct = costoCC/recaudo*100
      const curCostoPct = curMonth?.margenPct ?? 0; // margenPct ahora = costoOpMes/recaudo*100
      const margenVsBm = curCostoPct - BM_COSTO_CC_PCT; // positivo = supera benchmark (malo)
      const tcVsBm = avgTC - BM_TASA_CONTACTO_PCT;

      // Scale-A (23 abr 2026) — KPIs CPP y ROI
      const localCostoOpMes2 = costoAgenteMes * agentesActivos;
      const kpiMonthPtp2 = kpiMonth ? (ptpByMonth[kpiMonth.mes] || 0) : 0;
      const cppKpi = kpiMonthPtp2 > 0 && localCostoOpMes2 > 0 ? localCostoOpMes2 / kpiMonthPtp2 : 0;
      const recaudoConPtp2 = kpiMonthPtp2 * TICKET_PROMEDIO_COP * TASA_CUMPLIMIENTO;
      const roiKpi = localCostoOpMes2 > 0 && kpiMonthPtp2 > 0 ? recaudoConPtp2 / localCostoOpMes2 : 0;

      const kpisBuilt: KPIData[] = [
        // Scale-G Fix #2 (21 abr 2026) — KPI recaudo en USD
        {
          id: 'recaudo_mes',
          title: 'Recaudo est. Mes',
          value: fmtUSD(toUSD(curRec, 'COP')),
          numericValue: curRec,
          change: tendPct,
          changeLabel: `${tendPct >= 0 ? '+' : ''}${tendPct.toFixed(1)}%`,
          vsIndustry: 0,
          sparkline: spark,
          roles: ['CEO', 'COO'],
          description: 'Estimativo. Incluye solo campañas de cobranza. Tasa ref: 1 USD = COP $4,200',
        },
        // Scale-G Fix #4 (21 abr 2026) — Costo CC / Recaudo (invertColor: menor % = mejor)
        {
          id: 'margen_op',
          title: 'Costo CC / Recaudo',
          value: `${curCostoPct.toFixed(1)}%`,
          numericValue: curCostoPct,
          change: margenVsBm,
          changeLabel: `vs bm ≤${BM_COSTO_CC_PCT}%`,
          vsIndustry: margenVsBm,
          sparkline: sparkMargen,
          invertColor: true,
          roles: ['CEO', 'COO'],
          description: `Costo del CC como % del recaudo. Benchmark: ≤${BM_COSTO_CC_PCT}%. No incluye otros costos operativos.`,
        },
        {
          id: 'tasa_contacto',
          title: 'Tasa Contacto',
          value: `${avgTC.toFixed(1)}%`,
          numericValue: avgTC,
          change: tcVsBm,
          changeLabel: `${tcVsBm >= 0 ? '+' : ''}${tcVsBm.toFixed(1)}pp vs bm`,
          vsIndustry: tcVsBm,
          sparkline: sparkTC,
          roles: ['CEO', 'VP Ventas', 'COO'],
          description: `Benchmark COPC LATAM: ${BM_TASA_CONTACTO_PCT}%`,
        },
        {
          id: 'costo_op',
          title: 'Costo Operativo',
          value: costoOpMes > 0 ? fmtCOP(costoOpMes) : 'N/D',
          numericValue: costoOpMes,
          change: 0,
          changeLabel: agentesActivos > 0 ? `${agentesActivos} agentes × $${(costoAgenteMes/1_000_000).toFixed(1)}M` : 'Sin datos de costos',
          vsIndustry: 0,
          sparkline: Array(7).fill(costoOpMes > 0 ? costoOpMes / 1_000_000 : 0),
          invertColor: true,
          roles: ['CEO', 'COO'],
          description: 'Nómina estimada + carga social',
        },
        // Scale-A (23 abr 2026) — KPI: Costo por Promesa (CPP)
        ...(cppKpi > 0 ? [{
          id: 'cpp',
          title: 'Costo por Promesa',
          value: fmtCOP(Math.round(cppKpi)),
          numericValue: cppKpi,
          change: cppKpi <= 25_000 ? (cppKpi <= 15_000 ? -10 : -2) : 5,
          changeLabel: cppKpi <= 15_000 ? '✅ Óptimo (<$15K)' : cppKpi <= 25_000 ? '⚠️ Aceptable ($15-25K)' : '🔴 Alto (>$25K)',
          vsIndustry: cppKpi <= 25_000 ? -1 : 1,
          sparkline: Array(7).fill(cppKpi / 1_000),
          invertColor: true,
          roles: ['CEO', 'COO'],
          description: 'Costo operativo por promesa de pago. Benchmark industria: COP $15,000–$25,000',
        }] : []),
        // Scale-A (23 abr 2026) — KPI: ROI de Operación
        ...(roiKpi > 0 ? [{
          id: 'roi_op',
          title: 'ROI Operación',
          value: `${roiKpi.toFixed(1)}x`,
          numericValue: roiKpi,
          change: roiKpi > 3 ? 10 : roiKpi > 1 ? 2 : -5,
          changeLabel: roiKpi > 3 ? '✅ Excelente (>3x)' : roiKpi > 1 ? '⚠️ Positivo (1-3x)' : '🔴 Negativo (<1x)',
          vsIndustry: roiKpi > 1 ? 1 : -1,
          sparkline: Array(7).fill(roiKpi),
          roles: ['CEO', 'COO'],
          description: 'Recaudo estimado / Costo operativo. >1x = operación rentable. Basado en PTP real.',
        }] : []),
      ];
      // Filtrar KPIs según industria — fintech no muestra recaudo/cobranza
      const industry = clientConfig?.industry;
      const filteredKpis = industry === 'fintech_pagos'
        ? kpisBuilt.filter(k => !['recaudo_mes', 'margen_op', 'cpp', 'roi_op'].includes(k.id))
        : kpisBuilt;
      setKpis(filteredKpis);

    } catch (e: unknown) {
      setError(`Error cargando datos financieros: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  // ─── Upload ─────────────────────────────────────────────────────────────────
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadResult(null);
    setPreviewRows([]);

    try {
      const text    = await file.text();
      const lines   = text.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const preview = lines.slice(1, 6).map(line => {
        const vals = line.split(',').map(v => v.trim().replace(/"/g, ''));
        return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']));
      });
      setPreviewRows(preview);

      const required = ['fecha', 'monto_recaudado'];
      const missing  = required.filter(col => !headers.some(h => h.toLowerCase().includes(col)));
      if (missing.length > 0) {
        setUploadResult({ ok: false, msg: `Columnas faltantes: ${missing.join(', ')}` });
        setUploading(false);
        return;
      }

      const rows = lines.slice(1).filter(l => l.trim()).map(line => {
        const vals = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const obj  = Object.fromEntries(headers.map((h, i) => [h.toLowerCase(), vals[i] ?? '']));
        return {
          client_id: clientId,
          fecha: obj['fecha'] || '',
          campana: obj['campana'] || 'General',
          promesas_pago: 0,
          monto_prometido_cop: parseInt(String(obj['monto_recaudado'] || '0').replace(/\D/g, ''), 10),
          monto_recaudado_cop: parseInt(String(obj['monto_recaudado'] || '0').replace(/\D/g, ''), 10),
          tasa_cumplimiento_pct: 100.0,
          ticket_promedio_cop: TICKET_PROMEDIO_COP,
          fuente: 'manual',
          notas: `Archivo: ${file.name}`,
        };
      }).filter(r => r.fecha && r.monto_recaudado_cop > 0);

      if (rows.length === 0) {
        setUploadResult({ ok: false, msg: 'No se encontraron filas válidas.' });
        setUploading(false);
        return;
      }

      const resp = await fetch(`${PROXY_URL}/load-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'wekall-load-2026', table: 'financial_results', rows, on_conflict: 'client_id,fecha,campana' }),
      });
      const result = await resp.json() as { ok: boolean; rows?: number; detail?: string };

      if (result.ok) {
        setUploadResult({ ok: true, msg: `✅ ${rows.length} registros cargados. Recargando...` });
        setTimeout(() => load(), 1500);
      } else {
        setUploadResult({ ok: false, msg: `Error: ${result.detail || 'desconocido'}` });
      }
    } catch (err: unknown) {
      setUploadResult({ ok: false, msg: `Error: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  // ─── Derived ────────────────────────────────────────────────────────────────
  const tendenciaMes = mesAnteriorRecaudo > 0
    ? ((mesActualRecaudo - mesAnteriorRecaudo) / mesAnteriorRecaudo) * 100
    : 0;
  const margenMesActual = mesActualRecaudo - costoOpMes;
  const currentMesLabel = monthlyData.length > 0 ? monthlyData[monthlyData.length - 1].mesLabel : '';

  // ─── States ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-primary">
        <Loader2 className="animate-spin h-5 w-5" />
        <span className="text-sm">Calculando Financial Intelligence...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-6 text-destructive bg-destructive/10 rounded-lg m-4 border border-destructive/20">
        <XCircle className="h-5 w-5 shrink-0" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1400px] mx-auto w-full">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            Financial Intelligence
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">¿Cuánto está generando tu operación hoy?</p>
        </div>
        {/* Scale-A (23 abr 2026) — Banner dinámico fuente de datos */}
        {hasPtpData ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[11px] font-medium text-emerald-400 self-start">
            <CheckCircle2 className="h-3 w-3" />
            PTP real disponible
          </span>
        ) : !hasRealData ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 text-[11px] font-medium text-blue-400 self-start">
            <AlertTriangle className="h-3 w-3" />
            Estimativos CDR
          </span>
        ) : null}
      </div>

      {/* ── Executive Brief ─────────────────────────────────────────────────── */}
      <ExecutiveBrief
        recaudoHoy={todayRecaudo}
        recaudoMes={mesActualRecaudo}
        margenMes={margenMesActual}
        tendenciaPct={tendenciaMes}
        hasRealData={hasRealData}
        tasaContacto={avgTasaContacto}
        mesLabel={currentMesLabel}
        industry={clientConfig?.industry}
        costoOpMes={costoOpMes}
        hasPtpData={hasPtpData}
        mesPtpContacts={mesPtpContacts}
        todayPtpContacts={todayPtpContacts}
        roiValue={roiValue}
      />

      {/* ── KPI Cards con sparklines ─────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Indicadores Financieros</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map(kpi => (
            <KPICard key={kpi.id} kpi={kpi} />
          ))}
        </div>
      </div>

      {clientConfig?.industry !== 'fintech_pagos' && <>{/* ── Gráfico principal: Recaudo + Costo ──────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-wk-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-medium text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Recaudo — últimos 12 meses
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Barras = recaudo · Línea roja = costo operativo fijo</p>
          </div>
          {!hasRealData && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Info className="h-3 w-3" /> estimativos
            </span>
          )}
        </div>
        {monthlyData.length === 0 ? (
          <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
            Sin datos CDR disponibles para este cliente
          </div>
        ) : (
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={monthlyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="recaudoGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.9} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="mesLabel" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={fmtCOP} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} width={72} />
            <Tooltip content={<FinancialTooltip />} />
            <Legend formatter={(v) => <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: 11 }}>{v}</span>} />
            <Bar dataKey="recaudo" name="Recaudo est." fill="url(#recaudoGrad)" radius={[4,4,0,0]} maxBarSize={40} />
            <Line type="monotone" dataKey="costoOp" name="Costo op." stroke="#ef4444" strokeWidth={2} dot={false} strokeDasharray="5 3" />
          </ComposedChart>
        </ResponsiveContainer>
        )}
      </div></> }

      {clientConfig?.industry !== 'fintech_pagos' && <>{/* ── Margen mensual + Tabla campañas ─────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Scale-G Fix #4 — Costo CC como % Recaudo (menor = mejor = verde) */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 shadow-wk-sm">
          <div className="mb-4">
            <h2 className="text-base font-medium text-foreground">{clientConfig?.industry === 'fintech_pagos' ? 'Tasa de Contacto Mensual' : 'Costo CC como % Recaudo'}</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Benchmark: ≤{BM_COSTO_CC_PCT}% · Verde = eficiente</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mesLabel" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip formatter={(v: number) => [v >= 200 ? 'N/D (recaudo insuficiente)' : `${v.toFixed(1)}%`, 'Costo CC / Recaudo']} />
              <Bar dataKey="margenPct" name="Costo CC %" radius={[4,4,0,0]} maxBarSize={32}>
                {monthlyData.map((entry, i) => (
                  <Cell key={`cell-${i}`} fill={entry.margenPct <= BM_COSTO_CC_PCT ? '#22c55e' : '#f59e0b'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tabla campañas */}
        <div className="lg:col-span-3 rounded-xl border border-border bg-card p-5 shadow-wk-sm">
          <h2 className="text-base font-medium text-foreground mb-4">
            Desglose por campaña — {currentMesLabel}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              {/* Scale-G Fix #1+2+crossselling — tipo cobranza/servicio, solo USD, nota upselling */}
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 font-medium text-muted-foreground">Campaña</th>
                  <th className="pb-2 font-medium text-muted-foreground text-right">Llamadas</th>
                  <th className="pb-2 font-medium text-muted-foreground text-right">Contactos (ef.)</th>
                  <th className="pb-2 font-medium text-muted-foreground text-right">Recaudo est. (USD)</th>
                  <th className="pb-2 font-medium text-muted-foreground text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-primary/5 transition-colors">
                    <td className="py-2.5 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                          c.tipo === 'cobranza'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                            : 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                        }`}>{c.tipo}</span>
                        {c.campana}
                      </div>
                    </td>
                    <td className="py-2.5 text-right text-muted-foreground">{c.llamadas.toLocaleString('es-CO')}</td>
                    <td className="py-2.5 text-right text-muted-foreground">{c.contactos.toLocaleString('es-CO')}</td>
                    <td className="py-2.5 text-right font-semibold">
                      {c.tipo === 'servicio'
                        ? (
                          <span className="text-muted-foreground/50 text-[11px]" title="Servicio no genera recaudo directo. Si hay upselling/crossselling, conectar datos reales.">
                            N/A †
                          </span>
                        )
                        : <span className="text-emerald-400">{fmtUSD(toUSD(c.recaudoEst, c.moneda))}</span>
                      }
                    </td>
                    <td className="py-2.5 text-right">
                      <span className="inline-flex items-center rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] text-primary font-semibold">
                        {c.pctTotal.toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                ))}
                {campaigns.length > 0 && (
                  <tr className="border-t-2 border-border font-bold">
                    <td className="py-2.5 text-foreground font-semibold">TOTAL cobranza</td>
                    <td className="py-2.5 text-right text-foreground">{campaigns.reduce((s,c)=>s+c.llamadas,0).toLocaleString('es-CO')}</td>
                    <td className="py-2.5 text-right text-foreground">{campaigns.reduce((s,c)=>s+c.contactos,0).toLocaleString('es-CO')}</td>
                    <td className="py-2.5 text-right text-emerald-400">{fmtUSD(campaigns.filter(c=>c.tipo==='cobranza').reduce((s,c)=>s+toUSD(c.recaudoEst,c.moneda),0))}</td>
                    <td className="py-2.5 text-right text-foreground">100%</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div></> }

      {clientConfig?.industry !== 'fintech_pagos' && <>{/* ── Conectar datos reales — compacto ─────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-wk-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-1">
              <Upload className="h-4 w-4 text-primary" />
              {hasRealData ? 'Actualizar datos de recaudo' : 'Conectar datos reales'}
            </h2>
            <p className="text-xs text-muted-foreground">
              Sube tu reporte para reemplazar estimativos con datos exactos.{' '}
              <span className="text-muted-foreground/60">
                Req: <code className="bg-secondary px-1 rounded text-[10px]">fecha</code>,{' '}
                <code className="bg-secondary px-1 rounded text-[10px]">monto_recaudado</code>
              </span>
            </p>
          </div>
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={handleFileUpload} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors"
          >
            {uploading
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Procesando...</>
              : <><Upload className="h-4 w-4" /> Subir CSV / Excel</>
            }
          </button>
        </div>

        {uploadResult && (
          <div className={`mt-3 rounded-lg border p-3 flex items-start gap-2 text-xs ${
            uploadResult.ok
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              : 'border-destructive/30 bg-destructive/10 text-destructive'
          }`}>
            {uploadResult.ok
              ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              : <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
            }
            <span>{uploadResult.msg}</span>
          </div>
        )}

        {previewRows.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Vista previa (primeras 5 filas):</p>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    {Object.keys(previewRows[0] || {}).map(h => (
                      <th key={h} className="text-left px-3 py-2 text-muted-foreground font-semibold uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {Object.values(row).map((v, j) => (
                        <td key={j} className="px-3 py-2 text-muted-foreground">{String(v)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div></> }

      {/* ── Parámetros del modelo ─────────────────────────────────────────────── */}
      {clientConfig?.industry !== 'fintech_pagos' && (
      <div className="rounded-xl border border-border bg-card p-5 shadow-wk-sm">
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          Parámetros del modelo estimativo
          <span className="text-[10px] font-normal text-muted-foreground/60">(cobranzas)</span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: 'Ticket promedio CO', value: fmtCOPFull(TICKET_PROMEDIO_COP), note: `≈ ${fmtUSD(toUSD(TICKET_PROMEDIO_COP,'COP'))} USD` },
            { label: 'Ticket promedio PE', value: `S/${TICKET_PEN}`,              note: `≈ ${fmtUSD(toUSD(TICKET_PEN,'PEN'))} USD` },
            { label: 'Tasa promesa',       value: `${(TASA_PROMESA*100).toFixed(0)}%`,   note: `Bm: ${BM_TASA_PROMESA_PCT}%` },
            { label: 'Tasa cumplimiento',  value: `${(TASA_CUMPLIMIENTO*100).toFixed(0)}%`, note: `Bm: ${BM_TASA_CUMPLIM_PCT}%` },
            { label: 'Agentes activos',    value: String(agentesActivos),          note: 'Estimado — contactos ef. CDR' },
            { label: 'Costo/agente/mes',   value: fmtCOPFull(costoAgenteMes),    note: 'Nómina + carga social' },
            { label: 'Tasa COP/USD',       value: `1 USD = $${USD_COP.toLocaleString()} COP`, note: 'TRM promedio abr 2026 — Banco de la República' },
            { label: 'Tasa PEN/USD',       value: `1 USD = S/${USD_PEN} PEN`,       note: 'TC promedio abr 2026 — BCRP interbancario' },
          ].map((p, i) => (
            <div key={i} className="rounded-lg border border-border bg-secondary/20 p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{p.label}</p>
              <p className="text-sm font-bold text-primary">{p.value}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">{p.note}</p>
            </div>
          ))}
        </div>
        {/* Nota crossselling + fuente tasas */}
        <p className="mt-3 text-[11px] text-muted-foreground/50 leading-relaxed border-t border-border/50 pt-3">
          † Campañas de servicio no generan recaudo por cobranza directa. Si existen ingresos por upselling o crossselling en estas campañas, deben cargarse vía datos reales (CSV). Las tasas de cambio corresponden al promedio mensual publicado por el Banco de la República (Colombia) y el BCRP (Perú). Se actualizan al inicio de cada mes.
        </p>
      </div>
      )}

    </div>
  );
}
