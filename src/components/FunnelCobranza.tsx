/**
 * FunnelCobranza — Scale-H1 v6
 * Embudo ejecutivo con CSS clip-path — control total sobre proporciones visuales.
 * Los tamaños del funnel son VISUALES (no proporcionales a los valores reales),
 * para que las 3 capas sean legibles aunque los porcentajes sean muy distintos.
 */
import type { CDRDayMetric } from '@/lib/supabase';

type Status = 'green' | 'yellow' | 'red';

function Dot({ status }: { status: Status }) {
  const color = status === 'green' ? '#22c55e' : status === 'yellow' ? '#f59e0b' : '#ef4444';
  const label = status === 'green' ? 'Óptimo' : status === 'yellow' ? 'Aceptable' : 'Bajo';
  const bg    = status === 'green' ? 'bg-emerald-500/10 text-emerald-400' : status === 'yellow' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400';
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${bg}`}>
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
      {label}
    </span>
  );
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

export function FunnelCobranza({ totalHoy, rpcPct, rpcAbs, ptpPct, ptpAbs, isHistoric, diasConRpc }: Props) {
  const rpcStatus: Status = rpcPct >= 12 ? 'green' : rpcPct >= 8  ? 'yellow' : 'red';
  const ptpStatus: Status = ptpPct >= 25 ? 'green' : ptpPct >= 15 ? 'yellow' : 'red';

  // Capas del funnel — anchos VISUALES fijos para legibilidad
  // (no proporcionales a los valores reales)
  const layers = [
    {
      label: 'Volumen',
      value: totalHoy.toLocaleString('es-CO'),
      pct: '100%',
      color: 'from-indigo-500 to-indigo-600',
      topW: 100,   // % del ancho del contenedor
      botW: 72,
      height: 80,
    },
    {
      label: 'RPC',
      value: rpcAbs.toLocaleString('es-CO'),
      pct: `${rpcPct}%`,
      color: 'from-violet-500 to-violet-600',
      topW: 72,
      botW: 44,
      height: 72,
    },
    {
      label: 'PTP',
      value: ptpAbs.toLocaleString('es-CO'),
      pct: `${ptpPct}%`,
      color: 'from-emerald-500 to-emerald-600',
      topW: 44,
      botW: 20,
      height: 64,
    },
  ];

  // Histórico 3 períodos
  const now = new Date();
  const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const prevYear  = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

  const pStats = [
    {
      label: 'Sem. anterior',
      dias: diasConRpc.filter(d => {
        const diff = Math.floor((Date.now() - new Date(d.fecha + 'T12:00:00').getTime()) / 86400000);
        return diff >= 7 && diff <= 13;
      }),
    },
    {
      label: 'Mes anterior',
      dias: diasConRpc.filter(d => {
        const dd = new Date(d.fecha + 'T12:00:00');
        return dd.getMonth() === prevMonth && dd.getFullYear() === prevYear;
      }),
    },
    {
      label: 'Año anterior',
      dias: diasConRpc.filter(d => new Date(d.fecha + 'T12:00:00').getFullYear() === now.getFullYear() - 1),
    },
  ].map(p => {
    const dd = p.dias.filter(d => d.total_llamadas > 3000);
    return {
      label: p.label,
      vol: dd.length > 0 ? Math.round(dd.reduce((s, r) => s + r.total_llamadas, 0) / dd.length) : null,
      rpc: dd.length > 0 ? Math.round(dd.reduce((s, r) => s + (r.rpc_rate_pct || 0), 0) / dd.length * 10) / 10 : null,
      ptp: dd.length > 0 ? Math.round(dd.reduce((s, r) => s + (r.ptp_rate_pct || 0), 0) / dd.length * 10) / 10 : null,
    };
  });

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">

      {/* Fila superior: funnel CSS + KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">

        {/* Panel izquierdo — funnel CSS clip-path */}
        <div className="p-6 flex flex-col items-center justify-center gap-0">
          {layers.map((l, i) => {
            // clip-path trapezoid: top-left, top-right, bottom-right, bottom-left
            const tl = `${(100 - l.topW) / 2}%`;
            const tr = `${(100 + l.topW) / 2}%`;
            const br = `${(100 + l.botW) / 2}%`;
            const bl = `${(100 - l.botW) / 2}%`;
            const clipPath = `polygon(${tl} 0%, ${tr} 0%, ${br} 100%, ${bl} 100%)`;
            return (
              <div
                key={l.label}
                className="w-full relative flex items-center justify-center"
                style={{ height: `${l.height}px` }}
              >
                {/* Trapezoid */}
                <div
                  className={`absolute inset-0 bg-gradient-to-b ${l.color}`}
                  style={{ clipPath }}
                />
                {/* Content centrado */}
                <div className="relative z-10 flex flex-col items-center">
                  <span className="text-white font-black text-lg leading-tight drop-shadow-md">
                    {l.value}
                  </span>
                  <span className="text-white/85 font-semibold text-[12px] leading-tight">
                    {l.pct}
                  </span>
                </div>
              </div>
            );
          })}
          {/* Leyenda */}
          <div className="flex items-center gap-4 mt-4">
            {[
              { label: 'Volumen', color: '#6366f1' },
              { label: 'RPC',     color: '#8b5cf6' },
              { label: 'PTP',     color: '#10b981' },
            ].map(d => (
              <div key={d.label} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: d.color }} />
                <span className="text-[11px] text-muted-foreground font-medium">{d.label}</span>
              </div>
            ))}
          </div>
          {isHistoric && (
            <p className="text-[10px] text-muted-foreground/40 text-center mt-2">
              Promedio 30 días · actualiza al cargar CDR con tipificaciones
            </p>
          )}
        </div>

        {/* Panel derecho — KPIs */}
        <div className="grid grid-rows-3 divide-y divide-border">
          {[
            { label: 'Volumen', sub: 'Llamadas marcadas',     val: totalHoy.toLocaleString('es-CO'), status: null as Status | null, ref: '' },
            { label: 'RPC',     sub: 'Contacto persona real', val: `${rpcPct}%`,                     status: rpcStatus,              ref: 'Ref. industria: 8–15%' },
            { label: 'PTP',     sub: 'Promesa de pago',       val: `${ptpPct}%`,                     status: ptpStatus,              ref: 'Ref. industria: 25–45% de RPC' },
          ].map(k => (
            <div key={k.label} className="px-6 py-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{k.label}</p>
                <p className="text-2xl font-black text-foreground tracking-tight leading-tight mt-1">{k.val}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{k.sub}</p>
              </div>
              <div className="text-right shrink-0 flex flex-col items-end gap-1">
                {k.status && <Dot status={k.status} />}
                {k.ref && <p className="text-[10px] text-muted-foreground/50">{k.ref}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fila inferior — histórico 3 períodos */}
      <div className="border-t border-border bg-secondary/20">
        <div className="grid grid-cols-3 divide-x divide-border">
          {pStats.map((p, i) => (
            <div key={i} className="px-5 py-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">{p.label}</p>
              {p.vol != null ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">Vol/día</span>
                    <span className="text-[13px] font-bold text-foreground">{p.vol.toLocaleString('es-CO')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">RPC</span>
                    <span className="text-[13px] font-bold text-violet-400">{p.rpc}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">PTP</span>
                    <span className="text-[13px] font-bold text-emerald-400">{p.ptp}%</span>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground/40 italic">Sin datos</p>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
