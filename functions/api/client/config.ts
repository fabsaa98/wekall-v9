/**
 * GET /api/client/config
 * Configuración del tenant del JWT.
 */

import { withAuth } from '../../lib/handler';
import { jsonResponse, withRetry } from '../../lib/http';
import { log } from '../../lib/logger';

function normalizeClientId(clientId: string): string {
  const mapping: Record<string, string> = {
    credismart: 'crediminuto',
    credi: 'crediminuto',
  };
  return mapping[clientId.toLowerCase()] || clientId;
}

export const onRequestGet = withAuth(async ({ request, env, auth, requestId }) => {
  const WORKER_PROXY_URL = env.WORKER_PROXY_URL || 'https://wekall-vicky-proxy.fabsaa98.workers.dev';
  const client_id = normalizeClientId(auth.client_id);

  try {
    const data = (await withRetry(async () => {
      const res = await fetch(`${WORKER_PROXY_URL}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-Authorization': request.headers.get('Authorization') || '',
          'X-Client-Id': auth.client_id,
        },
        body: JSON.stringify({
          table: 'client_config',
          select: '*',
          filters: { client_id: `eq.${client_id}` },
          limit: 1,
        }),
      });
      if (!res.ok) throw new Error(`Worker query failed: ${res.status}`);
      return res.json();
    })) as Array<Record<string, unknown>>;

    const config =
      data?.[0] || {
        client_id,
        client_name: client_id,
        industry: 'general',
        business_type: 'service_support',
        country: 'colombia',
        currency: 'COP',
        timezone: 'America/Bogota',
        active: true,
      };

    return jsonResponse(config, { headers: { 'Cache-Control': 'private, max-age=3600' } });
  } catch (error) {
    log.error('client_config_error', {
      request_id: requestId,
      client_id: auth.client_id,
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse({ error: 'Error obteniendo config', request_id: requestId }, { status: 500 });
  }
});
