/**
 * FinancialIntelligence — V23 (Scale-A Fase 2, 25 abr 2026)
 * + Métricas ejecutivas: HOY, MTD, DoD, MoM, YoY, QoQ, Sparkline
 * + Executive Summary dinámico
 * + Mantiene gráficos legacy y upload CSV
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

// Scale-A Fase 2 imports
import { RealTimeCard } from '@/components/financial/RealTimeCard';
import { MTDCard } from '@/components/financial/MTDCard';
import { ComparativesGrid } from '@/components/financial/ComparativesGrid';
import { SparklineTrend } from '@/components/financial/SparklineTrend';
import { ExecutiveSummary } from '@/components/financial/ExecutiveSummary';
import type {
  RecaudoHoy,
  RecaudoMTD,
  RecaudoDoD,
  RecaudoMoM,
  RecaudoYoY,
  RecaudoQoQ,
  RecaudoSparkline,
} from '@/types/financial-executive';

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
const DEFAULT_costoAgenteMes = 3_000_000;
const DEFAULT_agentesActivos  = 81;
const DIAS_LABORALES_MES  = 22;

const BM_TASA_CONTACTO_PCT  = 22.5;
const BM_TASA_PROMESA_PCT   = 35.0;
const BM_TASA_CUMPLIM_PCT   = 55.0;
const BM_COSTO_CC_PCT       = 15.0;

// ─── Types ─────────────────────────────────────────────────────────────────────
interface CDRDaily {
  fecha: string;
  total_llamadas: number;
  contactos_efectivos: number;
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

const USD_COP = 3634;
const USD_PEN = 3.42;
const TICKET_PEN = 150;

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

// ─── Main Component ────────────────────────────────────────────────────────────
export default function FinancialIntelligence() {
  const { clientId, clientConfig } = useClient();
  const CAMPANAS_DIST = clientConfig?.industry === 'fintech_pagos' ? CAMPANAS_FINTECH : CAMPANAS_COBRANZA;

  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [hasRealData, setHasRealData] = useState(false);

  // Scale-A Fase 2: Executive Metrics
  const [todayData,   setTodayData]   = useState<RecaudoHoy | null>(null);
  const [mtdData,     setMtdData]     = useState<RecaudoMTD | null>(null);
  const [dodData,     setDodData]     = useState<RecaudoDoD | null>(null);
  const [momData,     setMomData]     = useState<RecaudoMoM[]>([]);
  const [yoyData,     setYoyData]     = useState<RecaudoYoY[]>([]);
  const [qoqData,     setQoqData]     = useState<RecaudoQoQ[]>([]);
  const [sparkData,   setSparkData]   = useState<RecaudoSparkline[]>([]);

  // Legacy state (mantener para gráficos)
  const [monthlyData,       setMonthlyData]       = useState<MonthlyFinancial[]>([]);
  const [campaigns,         setCampaigns]         = useState<CampaignRow[]>([]);
  const [kpis,              setKpis]              = useState<KPIData[]>([]);
  const [avgTasaContacto,   setAvgTasaContacto]   = useState(0);
  const [costoAgenteMes,    setCostoAgenteMes]    = useState(DEFAULT_costoAgenteMes);
  const [agentesActivos,    setAgentesActivos]    = useState(DEFAULT_agentesActivos);
  const costoOpMes = costoAgenteMes * agentesActivos;

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

      // 0. Load labor costs
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

      // 1. Check real financial data
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

      // 2. Scale-A Fase 2: Load executive queries in parallel
      try {
        const [hoy, mtd, dod, mom, yoy, qoq, spark] = await Promise.all([
          proxyQuery<RecaudoHoy[]>({
            rpc: 'get_recaudo_hoy',
            params: { p_client_id: clientId },
          }),
          proxyQuery<RecaudoMTD[]>({
            rpc: 'get_recaudo_mtd',
            params: { p_client_id: clientId },
          }),
          proxyQuery<RecaudoDoD[]>({
            rpc: 'get_recaudo_dod',
            params: { p_client_id: clientId },
          }),
          proxyQuery<RecaudoMoM[]>({
            rpc: 'get_recaudo_mom',
            params: { p_client_id: clientId },
          }),
          proxyQuery<RecaudoYoY[]>({
            rpc: 'get_recaudo_yoy',
            params: { p_client_id: clientId },
          }),
          proxyQuery<RecaudoQoQ[]>({
            rpc: 'get_recaudo_qoq',
            params: { p_client_id: clientId },
          }),
          proxyQuery<RecaudoSparkline[]>({
            rpc: 'get_recaudo_sparkline',
            params: { p_client_id: clientId, p_dias: 30 },
          }),
        ]);

        setTodayData(Array.isArray(hoy) && hoy.length > 0 ? hoy[0] : null);
        setMtdData(Array.isArray(mtd) && mtd.length > 0 ? mtd[0] : null);
        setDodData(Array.isArray(dod) && dod.length > 0 ? dod.find(d => d.es_ayer) || null : null);
        setMomData(Array.isArray(mom) ? mom : []);
        setYoyData(Array.isArray(yoy) ? yoy : []);
        setQoqData(Array.isArray(qoq) ? qoq : []);
        setSparkData(Array.isArray(spark) ? spark : []);
      } catch (e) {
        console.error('Error loading executive queries:', e);
        // Continue with legacy CDR data
      }

      // 3. Load legacy CDR data for charts
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

      // 4. Group by month for legacy charts
      const byMonth: Record<string, { llamadas: number; contactos: number }> = {};
      for (const row of cdrData) {
        const ym = row.fecha.slice(0, 7);
        if (!byMonth[ym]) byMonth[ym] = { llamadas: 0, contactos: 0 };
        byMonth[ym].llamadas  += row.total_llamadas;
        byMonth[ym].contactos += row.contactos_efectivos;
      }

      const allMonths = Object.keys(byMonth).sort();
      const last12    = allMonths.slice(-12);

      // 5. Build monthly financial (legacy)
      const financial: MonthlyFinancial[] = last12.map(ym => {
        const m = byMonth[ym];
        const promesas = Math.round(m.contactos * TASA_PROMESA);
        let recaudo = Math.round(Math.round(m.contactos * COBRANZA_PCT * TASA_PROMESA) * TICKET_PROMEDIO_COP * TASA_CUMPLIMIENTO);

        if (realRows.length > 0) {
          const mReal = realRows.filter(r => r.fecha.slice(0, 7) === ym);
          if (mReal.length > 0) recaudo = mReal.reduce((s, r) => s + r.monto_recaudado_cop, 0);
        }

        const margen = recaudo - costoOpMes;
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

      // 6. Avg tasa contacto (last 3 months)
      const last3 = financial.slice(-3);
      const avgTC = last3.length > 0
        ? last3.reduce((s, m) => s + m.tasaContacto, 0) / last3.length
        : 0;
      setAvgTasaContacto(avgTC);

      // 7. Campaigns table (last month)
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

      // 8. Build KPIData for KPICard
      const spark = financial.slice(-7).map(m => m.recaudo / 1_000_000);
      const sparkMargen = financial.slice(-7).map(m => m.margenPct);
      const sparkTC = financial.slice(-7).map(m => m.tasaContacto);
      
      const lastFinancialMonth = financial[financial.length - 1];
      const secondLastMonth = financial[financial.length - 2];
      const curRec  = lastFinancialMonth?.recaudo ?? 0;
      const prevRec = secondLastMonth?.recaudo ?? 0;
      const tendPct = prevRec > 0 ? ((curRec - prevRec) / prevRec) * 100 : 0;
      const curCostoPct = lastFinancialMonth?.margenPct ?? 0;
      const margenVsBm = curCostoPct - BM_COSTO_CC_PCT;
      const tcVsBm = avgTC - BM_TASA_CONTACTO_PCT;

      const kpisBuilt: KPIData[] = [
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
          description: 'Estimativo. Incluye solo campañas de cobranza.',
        },
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
          description: `Costo del CC como % del recaudo. Benchmark: ≤${BM_COSTO_CC_PCT}%.`,
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
      ];

      const industry = clientConfig?.industry;
      const filteredKpis = industry === 'fintech_pagos'
        ? kpisBuilt.filter(k => !['recaudo_mes', 'margen_op'].includes(k.id))
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
      const text = await file.text();
      const lines = text.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const preview = lines.slice(1, 6).map(line => {
        const vals = line.split(',').map(v => v.trim().replace(/"/g, ''));
        return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']));
      });
      setPreviewRows(preview);

      const required = ['fecha', 'monto_recaudado'];
      const missing = required.filter(col => !headers.some(h => h.toLowerCase().includes(col)));
      if (missing.length > 0) {
        setUploadResult({ ok: false, msg: `Columnas faltantes: ${missing.join(', ')}` });
        setUploading(false);
        return;
      }

      const rows = lines.slice(1).filter(l => l.trim()).map(line => {
        const vals = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const obj = Object.fromEntries(headers.map((h, i) => [h.toLowerCase(), vals[i] ?? '']));
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

  const currentMesLabel = monthlyData.length > 0 ? monthlyData[monthlyData.length - 1].mesLabel : '';

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
          <p className="text-sm text-muted-foreground mt-0.5">Métricas ejecutivas · Recaudo en tiempo real</p>
        </div>
        {hasRealData && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[11px] font-medium text-emerald-400 self-start">
            <CheckCircle2 className="h-3 w-3" />
            Datos reales disponibles
          </span>
        )}
      </div>

      {/* ── Scale-A Fase 2: Executive Metrics Grid 2×2 ────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RealTimeCard data={todayData} loading={loading} />
        <MTDCard data={mtdData} loading={loading} />
        <ComparativesGrid 
          dod={dodData} 
          mom={momData} 
          yoy={yoyData} 
          qoq={qoqData} 
          loading={loading} 
        />
        <SparklineTrend data={sparkData} loading={loading} />
      </div>

      {/* ── Scale-A Fase 2: Executive Summary ────────────────────────────── */}
      <ExecutiveSummary
        today={todayData}
        mtd={mtdData}
        mom={momData}
        yoy={yoyData}
        industry={clientConfig?.industry}
        hasRealData={hasRealData}
        loading={loading}
      />

      {/* ── KPI Cards con sparklines (legacy) ────────────────────────────── */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Indicadores Financieros</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map(kpi => (
            <KPICard key={kpi.id} kpi={kpi} />
          ))}
        </div>
      </div>

      {clientConfig?.industry !== 'fintech_pagos' && <>
      {/* ── Gráfico principal: Recaudo + Costo (legacy) ──────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-wk-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-medium text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Recaudo — últimos 12 meses
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Barras = recaudo · Línea roja = costo operativo fijo</p>
          </div>
        </div>
        {monthlyData.length === 0 ? (
          <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
            Sin datos CDR disponibles
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
      </div>

      {/* ── Margen mensual + Tabla campañas (legacy) ─────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 shadow-wk-sm">
          <div className="mb-4">
            <h2 className="text-base font-medium text-foreground">Costo CC como % Recaudo</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Benchmark: ≤{BM_COSTO_CC_PCT}% · Verde = eficiente</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mesLabel" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip formatter={(v: number) => [v >= 200 ? 'N/D' : `${v.toFixed(1)}%`, 'Costo CC / Recaudo']} />
              <Bar dataKey="margenPct" name="Costo CC %" radius={[4,4,0,0]} maxBarSize={32}>
                {monthlyData.map((entry, i) => (
                  <Cell key={`cell-${i}`} fill={entry.margenPct <= BM_COSTO_CC_PCT ? '#22c55e' : '#f59e0b'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-3 rounded-xl border border-border bg-card p-5 shadow-wk-sm">
          <h2 className="text-base font-medium text-foreground mb-4">
            Desglose por campaña — {currentMesLabel}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 font-medium text-muted-foreground">Campaña</th>
                  <th className="pb-2 font-medium text-muted-foreground text-right">Llamadas</th>
                  <th className="pb-2 font-medium text-muted-foreground text-right">Contactos</th>
                  <th className="pb-2 font-medium text-muted-foreground text-right">Recaudo (USD)</th>
                  <th className="pb-2 font-medium text-muted-foreground text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-primary/5 transition-colors">
                    <td className="py-2.5 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
                          c.tipo === 'cobranza'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-blue-500/15 text-blue-400'
                        }`}>{c.tipo}</span>
                        {c.campana}
                      </div>
                    </td>
                    <td className="py-2.5 text-right text-muted-foreground">{c.llamadas.toLocaleString('es-CO')}</td>
                    <td className="py-2.5 text-right text-muted-foreground">{c.contactos.toLocaleString('es-CO')}</td>
                    <td className="py-2.5 text-right font-semibold">
                      {c.tipo === 'servicio'
                        ? <span className="text-muted-foreground/50 text-[11px]">N/A †</span>
                        : <span className="text-emerald-400">{fmtUSD(toUSD(c.recaudoEst, c.moneda))}</span>
                      }
                    </td>
                    <td className="py-2.5 text-right">
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary font-semibold">
                        {c.pctTotal.toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Upload CSV (legacy) ──────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-wk-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-1">
              <Upload className="h-4 w-4 text-primary" />
              {hasRealData ? 'Actualizar datos de recaudo' : 'Conectar datos reales'}
            </h2>
            <p className="text-xs text-muted-foreground">
              Sube tu reporte CSV con columnas: <code className="bg-secondary px-1 rounded text-[10px]">fecha</code>, <code className="bg-secondary px-1 rounded text-[10px]">monto_recaudado</code>
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
              : <><Upload className="h-4 w-4" /> Subir archivo</>
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
            <p className="text-xs font-semibold text-muted-foreground mb-2">Vista previa:</p>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    {Object.keys(previewRows[0] || {}).map(h => (
                      <th key={h} className="text-left px-3 py-2 text-muted-foreground font-semibold uppercase">{h}</th>
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
      </div>

      {/* ── Parámetros del modelo (legacy) ────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-wk-sm">
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          Parámetros del modelo estimativo
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: 'Ticket promedio CO', value: fmtCOPFull(TICKET_PROMEDIO_COP), note: `≈ ${fmtUSD(toUSD(TICKET_PROMEDIO_COP,'COP'))}` },
            { label: 'Ticket promedio PE', value: `S/${TICKET_PEN}`, note: `≈ ${fmtUSD(toUSD(TICKET_PEN,'PEN'))}` },
            { label: 'Tasa promesa', value: `${(TASA_PROMESA*100).toFixed(0)}%`, note: `Bm: ${BM_TASA_PROMESA_PCT}%` },
            { label: 'Tasa cumplimiento', value: `${(TASA_CUMPLIMIENTO*100).toFixed(0)}%`, note: `Bm: ${BM_TASA_CUMPLIM_PCT}%` },
            { label: 'Agentes activos', value: String(agentesActivos), note: 'Estimado CDR' },
            { label: 'Costo/agente/mes', value: fmtCOPFull(costoAgenteMes), note: 'Nómina + carga' },
            { label: 'Tasa COP/USD', value: `1 USD = $${USD_COP.toLocaleString()} COP`, note: 'Abr 2026' },
            { label: 'Tasa PEN/USD', value: `1 USD = S/${USD_PEN} PEN`, note: 'Abr 2026' },
          ].map((p, i) => (
            <div key={i} className="rounded-lg border border-border bg-secondary/20 p-3">
              <p className="text-[10px] text-muted-foreground uppercase mb-1">{p.label}</p>
              <p className="text-sm font-bold text-primary">{p.value}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">{p.note}</p>
            </div>
          ))}
        </div>
      </div>
      </>}

    </div>
  );
}
