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
      label: 'VOLUMEN',
      value: totalHoy.toLocaleString('es-CO'),
      pct: '100%',
      status: null,
      ref: null,
      topW: 100,
      botW: 72,
      height: 100,
      gradient: 'from-indigo-500 to-indigo-600',
    },
    {
      key: 'rpc',
      label: 'RPC',
      value: rpcAbs.toLocaleString('es-CO'),
      pct: `${rpcPct}%`,
      status: rpcStatus,
      ref: 'Ref: 8–15%',
      topW: 72,
      botW: 44,
      height: 90,
      gradient: 'from-violet-500 to-violet-600',
    },
    {
      key: 'ptp',
      label: 'PTP',
      value: ptpAbs.toLocaleString('es-CO'),
      pct: `${ptpPct}%`,
      status: ptpStatus,
      ref: 'Ref: 25–45%',
      topW: 44,
      botW: 20,
      height: 80,
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
      {/* Caption histórico */}
      {isHistoric && (
        <p className="text-[10px] text-muted-foreground/40 text-center px-4 pt-3">
          Promedio 30 días · actualiza al cargar CDR con tipificaciones
        </p>
      )}

      {/* Funnel — centrado, sin panel lateral */}
      <div className="p-6 flex flex-col items-center justify-center gap-0">
        {layers.map((layer) => {
          // botInsetPct: how much each side narrows at the bottom, as % of this layer's own width
          const botInsetPct =
            ((layer.topW - layer.botW) / layer.topW / 2) * 100;
          const clipPath = `polygon(0% 0%, 100% 0%, ${100 - botInsetPct}% 100%, ${botInsetPct}% 100%)`;

          return (
            <div
              key={layer.key}
              className="relative"
              style={{
                width: `${layer.topW}%`,
                height: `${layer.height}px`,
              }}
            >
              {/* Gradient background — shape via clip-path */}
              <div
                className={`absolute inset-0 bg-gradient-to-b ${layer.gradient}`}
                style={{ clipPath }}
              />

              {/* Content — z-10, lives inside the visual trapezoid */}
              <div className="relative z-10 w-full px-5 flex flex-col justify-center h-full gap-0.5">
                {/* Row 1: label + percentage */}
                <div className="flex items-center justify-between">
                  <span className="text-white/70 text-[10px] font-semibold uppercase tracking-widest">
                    {layer.label}
                  </span>
                  <span className="text-white font-bold text-sm">
                    {layer.pct}
                  </span>
                </div>

                {/* Row 2: big number + status badge */}
                <div className="flex items-center justify-between">
                  <span className="text-white font-black text-2xl leading-tight drop-shadow-md">
                    {layer.value}
                  </span>
                  {layer.status && <Dot status={layer.status} />}
                </div>

                {/* Row 3: industry reference (RPC & PTP only) */}
                {layer.ref && (
                  <span className="text-white/40 text-[9px]">{layer.ref}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Histórico 3 períodos */}
      <div className="border-t border-border bg-secondary/20">
        <div className="grid grid-cols-3 divide-x divide-border">
          {pStats.map((p, i) => (
            <div key={i} className="px-5 py-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                {p.label}
              </p>
              {p.vol != null ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">
                      Vol/día
                    </span>
                    <span className="text-[13px] font-bold text-foreground">
                      {p.vol.toLocaleString('es-CO')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">
                      RPC
                    </span>
                    <span className="text-[13px] font-bold text-violet-400">
                      {p.rpc}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">
                      PTP
                    </span>
                    <span className="text-[13px] font-bold text-emerald-400">
                      {p.ptp}%
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground/40 italic">
                  Sin datos
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
