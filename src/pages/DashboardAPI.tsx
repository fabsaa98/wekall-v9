/**
 * Dashboard que usa SOLO el API backend (Pages Functions)
 * Sin dependencia de Supabase directo — arquitectura world-class
 */
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useClient } from '@/contexts/ClientContext';

export function DashboardAPI() {
  const { clientId } = useClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', 'kpis', clientId],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/kpis?client_id=${clientId}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      return res.json();
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-red-900 font-semibold mb-2">Error cargando datos</h2>
          <p className="text-red-700 text-sm">{error instanceof Error ? error.message : 'Error desconocido'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard WeIntelligence</h1>
        <p className="text-gray-600">Cliente: {clientId}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* CSAT */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="text-sm font-medium text-gray-600 mb-2">CSAT</div>
          <div className="text-3xl font-bold text-purple-600">
            {data?.csat !== null && data?.csat !== undefined ? data.csat.toFixed(2) : '—'}
          </div>
          <div className="text-xs text-gray-500 mt-1">Satisfacción del cliente</div>
        </div>

        {/* FCR */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="text-sm font-medium text-gray-600 mb-2">FCR</div>
          <div className="text-3xl font-bold text-green-600">
            {data?.fcr !== null && data?.fcr !== undefined ? `${data.fcr.toFixed(1)}%` : '—'}
          </div>
          <div className="text-xs text-gray-500 mt-1">Primera llamada resolutiva</div>
        </div>

        {/* Escalaciones */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="text-sm font-medium text-gray-600 mb-2">Escalaciones</div>
          <div className="text-3xl font-bold text-orange-600">
            {data?.escalaciones !== null && data?.escalaciones !== undefined ? `${data.escalaciones.toFixed(1)}%` : '—'}
          </div>
          <div className="text-xs text-gray-500 mt-1">Tasa de escalamiento</div>
        </div>

        {/* Conversión */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="text-sm font-medium text-gray-600 mb-2">Conversión</div>
          <div className="text-3xl font-bold text-blue-600">
            {data?.tasa_conversion !== null && data?.tasa_conversion !== undefined ? `${data.tasa_conversion.toFixed(1)}%` : '—'}
          </div>
          <div className="text-xs text-gray-500 mt-1">Tasa de conversión</div>
        </div>
      </div>

      {/* Métricas financieras (cuando estén disponibles) */}
      {(data?.recaudo_hoy !== null || data?.recaudo_mtd !== null) && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="text-sm font-medium text-gray-600 mb-2">Recaudo HOY</div>
            <div className="text-2xl font-bold text-purple-600">
              {data.recaudo_hoy !== null ? `$${(data.recaudo_hoy / 1_000_000).toFixed(1)}M` : '—'}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="text-sm font-medium text-gray-600 mb-2">Recaudo MTD</div>
            <div className="text-2xl font-bold text-green-600">
              {data.recaudo_mtd !== null ? `$${(data.recaudo_mtd / 1_000_000).toFixed(1)}M` : '—'}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="text-sm font-medium text-gray-600 mb-2">Cambio MoM</div>
            <div className={`text-2xl font-bold ${data.mom_change && data.mom_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {data.mom_change !== null ? `${data.mom_change > 0 ? '+' : ''}${data.mom_change.toFixed(1)}%` : '—'}
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 text-xs text-gray-500">
        Última actualización: {data?.last_updated ? new Date(data.last_updated).toLocaleString('es-CO') : '—'}
      </div>
    </div>
  );
}
