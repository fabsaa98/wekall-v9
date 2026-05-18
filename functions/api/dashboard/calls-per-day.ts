/**
 * GET /api/dashboard/calls-per-day
 * Daily call volume trend (last 7 days) para el tenant del JWT.
 */

import { withAuth } from '../../lib/handler';
import { jsonResponse, withRetry } from '../../lib/http';
import { log } from '../../lib/logger';

export const onRequest = withAuth(async ({ request, env, auth, requestId }) => {
  const WORKER_PROXY_URL = env.WORKER_PROXY_URL || 'https://wekall-vicky-proxy.fabsaa98.workers.dev';

  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  const fromDate = sevenDaysAgo.toISOString().split('T')[0]!;

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
          select: 'fecha,llamadas_total',
          filters: {
            client_id: `eq.${auth.client_id}`,
            fecha: `gte.${fromDate}`,
          },
          order: 'fecha.asc',
        }),
      });
      if (!res.ok) throw new Error(`Worker query failed: ${res.status}`);
      return res.json();
    })) as Array<{ fecha: string; llamadas_total: number | null }>;

    const byDate = new Map<string, number>();
    for (const row of data || []) {
      byDate.set(row.fecha, (byDate.get(row.fecha) || 0) + (row.llamadas_total || 0));
    }

    const result = Array.from(byDate.entries())
      .map(([date, calls]) => ({
        date,
        label: new Date(date).toLocaleDateString('es-CO', { weekday: 'short' }),
        calls,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return jsonResponse(result, {
      headers: { 'Cache-Control': 'private, s-maxage=600' },
    });
  } catch (error) {
    log.error('dashboard_calls_per_day_error', {
      request_id: requestId,
      client_id: auth.client_id,
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse({ error: 'Error obteniendo serie diaria', request_id: requestId }, { status: 500 });
  }
});
