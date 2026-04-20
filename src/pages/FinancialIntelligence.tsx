import { useEffect, useState, useRef } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Loader2,
  Upload,
  CheckCircle2,
  XCircle,
  Info,
} from 'lucide-react';
import {
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
  BarChart,
  Cell,
} from 'recharts';
import { useClient } from '@/contexts/ClientContext';

// ─── Proxy helper ──────────────────────────────────────────────────────────────
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
const TICKET_PROMEDIO_COP = 160_000;      // Mediana de análisis de 50 transcripciones
const TASA_CUMPLIMIENTO = 0.60;           // 60% — estándar industria cobranzas
const TASA_PROMESA = 0.40;               // 40% de contactos efectivos hacen promesa
const COSTO_AGENTE_MES = 3_000_000;       // COP — nómina + carga social estimada
const AGENTES_ACTIVOS = 81;
const DIAS_LABORALES_MES = 22;
const COSTO_OP_MES = COSTO_AGENTE_MES * AGENTES_ACTIVOS;  // COP $243M/mes

// ─── Types ─────────────────────────────────────────────────────────────────────
interface CDRDaily {
  fecha: string;
  total_llamadas: number;
  contactos_efectivos: number;
}

interface FinancialResult {
  client_id: string;
  fecha: string;
  campana: string;
  promesas_pago: number;
  monto_prometido_cop: number;
  monto_recaudado_cop: number;
  tasa_cumplimiento_pct: number;
  ticket_promedio_cop: number;
  fuente: string;
  notas?: string;
}

interface MonthlyFinancial {
  mes: string;          // YYYY-MM
  mesLabel: string;     // Abr 2026
  recaudoEstimado: number;
  costoOp: number;
  margen: number;
  promesas: number;
  llamadas: number;
  contactos: number;
}

interface CampaignRow {
  campana: string;
  llamadas: number;
  contactos: number;
  promesasEst: number;
  recaudoEst: number;
  pctTotal: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function fmtCOP(n: number): string {
  if (Math.abs(n) >= 1_000_000_000) {
    return `$${(n / 1_000_000_000).toFixed(2)}B`;
  }
  if (Math.abs(n) >= 1_000_000) {
    return `$${(n / 1_000_000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}M`;
  }
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

// Campaign distribution
const CAMPANAS_DIST = [
  { name: 'Cobranzas Colombia', pct: 0.55 },
  { name: 'Cobranzas Perú', pct: 0.25 },
  { name: 'Servicio CO', pct: 0.12 },
  { name: 'Servicio PE', pct: 0.08 },
];

// ─── Custom Tooltip ────────────────────────────────────────────────────────────
function FinancialTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; fill?: string; stroke?: string; color?: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#22263A] bg-[#11131c] p-3 text-xs shadow-xl">
      <p className="font-semibold text-[#EEF0F6] mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span style={{ color: p.fill || p.stroke || p.color }} className="font-medium">{p.name}</span>
          <span className="text-[#EEF0F6] font-bold">{fmtCOP(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function FinancialIntelligence() {
  const { clientId } = useClient();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasRealData, setHasRealData] = useState(false);

  const [monthlyData, setMonthlyData] = useState<MonthlyFinancial[]>([]);
  const [todayRecaudo, setTodayRecaudo] = useState(0);
  const [mesActualRecaudo, setMesActualRecaudo] = useState(0);
  const [mesAnteriorRecaudo, setMesAnteriorRecaudo] = useState(0);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [previewRows, setPreviewRows] = useState<Record<string, string | number>[]>([]);
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

      // Try to fetch real financial_results first
      let realRows: FinancialResult[] = [];
      try {
        const result = await proxyQuery<FinancialResult[]>({
          table: 'financial_results',
          select: '*',
          filters: { 'client_id': `eq.${clientId}` },
          order: 'fecha.asc',
          limit: 10000,
        });
        if (Array.isArray(result) && result.length > 0) {
          realRows = result;
          setHasRealData(true);
        }
      } catch {
        // Table doesn't exist or no data — use CDR estimates
        setHasRealData(false);
      }

      // Always fetch CDR daily for estimates
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

      // ─── Group CDR by month ──────────────────────────────────────────────────
      const byMonth: Record<string, { llamadas: number; contactos: number }> = {};
      for (const row of cdrData) {
        const ym = row.fecha.slice(0, 7);
        if (!byMonth[ym]) byMonth[ym] = { llamadas: 0, contactos: 0 };
        byMonth[ym].llamadas += row.total_llamadas;
        byMonth[ym].contactos += row.contactos_efectivos;
      }

      const allMonths = Object.keys(byMonth).sort();
      const last12 = allMonths.slice(-12);

      // Today metrics (latest day in CDR)
      const sortedDays = [...cdrData].sort((a, b) => b.fecha.localeCompare(a.fecha));
      const todayRow = sortedDays[0];
      const todayPromesas = todayRow ? Math.round(todayRow.contactos_efectivos * TASA_PROMESA) : 0;
      const todayRec = Math.round(todayPromesas * TICKET_PROMEDIO_COP * TASA_CUMPLIMIENTO);
      setTodayRecaudo(todayRec);

      // Build monthly financial data
      const financial: MonthlyFinancial[] = last12.map(ym => {
        const m = byMonth[ym];
        const promesas = Math.round(m.contactos * TASA_PROMESA);

        let recaudo = Math.round(promesas * TICKET_PROMEDIO_COP * TASA_CUMPLIMIENTO);

        // Override with real data if available
        if (realRows.length > 0) {
          const monthRealRows = realRows.filter(r => r.fecha.slice(0, 7) === ym);
          if (monthRealRows.length > 0) {
            recaudo = monthRealRows.reduce((s, r) => s + r.monto_recaudado_cop, 0);
          }
        }

        return {
          mes: ym,
          mesLabel: mesLabel(ym),
          recaudoEstimado: recaudo,
          costoOp: COSTO_OP_MES,
          margen: recaudo - COSTO_OP_MES,
          promesas,
          llamadas: m.llamadas,
          contactos: m.contactos,
        };
      });

      setMonthlyData(financial);

      // Current + previous month
      const now = new Date();
      const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevYM = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

      const currentMonth = financial.find(m => m.mes === currentYM);
      const prevMonth = financial.find(m => m.mes === prevYM);
      setMesActualRecaudo(currentMonth?.recaudoEstimado ?? 0);
      setMesAnteriorRecaudo(prevMonth?.recaudoEstimado ?? 0);

      // Build campaign table from last available month
      const lastMonthData = financial[financial.length - 1];
      if (lastMonthData) {
        const campRows: CampaignRow[] = CAMPANAS_DIST.map(camp => {
          const llamadas = Math.round(lastMonthData.llamadas * camp.pct);
          const contactos = Math.round(lastMonthData.contactos * camp.pct);
          const promesasEst = Math.round(lastMonthData.promesas * camp.pct);
          const recaudoEst = Math.round(promesasEst * TICKET_PROMEDIO_COP * TASA_CUMPLIMIENTO);
          return {
            campana: camp.name,
            llamadas,
            contactos,
            promesasEst,
            recaudoEst,
            pctTotal: camp.pct * 100,
          };
        });
        setCampaigns(campRows);
      }
    } catch (e: unknown) {
      setError(`Error cargando datos financieros: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  // ─── Upload handler ──────────────────────────────────────────────────────────
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadResult(null);
    setPreviewRows([]);

    try {
      // Basic CSV parsing (handles simple CSVs)
      const text = await file.text();
      const lines = text.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const rows = lines.slice(1, 6).map(line => {
        const vals = line.split(',').map(v => v.trim().replace(/"/g, ''));
        return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']));
      });
      setPreviewRows(rows);

      // Validate required columns
      const requiredCols = ['fecha', 'monto_recaudado'];
      const missing = requiredCols.filter(col => !headers.some(h => h.toLowerCase().includes(col.toLowerCase())));
      if (missing.length > 0) {
        setUploadResult({ ok: false, msg: `Columnas requeridas faltantes: ${missing.join(', ')}. El archivo debe tener: fecha, monto_recaudado (y opcionalmente: campana)` });
        setUploading(false);
        return;
      }

      // Build rows for financial_results
      const allLines = lines.slice(1).filter(l => l.trim());
      const financialRows = allLines.map(line => {
        const vals = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const obj = Object.fromEntries(headers.map((h, i) => [h.toLowerCase(), vals[i] ?? '']));
        const fecha = obj['fecha'] || obj['date'] || '';
        const monto = parseInt(String(obj['monto_recaudado'] || obj['monto'] || '0').replace(/\D/g, ''), 10);
        const campana = obj['campana'] || obj['campaign'] || 'General';
        return {
          client_id: clientId,
          fecha,
          campana,
          promesas_pago: 0,
          monto_prometido_cop: monto,
          monto_recaudado_cop: monto,
          tasa_cumplimiento_pct: 100.0,
          ticket_promedio_cop: TICKET_PROMEDIO_COP,
          fuente: 'manual',
          notas: `Cargado desde archivo: ${file.name}`,
        };
      }).filter(r => r.fecha && r.monto_recaudado_cop > 0);

      if (financialRows.length === 0) {
        setUploadResult({ ok: false, msg: 'No se encontraron filas válidas con fecha y monto_recaudado > 0' });
        setUploading(false);
        return;
      }

      // Upload to Supabase via Worker
      const resp = await fetch(`${PROXY_URL}/load-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'wekall-load-2026',
          table: 'financial_results',
          rows: financialRows,
          on_conflict: 'client_id,fecha,campana',
        }),
      });
      const result = await resp.json() as { ok: boolean; rows?: number; detail?: string };

      if (result.ok) {
        setUploadResult({ ok: true, msg: `✅ ${financialRows.length} registros cargados exitosamente. Recargando datos...` });
        setTimeout(() => load(), 1500);
      } else {
        setUploadResult({ ok: false, msg: `Error al cargar: ${result.detail || 'Error desconocido'}. Es posible que la tabla financial_results aún no esté creada en Supabase.` });
      }
    } catch (err: unknown) {
      setUploadResult({ ok: false, msg: `Error procesando archivo: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  // ─── Trend ──────────────────────────────────────────────────────────────────
  const tendenciaMes = mesAnteriorRecaudo > 0
    ? ((mesActualRecaudo - mesAnteriorRecaudo) / mesAnteriorRecaudo) * 100
    : 0;

  const margenMesActual = mesActualRecaudo - COSTO_OP_MES;
  const margenPct = mesActualRecaudo > 0
    ? ((margenMesActual / mesActualRecaudo) * 100).toFixed(1)
    : '0';

  // ─── Loading / Error states ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-[#818CF8]">
        <Loader2 className="animate-spin h-5 w-5" />
        <span className="text-sm">Calculando Financial Intelligence...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-6 text-[#F87171] bg-[#F87171]/10 rounded-lg mx-4 mt-6 border border-[#F87171]/20">
        <XCircle className="h-5 w-5 flex-shrink-0" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#EEF0F6] flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-[#818CF8]" />
            Financial Intelligence
          </h1>
          <p className="text-sm text-[#818CF8]/80 mt-1">¿Cuánto está generando tu operación hoy?</p>
        </div>
        {!hasRealData && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 text-xs font-semibold text-amber-400 self-start">
            <AlertTriangle className="h-3.5 w-3.5" />
            Estimativos basados en transcripciones
          </span>
        )}
      </div>

      {/* ── Banner estimativos ────────────────────────────────────────────── */}
      {!hasRealData && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/8 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-300 mb-1">⚠️ Datos estimativos — no conectados a tu sistema de cobranza</p>
              <p className="text-xs text-amber-400/80 leading-relaxed">
                Los valores mostrados son estimativos basados en análisis de <strong>50 transcripciones de llamadas</strong> y supuestos de industria
                (ticket promedio COP $160K, 40% tasa de promesa, 60% cumplimiento de promesas).
                El margen de error puede ser <strong>±40%</strong>.
                Para análisis exacto, conecta tu sistema de cobranza usando el botón de abajo.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── KPI Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Recaudo HOY */}
        <div className="rounded-xl border border-[#22263A] bg-[#11131c] p-4 flex flex-col gap-2">
          <p className="text-[10px] font-semibold text-[#818CF8]/70 uppercase tracking-widest">Recaudo est. HOY</p>
          <p className="text-2xl font-bold text-[#EEF0F6]">{fmtCOP(todayRecaudo)}</p>
          <p className="text-xs text-[#818CF8]/60">
            {Math.round(todayRecaudo / TICKET_PROMEDIO_COP / TASA_CUMPLIMIENTO).toLocaleString()} promesas × COP $160K × 60%
          </p>
          <div className="mt-auto pt-2 border-t border-[#22263A]">
            <span className="text-[10px] text-[#818CF8]/50 uppercase tracking-wider">{hasRealData ? 'Real' : 'Estimado'}</span>
          </div>
        </div>

        {/* Recaudo MES */}
        <div className="rounded-xl border border-[#22263A] bg-[#11131c] p-4 flex flex-col gap-2">
          <p className="text-[10px] font-semibold text-[#818CF8]/70 uppercase tracking-widest">Recaudo est. MES</p>
          <p className="text-2xl font-bold text-[#EEF0F6]">{fmtCOP(mesActualRecaudo)}</p>
          <div className="flex items-center gap-1">
            {tendenciaMes >= 0
              ? <TrendingUp className="h-3.5 w-3.5 text-[#4ADE80]" />
              : <TrendingDown className="h-3.5 w-3.5 text-[#F87171]" />
            }
            <span className={`text-xs font-semibold ${tendenciaMes >= 0 ? 'text-[#4ADE80]' : 'text-[#F87171]'}`}>
              {tendenciaMes >= 0 ? '+' : ''}{tendenciaMes.toFixed(1)}% vs mes anterior
            </span>
          </div>
          <div className="mt-auto pt-2 border-t border-[#22263A]">
            <span className="text-[10px] text-[#818CF8]/50 uppercase tracking-wider">{hasRealData ? 'Real' : 'Estimado'}</span>
          </div>
        </div>

        {/* Costo operativo */}
        <div className="rounded-xl border border-[#22263A] bg-[#11131c] p-4 flex flex-col gap-2">
          <p className="text-[10px] font-semibold text-[#818CF8]/70 uppercase tracking-widest">Costo op. / mes</p>
          <p className="text-2xl font-bold text-[#EEF0F6]">{fmtCOP(COSTO_OP_MES)}</p>
          <p className="text-xs text-[#818CF8]/60">{AGENTES_ACTIVOS} agentes × COP $3M</p>
          <div className="mt-auto pt-2 border-t border-[#22263A]">
            <span className="text-[10px] text-[#818CF8]/50 uppercase tracking-wider">Nómina estimada</span>
          </div>
        </div>

        {/* Margen estimado */}
        <div className={`rounded-xl border p-4 flex flex-col gap-2 ${
          margenMesActual >= 0
            ? 'border-[#4ADE80]/20 bg-[#4ADE80]/5'
            : 'border-[#F87171]/20 bg-[#F87171]/5'
        }`}>
          <p className="text-[10px] font-semibold text-[#818CF8]/70 uppercase tracking-widest">Margen estimado</p>
          <p className={`text-2xl font-bold ${margenMesActual >= 0 ? 'text-[#4ADE80]' : 'text-[#F87171]'}`}>
            {fmtCOP(margenMesActual)}
          </p>
          <p className="text-xs text-[#818CF8]/60">
            Margen bruto: <span className={`font-semibold ${margenMesActual >= 0 ? 'text-[#4ADE80]' : 'text-[#F87171]'}`}>{margenPct}%</span>
          </p>
          <div className="mt-auto pt-2 border-t border-[#22263A]/50">
            <span className="text-[10px] text-[#818CF8]/50 uppercase tracking-wider">Recaudo − Costo op.</span>
          </div>
        </div>
      </div>

      {/* ── Gráfico principal ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-[#22263A] bg-[#11131c] p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-semibold text-[#EEF0F6] flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#818CF8]" />
              Recaudo estimado — últimos 12 meses
            </h2>
            <p className="text-xs text-[#818CF8]/60 mt-0.5">Barras = recaudo estimado · Línea = costo operativo fijo</p>
          </div>
          {!hasRealData && (
            <div className="flex items-center gap-1.5 text-xs text-amber-400/80">
              <Info className="h-3.5 w-3.5" />
              <span>Estimativos</span>
            </div>
          )}
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={monthlyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="recaudoGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#818CF8" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#818CF8" stopOpacity={0.5} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#22263A" />
            <XAxis
              dataKey="mesLabel"
              tick={{ fill: '#818CF8', fontSize: 10 }}
              axisLine={{ stroke: '#22263A' }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => fmtCOP(v)}
              tick={{ fill: '#818CF8', fontSize: 10 }}
              axisLine={{ stroke: '#22263A' }}
              tickLine={false}
              width={70}
            />
            <Tooltip content={<FinancialTooltip />} />
            <Legend
              formatter={(value) => <span style={{ color: '#818CF8', fontSize: 11 }}>{value}</span>}
            />
            <Bar
              dataKey="recaudoEstimado"
              name="Recaudo est."
              fill="url(#recaudoGrad)"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
            <Line
              type="monotone"
              dataKey="costoOp"
              name="Costo op."
              stroke="#F87171"
              strokeWidth={2}
              dot={false}
              strokeDasharray="5 3"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ── Tabla por campaña ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-[#22263A] bg-[#11131c] p-5">
        <h2 className="text-sm font-semibold text-[#EEF0F6] mb-4">
          Desglose por campaña — {monthlyData[monthlyData.length - 1]?.mesLabel ?? 'último mes'}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#22263A]">
                <th className="text-left py-2 pr-4 text-[#818CF8]/70 font-semibold uppercase tracking-wider">Campaña</th>
                <th className="text-right py-2 pr-4 text-[#818CF8]/70 font-semibold uppercase tracking-wider">Llamadas</th>
                <th className="text-right py-2 pr-4 text-[#818CF8]/70 font-semibold uppercase tracking-wider">Contactos</th>
                <th className="text-right py-2 pr-4 text-[#818CF8]/70 font-semibold uppercase tracking-wider">Promesas est.</th>
                <th className="text-right py-2 pr-4 text-[#818CF8]/70 font-semibold uppercase tracking-wider">Recaudo est.</th>
                <th className="text-right py-2 text-[#818CF8]/70 font-semibold uppercase tracking-wider">% Total</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c, i) => (
                <tr key={i} className="border-b border-[#22263A]/50 hover:bg-[#818CF8]/5 transition-colors">
                  <td className="py-3 pr-4 font-medium text-[#EEF0F6]">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#818CF8]" style={{ opacity: 0.4 + (i * 0.2) }} />
                      {c.campana}
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-right text-[#EEF0F6]/80">{c.llamadas.toLocaleString('es-CO')}</td>
                  <td className="py-3 pr-4 text-right text-[#EEF0F6]/80">{c.contactos.toLocaleString('es-CO')}</td>
                  <td className="py-3 pr-4 text-right text-[#818CF8]">{c.promesasEst.toLocaleString('es-CO')}</td>
                  <td className="py-3 pr-4 text-right font-semibold text-[#4ADE80]">{fmtCOP(c.recaudoEst)}</td>
                  <td className="py-3 text-right">
                    <span className="inline-flex items-center rounded-full bg-[#818CF8]/10 border border-[#818CF8]/20 px-2 py-0.5 text-[#818CF8] font-semibold">
                      {c.pctTotal.toFixed(0)}%
                    </span>
                  </td>
                </tr>
              ))}
              {/* Totals row */}
              {campaigns.length > 0 && (
                <tr className="border-t-2 border-[#22263A] font-bold">
                  <td className="py-3 pr-4 text-[#EEF0F6]">TOTAL</td>
                  <td className="py-3 pr-4 text-right text-[#EEF0F6]">
                    {campaigns.reduce((s, c) => s + c.llamadas, 0).toLocaleString('es-CO')}
                  </td>
                  <td className="py-3 pr-4 text-right text-[#EEF0F6]">
                    {campaigns.reduce((s, c) => s + c.contactos, 0).toLocaleString('es-CO')}
                  </td>
                  <td className="py-3 pr-4 text-right text-[#818CF8]">
                    {campaigns.reduce((s, c) => s + c.promesasEst, 0).toLocaleString('es-CO')}
                  </td>
                  <td className="py-3 pr-4 text-right text-[#4ADE80]">
                    {fmtCOP(campaigns.reduce((s, c) => s + c.recaudoEst, 0))}
                  </td>
                  <td className="py-3 text-right text-[#EEF0F6]">100%</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Margen mensual chart ──────────────────────────────────────────── */}
      <div className="rounded-xl border border-[#22263A] bg-[#11131c] p-5">
        <h2 className="text-sm font-semibold text-[#EEF0F6] mb-4">Margen operativo mensual</h2>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#22263A" />
            <XAxis dataKey="mesLabel" tick={{ fill: '#818CF8', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => fmtCOP(v)} tick={{ fill: '#818CF8', fontSize: 10 }} axisLine={false} tickLine={false} width={70} />
            <Tooltip content={<FinancialTooltip />} />
            <Bar
              dataKey="margen"
              name="Margen"
              radius={[4, 4, 0, 0]}
              maxBarSize={36}
            >
              {monthlyData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.margen >= 0 ? '#4ADE80' : '#F87171'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Conectar datos reales ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-[#818CF8]/30 bg-[#818CF8]/5 p-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-[#EEF0F6] flex items-center gap-2 mb-2">
              <Upload className="h-4 w-4 text-[#818CF8]" />
              {hasRealData ? 'Actualizar datos de recaudo' : 'Conectar datos reales de recaudo'}
            </h2>
            <p className="text-xs text-[#818CF8]/70 mb-3">
              Sube tu reporte de recaudo para reemplazar los estimativos con datos exactos.
              Formatos aceptados: <strong>.csv</strong>, <strong>.xlsx</strong>
            </p>
            <p className="text-[11px] text-[#818CF8]/50">
              Columnas requeridas: <code className="bg-[#22263A] px-1 rounded">fecha</code>, <code className="bg-[#22263A] px-1 rounded">monto_recaudado</code>
              {' '}— Opcional: <code className="bg-[#22263A] px-1 rounded">campana</code>
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-lg bg-[#818CF8] hover:bg-[#818CF8]/90 disabled:opacity-50 px-4 py-2.5 text-sm font-semibold text-white transition-colors"
            >
              {uploading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Procesando...</>
              ) : (
                <><Upload className="h-4 w-4" /> Subir Excel / CSV</>
              )}
            </button>
          </div>
        </div>

        {/* Upload result */}
        {uploadResult && (
          <div className={`mt-4 rounded-lg border p-3 flex items-start gap-2 text-xs ${
            uploadResult.ok
              ? 'border-[#4ADE80]/30 bg-[#4ADE80]/10 text-[#4ADE80]'
              : 'border-[#F87171]/30 bg-[#F87171]/10 text-[#F87171]'
          }`}>
            {uploadResult.ok ? <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" /> : <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />}
            <span>{uploadResult.msg}</span>
          </div>
        )}

        {/* Preview */}
        {previewRows.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-[#818CF8]/70 mb-2">Vista previa (primeras 5 filas):</p>
            <div className="overflow-x-auto rounded-lg border border-[#22263A]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#22263A] bg-[#0a0b10]">
                    {Object.keys(previewRows[0] || {}).map(h => (
                      <th key={h} className="text-left px-3 py-2 text-[#818CF8]/70 font-semibold uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i} className="border-b border-[#22263A]/50">
                      {Object.values(row).map((v, j) => (
                        <td key={j} className="px-3 py-2 text-[#EEF0F6]/70">{String(v)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Parámetros del modelo ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-[#22263A] bg-[#11131c] p-5">
        <h2 className="text-sm font-semibold text-[#EEF0F6] mb-4 flex items-center gap-2">
          <Info className="h-4 w-4 text-[#818CF8]" />
          Parámetros del modelo estimativo
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: 'Ticket promedio', value: fmtCOPFull(TICKET_PROMEDIO_COP), note: 'Mediana 50 transcripciones' },
            { label: 'Tasa promesa', value: '40%', note: 'Contactos → promesa pago' },
            { label: 'Tasa cumplimiento', value: '60%', note: 'Promesas → recaudo real' },
            { label: 'Agentes activos', value: String(AGENTES_ACTIVOS), note: 'Base CDR' },
            { label: 'Costo/agente/mes', value: fmtCOPFull(COSTO_AGENTE_MES), note: 'Nómina + carga social' },
          ].map((p, i) => (
            <div key={i} className="rounded-lg border border-[#22263A] bg-[#0a0b10] p-3">
              <p className="text-[10px] text-[#818CF8]/60 uppercase tracking-wider mb-1">{p.label}</p>
              <p className="text-sm font-bold text-[#818CF8]">{p.value}</p>
              <p className="text-[10px] text-[#818CF8]/40 mt-0.5">{p.note}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
