/**
 * GET /api/cdr/daily-aggregated?client_id=credismart&days=30
 * 
 * Agrega agents_performance por fecha (suma llamadas, promedio tasas)
 * Alternativa a cdr_daily_metrics que no existe
 */

interface Env {
  WORKER_PROXY_URL?: string;
}

interface AgentPerformance {
  fecha: string;
  llamadas_total: number;
  contactos: number;
  promesas: number;
  tasa_contacto: number;
  tasa_promesa: number;
  csat: number;
  fcr: number;
  aht_segundos: number;
}

interface DailyAggregated {
  fecha: string;
  total_llamadas: number;
  total_contactos: number;
  total_promesas: number;
  tasa_contacto_pct: number;
  tasa_promesa_pct: number;
  csat_promedio: number;
  fcr_promedio: number;
  duracion_promedio_seg: number;
}

export async function onRequestGet(context: { request: Request; env: Env }) {
  const { request, env } = context;
  const url = new URL(request.url);
  const client_id = url.searchParams.get('client_id') || 'credismart';
  const days = parseInt(url.searchParams.get('days') || '30', 10);

  const WORKER_PROXY_URL = env.WORKER_PROXY_URL || 'https://wekall-vicky-proxy.fabsaa98.workers.dev';

  try {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    // Get all agent performance records
    const res = await fetch(`${WORKER_PROXY_URL}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'agents_performance',
        select: 'fecha,llamadas_total,contactos,promesas,tasa_contacto,tasa_promesa,csat,fcr,aht_segundos',
        filters: {
          client_id: `eq.${client_id}`,
          fecha: `gte.${startDateStr}`,
        },
        order: 'fecha.asc',
        limit: 5000,
      }),
    });

    if (!res.ok) {
      throw new Error(`Worker query failed: ${res.status}`);
    }

    const rawData: AgentPerformance[] = await res.json();

    // Aggregate by date
    const byDate = new Map<string, AgentPerformance[]>();
    
    for (const row of rawData) {
      if (!byDate.has(row.fecha)) {
        byDate.set(row.fecha, []);
      }
      byDate.get(row.fecha)!.push(row);
    }

    const aggregated: DailyAggregated[] = [];

    for (const [fecha, agents] of byDate.entries()) {
      const total_llamadas = agents.reduce((sum, a) => sum + (a.llamadas_total || 0), 0);
      const total_contactos = agents.reduce((sum, a) => sum + (a.contactos || 0), 0);
      const total_promesas = agents.reduce((sum, a) => sum + (a.promesas || 0), 0);
      
      const tasas_contacto = agents.map(a => a.tasa_contacto || 0).filter(t => t > 0);
      const tasas_promesa = agents.map(a => a.tasa_promesa || 0).filter(t => t > 0);
      const csats = agents.map(a => a.csat || 0).filter(c => c > 0);
      const fcrs = agents.map(a => a.fcr || 0).filter(f => f > 0);
      const ahts = agents.map(a => a.aht_segundos || 0).filter(a => a > 0);

      const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;

      aggregated.push({
        fecha,
        total_llamadas,
        total_contactos,
        total_promesas,
        tasa_contacto_pct: Math.round(avg(tasas_contacto) * 10) / 10,
        tasa_promesa_pct: Math.round(avg(tasas_promesa) * 10) / 10,
        csat_promedio: Math.round(avg(csats) * 10) / 10,
        fcr_promedio: Math.round(avg(fcrs) * 10) / 10,
        duracion_promedio_seg: Math.round(avg(ahts)),
      });
    }

    // Sort by date ascending
    aggregated.sort((a, b) => a.fecha.localeCompare(b.fecha));

    return new Response(JSON.stringify(aggregated), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error) {
    console.error('[cdr/daily-aggregated] Error:', error);
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
