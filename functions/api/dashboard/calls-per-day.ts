/**
 * Calls Per Day API Endpoint
 * 
 * Returns daily call volume trend (last 7 days)
 */

interface Env {
  WORKER_PROXY_URL?: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (context.request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const WORKER_PROXY_URL = context.env.WORKER_PROXY_URL || 'https://wekall-vicky-proxy.fabsaa98.workers.dev';

    const url = new URL(context.request.url);
    const client_id = url.searchParams.get('client_id') || 'credismart';

    // Get last 7 days
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    const res = await fetch(`${WORKER_PROXY_URL}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'agents_performance',
        select: 'fecha,llamadas_total',
        filters: {
          client_id: `eq.${client_id}`,
          fecha: `gte.${sevenDaysAgo.toISOString().split('T')[0]}`,
        },
        order: 'fecha.asc',
      }),
    });
    
    if (!res.ok) throw new Error(`Worker query failed: ${res.status}`);
    const data = await res.json();

    // Aggregate by date
    const byDate = new Map<string, number>();

    data?.forEach(row => {
      const current = byDate.get(row.fecha) || 0;
      byDate.set(row.fecha, current + (row.llamadas_total || 0));
    });

    const result = Array.from(byDate.entries())
      .map(([date, calls]) => ({
        date,
        label: new Date(date).toLocaleDateString('es-CO', { weekday: 'short' }),
        calls,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=600',
      },
    });

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error' }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
