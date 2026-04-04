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
