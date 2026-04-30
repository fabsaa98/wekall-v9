/**
 * GET /api/cdr/latest?client_id=credismart
 * 
 * Retorna el día más reciente de métricas CDR
 */

interface Env {
  WORKER_PROXY_URL?: string;
}

export async function onRequestGet(context: { request: Request; env: Env }) {
  const { request, env } = context;
  const url = new URL(request.url);
  const client_id = url.searchParams.get('client_id') || 'credismart';

  const WORKER_PROXY_URL = env.WORKER_PROXY_URL || 'https://wekall-vicky-proxy.fabsaa98.workers.dev';

  try {
    const res = await fetch(`${WORKER_PROXY_URL}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'cdr_daily_metrics',
        select: 'fecha,total_llamadas,llamadas_entrantes,llamadas_salientes,total_contactos,total_promesas,duracion_promedio_seg,tasa_contacto_pct,tasa_promesa_pct,csat_promedio',
        filters: { client_id: `eq.${client_id}` },
        order: 'fecha.desc',
        limit: 1,
      }),
    });

    if (!res.ok) {
      throw new Error(`Worker query failed: ${res.status}`);
    }

    const data = await res.json();
    const latest = data?.[0] || null;

    return new Response(JSON.stringify(latest), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error) {
    console.error('[cdr/latest] Error:', error);
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
