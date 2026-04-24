/**
 * FunnelCobranza — Embudo interactivo v8
 * El funnel ES la fuente de datos: toda la info vive dentro de cada capa.
 * Sin panel lateral. Sin duplicación.
 */
import type { CDRDayMetric } from '@/lib/supabase';

type Status = 'green' | 'yellow' | 'red';

function Dot({ status }: { status: Status }) {
  const color = status === 'green' ? '#22c55e' : status === 'yellow' ? '#f59e0b' : '#ef4444';
  const label = status === 'green' ? 'Óptimo' : status === 'yellow' ? 'Aceptable' : 'Bajo';
  const bg =
    status === 'green'
      ? 'bg-emerald-500/10 text-emerald-400'
      : status === 'yellow'
      ? 'bg-amber-500/10 text-amber-400'
      : 'bg-red-500/10 text-red-400';
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${bg}`}>
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
      {label}
    </span>
  );
}

interface LayerDef {
  key: string;
  label: string;
  value: string;
  pct: string;
  status: Status | null;
  ref: string | null;
  topW: number;   // % of container width at top edge
  botW: number;   // % of container width at bottom edge
  height: number; // px
  gradient: string;
}

interface Props {
  totalHoy: number;
  rpcPct: number;
  rpcAbs: number;
  ptpPct: number;
  ptpAbs: number;
  isHistoric: boolean;
  diasConRpc: CDRDayMetric[];
}

export function FunnelCobranza({
  totalHoy,
  rpcPct,
  rpcAbs,
  ptpPct,
  ptpAbs,
  isHistoric,
  diasConRpc,
}: Props) {
  const rpcStatus: Status = rpcPct >= 12 ? 'green' : rpcPct >= 8 ? 'yellow' : 'red';
  const ptpStatus: Status = ptpPct >= 25 ? 'green' : ptpPct >= 15 ? 'yellow' : 'red';

  const layers: LayerDef[] = [
    {
      key: 'vol',
      label: 'Volumen de Llamadas',
      value: totalHoy.toLocaleString('es-CO'),
      pct: '100%',
      status: null,
      ref: null,
      topW: 100,
      botW: 76,
      height: 110,
      gradient: 'from-indigo-500 to-indigo-600',
    },
    {
      key: 'rpc',
      label: 'Contacto Persona Correcta (RPC)',
      value: rpcAbs.toLocaleString('es-CO'),
      pct: `${rpcPct}%`,
      status: rpcStatus,
      ref: null,
      topW: 76,
      botW: 52,
      height: 100,
      gradient: 'from-violet-500 to-violet-600',
    },
    {
      key: 'ptp',
      label: 'Promesa de Pago (PTP)',
      value: ptpAbs.toLocaleString('es-CO'),
      pct: `${ptpPct}%`,
      status: ptpStatus,
      ref: null,
      topW: 52,
      botW: 28,
      height: 90,
      gradient: 'from-emerald-500 to-emerald-600',
    },
  ];

  // Histórico 3 períodos
  const now = new Date();
  const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const prevYear =
    now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

  const pStats = [
    {
      label: 'Sem. anterior',
      dias: diasConRpc.filter((d) => {
        const diff = Math.floor(
          (Date.now() - new Date(d.fecha + 'T12:00:00').getTime()) / 86400000,
        );
        return diff >= 7 && diff <= 13;
      }),
    },
    {
      label: 'Mes anterior',
      dias: diasConRpc.filter((d) => {
        const dd = new Date(d.fecha + 'T12:00:00');
        return dd.getMonth() === prevMonth && dd.getFullYear() === prevYear;
      }),
    },
    {
      label: 'Año anterior',
      dias: diasConRpc.filter(
        (d) =>
          new Date(d.fecha + 'T12:00:00').getFullYear() ===
          now.getFullYear() - 1,
      ),
    },
  ].map((p) => {
    const dd = p.dias.filter((d) => d.total_llamadas > 3000);
    return {
      label: p.label,
      vol:
        dd.length > 0
          ? Math.round(
              dd.reduce((s, r) => s + r.total_llamadas, 0) / dd.length,
            )
          : null,
      rpc:
        dd.length > 0
          ? Math.round(
              (dd.reduce((s, r) => s + (r.rpc_rate_pct || 0), 0) / dd.length) *
                10,
            ) / 10
          : null,
      ptp:
        dd.length > 0
          ? Math.round(
              (dd.reduce((s, r) => s + (r.ptp_rate_pct || 0), 0) / dd.length) *
                10,
            ) / 10
          : null,
    };
  });

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {isHistoric && (
        <p className="text-[10px] text-muted-foreground/40 text-center px-4 pt-3 -mb-1">
          Promedio 30 días · actualiza al cargar CDR con tipificaciones
        </p>
      )}

      {/* Grid: funnel izquierda (60%) + histórico derecha (40%) */}
      <div className="flex divide-x divide-border">

        {/* Funnel — columna izquierda */}
        <div className="flex-[6] p-5 flex flex-col items-center justify-center gap-0">
          {layers.map((layer) => {
            // clip-path relativo al ancho de ESTA capa (topW%)
            // bottom es botW/topW * 100% del ancho de la capa
            const botRelPct = (layer.botW / layer.topW) * 100;
            const inset = (100 - botRelPct) / 2;
            const clipPath = `polygon(0% 0%, 100% 0%, ${100 - inset}% 100%, ${inset}% 100%)`;
            const padPct = inset + 4;
            return (
              <div
                key={layer.key}
                className="relative"
                style={{ width: `${layer.topW}%`, height: `${layer.height}px` }}
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-b ${layer.gradient}`}
                  style={{ clipPath }}
                />
                <div
                  className="relative z-10 flex flex-col items-center justify-center h-full gap-0.5 text-center"
                  style={{ paddingLeft: `${padPct}%`, paddingRight: `${padPct}%` }}
                >
                  <span className="text-white/80 text-[11px] font-semibold leading-tight">
                    {layer.label}
                  </span>
                  <span className="text-white font-black text-[28px] leading-none drop-shadow-lg">
                    {layer.value}
                  </span>
                  <span className="text-white font-bold text-[17px] leading-none opacity-90">
                    {layer.pct}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Histórico — columna derecha, mismo estilo visual que KPI cards principales */}
        <div className="flex-[4] flex flex-col gap-3 p-4">
          {pStats.map((p, i) => (
            <div key={i} className="flex-1 rounded-xl border border-border bg-card px-4 py-4 flex flex-col justify-center min-h-0">
              {/* Título */}
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">
                {p.label}
              </p>

              {p.vol != null ? (
                <>
                  {/* Número grande — Vol/día como métrica principal */}
                  <p className="text-[28px] font-black text-foreground leading-tight tracking-tight">
                    {p.vol.toLocaleString('es-CO')}
                  </p>
                  <p className="text-[11px] text-muted-foreground mb-2">llamadas / día</p>

                  {/* Métricas secundarias */}
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-muted-foreground">RPC</span>
                      <span className="text-[15px] font-bold text-violet-400">{p.rpc}%</span>
                    </div>
                    <div className="w-px h-6 bg-border" />
                    <div className="flex flex-col">
                      <span className="text-[10px] text-muted-foreground">PTP</span>
                      <span className="text-[15px] font-bold text-emerald-400">{p.ptp}%</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-[28px] font-black text-muted-foreground/20 leading-tight">—</p>
                  <p className="text-[11px] text-muted-foreground/40 italic mt-1">Sin datos</p>
                </>
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
