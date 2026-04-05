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

const ANOMALY_THRESHOLD = 1.5; // desviaciones estándar

function detectAnomaly(last30: CDRDayMetric[], latestDay: CDRDayMetric | null): AnomalyResult | null {
  if (!latestDay || last30.length < 7) return null;

  // Usar los días históricos (excluir el último día para el cálculo de referencia)
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
  });

  useEffect(() => {
    async function load() {
      try {
        const [last30, lastDay] = await Promise.all([
          getLastNDays(30, clientId),
          getLatestDay(clientId)
        ]);

        const last7 = last30.slice(-7);
        const promedio7d = last7.length > 0 ? last7.reduce((s, d) => s + d.tasa_contacto_pct, 0) / last7.length : 0;
        const promedio30d = last30.length > 0 ? last30.reduce((s, d) => s + d.tasa_contacto_pct, 0) / last30.length : 0;

        // Detectar anomalía en tasa de contacto
        const anomaly = detectAnomaly(last30, lastDay);

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
        });
      } catch (err: unknown) {
        setState(s => ({ ...s, loading: false, error: err instanceof Error ? err.message : 'Error cargando datos' }));
      }
    }
    load();
  }, [clientId]);

  return state;
}
