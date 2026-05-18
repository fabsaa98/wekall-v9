/**
 * GET /api/cdr/latest
 * Día más reciente de métricas CDR para el tenant del JWT.
 */

import { withAuth } from '../../lib/handler';
import { jsonResponse, withRetry } from '../../lib/http';
import { log } from '../../lib/logger';

export const onRequestGet = withAuth(async ({ request, env, auth, requestId }) => {
  const WORKER_PROXY_URL = env.WORKER_PROXY_URL || 'https://wekall-vicky-proxy.fabsaa98.workers.dev';
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
          table: 'agents_performance',
          select: 'fecha,llamadas_total,contactos,promesas,tasa_contacto,tasa_promesa,csat,fcr,aht_segundos',
          filters: { client_id: `eq.${auth.client_id}` },
          order: 'fecha.desc',
          limit: 1,
        }),
      });
      if (!res.ok) throw new Error(`Worker query failed: ${res.status}`);
      return res.json();
    })) as Array<Record<string, number | string | null>>;
    const latest = data?.[0] || null;
    return jsonResponse(latest, { headers: { 'Cache-Control': 'private, max-age=300' } });
  } catch (error) {
    log.error('cdr_latest_error', {
      request_id: requestId,
      client_id: auth.client_id,
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse({ error: 'Error obteniendo CDR latest', request_id: requestId }, { status: 500 });
  }
});
