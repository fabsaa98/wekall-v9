/**
 * GET /api/cdr/daily-aggregated?client_id=credismart&days=30
 * 
 * Retorna métricas diarias desde cdr_daily_metrics
 * Incluye RPC/PTP para clientes de cobranza
 */

interface Env {
  WORKER_PROXY_URL?: string;
}

function normalizeClientId(clientId: string): string {
  const mapping: Record<string, string> = {
    'credismart': 'crediminuto',
    'credi': 'crediminuto',
  };
  return mapping[clientId.toLowerCase()] || clientId;
}

interface CDRDailyMetric {
  fecha: string;
  total_llamadas: number;
  contactos_efectivos: number;
  tasa_contacto_pct: number;
  rpc_contactos: number | null;
  rpc_rate_pct: number | null;
  ptp_contactos: number | null;
  ptp_rate_pct: number | null;
  aht_minutos: number | null;
}

export async function onRequestGet(context: { request: Request; env: Env }) {
  const { request, env } = context;
  const url = new URL(request.url);
  const rawClientId = url.searchParams.get('client_id') || 'credismart';
  const client_id = normalizeClientId(rawClientId);
  const days = parseInt(url.searchParams.get('days') || '30', 10);

  const WORKER_PROXY_URL = env.WORKER_PROXY_URL || 'https://wekall-vicky-proxy.fabsaa98.workers.dev';

  try {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    // Get cdr_daily_metrics
    const res = await fetch(`${WORKER_PROXY_URL}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'cdr_daily_metrics',
        select: '*',
        limit: 1000,
      }),
    });

    if (!res.ok) {
      throw new Error(`Worker query failed: ${res.status}`);
    }

    const allMetrics: CDRDailyMetric[] = await res.json();
    
    // Filter client-side (Worker proxy bug workaround) + date range
    const filtered = allMetrics.filter(m => 
      m.client_id === client_id && 
      m.fecha >= startDateStr
    );

    // Sort by date ascending
    const sorted = filtered.sort((a, b) => a.fecha.localeCompare(b.fecha));

    return new Response(JSON.stringify(sorted), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error) {
    console.error('[cdr/daily-aggregated] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
