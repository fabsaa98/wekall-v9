/**
 * useChannelCosts — Hook para costos operativos por canal
 * Scale-A P2: Costo por Canal (Vicky IA vs Agente Humano)
 * 12 mayo 2026
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface ChannelCost {
  channel: string;
  costo: number;
  tiempo_seg: number;
}

export interface ChannelCostComparison {
  costo_humano: number;
  costo_vicky: number;
  ahorro_pct: number;
  volumen_vicky: number;
  volumen_humano: number;
  canales: ChannelCost[];
}

export function useChannelCosts(clientId: string) {
  const [data, setData] = useState<ChannelCostComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    async function fetchChannelCosts() {
      try {
        setLoading(true);
        setError(null);

        const { data: result, error: rpcError } = await supabase
          .rpc('get_channel_cost_comparison', { p_client_id: clientId });

        if (rpcError) {
          throw new Error(`Error RPC: ${rpcError.message}`);
        }

        setData(result as ChannelCostComparison);
      } catch (err) {
        console.error('[useChannelCosts] Error:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    fetchChannelCosts();
  }, [clientId]);

  return { data, loading, error };
}
