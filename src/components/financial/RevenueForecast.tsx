/**
 * RevenueForecast — P5 Scale-A Financial Intelligence
 * Proyección de recaudo omnicanal con regresión lineal + estacionalidad
 * 12 mayo 2026
 */
import { useEffect, useState } from 'react';
import { TrendingUp, Calendar, AlertCircle, Loader2, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  ComposedChart,
} from 'recharts';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ForecastRow {
  fecha: string;
  proyeccion_cop: number;
  intervalo_min: number;
  intervalo_max: number;
  confianza: 'alta' | 'media' | 'baja';
}

interface AccuracyRow {
  periodo: string;
  real_cop: number;
  forecast_cop: number;
  error_pct: number;
}

interface RevenueForecastProps {
  clientId: string;
  horizonDays?: number;
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

export function RevenueForecast({ clientId, horizonDays = 30 }: RevenueForecastProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forecast, setForecast] = useState<ForecastRow[]>([]);
  const [accuracy, setAccuracy] = useState<AccuracyRow[]>([]);

  useEffect(() => {
    if (!clientId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, horizonDays]);

  async function load() {
    try {
      setLoading(true);
      setError(null);

      const [forecastData, accuracyData] = await Promise.all([
        proxyRPC<ForecastRow[]>('forecast_revenue', {
          p_client_id: clientId,
          p_horizon_dias: horizonDays,
        }),
        proxyRPC<AccuracyRow[]>('forecast_accuracy_check', {
          p_client_id: clientId,
        }),
      ]);

      setForecast(forecastData || []);
      setAccuracy(accuracyData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando forecast');
      console.error('RevenueForecast error:', err);
    } finally {
      setLoading(false);
    }
  }

  // ─── Calcular estadísticas de precisión ────────────────────────────────────

  const avgError = accuracy.length > 0
    ? accuracy.reduce((sum, r) => sum + r.error_pct, 0) / accuracy.length
    : 0;

  const accuracyQuality = avgError <= 15 ? 'alta' : avgError <= 25 ? 'media' : 'baja';

  // ─── Formatear datos para gráfico ───────────────────────────────────────────

  const chartData = forecast.map((f) => ({
    fecha: new Date(f.fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }),
    fechaFull: f.fecha,
    proyeccion: Math.round(f.proyeccion_cop),
    min: Math.round(f.intervalo_min),
    max: Math.round(f.intervalo_max),
    confianza: f.confianza,
  }));

  // ─── Render ────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-700">
            <TrendingUp className="h-5 w-5" />
            Forecast de Recaudo
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
            <AlertCircle className="h-5 w-5" />
            Forecast de Recaudo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (forecast.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-yellow-50 to-white border-yellow-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-700">
            <Info className="h-5 w-5" />
            Forecast de Recaudo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-yellow-700">
            Sin datos suficientes para generar forecast. Se requieren al menos 30 días de historial.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-slate-700">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            Forecast de Recaudo — Próximos {horizonDays} Días
          </div>
          <Badge className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white border-0 px-3 py-1">
            <Calendar className="h-3 w-3 mr-1 inline" />
            ESTIMADO
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Precisión del modelo */}
        {accuracy.length > 0 && (
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-slate-500" />
                <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                  Precisión del Modelo (últimos 30 días)
                </span>
              </div>
              <Badge
                className={
                  accuracyQuality === 'alta'
                    ? 'bg-green-100 text-green-800 border-green-200'
                    : accuracyQuality === 'media'
                    ? 'bg-orange-100 text-orange-800 border-orange-200'
                    : 'bg-red-100 text-red-800 border-red-200'
                }
              >
                {accuracyQuality === 'alta' ? 'Alta' : accuracyQuality === 'media' ? 'Media' : 'Baja'}
              </Badge>
            </div>
            <div className="text-2xl font-bold text-slate-800">
              ±{avgError.toFixed(1)}% error promedio
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Comparando proyección vs recaudo real
            </div>
          </div>
        )}

        {/* Próximos 7 días destacados */}
        <div>
          <div className="text-sm font-medium text-slate-700 mb-3">Proyección próximos 7 días</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {forecast.slice(0, 7).map((f, idx) => (
              <div
                key={f.fecha}
                className={`rounded-lg p-3 border ${
                  f.confianza === 'alta'
                    ? 'bg-green-50 border-green-200'
                    : f.confianza === 'media'
                    ? 'bg-orange-50 border-orange-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="text-xs text-slate-600 mb-1">
                  {new Date(f.fecha).toLocaleDateString('es-CO', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                </div>
                <div className="text-lg font-bold text-slate-800">
                  ${(f.proyeccion_cop / 1_000_000).toFixed(1)}M
                </div>
                <div className="text-xs text-slate-500">
                  {confianzaLabel(f.confianza)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gráfico de proyección */}
        <div className="pt-4">
          <div className="text-sm font-medium text-slate-700 mb-3">
            Proyección con Intervalo de Confianza
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <defs>
                <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="fecha"
                tick={{ fill: '#64748b', fontSize: 11 }}
                angle={-15}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickFormatter={(v) => `$${(v / 1_000_000).toFixed(1)}M`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                }}
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = {
                    proyeccion: 'Proyección',
                    min: 'Mínimo',
                    max: 'Máximo',
                  };
                  return [`COP $${value.toLocaleString('es-CO')}`, labels[name] || name];
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '12px' }}
                formatter={(value) => {
                  const labels: Record<string, string> = {
                    proyeccion: 'Proyección',
                    min: 'Intervalo Mín.',
                    max: 'Intervalo Máx.',
                  };
                  return labels[value] || value;
                }}
              />
              {/* Área de confianza */}
              <Area
                type="monotone"
                dataKey="max"
                stroke="transparent"
                fill="url(#confidenceGradient)"
                fillOpacity={1}
              />
              <Area
                type="monotone"
                dataKey="min"
                stroke="transparent"
                fill="#fff"
                fillOpacity={1}
              />
              {/* Línea de proyección */}
              <Line
                type="monotone"
                dataKey="proyeccion"
                stroke="#8b5cf6"
                strokeWidth={3}
                dot={{ fill: '#8b5cf6', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Footer info */}
        <div className="text-xs text-slate-500 pt-2 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <span>Algoritmo: Regresión lineal + ajustes estacionales</span>
            <span>Actualizado: {new Date().toLocaleDateString('es-CO')}</span>
          </div>
          <div className="mt-1 text-slate-400">
            Factores: tendencia histórica (90d) + fin de semana (-35%) + fin de mes (+15%)
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function confianzaLabel(c: 'alta' | 'media' | 'baja'): string {
  const labels = {
    alta: 'Confianza alta',
    media: 'Confianza media',
    baja: 'Confianza baja',
  };
  return labels[c];
}
