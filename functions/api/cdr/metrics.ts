/**
 * GET /api/cdr/metrics?client_id=credismart&days=30
 * 
 * Retorna métricas CDR (Call Detail Records) agregadas por día
 * Para alimentar Overview.tsx con datos del API en vez de Supabase directo
 */

interface Env {
  WORKER_PROXY_URL?: string;
}

export async function onRequestGet(context: { request: Request; env: Env }) {
  const { request, env } = context;
  const url = new URL(request.url);
  const client_id = url.searchParams.get('client_id') || 'credismart';
  const days = parseInt(url.searchParams.get('days') || '30', 10);

  const WORKER_PROXY_URL = env.WORKER_PROXY_URL || 'https://wekall-vicky-proxy.fabsaa98.workers.dev';

  try {
    // Calcular fecha de inicio (days atrás desde hoy)
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    // Query via Worker proxy
    const res = await fetch(`${WORKER_PROXY_URL}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'cdr_daily_metrics',
        select: 'fecha,total_llamadas,llamadas_entrantes,llamadas_salientes,total_contactos,total_promesas,duracion_promedio_seg,tasa_contacto_pct,tasa_promesa_pct,csat_promedio',
        filters: {
          client_id: `eq.${client_id}`,
          fecha: `gte.${startDateStr}`,
        },
        order: 'fecha.asc',
        limit: days + 10, // buffer
      }),
    });

    if (!res.ok) {
      throw new Error(`Worker query failed: ${res.status}`);
    }

    const data = await res.json();

    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // 5 min cache
      },
    });
  } catch (error) {
    console.error('[cdr/metrics] Error:', error);
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
