/**
 * ChannelCostComparison — P2 Scale-A Financial Intelligence
 * Comparativa de costo operativo: Vicky IA vs Agente Humano
 * 12 mayo 2026
 */
import { useEffect, useState } from 'react';
import { DollarSign, TrendingDown, Zap, Users, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ChannelCostData {
  costo_humano: number;
  costo_vicky: number;
  ahorro_pct: number;
  volumen_vicky: number;
  volumen_humano: number;
  canales: Array<{
    channel: string;
    costo: number;
    tiempo_seg: number;
  }>;
}

interface ChannelCostComparisonProps {
  clientId: string;
}

// ─── Proxy Helper ──────────────────────────────────────────────────────────────

const PROXY_URL = (import.meta.env.VITE_PROXY_URL || 'https://wekall-vicky-proxy.fabsaa98.workers.dev').replace(/\/$/, '');

async function proxyRPC<T>(fn: string, params: object): Promise<T> {
  const resp = await fetch(`${PROXY_URL}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rpc: fn, params }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({})) as Record<string, string>;
    throw new Error(err.error || `rpc_error_${resp.status}`);
  }
  const data = await resp.json();
  return data as T;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function ChannelCostComparison({ clientId }: ChannelCostComparisonProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ChannelCostData | null>(null);

  useEffect(() => {
    if (!clientId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const result = await proxyRPC<ChannelCostData>('get_channel_cost_comparison', {
        p_client_id: clientId,
      });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando costos por canal');
      console.error('ChannelCostComparison error:', err);
    } finally {
      setLoading(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-slate-50 to-white border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-700">
            <DollarSign className="h-5 w-5" />
            Costo por Canal
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-gradient-to-br from-red-50 to-white border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <DollarSign className="h-5 w-5" />
            Costo por Canal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  // Formatear para gráfico
  const chartData = data.canales.map((c) => ({
    canal: channelLabel(c.channel),
    costo: c.costo,
    tiempo: c.tiempo_seg,
  }));

  const ahorroColor = data.ahorro_pct >= 50 ? 'text-green-600' : data.ahorro_pct >= 25 ? 'text-emerald-500' : 'text-slate-600';

  return (
    <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-slate-700">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-indigo-600" />
            Costo por Canal
          </div>
          <Badge className="bg-gradient-to-r from-emerald-500 to-green-600 text-white border-0 px-3 py-1">
            <TrendingDown className="h-3 w-3 mr-1 inline" />
            Ahorro IA: <span className="font-bold ml-1">{data.ahorro_pct.toFixed(1)}%</span>
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPIs Principales */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-slate-500" />
              <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">Agente Humano</span>
            </div>
            <div className="text-2xl font-bold text-slate-800">
              ${data.costo_humano.toLocaleString('es-CO')}
            </div>
            <div className="text-xs text-slate-500 mt-1">por interacción</div>
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-200">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-indigo-600" />
              <span className="text-xs font-medium text-indigo-700 uppercase tracking-wide">Vicky IA</span>
            </div>
            <div className="text-2xl font-bold text-indigo-700">
              ${data.costo_vicky.toLocaleString('es-CO')}
            </div>
            <div className="text-xs text-indigo-600 mt-1">por interacción</div>
          </div>
        </div>

        {/* Métrica de Ahorro */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-green-700 uppercase tracking-wide mb-1">
                Ahorro con IA
              </div>
              <div className={`text-3xl font-bold ${ahorroColor}`}>
                {data.ahorro_pct.toFixed(1)}%
              </div>
            </div>
            <div className="text-right text-sm text-green-700">
              <div className="font-medium">Reducción de costo</div>
              <div className="text-xs text-green-600">
                ${(data.costo_humano - data.costo_vicky).toLocaleString('es-CO')} menos
              </div>
            </div>
          </div>
        </div>

        {/* Volúmenes últimos 30 días */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="text-center">
            <div className="text-xs text-slate-500 mb-1">Volumen Vicky (30d)</div>
            <div className="text-xl font-semibold text-indigo-600">
              {data.volumen_vicky.toLocaleString('es-CO')}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-500 mb-1">Volumen Humano (30d)</div>
            <div className="text-xl font-semibold text-slate-600">
              {data.volumen_humano.toLocaleString('es-CO')}
            </div>
          </div>
        </div>

        {/* Gráfico comparativo */}
        <div className="pt-4">
          <div className="text-sm font-medium text-slate-700 mb-3">Costo por Canal</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="canal"
                tick={{ fill: '#64748b', fontSize: 12 }}
                angle={-15}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 12 }}
                label={{ value: 'COP', angle: -90, position: 'insideLeft', style: { fill: '#64748b', fontSize: 12 } }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'costo') return [`$${value.toLocaleString('es-CO')}`, 'Costo'];
                  if (name === 'tiempo') return [`${value}s`, 'Tiempo promedio'];
                  return [value, name];
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '12px' }}
                formatter={(value) => (value === 'costo' ? 'Costo/interacción' : 'Tiempo (seg)')}
              />
              <Bar dataKey="costo" radius={[8, 8, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.canal === 'Vicky' ? '#6366f1' : entry.canal === 'Voz' ? '#64748b' : '#94a3b8'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Footer info */}
        <div className="text-xs text-slate-500 pt-2 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <span>Última actualización: {new Date().toLocaleDateString('es-CO')}</span>
            <span>Datos últimos 30 días</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function channelLabel(ch: string): string {
  const labels: Record<string, string> = {
    voz: 'Voz',
    vicky: 'Vicky',
    whatsapp: 'WhatsApp',
    email: 'Email',
    chat: 'Chat',
  };
  return labels[ch] || ch;
}
