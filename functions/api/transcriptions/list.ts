/**
 * GET /api/transcriptions/list?page=1&limit=20&search=&sentiment=
 * Lista paginada de transcripciones del tenant del JWT.
 */

import { withAuth } from '../../lib/handler';
import { jsonResponse, withRetry } from '../../lib/http';
import { log } from '../../lib/logger';

export const onRequestGet = withAuth(async ({ request, env, auth, requestId }) => {
  const WORKER_PROXY_URL = env.WORKER_PROXY_URL || 'https://wekall-vicky-proxy.fabsaa98.workers.dev';
  const url = new URL(request.url);

  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
  const search = (url.searchParams.get('search') || '').slice(0, 200);
  const sentiment = (url.searchParams.get('sentiment') || '').slice(0, 50);

  const offset = (page - 1) * limit;

  const filters: Record<string, string> = {
    client_id: `eq.${auth.client_id}`,
  };
  if (sentiment) filters.sentiment = `eq.${sentiment}`;

  try {
    let data = (await withRetry(async () => {
      const res = await fetch(`${WORKER_PROXY_URL}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-Authorization': request.headers.get('Authorization') || '',
          'X-Client-Id': auth.client_id,
        },
        body: JSON.stringify({
          table: 'transcriptions',
          select: 'id,call_id,fecha,agente,cliente,texto,sentiment,tags,duracion_segundos,created_at',
          filters,
          order: 'created_at.desc',
          limit,
          offset,
        }),
      });
      if (!res.ok) throw new Error(`Worker query failed: ${res.status}`);
      return res.json();
    })) as Array<Record<string, unknown>>;

    if (search && data.length > 0) {
      const s = search.toLowerCase();
      data = data.filter(
        (t) =>
          String(t.texto || '').toLowerCase().includes(s) ||
          String(t.agente || '').toLowerCase().includes(s) ||
          String(t.cliente || '').toLowerCase().includes(s)
      );
    }

    return jsonResponse(
      { data, total: data.length, page, limit },
      { headers: { 'Cache-Control': 'private, max-age=60' } }
    );
  } catch (error) {
    log.error('transcriptions_list_error', {
      request_id: requestId,
      client_id: auth.client_id,
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse({ error: 'Error listando transcripciones', request_id: requestId }, { status: 500 });
  }
});
