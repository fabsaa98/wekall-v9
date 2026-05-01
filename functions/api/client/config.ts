/**
 * GET /api/client/config?client_id=credismart
 * 
 * Retorna configuración del cliente desde client_config
 * Aplica mapping: credismart → crediminuto
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

export async function onRequestGet(context: { request: Request; env: Env }) {
  const { request, env } = context;
  const url = new URL(request.url);
  const rawClientId = url.searchParams.get('client_id') || 'credismart';
  const client_id = normalizeClientId(rawClientId);

  const WORKER_PROXY_URL = env.WORKER_PROXY_URL || 'https://wekall-vicky-proxy.fabsaa98.workers.dev';

  try {
    // Get all configs and filter client-side (Worker proxy filter bug workaround)
    const res = await fetch(`${WORKER_PROXY_URL}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'client_config',
        select: '*',
        limit: 20,
      }),
    });

    if (!res.ok) {
      throw new Error(`Worker query failed: ${res.status}`);
    }

    const allConfigs = await res.json();
    const config = allConfigs.find((c: any) => c.client_id === client_id) || null;

    if (!config) {
      // Return default config if not found
      return new Response(
        JSON.stringify({
          client_id,
          client_name: client_id,
          industry: 'general',
          business_type: 'service_support',
          country: 'colombia',
          currency: 'COP',
          timezone: 'America/Bogota',
          active: true,
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=3600', // 1 hour cache
          },
        }
      );
    }

    return new Response(JSON.stringify(config), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('[client/config] Error:', error);
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
