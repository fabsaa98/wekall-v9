import { useState, useEffect } from 'react';
import { getLastNDays, getLatestDay, CDRDayMetric } from '@/lib/supabase';
import { useClient } from '@/contexts/ClientContext';

// ─── Anomalía detectada ───────────────────────────────────────────────────────

export interface AnomalyResult {
  detected: boolean;
  direction: 'up' | 'down' | 'none';
  magnitude: number;    // diferencia absoluta vs promedio 30d
  zScore: number;       // desviaciones estándar sobre la media
  promedio30d: number;
  stdDev30d: number;
  metrica: 'tasa_contacto_pct';
  valorHoy: number;
}

// ─── Forecast ─────────────────────────────────────────────────────────────────

export interface ForecastPoint {
  fecha: string;
  predicted_llamadas: number;
  predicted_tasa: number;
  confidence_low: number;    // -1 stdDev del histórico
  confidence_high: number;   // +1 stdDev del histórico
}

// ─── Estado del hook ──────────────────────────────────────────────────────────

interface CDRState {
  loading: boolean;
  error: string | null;
  latestDay: CDRDayMetric | null;
  last30Days: CDRDayMetric[];
  last7Days: CDRDayMetric[];
  sparklineTasa: number[];
  sparklineVolumen: number[];
  promedio7dTasa: number;
  promedio30dTasa: number;
  deltaTasa: number; // vs promedio 7d
  anomaly: AnomalyResult | null;
  forecast: ForecastPoint[];
}

// ─── Helpers estadísticos ─────────────────────────────────────────────────────

function calcMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function calcStdDev(values: number[], mean: number): number {
  if (values.length < 2) return 0;
  const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

// ─── Regresión lineal ─────────────────────────────────────────────────────────

function linearRegression(values: number[]): { slope: number; intercept: number; r2: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] ?? 0, r2: 0 };

  const xMean = (n - 1) / 2;
  const yMean = calcMean(values);

  let ssXY = 0;
  let ssXX = 0;
  let ssYY = 0;

  for (let i = 0; i < n; i++) {
    const dx = i - xMean;
    const dy = values[i] - yMean;
    ssXY += dx * dy;
    ssXX += dx * dx;
    ssYY += dy * dy;
  }

  const slope = ssXX !== 0 ? ssXY / ssXX : 0;
  const intercept = yMean - slope * xMean;
  const r2 = ssYY !== 0 ? (ssXY * ssXY) / (ssXX * ssYY) : 0;

  return { slope, intercept, r2 };
}

// ─── Generar siguiente día hábil ──────────────────────────────────────────────

function nextWorkday(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  return d.toISOString().split('T')[0];
}

// ─── Exponential Smoothing (ETS simple) ──────────────────────────────────────
// Alpha: peso de los datos recientes. 0.3 = moderado (responde a cambios sin
// ser demasiado reactivo al ruido de un solo día).

function exponentialSmoothing(values: number[], alpha = 0.3): number[] {
  if (values.length === 0) return [];
  const smoothed: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    smoothed.push(alpha * values[i] + (1 - alpha) * smoothed[i - 1]);
  }
  return smoothed;
}

// ─── Generar 7 días de forecast (Exponential Smoothing) ──────────────────────
// Reemplaza la regresión lineal que ignoraba los días más recientes.
// ETS da más peso a los últimos días → si la tasa cae, el forecast lo refleja.

// Detectar días atípicos: volumen < 40% de la mediana → excluir de regresión
// Cubre Semana Santa, feriados, días de corte de sistema
function detectarDiasAtipicos(days: CDRDayMetric[]): boolean[] {
  const vols = days.map(d => d.total_llamadas).sort((a, b) => a - b);
  const mediana = vols[Math.floor(vols.length / 2)];
  const umbralBajo  = mediana * 0.40; // < 40% mediana = día atípico bajo
  const umbralAlto  = mediana * 2.50; // > 250% mediana = día atípico alto (errores)
  return days.map(d => d.total_llamadas < umbralBajo || d.total_llamadas > umbralAlto);
}

function generateForecast(last30Days: CDRDayMetric[]): ForecastPoint[] {
  if (last30Days.length < 7) return [];

  // Filtrar días atípicos para el cálculo de tendencia
  const atipicos = detectarDiasAtipicos(last30Days);
  const diasNormales = last30Days.filter((_, i) => !atipicos[i]);
  // Usar días normales para estadísticas, pero mantener todos para el gráfico histórico
  const datosParaForecast = diasNormales.length >= 7 ? diasNormales : last30Days;

  const tasaValues = datosParaForecast.map(d => d.tasa_contacto_pct);
  const volValues  = datosParaForecast.map(d => d.total_llamadas);

  // Suavizado exponencial — alpha=0.3 para tasa, 0.25 para volumen (más estable)
  const smoothedTasa = exponentialSmoothing(tasaValues, 0.3);
  const smoothedVol = exponentialSmoothing(volValues, 0.25);

  // Último valor suavizado = punto de partida del forecast
  const lastSmoothedTasa = smoothedTasa[smoothedTasa.length - 1];
  const lastSmoothedVol = smoothedVol[smoothedVol.length - 1];

  // Tendencia de corto plazo: pendiente de los últimos 7 días suavizados
  const recentTasa = smoothedTasa.slice(-7);
  const recentVol = smoothedVol.slice(-7);
  const tasaTrend = recentTasa.length >= 2
    ? (recentTasa[recentTasa.length - 1] - recentTasa[0]) / (recentTasa.length - 1)
    : 0;
  const volTrend = recentVol.length >= 2
    ? (recentVol[recentVol.length - 1] - recentVol[0]) / (recentVol.length - 1)
    : 0;

  // Banda de confianza: desviación estándar de los últimos 14 días
  const recent14Tasa = tasaValues.slice(-14);
  const meanRecent = calcMean(recent14Tasa);
  const stdDevRecent = calcStdDev(recent14Tasa, meanRecent);

  const n = last30Days.length;
  let lastFecha = last30Days[n - 1].fecha;
  const forecast: ForecastPoint[] = [];

  for (let i = 0; i < 7; i++) {
    const nextFecha = nextWorkday(lastFecha);

    // Proyección: valor suavizado + tendencia de corto plazo
    // Tendencia se atenúa con el tiempo (factor 0.85^i) para evitar extrapolación extrema
    const dampFactor = Math.pow(0.85, i);
    const rawTasa = lastSmoothedTasa + tasaTrend * (i + 1) * dampFactor;
    const rawVol = lastSmoothedVol + volTrend * (i + 1) * dampFactor;

    const predictedTasa = Math.max(0, Math.min(100, Math.round(rawTasa * 10) / 10));
    const predictedVol = Math.max(0, Math.round(rawVol));

    // Banda de confianza se amplía con la distancia (incertidumbre crece)
    const uncertainty = stdDevRecent * (1 + i * 0.1);
    forecast.push({
      fecha: nextFecha,
      predicted_tasa: predictedTasa,
      predicted_llamadas: predictedVol,
      confidence_low: Math.max(0, Math.round((predictedTasa - uncertainty) * 10) / 10),
      confidence_high: Math.min(100, Math.round((predictedTasa + uncertainty) * 10) / 10),
    });

    lastFecha = nextFecha;
  }

  return forecast;
}

// ─── Anomaly detection ────────────────────────────────────────────────────────

const ANOMALY_THRESHOLD = 1.5;

function detectAnomaly(last30: CDRDayMetric[], latestDay: CDRDayMetric | null): AnomalyResult | null {
  if (!latestDay || last30.length < 7) return null;

  const historical = last30.filter(d => d.fecha !== latestDay.fecha);
  if (historical.length < 5) return null;

  const values = historical.map(d => d.tasa_contacto_pct);
  const mean = calcMean(values);
  const stdDev = calcStdDev(values, mean);

  if (stdDev === 0) return null;

  const valorHoy = latestDay.tasa_contacto_pct;
  const diff = valorHoy - mean;
  const zScore = diff / stdDev;

  const detected = Math.abs(zScore) > ANOMALY_THRESHOLD;

  return {
    detected,
    direction: detected ? (diff > 0 ? 'up' : 'down') : 'none',
    magnitude: Math.round(Math.abs(diff) * 10) / 10,
    zScore: Math.round(zScore * 100) / 100,
    promedio30d: Math.round(mean * 10) / 10,
    stdDev30d: Math.round(stdDev * 10) / 10,
    metrica: 'tasa_contacto_pct',
    valorHoy,
  };
}

// ─── Hook principal ───────────────────────────────────────────────────────────

export function useCDRData(): CDRState {
  const { clientId } = useClient();

  const [state, setState] = useState<CDRState>({
    loading: true,
    error: null,
    latestDay: null,
    last30Days: [],
    last7Days: [],
    sparklineTasa: [],
    sparklineVolumen: [],
    promedio7dTasa: 0,
    promedio30dTasa: 0,
    deltaTasa: 0,
    anomaly: null,
    forecast: [],
  });

  useEffect(() => {
    async function load() {
      try {
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Tiempo de espera agotado. Verifica tu conexión.')), 12000)
        );

        const [last30, lastDay] = await Promise.race([
          Promise.all([getLastNDays(30, clientId), getLatestDay(clientId)]),
          timeout,
        ]) as [Awaited<ReturnType<typeof getLastNDays>>, Awaited<ReturnType<typeof getLatestDay>>];

        const last7 = last30.slice(-7);
        const promedio7d = last7.length > 0 ? last7.reduce((s, d) => s + d.tasa_contacto_pct, 0) / last7.length : 0;
        const promedio30d = last30.length > 0 ? last30.reduce((s, d) => s + d.tasa_contacto_pct, 0) / last30.length : 0;

        const anomaly = detectAnomaly(last30, lastDay);
        const forecast = generateForecast(last30);

        setState({
          loading: false,
          error: null,
          latestDay: lastDay,
          last30Days: last30,
          last7Days: last7,
          sparklineTasa: last30.map(d => d.tasa_contacto_pct),
          sparklineVolumen: last30.map(d => d.total_llamadas),
          promedio7dTasa: Math.round(promedio7d * 10) / 10,
          promedio30dTasa: Math.round(promedio30d * 10) / 10,
          deltaTasa: lastDay ? Math.round((lastDay.tasa_contacto_pct - promedio7d) * 10) / 10 : 0,
          anomaly,
          forecast,
        });
      } catch (err: unknown) {
        setState(s => ({ ...s, loading: false, error: err instanceof Error ? err.message : 'Error cargando datos' }));
      }
    }
    load();
  }, [clientId]);

  return state;
}
