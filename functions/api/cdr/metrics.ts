/**
 * GET /api/cdr/metrics?days=30
 * Métricas CDR diarias del tenant del JWT (últimos N días).
 */

import { withAuth } from '../../lib/handler';
import { jsonResponse, withRetry } from '../../lib/http';
import { log } from '../../lib/logger';

export const onRequestGet = withAuth(async ({ request, env, auth, requestId }) => {
  const WORKER_PROXY_URL = env.WORKER_PROXY_URL || 'https://wekall-vicky-proxy.fabsaa98.workers.dev';
  const url = new URL(request.url);
  const days = Math.min(365, Math.max(1, parseInt(url.searchParams.get('days') || '30', 10)));

  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - days);
  const startDateStr = startDate.toISOString().split('T')[0]!;

  try {
    const data = await withRetry(async () => {
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
          filters: {
            client_id: `eq.${auth.client_id}`,
            fecha: `gte.${startDateStr}`,
          },
          order: 'fecha.asc',
          limit: days + 10,
        }),
      });
      if (!res.ok) throw new Error(`Worker query failed: ${res.status}`);
      return res.json();
    });

    return jsonResponse(data, { headers: { 'Cache-Control': 'private, max-age=300' } });
  } catch (error) {
    log.error('cdr_metrics_error', {
      request_id: requestId,
      client_id: auth.client_id,
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse({ error: 'Error obteniendo metricas CDR', request_id: requestId }, { status: 500 });
  }
});
