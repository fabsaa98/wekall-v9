/**
 * GET /api/client/campaigns?client_id=credismart
 * 
 * Retorna campañas activas del cliente clasificadas por tipo
 * Clasificación: keywords en nombre → fallback a business_type
 */

interface Env {
  WORKER_PROXY_URL?: string;
}

function normalizeClientId(clientId: string): string {
  const mapping: Record<string, string> = {
    'credismart': 'crediminuto',
    'credi': 'crediminuto',
  };
  return mapping[clientId.toLowerCase()] || clientId;
}

function clasificarCampana(campaignName: string): 'collections' | 'sales' | 'service' | 'unknown' {
  const nombre = campaignName.toLowerCase();
  
  // Keywords por tipo de campaña
  const patterns = {
    collections: /cobranza|cobro|recupera|cartera|mora|deuda|ptp|rpc|promesa|pago|vencid|gestion.*deuda/i,
    sales: /venta|comercial|lead|prospecto|cierre|cotiza|oferta|upsell|cross.*sell|telesale|prospección/i,
    service: /servicio|soporte|ayuda|reclamo|ticket|incidencia|atencion.*cliente|mesa.*ayuda|support/i,
  };
  
  if (patterns.collections.test(nombre)) return 'collections';
  if (patterns.sales.test(nombre)) return 'sales';
  if (patterns.service.test(nombre)) return 'service';
  
  return 'unknown';
}

export async function onRequestGet(context: { request: Request; env: Env }) {
  const { request, env } = context;
  const url = new URL(request.url);
  const rawClientId = url.searchParams.get('client_id') || 'credismart';
  const client_id = normalizeClientId(rawClientId);
  const days = parseInt(url.searchParams.get('days') || '7', 10);

  const WORKER_PROXY_URL = env.WORKER_PROXY_URL || 'https://wekall-vicky-proxy.fabsaa98.workers.dev';

  try {
    // Fetch client config para fallback
    const configRes = await fetch(`${url.origin}/api/client/config?client_id=${client_id}`);
    const clientConfig = await configRes.json();
    const fallbackType = clientConfig.business_type || 'service';

    // Calcular fecha de inicio
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    // Fetch campañas activas (últimos N días)
    const metricsRes = await fetch(`${WORKER_PROXY_URL}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'cdr_campaign_metrics',
        select: 'campaign_id,total_llamadas,contactos_efectivos,tasa_contacto_pct,fecha',
        limit: 1000,
      }),
    });

    if (!metricsRes.ok) {
      throw new Error(`Worker query failed: ${metricsRes.status}`);
    }

    const allMetrics = await metricsRes.json();
    
    // Filtrar por client_id (si está disponible) y fecha
    const recentMetrics = allMetrics.filter((m: any) => 
      (!m.client_id || m.client_id === client_id) && 
      m.fecha >= startDateStr
    );

    // Agrupar por campaign_id
    const campaignMap = new Map<string, any>();
    
    for (const metric of recentMetrics) {
      const cid = metric.campaign_id;
      if (!campaignMap.has(cid)) {
        campaignMap.set(cid, {
          campaign_id: cid,
          total_llamadas: 0,
          contactos_efectivos: 0,
          dias_activos: 0,
        });
      }
      
      const camp = campaignMap.get(cid)!;
      camp.total_llamadas += metric.total_llamadas || 0;
      camp.contactos_efectivos += metric.contactos_efectivos || 0;
      camp.dias_activos += 1;
    }

    // Clasificar cada campaña
    const campaigns = Array.from(campaignMap.values()).map(camp => {
      let type = clasificarCampana(camp.campaign_id);
      
      if (type === 'unknown') {
        console.warn(`[campaigns] Campaña "${camp.campaign_id}" sin clasificar, usando fallback: ${fallbackType}`);
        type = fallbackType as any;
      }
      
      return {
        ...camp,
        type,
        tasa_contacto_pct: camp.total_llamadas > 0 
          ? Math.round((camp.contactos_efectivos / camp.total_llamadas) * 1000) / 10 
          : 0,
      };
    });

    // Determinar widgets a habilitar
    const tipos = [...new Set(campaigns.map(c => c.type))];
    
    const widgets_enabled = {
      embudo_cobranza: tipos.includes('collections'),
      embudo_ventas: tipos.includes('sales'),
      kpis_servicio: tipos.includes('service'),
    };

    return new Response(
      JSON.stringify({
        campaigns: campaigns.sort((a, b) => b.total_llamadas - a.total_llamadas),
        widgets_enabled,
        fallback_type: fallbackType,
        classification_method: 'keywords_with_fallback',
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=600', // 10 min cache
        },
      }
    );
  } catch (error) {
    console.error('[client/campaigns] Error:', error);
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
