/**
 * GET /api/transcriptions/[id]
 * Transcripción individual del tenant del JWT.
 * Sprint 1 fix: el filtro client_id se valida contra el JWT, no contra query.
 */

import { withAuth } from '../../lib/handler';
import { jsonResponse, withRetry } from '../../lib/http';
import { log } from '../../lib/logger';

export const onRequestGet = withAuth(async ({ request, env, auth, requestId, params }) => {
  const WORKER_PROXY_URL = env.WORKER_PROXY_URL || 'https://wekall-vicky-proxy.fabsaa98.workers.dev';
  const id = params.id;
  if (!id) return jsonResponse({ error: 'id requerido', request_id: requestId }, { status: 400 });

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
          table: 'transcriptions',
          select: '*',
          filters: { id: `eq.${id}`, client_id: `eq.${auth.client_id}` },
          limit: 1,
        }),
      });
      if (!res.ok) throw new Error(`Worker query failed: ${res.status}`);
      return res.json();
    })) as Array<Record<string, unknown>>;

    const transcription = data?.[0];
    if (!transcription) {
      return jsonResponse({ error: 'Transcription not found', request_id: requestId }, { status: 404 });
    }
    return jsonResponse(transcription, { headers: { 'Cache-Control': 'private, max-age=300' } });
  } catch (error) {
    log.error('transcriptions_id_error', {
      request_id: requestId,
      client_id: auth.client_id,
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse({ error: 'Error obteniendo transcripcion', request_id: requestId }, { status: 500 });
  }
});
