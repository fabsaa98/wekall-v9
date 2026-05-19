/**
 * GET /api/cdr/daily-aggregated?days=30
 * Métricas diarias desde cdr_daily_metrics del tenant del JWT.
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
  const url = new URL(request.url);
  const days = Math.min(365, Math.max(1, parseInt(url.searchParams.get('days') || '30', 10)));

  // El client_id viene del JWT, no del query.
  const client_id = normalizeClientId(auth.client_id);

  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - days);
  const startDateStr = startDate.toISOString().split('T')[0]!;

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
          table: 'cdr_daily_metrics',
          select: '*',
          filters: {
            client_id: `eq.${client_id}`,
            fecha: `gte.${startDateStr}`,
          },
          order: 'fecha.asc',
          limit: days + 10,
        }),
      });
      if (!res.ok) throw new Error(`Worker query failed: ${res.status}`);
      return res.json();
    })) as Array<Record<string, unknown>>;

    return jsonResponse(data, { headers: { 'Cache-Control': 'private, max-age=300' } });
  } catch (error) {
    log.error('cdr_daily_aggregated_error', {
      request_id: requestId,
      client_id: auth.client_id,
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse({ error: 'Error obteniendo CDR diario', request_id: requestId }, { status: 500 });
  }
});
