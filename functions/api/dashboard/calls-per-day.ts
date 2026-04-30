/**
 * Calls Per Day API Endpoint
 * 
 * Returns daily call volume trend (last 7 days)
 */

import { createClient } from '@supabase/supabase-js';

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
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
    const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = context.env;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const url = new URL(context.request.url);
    const client_id = url.searchParams.get('client_id') || 'credismart';

    // Get last 7 days
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    const { data, error } = await supabase
      .from('agents_performance')
      .select('fecha, llamadas_total')
      .eq('client_id', client_id)
      .gte('fecha', sevenDaysAgo.toISOString().split('T')[0])
      .order('fecha', { ascending: true });

    if (error) throw error;

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
