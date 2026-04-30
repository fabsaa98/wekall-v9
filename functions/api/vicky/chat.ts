/**
 * POST /api/vicky/chat
 * 
 * Proxy a Vicky (Worker) para chat conversacional
 * Body: { question: string, client_id?: string, conversation_id?: string }
 */

interface Env {
  WORKER_PROXY_URL?: string;
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  const { request, env } = context;
  const WORKER_PROXY_URL = env.WORKER_PROXY_URL || 'https://wekall-vicky-proxy.fabsaa98.workers.dev';

  try {
    const body = await request.json();
    const { question, client_id = 'credismart', conversation_id } = body as {
      question: string;
      client_id?: string;
      conversation_id?: string;
    };

    if (!question) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: question' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Forward to Worker /vicky endpoint
    const res = await fetch(`${WORKER_PROXY_URL}/vicky`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        client_id,
        conversation_id,
      }),
    });

    if (!res.ok) {
      throw new Error(`Vicky Worker error: ${res.status}`);
    }

    const data = await res.json();

    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store', // Chat responses no se cachean
      },
    });
  } catch (error) {
    console.error('[vicky/chat] Error:', error);
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
