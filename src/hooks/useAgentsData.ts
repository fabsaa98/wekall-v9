import { useState, useEffect } from 'react';
import { useClient } from '@/contexts/ClientContext';

// ─── Proxy helper (igual que en supabase.ts) ───────────────────────────────────
const PROXY_URL = (import.meta.env.VITE_PROXY_URL || 'https://wekall-vicky-proxy.fabsaa98.workers.dev').replace(/\/$/, '');

async function proxyQuery<T>(payload: object): Promise<T> {
  const resp = await fetch(`${PROXY_URL}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({})) as Record<string, string>;
    throw new Error(err.error || `query_error_${resp.status}`);
  }
  return resp.json() as Promise<T>;
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface AgentDayRecord {
  fecha: string;
  agent_id: string;
  agent_name: string;
  campaign_id: string;
  area: string;
  tasa_contacto: number;
  tasa_promesa: number;
  aht_segundos: number;
  csat: number;
  fcr: number;
  escalaciones: number;
  llamadas_total: number;
  contactos: number;
  promesas: number;
}

export interface AgentSummary {
  agent_id: string;
  agent_name: string;
  area: string;
  campaign_id: string;

  // Promedios de los últimos 30 días
  avg_tasa_contacto: number;
  avg_tasa_promesa: number;
  avg_aht_segundos: number;
  avg_csat: number;
  avg_fcr: number;
  avg_escalaciones: number;
  total_llamadas: number;
  total_promesas: number;

  // Trend: comparando últimos 7 días vs últimos 30 días
  // 'up' = mejora, 'down' = empeora, 'stable' = sin cambio significativo
  trend: 'up' | 'down' | 'stable';
  trend_delta: number; // diferencia en tasa_contacto (7d vs 30d)

  // Promedios de los últimos 7 días (para trend)
  avg7d_tasa_contacto: number;
  avg7d_fcr: number;
  avg7d_csat: number;

  days_count: number; // días con datos en los últimos 30

  // Sparkline: últimos 7 días de tasa_contacto (para mini-gráfico en tabla)
  sparkline7d: number[];
}

export interface AgentsDataState {
  loading: boolean;
  error: string | null;
  agents: AgentSummary[];
  areas: string[];
  lastUpdated: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function calcTrend(avg30: number, avg7: number): 'up' | 'down' | 'stable' {
  if (avg30 === 0) return 'stable';
  const delta = avg7 - avg30;
  const pct = Math.abs(delta / avg30);
  if (pct < 0.03) return 'stable';   // < 3% de variación → estable
  return delta > 0 ? 'up' : 'down';
}

function aggregateAgent(records: AgentDayRecord[]): AgentSummary {
  const agent = records[0];

  // Ordenar por fecha
  const sorted = [...records].sort((a, b) => a.fecha.localeCompare(b.fecha));

  // Todos los valores
  const all = sorted;
  const last7 = sorted.slice(-7);

  const avg30_tc = avg(all.map(r => r.tasa_contacto));
  const avg7_tc  = avg(last7.map(r => r.tasa_contacto));

  const trend = calcTrend(avg30_tc, avg7_tc);
  const trend_delta = Math.round((avg7_tc - avg30_tc) * 10) / 10;

  return {
    agent_id: agent.agent_id,
    agent_name: agent.agent_name,
    area: agent.area,
    campaign_id: agent.campaign_id,

    avg_tasa_contacto: Math.round(avg30_tc * 10) / 10,
    avg_tasa_promesa:  Math.round(avg(all.map(r => r.tasa_promesa)) * 10) / 10,
    avg_aht_segundos:  Math.round(avg(all.map(r => r.aht_segundos))),
    avg_csat:          Math.round(avg(all.map(r => r.csat)) * 10) / 10,
    avg_fcr:           Math.round(avg(all.map(r => r.fcr)) * 10) / 10,
    avg_escalaciones:  Math.round(avg(all.map(r => r.escalaciones)) * 10) / 10,
    total_llamadas:    all.reduce((s, r) => s + r.llamadas_total, 0),
    total_promesas:    all.reduce((s, r) => s + r.promesas, 0),

    trend,
    trend_delta,

    avg7d_tasa_contacto: Math.round(avg7_tc * 10) / 10,
    avg7d_fcr:           Math.round(avg(last7.map(r => r.fcr)) * 10) / 10,
    avg7d_csat:          Math.round(avg(last7.map(r => r.csat)) * 10) / 10,

    days_count: all.length,

    // Sparkline: últimos 7 días de tasa_contacto ordenados cronológicamente
    sparkline7d: last7.map(r => Math.round(r.tasa_contacto * 10) / 10),
  };
}

// ─── Hook principal ───────────────────────────────────────────────────────────

export function useAgentsData(): AgentsDataState {
  const { clientId } = useClient();

  const [state, setState] = useState<AgentsDataState>({
    loading: true,
    error: null,
    agents: [],
    areas: [],
    lastUpdated: null,
  });

  useEffect(() => {
    async function load() {
      try {
        // Obtener los últimos 30 días de datos de agentes
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 45); // buffer de 45 días para garantizar 30 hábiles
        const cutoffStr = cutoff.toISOString().split('T')[0];

        // Usar proxy (service role) en vez de supabase directo — evita bloqueo RLS
        const rows = await proxyQuery<AgentDayRecord[]>({
          table: 'agents_performance',
          select: '*',
          filters: {
            'client_id': `eq.${clientId}`,
            'fecha': `gte.${cutoffStr}`,
          },
          order: 'fecha.asc',
          limit: 10000,
        });

        if (rows.length === 0) {
          setState({
            loading: false,
            error: null,
            agents: [],
            areas: [],
            lastUpdated: null,
          });
          return;
        }

        // Agrupar por agent_id
        const byAgent = new Map<string, AgentDayRecord[]>();
        for (const row of rows) {
          const existing = byAgent.get(row.agent_id) || [];
          existing.push(row);
          byAgent.set(row.agent_id, existing);
        }

        // Calcular resumen por agente
        const agents = Array.from(byAgent.values()).map(aggregateAgent);

        // Ordenar por FCR descendente
        agents.sort((a, b) => b.avg_fcr - a.avg_fcr);

        // Áreas únicas
        const areas = [...new Set(agents.map(a => a.area))].sort();

        // Fecha más reciente
        const lastUpdated = rows.reduce((max, r) => r.fecha > max ? r.fecha : max, rows[0].fecha);

        setState({
          loading: false,
          error: null,
          agents,
          areas,
          lastUpdated,
        });
      } catch (err: unknown) {
        setState(s => ({
          ...s,
          loading: false,
          error: err instanceof Error ? err.message : 'Error cargando datos de agentes',
        }));
      }
    }

    load();
  }, [clientId]);

  return state;
}
