/**
 * Dashboard KPIs API Endpoint
 * 
 * Cloudflare Pages Function - Edge computing
 * Returns real-time KPIs from Supabase executive functions
 * 
 * Architecture: Frontend → API (this) → Supabase
 * Best practice: Centralized data fetching, type-safe, cacheable
 */

import { createClient } from '@supabase/supabase-js';

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
}

interface KPIResponse {
  csat: number | null;
  fcr: number | null;
  escalaciones: number | null;
  tasa_conversion: number | null;
  costo_llamada: number | null;
  recaudo_hoy: number | null;
  recaudo_mtd: number | null;
  mom_change: number | null;
  yoy_change: number | null;
  last_updated: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle preflight
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = context.env;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Extract client_id from query params or auth
    const url = new URL(context.request.url);
    const client_id = url.searchParams.get('client_id') || 'credismart';

    // Fetch all KPIs in parallel
    const [
      { data: recaudoHoy },
      { data: recaudoMtd },
      { data: mom },
      { data: agentsData },
    ] = await Promise.all([
      supabase.rpc('get_recaudo_hoy', { p_client_id: client_id }),
      supabase.rpc('get_recaudo_mtd', { p_client_id: client_id }),
      supabase.rpc('get_recaudo_mom', { p_client_id: client_id }),
      supabase
        .from('agents_performance')
        .select('csat, fcr, escalaciones, tasa_contacto, tasa_promesa')
        .eq('client_id', client_id)
        .limit(100),
    ]);

    // Aggregate agent metrics
    let avgCsat = null;
    let avgFcr = null;
    let avgEscalaciones = null;
    let avgConversion = null;

    if (agentsData && agentsData.length > 0) {
      const validCsat = agentsData.filter(a => a.csat !== null);
      const validFcr = agentsData.filter(a => a.fcr !== null);
      const validEsc = agentsData.filter(a => a.escalaciones !== null);
      const validConv = agentsData.filter(a => a.tasa_promesa !== null);

      avgCsat = validCsat.length > 0
        ? validCsat.reduce((sum, a) => sum + a.csat, 0) / validCsat.length
        : null;

      avgFcr = validFcr.length > 0
        ? validFcr.reduce((sum, a) => sum + a.fcr, 0) / validFcr.length
        : null;

      avgEscalaciones = validEsc.length > 0
        ? validEsc.reduce((sum, a) => sum + a.escalaciones, 0) / validEsc.length
        : null;

      avgConversion = validConv.length > 0
        ? validConv.reduce((sum, a) => sum + a.tasa_promesa, 0) / validConv.length
        : null;
    }

    // Calculate cost per call (simplified - should come from financial data)
    const costoLlamada = recaudoHoy && agentsData && agentsData.length > 0
      ? Math.round(3000000 / (agentsData.length * 22 * 150)) // Estimado
      : null;

    const response: KPIResponse = {
      csat: avgCsat ? Number(avgCsat.toFixed(2)) : null,
      fcr: avgFcr ? Number(avgFcr.toFixed(1)) : null,
      escalaciones: avgEscalaciones ? Number(avgEscalaciones.toFixed(1)) : null,
      tasa_conversion: avgConversion ? Number(avgConversion.toFixed(1)) : null,
      costo_llamada: costoLlamada,
      recaudo_hoy: recaudoHoy || null,
      recaudo_mtd: recaudoMtd || null,
      mom_change: mom || null,
      yoy_change: null, // TODO: implement get_recaudo_yoy
      last_updated: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=300', // Cache 5 min
      },
    });

  } catch (error) {
    console.error('Dashboard KPIs error:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
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
