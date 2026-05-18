/**
 * GET /api/client/campaigns?days=7
 * Campañas activas del tenant del JWT clasificadas por tipo.
 */

import { withAuth } from '../../lib/handler';
import { jsonResponse, withRetry } from '../../lib/http';
import { log } from '../../lib/logger';

function normalizeClientId(clientId: string): string {
  const mapping: Record<string, string> = {
    credismart: 'crediminuto',
    credi: 'crediminuto',
  };
  return mapping[clientId.toLowerCase()] || clientId;
}

function clasificarCampana(name: string): 'collections' | 'sales' | 'service' | 'unknown' {
  const nombre = name.toLowerCase();
  if (/cobranza|cobro|recupera|cartera|mora|deuda|ptp|rpc|promesa|pago|vencid/i.test(nombre)) return 'collections';
  if (/venta|comercial|lead|prospecto|cierre|cotiza|oferta|upsell|cross|telesale/i.test(nombre)) return 'sales';
  if (/servicio|soporte|ayuda|reclamo|ticket|incidencia|atencion|support/i.test(nombre)) return 'service';
  return 'unknown';
}

export const onRequestGet = withAuth(async ({ request, env, auth, requestId }) => {
  const WORKER_PROXY_URL = env.WORKER_PROXY_URL || 'https://wekall-vicky-proxy.fabsaa98.workers.dev';
  const url = new URL(request.url);
  const days = Math.min(90, Math.max(1, parseInt(url.searchParams.get('days') || '7', 10)));
  const client_id = normalizeClientId(auth.client_id);

  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - days);
  const startDateStr = startDate.toISOString().split('T')[0]!;

  try {
    // 1. Fetch client config para fallback (vía mismo origen + reenvío de auth)
    const configRes = await fetch(`${url.origin}/api/client/config`, {
      headers: { Authorization: request.headers.get('Authorization') || '' },
    });
    const clientConfig = configRes.ok ? ((await configRes.json()) as any) : {};
    const fallbackType: 'collections' | 'sales' | 'service' = clientConfig.business_type || 'service';

    // 2. Fetch campaign metrics filtrados por client_id + fecha
    const allMetrics = (await withRetry(async () => {
      const res = await fetch(`${WORKER_PROXY_URL}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-Authorization': request.headers.get('Authorization') || '',
          'X-Client-Id': auth.client_id,
        },
        body: JSON.stringify({
          table: 'cdr_campaign_metrics',
          select: 'campaign_id,total_llamadas,contactos_efectivos,tasa_contacto_pct,fecha,client_id',
          filters: {
            client_id: `eq.${client_id}`,
            fecha: `gte.${startDateStr}`,
          },
          order: 'fecha.desc',
          limit: 1000,
        }),
      });
      if (!res.ok) throw new Error(`Worker query failed: ${res.status}`);
      return res.json();
    })) as Array<{
      campaign_id: string;
      total_llamadas: number | null;
      contactos_efectivos: number | null;
      tasa_contacto_pct: number | null;
      fecha: string;
      client_id: string | null;
    }>;

    const campaignMap = new Map<string, { campaign_id: string; total_llamadas: number; contactos_efectivos: number; dias_activos: number }>();
    for (const metric of allMetrics) {
      const cid = metric.campaign_id;
      if (!campaignMap.has(cid)) {
        campaignMap.set(cid, { campaign_id: cid, total_llamadas: 0, contactos_efectivos: 0, dias_activos: 0 });
      }
      const camp = campaignMap.get(cid)!;
      camp.total_llamadas += metric.total_llamadas || 0;
      camp.contactos_efectivos += metric.contactos_efectivos || 0;
      camp.dias_activos += 1;
    }

    const campaigns = Array.from(campaignMap.values()).map((camp) => {
      let type = clasificarCampana(camp.campaign_id);
      if (type === 'unknown') type = fallbackType;
      return {
        ...camp,
        type,
        tasa_contacto_pct:
          camp.total_llamadas > 0
            ? Math.round((camp.contactos_efectivos / camp.total_llamadas) * 1000) / 10
            : 0,
      };
    });

    const tipos = [...new Set(campaigns.map((c) => c.type))];
    return jsonResponse(
      {
        campaigns: campaigns.sort((a, b) => b.total_llamadas - a.total_llamadas),
        widgets_enabled: {
          embudo_cobranza: tipos.includes('collections'),
          embudo_ventas: tipos.includes('sales'),
          kpis_servicio: tipos.includes('service'),
        },
        fallback_type: fallbackType,
        classification_method: 'keywords_with_fallback',
      },
      { headers: { 'Cache-Control': 'private, max-age=600' } }
    );
  } catch (error) {
    log.error('client_campaigns_error', {
      request_id: requestId,
      client_id: auth.client_id,
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse({ error: 'Error obteniendo campaigns', request_id: requestId }, { status: 500 });
  }
});
