/**
 * FunnelCobranza — Scale-H1
 * Embudo real con Recharts FunnelChart + KPIs + histórico 3 períodos.
 */
import { FunnelChart, Funnel, Tooltip, LabelList, ResponsiveContainer } from 'recharts';
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
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg[status]}`}>
      <span className="w-1.5 h-1.5 rounded-full" style={{
        background: status === 'green' ? '#22c55e' : status === 'yellow' ? '#f59e0b' : '#ef4444'
      }} />
      {label}
    </span>
  );
}

// Tooltip personalizado para el funnel
function FunnelTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; value: number; pct: string } }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-foreground">{d.name}</p>
      <p className="text-muted-foreground mt-0.5">{d.value.toLocaleString('es-CO')} · {d.pct}</p>
    </div>
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

  // Datos para Recharts FunnelChart — valores deben ser decrecientes
  const funnelData = [
    { name: 'Volumen', value: totalHoy,  pct: '100%',        fill: '#6366f1' },
    { name: 'RPC',     value: rpcAbs,    pct: `${rpcPct}%`,  fill: '#8b5cf6' },
    { name: 'PTP',     value: ptpAbs,    pct: `${ptpPct}%`,  fill: '#10b981' },
  ];

  // KPIs panel derecho
  const kpis = [
    { key: 'vol', label: 'Volumen',  sublabel: 'Llamadas marcadas',     display: totalHoy.toLocaleString('es-CO'), status: null as Status | null, ref: '' },
    { key: 'rpc', label: 'RPC',      sublabel: 'Contacto persona real', display: `${rpcPct}%`,                    status: rpcStatus,              ref: 'Ref. industria: 8–15%' },
    { key: 'ptp', label: 'PTP',      sublabel: 'Promesa de pago',       display: `${ptpPct}%`,                    status: ptpStatus,              ref: 'Ref. industria: 25–45% de RPC' },
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

      {/* Fila superior: embudo + KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">

        {/* Panel izquierdo — FunnelChart Recharts */}
        <div className="p-6 flex flex-col items-center justify-center">
          <ResponsiveContainer width="100%" height={220}>
            <FunnelChart>
              <Tooltip content={<FunnelTooltip />} />
              <Funnel
                dataKey="value"
                data={funnelData}
                isAnimationActive
                labelLine={false}
              >
                <LabelList
                  position="center"
                  content={({ x, y, width, height, value, index }) => {
                    const d = funnelData[index as number];
                    const cx = (x as number) + (width as number) / 2;
                    const cy = (y as number) + (height as number) / 2;
                    return (
                      <g>
                        <text x={cx} y={cy - 8} textAnchor="middle" fill="white" fontSize={14} fontWeight="800" fontFamily="system-ui">
                          {typeof value === 'number' ? value.toLocaleString('es-CO') : value}
                        </text>
                        <text x={cx} y={cy + 9} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize={11} fontWeight="600">
                          {d?.pct}
                        </text>
                      </g>
                    );
                  }}
                />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
          {/* Leyenda */}
          <div className="flex items-center gap-4 mt-1">
            {funnelData.map(d => (
              <div key={d.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: d.fill }} />
                <span className="text-[11px] text-muted-foreground font-medium">{d.name}</span>
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
          {kpis.map(k => (
            <div key={k.key} className="px-6 py-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{k.label}</p>
                <p className="text-2xl font-black text-foreground tracking-tight leading-tight mt-1">{k.display}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{k.sublabel}</p>
              </div>
              <div className="text-right shrink-0">
                {k.status && <StatusBadge status={k.status} labels={['Óptimo', 'Aceptable', 'Bajo']} />}
                {k.ref && <p className="text-[10px] text-muted-foreground/50 mt-1.5">{k.ref}</p>}
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
