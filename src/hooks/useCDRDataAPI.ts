/**
 * Hook que consume /api/cdr/* en vez de Supabase directo
 * Drop-in replacement para useCDRData.ts
 */
import { useState, useEffect } from 'react';
import { useClient } from '@/contexts/ClientContext';

export interface CDRDayMetric {
  fecha: string;
  total_llamadas: number;
  llamadas_entrantes: number;
  llamadas_salientes: number;
  contactos_efectivos: number;
  promesas_pago: number;
  duracion_promedio_seg: number;
  tasa_contacto_pct: number;
  tasa_promesa_pct: number;
  csat_promedio: number | null;
}

export interface AnomalyResult {
  detected: boolean;
  direction: 'up' | 'down' | 'none';
  magnitude: number;
  zScore: number;
  promedio30d: number;
  stdDev30d: number;
  metrica: 'tasa_contacto_pct';
  valorHoy: number;
}

export interface ForecastPoint {
  fecha: string;
  predicted_llamadas: number;
  predicted_tasa: number;
  confidence_low: number;
  confidence_high: number;
}

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
  deltaTasa: number;
  anomaly: AnomalyResult | null;
  forecast: ForecastPoint[];
}

// ─── Stats helpers ────────────────────────────────────────────────────────────

function calcMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function calcStdDev(values: number[], mean: number): number {
  if (values.length < 2) return 0;
  const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

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
  const detected = Math.abs(zScore) > 1.5;

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

function generateForecast(last30Days: CDRDayMetric[]): ForecastPoint[] {
  // Simplified forecast — retorna array vacío por ahora
  // TODO: implementar lógica completa si es necesario
  return [];
}

// ─── Hook principal ───────────────────────────────────────────────────────────

function normalizeClientId(clientId: string): string {
  const mapping: Record<string, string> = {
    'credismart': 'crediminuto',
    'credi': 'crediminuto',
  };
  return mapping[clientId.toLowerCase()] || clientId;
}

export function useCDRDataAPI(): CDRState {
  const { clientId: rawClientId } = useClient();
  const clientId = normalizeClientId(rawClientId);

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
        const metricsRes = await fetch(`/api/cdr/daily-aggregated?client_id=${clientId}&days=60`);
        
        if (!metricsRes.ok) {
          throw new Error('Error cargando datos del API');
        }

        const last30Days: CDRDayMetric[] = await metricsRes.json();
        const latestDay: CDRDayMetric | null = last30Days.length > 0 ? last30Days[last30Days.length - 1] : null;



        const last7 = last30Days.slice(-7);
        const promedio7d = last7.length > 0 
          ? last7.reduce((s, d) => s + d.tasa_contacto_pct, 0) / last7.length 
          : 0;
        const promedio30d = last30Days.length > 0 
          ? last30Days.reduce((s, d) => s + d.tasa_contacto_pct, 0) / last30Days.length 
          : 0;

        const anomaly = detectAnomaly(last30Days, latestDay);
        const forecast = generateForecast(last30Days);

        setState({
          loading: false,
          error: null,
          latestDay,
          last30Days,
          last7Days: last7,
          sparklineTasa: last30Days.map(d => d.tasa_contacto_pct),
          sparklineVolumen: last30Days.map(d => d.total_llamadas),
          promedio7dTasa: Math.round(promedio7d * 10) / 10,
          promedio30dTasa: Math.round(promedio30d * 10) / 10,
          deltaTasa: latestDay ? Math.round((latestDay.tasa_contacto_pct - promedio7d) * 10) / 10 : 0,
          anomaly,
          forecast,
        });
      } catch (err: unknown) {
        setState(s => ({
          ...s,
          loading: false,
          error: err instanceof Error ? err.message : 'Error cargando datos',
        }));
      }
    }
    load();
  }, [clientId]);

  return state;
}
