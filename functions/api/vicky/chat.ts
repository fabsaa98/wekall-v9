/**
 * POST /api/vicky/chat
 * Proxy a Vicky (Worker) — client_id forzado del JWT.
 *
 * Body: { question: string, conversation_id?: string }
 * El client_id se IGNORA del body; el Worker recibe el del JWT.
 */

import { withAuth } from '../../lib/handler';
import { jsonResponse } from '../../lib/http';
import { log } from '../../lib/logger';

interface ChatBody {
  question?: string;
  conversation_id?: string;
}

export const onRequestPost = withAuth(
  async ({ request, env, auth, requestId }) => {
    const WORKER_PROXY_URL = env.WORKER_PROXY_URL || 'https://wekall-vicky-proxy.fabsaa98.workers.dev';

    let body: ChatBody;
    try {
      body = (await request.json()) as ChatBody;
    } catch {
      return jsonResponse({ error: 'Invalid JSON', request_id: requestId }, { status: 400 });
    }
    const question = (body.question || '').trim();
    if (!question) {
      return jsonResponse({ error: 'Missing required field: question', request_id: requestId }, { status: 400 });
    }
    if (question.length > 4000) {
      return jsonResponse({ error: 'question too long (max 4000 chars)', request_id: requestId }, { status: 413 });
    }

    try {
      const res = await fetch(`${WORKER_PROXY_URL}/vicky`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-Authorization': request.headers.get('Authorization') || '',
          'X-Client-Id': auth.client_id,
          'X-User-Id': auth.sub,
        },
        body: JSON.stringify({
          question,
          client_id: auth.client_id,
          conversation_id: body.conversation_id,
        }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        log.warn('vicky_worker_error', {
          request_id: requestId,
          client_id: auth.client_id,
          status: res.status,
          detail: errText.slice(0, 200),
        });
        return jsonResponse({ error: 'Vicky upstream error', request_id: requestId }, { status: 502 });
      }
      const data = await res.json();
      return jsonResponse(data, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      log.error('vicky_chat_error', {
        request_id: requestId,
        client_id: auth.client_id,
        error: error instanceof Error ? error.message : String(error),
      });
      return jsonResponse({ error: 'Error en chat Vicky', request_id: requestId }, { status: 500 });
    }
  },
  { expensive: true } // Vicky consume tokens OpenAI — rate-limit estricto
);
