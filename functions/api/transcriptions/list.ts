/**
 * GET /api/transcriptions/list?client_id=credismart&page=1&limit=20&search=&sentiment=
 * 
 * Lista transcripciones con paginación y filtros
 */

interface Env {
  WORKER_PROXY_URL?: string;
}

export async function onRequestGet(context: { request: Request; env: Env }) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  const client_id = url.searchParams.get('client_id') || 'credismart';
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limit = parseInt(url.searchParams.get('limit') || '20', 10);
  const search = url.searchParams.get('search') || '';
  const sentiment = url.searchParams.get('sentiment') || '';

  const WORKER_PROXY_URL = env.WORKER_PROXY_URL || 'https://wekall-vicky-proxy.fabsaa98.workers.dev';

  try {
    const offset = (page - 1) * limit;

    // Build filters
    const filters: Record<string, string> = {
      client_id: `eq.${client_id}`,
    };

    if (sentiment) {
      filters.sentiment = `eq.${sentiment}`;
    }

    // Query transcriptions
    const res = await fetch(`${WORKER_PROXY_URL}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'transcriptions',
        select: 'id,call_id,fecha,agente,cliente,texto,sentiment,tags,duracion_segundos,created_at',
        filters,
        order: 'created_at.desc',
        limit,
        offset,
      }),
    });

    if (!res.ok) {
      throw new Error(`Worker query failed: ${res.status}`);
    }

    let data = await res.json();

    // Client-side search if search param provided
    if (search && data.length > 0) {
      const searchLower = search.toLowerCase();
      data = data.filter((t: any) => 
        t.texto?.toLowerCase().includes(searchLower) ||
        t.agente?.toLowerCase().includes(searchLower) ||
        t.cliente?.toLowerCase().includes(searchLower)
      );
    }

    // Get total count (simplified - returning data length, real impl would do separate count query)
    const total = data.length;

    return new Response(
      JSON.stringify({
        data,
        total,
        page,
        limit,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60', // 1 min cache
        },
      }
    );
  } catch (error) {
    console.error('[transcriptions/list] Error:', error);
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
