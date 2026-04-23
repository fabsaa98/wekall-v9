/**
 * FunnelCobranza — Scale-H1
 * Embudo de gestión de cobranza estilo Amplitude.
 * Barras horizontales escalonadas + KPIs + histórico 3 períodos.
 */
import type { CDRDayMetric } from '@/lib/supabase';

type Status = 'green' | 'yellow' | 'red';

function StatusBadge({ status, labels }: { status: Status; labels: [string, string, string] }) {
  const cfg: Record<Status, string> = {
    green:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    yellow: 'bg-amber-500/10  text-amber-400  border-amber-500/20',
    red:    'bg-red-500/10    text-red-400    border-red-500/20',
  };
  const label = status === 'green' ? labels[0] : status === 'yellow' ? labels[1] : labels[2];
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg[status]}`}>
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

  const layers = [
    { key: 'vol', label: 'Volumen', sublabel: 'Total llamadas marcadas', numStr: totalHoy.toLocaleString('es-CO'), pctStr: '100%', barW: 100,                       color: 'bg-primary',     status: null         as Status | null, ref: '' },
    { key: 'rpc', label: 'RPC',     sublabel: 'Contacto persona real',   numStr: `${rpcPct}%`,                    pctStr: `${rpcPct}%`, barW: Math.min(rpcPct * 5.5, 82), color: 'bg-violet-500',  status: rpcStatus    as Status | null, ref: 'Ref: 8–15%' },
    { key: 'ptp', label: 'PTP',     sublabel: 'Promesa de pago',         numStr: `${ptpPct}%`,                    pctStr: `${ptpPct}%`, barW: Math.min(ptpPct * 2.5, 60), color: 'bg-emerald-500', status: ptpStatus    as Status | null, ref: 'Ref: 25–45% de RPC' },
  ];

  // Histórico 3 períodos
  const now = new Date();
  const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const prevYear  = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

  const periodos = [
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
  ];

  const pStats = periodos.map(p => {
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

      {/* Fila superior: funnel + KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">

        {/* Panel izquierdo — barras horizontales estilo Amplitude */}
        <div className="p-6 flex flex-col justify-center gap-4">
          {layers.map((l, i) => (
            <div key={l.key} className="flex items-center gap-3">
              {/* Label fija */}
              <div className="w-14 shrink-0 text-right">
                <p className="text-[11px] font-bold text-foreground leading-tight">{l.label}</p>
              </div>
              {/* Barra */}
              <div className="flex-1 flex items-center gap-2">
                <div
                  className={`h-9 rounded-lg ${l.color} flex items-center px-3 transition-all duration-700 shrink-0`}
                  style={{ width: `${l.barW}%`, opacity: 1 - i * 0.06 }}
                >
                  <span className="text-white text-sm font-black tracking-tight whitespace-nowrap drop-shadow-sm">
                    {l.numStr}
                  </span>
                </div>
                {l.status && (
                  <StatusBadge status={l.status} labels={['Óptimo', 'Aceptable', 'Bajo']} />
                )}
              </div>
            </div>
          ))}
          {isHistoric && (
            <p className="text-[10px] text-muted-foreground/40 text-center pt-1">
              Promedio 30 días · datos del día disponibles al cargar CDR con tipificaciones
            </p>
          )}
        </div>

        {/* Panel derecho — KPIs con referencia industria */}
        <div className="grid grid-rows-3 divide-y divide-border">
          {layers.map((l, i) => (
            <div key={l.key} className="px-5 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{l.label}</p>
                <p className="text-2xl font-black text-foreground tracking-tight leading-tight mt-0.5">
                  {i === 0 ? totalHoy.toLocaleString('es-CO') : l.numStr}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{l.sublabel}</p>
              </div>
              <div className="text-right shrink-0">
                {l.status && (
                  <StatusBadge status={l.status} labels={['🟢 Óptimo', '🟡 Aceptable', '🔴 Bajo']} />
                )}
                {l.ref && <p className="text-[10px] text-muted-foreground/50 mt-1">{l.ref}</p>}
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
