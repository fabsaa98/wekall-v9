/**
 * GET /api/client/branding?client_id=credismart
 * 
 * Retorna branding del cliente desde client_branding table
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
    // Get all branding and filter client-side (Worker proxy filter bug workaround)
    const res = await fetch(`${WORKER_PROXY_URL}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'client_branding',
        select: '*',
        limit: 20,
      }),
    });

    if (!res.ok) {
      throw new Error(`Worker query failed: ${res.status}`);
    }

    const allBranding = await res.json();
    const branding = allBranding.find((b: any) => b.client_id === client_id) || null;

    if (!branding) {
      return new Response(
        JSON.stringify({
          client_id,
          logo_url: null,
          primary_color: null,
          company_name: client_id,
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=3600',
          },
        }
      );
    }

    return new Response(JSON.stringify(branding), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('[client/branding] Error:', error);
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
