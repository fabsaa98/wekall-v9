/**
 * useForecastRevenue — Hook para proyección de recaudo
 * Scale-A P5: Forecast Revenue (regresión lineal + ajustes estacionales)
 * 13 mayo 2026
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface ForecastDataPoint {
  fecha: string;
  proyeccion_cop: number;
  intervalo_min: number;
  intervalo_max: number;
  confianza: 'alta' | 'media' | 'baja';
}

export function useForecastRevenue(clientId: string, horizonDias: number = 30) {
  const [data, setData] = useState<ForecastDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    async function fetchForecast() {
      try {
        setLoading(true);
        setError(null);

        const { data: result, error: rpcError } = await supabase
          .rpc('forecast_revenue', { 
            p_client_id: clientId,
            p_horizon_dias: horizonDias 
          });

        if (rpcError) {
          throw new Error(`Error RPC: ${rpcError.message}`);
        }

        setData((result || []) as ForecastDataPoint[]);
      } catch (err) {
        console.error('[useForecastRevenue] Error:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
        setData([]);
      } finally {
        setLoading(false);
      }
    }

    fetchForecast();
  }, [clientId, horizonDias]);

  return { data, loading, error };
}
