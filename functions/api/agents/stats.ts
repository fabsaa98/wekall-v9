/**
 * GET /api/agents/stats?limit=10&sort_by=llamadas_total
 * Top N agentes del tenant del JWT.
 */

import { withAuth } from '../../lib/handler';
import { jsonResponse, withRetry } from '../../lib/http';
import { log } from '../../lib/logger';

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

const ALLOWED_SORT = new Set([
  'llamadas_total', 'contactos', 'promesas',
  'tasa_contacto', 'tasa_promesa', 'csat', 'fcr', 'aht_segundos',
]);

export const onRequest = withAuth(async ({ request, env, auth, requestId }) => {
  const WORKER_PROXY_URL = env.WORKER_PROXY_URL || 'https://wekall-vicky-proxy.fabsaa98.workers.dev';
  const url = new URL(request.url);
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '10', 10)));
  const sortByRaw = url.searchParams.get('sort_by') || 'llamadas_total';
  const sortBy = ALLOWED_SORT.has(sortByRaw) ? sortByRaw : 'llamadas_total';

  try {
    const data = (await withRetry(async () => {
      const res = await fetch(`${WORKER_PROXY_URL}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-Authorization': request.headers.get('Authorization') || '',
          'X-Client-Id': auth.client_id,
        },
        body: JSON.stringify({
          table: 'agents_performance',
          select: 'agent_name,llamadas_total,contactos,promesas,tasa_contacto,tasa_promesa,csat,fcr,aht_segundos',
          filters: { client_id: `eq.${auth.client_id}` },
          order: `${sortBy}.desc`,
          limit: 500,
        }),
      });
      if (!res.ok) throw new Error(`Worker query failed: ${res.status}`);
      return res.json();
    })) as Array<Record<string, number | string | null>>;

    const agentMap = new Map<string, AgentStat>();
    for (const row of data || []) {
      const name = String(row.agent_name || '');
      if (!name) continue;
      if (!agentMap.has(name)) {
        agentMap.set(name, {
          agent_name: name,
          llamadas_total: 0, contactos: 0, promesas: 0,
          tasa_contacto: 0, tasa_promesa: 0, csat: 0, fcr: 0, aht_segundos: 0,
        });
      }
      const agent = agentMap.get(name)!;
      agent.llamadas_total += Number(row.llamadas_total || 0);
      agent.contactos += Number(row.contactos || 0);
      agent.promesas += Number(row.promesas || 0);
      agent.tasa_contacto = (agent.tasa_contacto + Number(row.tasa_contacto || 0)) / 2;
      agent.tasa_promesa = (agent.tasa_promesa + Number(row.tasa_promesa || 0)) / 2;
      agent.csat = (agent.csat + Number(row.csat || 0)) / 2;
      agent.fcr = (agent.fcr + Number(row.fcr || 0)) / 2;
      agent.aht_segundos = (agent.aht_segundos + Number(row.aht_segundos || 0)) / 2;
    }

    const result = Array.from(agentMap.values())
      .sort((a, b) => ((b as any)[sortBy] || 0) - ((a as any)[sortBy] || 0))
      .slice(0, limit)
      .map((agent) => ({
        ...agent,
        tasa_contacto: Number(agent.tasa_contacto.toFixed(1)),
        tasa_promesa: Number(agent.tasa_promesa.toFixed(1)),
        csat: Number(agent.csat.toFixed(2)),
        fcr: Number(agent.fcr.toFixed(1)),
        aht_segundos: Math.round(agent.aht_segundos),
      }));

    return jsonResponse(result, {
      headers: { 'Cache-Control': 'private, s-maxage=300' },
    });
  } catch (error) {
    log.error('agents_stats_error', {
      request_id: requestId,
      client_id: auth.client_id,
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse({ error: 'Error obteniendo stats', request_id: requestId }, { status: 500 });
  }
});
