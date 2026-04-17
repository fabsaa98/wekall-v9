import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Users,
  Clock,
  BarChart3,
  AlertCircle,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useClient } from '@/contexts/ClientContext';

// ─── Proxy helper ─────────────────────────────────────────────────────
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
import {
  calcularForecast,
  calcularDimensionamientoDia,
  ForecastResult,
  ErlangResult,
} from '@/lib/vickyCalculations';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DimensionamientoRow extends ErlangResult {
  franja: string;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function badgeConfianza(c: ForecastResult['confianza']) {
  if (c === 'alta') return <Badge className="bg-green-100 text-green-800 border-green-200">Alta</Badge>;
  if (c === 'media') return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Media</Badge>;
  return <Badge className="bg-red-100 text-red-800 border-red-200">Baja</Badge>;
}

function slaColor(sla: number) {
  if (sla >= 80) return 'text-green-600 font-semibold';
  if (sla >= 60) return 'text-yellow-600 font-semibold';
  return 'text-red-600 font-semibold';
}

function ocupacionColor(ocu: number) {
  if (ocu <= 75) return 'text-green-600';
  if (ocu <= 85) return 'text-yellow-600';
  return 'text-red-600 font-semibold';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ForecastView() {
  const navigate = useNavigate();
  const { clientId } = useClient();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [forecast, setForecast] = useState<ForecastResult[]>([]);
  const [mañana, setMañana] = useState<ForecastResult | null>(null);
  const [dimensionamiento, setDimensionamiento] = useState<DimensionamientoRow[]>([]);
  const [ahtSegundos, setAhtSegundos] = useState(180); // fallback 3 min

  useEffect(() => {
    if (!clientId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  async function load() {
    try {
      setLoading(true);
      setError(null);

      // Fecha límite: últimos 90 días para diario, 30 días para horario
      const hace90 = new Date();
      hace90.setDate(hace90.getDate() - 90);
      const hace30 = new Date();
      hace30.setDate(hace30.getDate() - 30);
      const fmt = (d: Date) => d.toISOString().split('T')[0];

      // Usar proxy (service role) para evitar bloqueo RLS
      const [daily, hourly, perfArr, configArr] = await Promise.all([
        proxyQuery<Array<{ fecha: string; total_llamadas: number }>>({ table: 'cdr_daily_metrics', select: 'fecha,total_llamadas', filters: { 'client_id': `eq.${clientId}`, 'fecha': `gte.${fmt(hace90)}` }, order: 'fecha.asc', limit: 10000 }),
        proxyQuery<Array<{ fecha: string; hora: number; total_llamadas: number }>>({ table: 'cdr_hourly_metrics', select: 'fecha,hora,total_llamadas', filters: { 'fecha': `gte.${fmt(hace30)}` }, order: 'fecha.asc', limit: 10000 }),
        proxyQuery<Array<{ aht_segundos: number }>>({ table: 'agents_performance', select: 'aht_segundos', filters: { 'client_id': `eq.${clientId}` }, limit: 1 }),
        proxyQuery<Array<{ agentes_activos: number; costo_agente_mes: number }>>({ table: 'client_config', select: 'agentes_activos,costo_agente_mes', filters: { 'client_id': `eq.${clientId}` }, limit: 1 }),
      ]);

      const perf = perfArr?.[0] ?? null;
      const config = configArr?.[0] ?? null;

      // AHT real si está disponible
      if (perf?.aht_segundos && perf.aht_segundos > 0) {
        setAhtSegundos(perf.aht_segundos);
      }
      console.log('[ForecastView] config', config, 'aht', perf?.aht_segundos);

      const historicoRaw = (daily ?? []) as Array<{ fecha: string; total_llamadas: number }>;
      const horarioRaw = (hourly ?? []) as Array<{ fecha: string; hora: number; total_llamadas: number }>;

      if (!historicoRaw.length) {
        setError('Sin datos históricos. Verifique que cdr_daily_metrics tenga registros para este cliente.');
        setLoading(false);
        return;
      }

      // Calcular forecast 5 días
      const fcast = calcularForecast(historicoRaw, horarioRaw, 5);
      setForecast(fcast);

      // Dimensionamiento para mañana (primer día del forecast)
      if (fcast.length > 0) {
        const aht = perf?.aht_segundos && perf.aht_segundos > 0 ? perf.aht_segundos : 180;
        setAhtSegundos(aht);
        setMañana(fcast[0]);
        const dim = calcularDimensionamientoDia(fcast[0], aht, 0.80);
        setDimensionamiento(dim);
      }
    } catch (e: unknown) {
      setError(`Error cargando datos: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  function preguntarVicky() {
    if (!mañana) return;
    const pregunta = `¿Cuántos agentes necesito mañana (${mañana.diaSemana} ${mañana.fecha})? El forecast indica ${mañana.voluménEsperado.toLocaleString()} llamadas esperadas con AHT de ${ahtSegundos} segundos.`;
    navigate(`/vicky?q=${encodeURIComponent(pregunta)}`);
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-muted-foreground">
        <Loader2 className="animate-spin h-5 w-5" />
        Calculando forecast…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-6 text-red-600 bg-red-50 rounded-lg mx-4 mt-6">
        <AlertCircle className="h-5 w-5 flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  const totalAgentesManana = dimensionamiento.length
    ? Math.max(...dimensionamiento.map(d => d.agentesRequeridos))
    : 0;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-blue-600" />
            Forecast & Dimensionamiento
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Proyección de volumen (822 días CDR) + Erlang C por hora
          </p>
        </div>
        <Button
          onClick={preguntarVicky}
          disabled={!mañana}
          className="gap-2"
        >
          <span>Preguntar a Vicky</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* KPI cards — mañana */}
      {mañana && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Día</p>
              <p className="text-lg font-bold">{mañana.diaSemana}</p>
              <p className="text-xs text-muted-foreground">{mañana.fecha}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Llamadas esperadas</p>
              <p className="text-2xl font-bold text-blue-600">{mañana.voluménEsperado.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">
                rango {mañana.rangoMin.toLocaleString()} – {mañana.rangoMax.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Agentes pico</p>
              <p className="text-2xl font-bold text-purple-600">{totalAgentesManana}</p>
              <p className="text-xs text-muted-foreground">hora pico · SLA 80%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Confianza forecast</p>
              <div className="mt-1">{badgeConfianza(mañana.confianza)}</div>
              <p className="text-xs text-muted-foreground mt-1">AHT {ahtSegundos}s</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Forecast 5 días */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-600" />
            Forecast próximos 5 días
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 pr-4">Fecha</th>
                  <th className="text-left py-2 pr-4">Día</th>
                  <th className="text-right py-2 pr-4">Llamadas</th>
                  <th className="text-right py-2 pr-4">Mín</th>
                  <th className="text-right py-2 pr-4">Máx</th>
                  <th className="text-center py-2">Confianza</th>
                </tr>
              </thead>
              <tbody>
                {forecast.map((f, i) => (
                  <tr key={f.fecha} className={`border-b last:border-0 ${i === 0 ? 'bg-blue-50' : ''}`}>
                    <td className="py-2 pr-4 font-mono text-xs">{f.fecha}</td>
                    <td className="py-2 pr-4 font-medium">{f.diaSemana}</td>
                    <td className="py-2 pr-4 text-right font-bold">{f.voluménEsperado.toLocaleString()}</td>
                    <td className="py-2 pr-4 text-right text-muted-foreground">{f.rangoMin.toLocaleString()}</td>
                    <td className="py-2 pr-4 text-right text-muted-foreground">{f.rangoMax.toLocaleString()}</td>
                    <td className="py-2 text-center">{badgeConfianza(f.confianza)}</td>
                  </tr>
                ))}
                {forecast.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      Sin datos suficientes para calcular forecast
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Dimensionamiento por hora — mañana */}
      {dimensionamiento.length > 0 && mañana && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-600" />
              Dimensionamiento Erlang C — {mañana.diaSemana} {mañana.fecha}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              SLA objetivo: 80% en ≤20s · AHT: {ahtSegundos}s
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 pr-4 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Franja
                    </th>
                    <th className="text-right py-2 pr-4">Llamadas</th>
                    <th className="text-right py-2 pr-4">Agentes</th>
                    <th className="text-right py-2 pr-4">Tráfico (Erl)</th>
                    <th className="text-right py-2 pr-4">Ocupación</th>
                    <th className="text-right py-2">SLA</th>
                  </tr>
                </thead>
                <tbody>
                  {dimensionamiento.map(row => (
                    <tr key={row.franja} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2 pr-4 font-mono text-xs">{row.franja}</td>
                      <td className="py-2 pr-4 text-right">{row.llamadasEsperadas}</td>
                      <td className="py-2 pr-4 text-right font-bold text-purple-700">{row.agentesRequeridos}</td>
                      <td className="py-2 pr-4 text-right text-muted-foreground">{row.traficoErlang}</td>
                      <td className={`py-2 pr-4 text-right ${ocupacionColor(row.ocupacion)}`}>
                        {row.ocupacion}%
                      </td>
                      <td className={`py-2 text-right ${slaColor(row.nivelServicio)}`}>
                        {row.nivelServicio}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-3 bg-purple-50 rounded-lg text-sm text-purple-800">
              <strong>Resumen:</strong> Se requieren hasta <strong>{totalAgentesManana} agentes</strong> en hora pico
              para atender {mañana.voluménEsperado.toLocaleString()} llamadas esperadas con SLA ≥80%.{' '}
              <button
                onClick={preguntarVicky}
                className="underline hover:text-purple-600 cursor-pointer"
              >
                Preguntarle a Vicky →
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
