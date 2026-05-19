/**
 * GET /api/dashboard/kpis
 *
 * Sprint 1 fix · cierre P0-5 propagado:
 *  - requireAuth() valida JWT y extrae client_id del custom claim.
 *  - Antes el client_id venía del query (`?client_id=credismart`) → IDOR.
 *  - Ahora se ignora cualquier query param `client_id`.
 *
 * Returns: KPIResponse
 */

import { withAuth } from '../../lib/handler';
import { jsonResponse } from '../../lib/http';
import { withRetry } from '../../lib/http';
import { log } from '../../lib/logger';

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

export const onRequest = withAuth(async ({ request, env, auth, requestId }) => {
  const WORKER_PROXY_URL = env.WORKER_PROXY_URL || 'https://wekall-vicky-proxy.fabsaa98.workers.dev';

  const queryWorker = (body: unknown) =>
    withRetry(async () => {
      const res = await fetch(`${WORKER_PROXY_URL}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Reenviar el JWT del usuario al Worker para defensa en profundidad.
          'X-Forwarded-Authorization': request.headers.get('Authorization') || '',
          'X-Client-Id': auth.client_id,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Worker query failed: ${res.status}`);
      return res.json();
    });

  try {
    const [recaudoHoyData, recaudoMtdData, momData, agentsData] = await Promise.all([
      queryWorker({ rpc: 'get_recaudo_hoy', params: { p_client_id: auth.client_id } }),
      queryWorker({ rpc: 'get_recaudo_mtd', params: { p_client_id: auth.client_id } }),
      queryWorker({ rpc: 'get_recaudo_mom', params: { p_client_id: auth.client_id } }),
      queryWorker({
        table: 'agents_performance',
        select: 'csat,fcr,escalaciones,tasa_contacto,tasa_promesa',
        filters: { client_id: `eq.${auth.client_id}` },
        limit: 100,
      }),
    ]);

    const recaudoHoy = (recaudoHoyData as any)?.[0]?.recaudo_cop ?? null;
    const recaudoMtd = (recaudoMtdData as any)?.[0]?.recaudo_cop ?? null;
    const mom = (momData as any)?.[0]?.mom_pct ?? null;

    let avgCsat = null;
    let avgFcr = null;
    let avgEscalaciones = null;
    let avgConversion = null;

    if (Array.isArray(agentsData) && agentsData.length > 0) {
      const arr = agentsData as Array<{
        csat: number | null;
        fcr: number | null;
        escalaciones: number | null;
        tasa_promesa: number | null;
      }>;
      const validCsat = arr.filter((a) => a.csat !== null);
      const validFcr = arr.filter((a) => a.fcr !== null);
      const validEsc = arr.filter((a) => a.escalaciones !== null);
      const validConv = arr.filter((a) => a.tasa_promesa !== null);

      avgCsat = validCsat.length > 0 ? validCsat.reduce((s, a) => s + (a.csat ?? 0), 0) / validCsat.length : null;
      avgFcr = validFcr.length > 0 ? validFcr.reduce((s, a) => s + (a.fcr ?? 0), 0) / validFcr.length : null;
      avgEscalaciones = validEsc.length > 0 ? validEsc.reduce((s, a) => s + (a.escalaciones ?? 0), 0) / validEsc.length : null;
      avgConversion = validConv.length > 0 ? validConv.reduce((s, a) => s + (a.tasa_promesa ?? 0), 0) / validConv.length : null;
    }

    const costoLlamada =
      recaudoHoy && Array.isArray(agentsData) && agentsData.length > 0
        ? Math.round(3_000_000 / (agentsData.length * 22 * 150))
        : null;

    const response: KPIResponse = {
      csat: avgCsat !== null ? Number(avgCsat.toFixed(2)) : null,
      fcr: avgFcr !== null ? Number(avgFcr.toFixed(1)) : null,
      escalaciones: avgEscalaciones !== null ? Number(avgEscalaciones.toFixed(1)) : null,
      tasa_conversion: avgConversion !== null ? Number(avgConversion.toFixed(1)) : null,
      costo_llamada: costoLlamada,
      recaudo_hoy: recaudoHoy,
      recaudo_mtd: recaudoMtd,
      mom_change: mom,
      yoy_change: null,
      last_updated: new Date().toISOString(),
    };

    return jsonResponse(response, {
      headers: { 'Cache-Control': 'private, s-maxage=300' },
    });
  } catch (error) {
    log.error('dashboard_kpis_error', {
      request_id: requestId,
      client_id: auth.client_id,
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse({ error: 'Error obteniendo KPIs', request_id: requestId }, { status: 500 });
  }
});
