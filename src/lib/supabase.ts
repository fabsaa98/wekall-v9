import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://iszodrpublcnsyvtgjcg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_eRRG-QSyURpWV-FstJUc4g_M-xmD6v_';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Tipos
export interface CDRDayMetric {
  fecha: string;
  total_llamadas: number;
  contactos_efectivos: number;
  tasa_contacto_pct: number;
}

export interface CDRCampaignMetric {
  fecha: string;
  campaign_id: string;
  total_llamadas: number;
  contactos_efectivos: number;
  tasa_contacto_pct: number;
}

export interface CDRHourlyMetric {
  fecha: string;
  hora: number;
  total_llamadas: number;
}

// Queries
export async function getLastNDays(n: number): Promise<CDRDayMetric[]> {
  const { data, error } = await supabase
    .from('cdr_daily_metrics')
    .select('fecha, total_llamadas, contactos_efectivos, tasa_contacto_pct')
    .gte('total_llamadas', 5000) // solo días hábiles
    .order('fecha', { ascending: false })
    .limit(n);
  if (error) throw error;
  return (data || []).reverse();
}

export async function getLatestDay(): Promise<CDRDayMetric | null> {
  const days = await getLastNDays(1);
  return days[0] || null;
}

export async function getSparkline(days: number): Promise<number[]> {
  const data = await getLastNDays(days);
  return data.map(d => d.tasa_contacto_pct);
}

export async function getVolumeSparkline(days: number): Promise<number[]> {
  const data = await getLastNDays(days);
  return data.map(d => d.total_llamadas);
}

export async function getLatestCampaigns(): Promise<CDRCampaignMetric[]> {
  const latest = await getLatestDay();
  if (!latest) return [];
  const { data, error } = await supabase
    .from('cdr_campaign_metrics')
    .select('*')
    .eq('fecha', latest.fecha)
    .order('total_llamadas', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getHourlyDistribution(fecha: string): Promise<CDRHourlyMetric[]> {
  const { data, error } = await supabase
    .from('cdr_hourly_metrics')
    .select('*')
    .eq('fecha', fecha)
    .order('hora', { ascending: true });
  if (error) throw error;
  return data || [];
}

// ─── Configuración de cliente (parámetros EBITDA por cliente) ─────────────────
export interface ClientConfig {
  client_id: string;
  client_name: string;
  country: string;           // 'colombia' | 'peru' | 'mexico' | ...
  currency: string;          // 'COP' | 'PEN' | 'MXN' | ...
  costo_agente_mes: number;  // costo real empresa por agente/mes en moneda local
  agentes_activos: number;   // headcount actual
  nomina_total_mes: number;  // nómina total = costo_agente_mes × agentes_activos
  trm_cop?: number;          // TRM si la moneda no es COP
  notas?: string;
  updated_at?: string;
}

export async function getClientConfig(clientId: string): Promise<ClientConfig | null> {
  const { data, error } = await supabase
    .from('client_config')
    .select('*')
    .eq('client_id', clientId)
    .single();
  if (error) return null;
  return data;
}

export async function getActiveClientConfig(): Promise<ClientConfig | null> {
  // Trae el cliente activo (el más reciente o el único configurado)
  const { data, error } = await supabase
    .from('client_config')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();
  if (error) return null;
  return data;
}
