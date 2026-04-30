/**
 * Agent Stats API Endpoint
 * 
 * Returns top agents by performance metrics
 */

interface Env {
  WORKER_PROXY_URL?: string;
}

interface AgentStat {
  agent_name: string;
  llamadas_total: number;
  contactos: number;
  promesas: number;
  tasa_contacto: number;
  tasa_promesa: number;
  csat: number;
  fcr: number;
  aht_segundos: number;
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
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);
    const sortBy = url.searchParams.get('sort_by') || 'llamadas_total';

    const res = await fetch(`${WORKER_PROXY_URL}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'agents_performance',
        select: 'agent_name,llamadas_total,contactos,promesas,tasa_contacto,tasa_promesa,csat,fcr,aht_segundos',
        filters: { client_id: `eq.${client_id}` },
        order: `${sortBy}.desc`,
        limit: 500,
      }),
    });
    
    if (!res.ok) throw new Error(`Worker query failed: ${res.status}`);
    const data = await res.json();

    // Aggregate by agent
    const agentMap = new Map<string, AgentStat>();

    data?.forEach(row => {
      const name = row.agent_name;
      if (!agentMap.has(name)) {
        agentMap.set(name, {
          agent_name: name,
          llamadas_total: 0,
          contactos: 0,
          promesas: 0,
          tasa_contacto: 0,
          tasa_promesa: 0,
          csat: 0,
          fcr: 0,
          aht_segundos: 0,
        });
      }

      const agent = agentMap.get(name)!;
      agent.llamadas_total += row.llamadas_total || 0;
      agent.contactos += row.contactos || 0;
      agent.promesas += row.promesas || 0;
      
      // Average rates (weighted by days)
      agent.tasa_contacto = ((agent.tasa_contacto + (row.tasa_contacto || 0)) / 2);
      agent.tasa_promesa = ((agent.tasa_promesa + (row.tasa_promesa || 0)) / 2);
      agent.csat = ((agent.csat + (row.csat || 0)) / 2);
      agent.fcr = ((agent.fcr + (row.fcr || 0)) / 2);
      agent.aht_segundos = ((agent.aht_segundos + (row.aht_segundos || 0)) / 2);
    });

    // Convert to array and sort
    const result = Array.from(agentMap.values())
      .sort((a, b) => {
        const aVal = (a as any)[sortBy] || 0;
        const bVal = (b as any)[sortBy] || 0;
        return bVal - aVal;
      })
      .slice(0, limit)
      .map(agent => ({
        ...agent,
        tasa_contacto: Number(agent.tasa_contacto.toFixed(1)),
        tasa_promesa: Number(agent.tasa_promesa.toFixed(1)),
        csat: Number(agent.csat.toFixed(2)),
        fcr: Number(agent.fcr.toFixed(1)),
        aht_segundos: Math.round(agent.aht_segundos),
      }));

    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=300',
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
