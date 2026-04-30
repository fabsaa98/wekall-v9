/**
 * GET /api/transcriptions/[id]?client_id=credismart
 * 
 * Obtiene una transcripción por ID
 */

interface Env {
  WORKER_PROXY_URL?: string;
}

export async function onRequestGet(context: { 
  request: Request; 
  env: Env;
  params: { id: string };
}) {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const client_id = url.searchParams.get('client_id') || 'credismart';
  const { id } = params;

  const WORKER_PROXY_URL = env.WORKER_PROXY_URL || 'https://wekall-vicky-proxy.fabsaa98.workers.dev';

  try {
    const res = await fetch(`${WORKER_PROXY_URL}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'transcriptions',
        select: '*',
        filters: {
          id: `eq.${id}`,
          client_id: `eq.${client_id}`,
        },
        limit: 1,
      }),
    });

    if (!res.ok) {
      throw new Error(`Worker query failed: ${res.status}`);
    }

    const data = await res.json();
    const transcription = data?.[0] || null;

    if (!transcription) {
      return new Response(
        JSON.stringify({ error: 'Transcription not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify(transcription), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error) {
    console.error('[transcriptions/[id]] Error:', error);
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
