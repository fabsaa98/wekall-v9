/**
 * FunnelCobranza — KPI Cards v7
 * 3 KPI cards apiladas con barra de progreso horizontal integrada.
 * Patrón Sisense / Looker / Amplitude — elimina redundancia embudo + panel.
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

      {/* Caption histórico */}
      {isHistoric && (
        <p className="text-[10px] text-muted-foreground/40 text-center px-4 pt-3 -mb-1">
          Promedio 30 días · actualiza al cargar CDR con tipificaciones
        </p>
      )}

      {/* 3 KPI Cards apiladas */}
      <div className="divide-y divide-border">

        {/* Card 1 — Volumen */}
        <div className="px-5 py-4">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            Volumen
          </p>
          <div className="flex items-baseline justify-between gap-3 mt-1">
            <p className="text-3xl font-black text-foreground tracking-tight leading-tight">
              {totalHoy.toLocaleString('es-CO')}
            </p>
            <span className="text-[11px] font-semibold text-indigo-400">100%</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Llamadas marcadas
          </p>
          <div className="mt-3 h-2 rounded-full bg-indigo-500/20">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-500"
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {/* Card 2 — RPC */}
        <div className="px-5 py-4">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            RPC
          </p>
          <div className="flex items-baseline justify-between gap-3 mt-1">
            <p className="text-3xl font-black text-foreground tracking-tight leading-tight">
              {rpcAbs.toLocaleString('es-CO')}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[13px] font-bold text-violet-400">{rpcPct}%</span>
              <Dot status={rpcStatus} />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Contacto persona real · {rpcAbs.toLocaleString('es-CO')} abs
          </p>
          <div className="mt-3 h-2 rounded-full bg-violet-500/20">
            <div
              className="h-full rounded-full bg-violet-500 transition-all duration-500"
              style={{ width: `${Math.min(rpcPct, 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground/50 mt-1.5">
            Ref. industria: 8–15%
          </p>
        </div>

        {/* Card 3 — PTP */}
        <div className="px-5 py-4">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            PTP
          </p>
          <div className="flex items-baseline justify-between gap-3 mt-1">
            <p className="text-3xl font-black text-foreground tracking-tight leading-tight">
              {ptpAbs.toLocaleString('es-CO')}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[13px] font-bold text-emerald-400">{ptpPct}%</span>
              <Dot status={ptpStatus} />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Promesa de pago · {ptpAbs.toLocaleString('es-CO')} abs
          </p>
          <div className="mt-3 h-2 rounded-full bg-emerald-500/20">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${Math.min(ptpPct, 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground/50 mt-1.5">
            Ref. industria: 25–45% de RPC
          </p>
        </div>

      </div>

      {/* Histórico 3 períodos */}
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
