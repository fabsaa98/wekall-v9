import { useState, useEffect } from 'react';
import { getLastNDays, getLatestDay, CDRDayMetric } from '@/lib/supabase';

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
}

export function useCDRData(): CDRState {
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
  });

  useEffect(() => {
    async function load() {
      try {
        const [last30, lastDay] = await Promise.all([
          getLastNDays(30),
          getLatestDay()
        ]);

        const last7 = last30.slice(-7);
        const promedio7d = last7.length > 0 ? last7.reduce((s, d) => s + d.tasa_contacto_pct, 0) / last7.length : 0;
        const promedio30d = last30.length > 0 ? last30.reduce((s, d) => s + d.tasa_contacto_pct, 0) / last30.length : 0;

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
        });
      } catch (err: unknown) {
        setState(s => ({ ...s, loading: false, error: err instanceof Error ? err.message : 'Error cargando datos' }));
      }
    }
    load();
  }, []);

  return state;
}
