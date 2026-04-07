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

// ─── Generar 7 días de forecast ───────────────────────────────────────────────

function generateForecast(last30Days: CDRDayMetric[]): ForecastPoint[] {
  if (last30Days.length < 7) return [];

  const tasaValues = last30Days.map(d => d.tasa_contacto_pct);
  const volValues = last30Days.map(d => d.total_llamadas);

  const tasaReg = linearRegression(tasaValues);
  const volReg = linearRegression(volValues);

  const meanTasa = calcMean(tasaValues);
  const stdDevTasa = calcStdDev(tasaValues, meanTasa);
  const meanVol = calcMean(volValues);
  const stdDevVol = calcStdDev(volValues, meanVol);

  const n = last30Days.length;

  // Punto de inicio: último día disponible
  let lastFecha = last30Days[n - 1].fecha;
  const forecast: ForecastPoint[] = [];

  for (let i = 0; i < 7; i++) {
    const x = n + i;
    const nextFecha = nextWorkday(lastFecha);

    const rawTasa = tasaReg.slope * x + tasaReg.intercept;
    const rawVol = volReg.slope * x + volReg.intercept;

    // Clamp tasa entre 0 y 100
    const predictedTasa = Math.max(0, Math.min(100, Math.round(rawTasa * 10) / 10));
    const predictedVol = Math.max(0, Math.round(rawVol));

    forecast.push({
      fecha: nextFecha,
      predicted_tasa: predictedTasa,
      predicted_llamadas: predictedVol,
      confidence_low: Math.max(0, Math.round((predictedTasa - stdDevTasa) * 10) / 10),
      confidence_high: Math.min(100, Math.round((predictedTasa + stdDevTasa) * 10) / 10),
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
