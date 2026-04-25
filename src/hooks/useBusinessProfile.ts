/**
 * useBusinessProfile - Scale-A
 * Hook para obtener el perfil de negocio del cliente actual
 * Permite métricas dinámicas según vertical (collections/service/sales/retention)
 */
import { useQuery } from '@tanstack/react-query';
import { useClient } from '@/contexts/ClientContext';

const PROXY = (import.meta.env.VITE_PROXY_URL || 'https://wekall-vicky-proxy.fabsaa98.workers.dev').replace(/\/$/, '');

interface BusinessProfile {
  business_type: string;
  display_name: string;
  primary_kpis: string[];
  secondary_kpis: string[];
  success_metrics: {
    primary_metric: string;
    primary_label: string;
    conversion_metric: string;
    conversion_label: string;
  };
}

interface ClientConfig {
  client_id: string;
  business_type: string;
}

export function useBusinessProfile() {
  const { clientId } = useClient();

  return useQuery({
    queryKey: ['businessProfile', clientId],
    queryFn: async () => {
      // 1. Obtener business_type del cliente
      const configResp = await fetch(`${PROXY}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'client_config',
          select: 'business_type',
          client_id: clientId,
          limit: '1',
        }),
      });

      if (!configResp.ok) throw new Error('Error fetching client config');
      
      const configs = await configResp.json() as ClientConfig[];
      const businessType = configs[0]?.business_type || 'collections';

      // 2. Obtener perfil de negocio
      const profileResp = await fetch(`${PROXY}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'business_profiles',
          select: '*',
          filters: { business_type: `eq.${businessType}` },
          limit: '1',
        }),
      });

      if (!profileResp.ok) throw new Error('Error fetching business profile');
      
      const profiles = await profileResp.json() as BusinessProfile[];
      
      return profiles[0] || {
        business_type: 'collections',
        display_name: 'Cobranzas',
        primary_kpis: ['rpc_rate', 'ptp_rate', 'recovery_amount'],
        secondary_kpis: ['contact_rate', 'aht'],
        success_metrics: {
          primary_metric: 'recovery_amount',
          primary_label: 'Recaudo',
          conversion_metric: 'ptp_rate',
          conversion_label: 'Tasa Promesa (%)',
        },
      };
    },
    staleTime: 300_000, // 5 minutos
    enabled: !!clientId,
  });
}
