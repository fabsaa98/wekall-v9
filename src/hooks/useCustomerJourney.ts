/**
 * useCustomerJourney — Hook para timeline de customer journey omnicanal
 * Scale-A P3: Customer Journeys (voz + whatsapp + email + chat)
 * 13 mayo 2026
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface JourneyTouchpoint {
  id: string;
  channel: 'voz' | 'whatsapp' | 'email' | 'chat';
  timestamp: string;
  agent_name: string;
  summary: string;
  resultado: string;
}

export interface CustomerJourney {
  journey_id: string;
  customer_id: string;
  touchpoints: JourneyTouchpoint[];
  inicio: string;
  fin: string;
  resultado: string;
  created_at: string;
}

export function useCustomerJourney(customerId: string, clientId?: string) {
  const [data, setData] = useState<CustomerJourney | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customerId) {
      setLoading(false);
      return;
    }

    async function fetchJourney() {
      try {
        setLoading(true);
        setError(null);

        const { data: result, error: rpcError } = await supabase
          .rpc('get_customer_journey', { 
            p_customer_id: customerId,
            p_client_id: clientId || null
          });

        if (rpcError) {
          throw new Error(`Error RPC: ${rpcError.message}`);
        }

        // La RPC retorna un array, tomamos el primer elemento
        const journey = Array.isArray(result) && result.length > 0 ? result[0] : null;
        setData(journey as CustomerJourney | null);
      } catch (err) {
        console.error('[useCustomerJourney] Error:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    fetchJourney();
  }, [customerId, clientId]);

  return { data, loading, error };
}
