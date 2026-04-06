import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://iszodrpublcnsyvtgjcg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_eRRG-QSyURpWV-FstJUc4g_M-xmD6v_';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AppUser {
  id?: string;
  email: string;
  client_id: string;
  role: string;
  name?: string;
  active?: boolean;
  auth_id?: string;
}

/**
 * Sign in con email y password usando Supabase Auth real.
 * Si la cuenta no existe en auth.users, lanzará error (lo captura Login.tsx para fallback).
 */
export async function signIn(email: string, password: string) {
  // Timeout de 8 segundos para evitar esperas de 30s+
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('auth_timeout')), 8000)
  );
  const authPromise = supabase.auth.signInWithPassword({ email, password });
  const result = await Promise.race([authPromise, timeoutPromise]) as Awaited<typeof authPromise>;
  const { data, error } = result;
  if (error) throw error;
  return data;
}

/** Sign out de Supabase Auth */
export async function signOut() {
  await supabase.auth.signOut();
}

/** Obtener sesión activa de Supabase Auth */
export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/**
 * Obtener el registro de app_users para el usuario autenticado.
 * Si se pasa clientId, filtra también por client_id (soporte multi-tenant por email).
 */
export async function getAppUser(email: string, clientId?: string): Promise<AppUser | null> {
  let query = supabase
    .from('app_users')
    .select('*')
    .eq('email', email)
    .eq('active', true);

  if (clientId) {
    query = query.eq('client_id', clientId);
  }

  // Usar .limit(1) en vez de .maybeSingle() — un email puede tener múltiples clientes (multi-tenant)
  const { data } = await query.limit(1);
  return data?.[0] ?? null;
}

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
export async function getLastNDays(n: number, clientId = 'credismart'): Promise<CDRDayMetric[]> {
  const { data, error } = await supabase
    .from('cdr_daily_metrics')
    .select('fecha, total_llamadas, contactos_efectivos, tasa_contacto_pct')
    .eq('client_id', clientId)
    .gte('total_llamadas', 5000) // solo días hábiles
    .order('fecha', { ascending: false })
    .limit(n);
  if (error) throw error;
  return (data || []).reverse();
}

export async function getLatestDay(clientId = 'credismart'): Promise<CDRDayMetric | null> {
  const days = await getLastNDays(1, clientId);
  return days[0] || null;
}

export async function getSparkline(days: number, clientId = 'credismart'): Promise<number[]> {
  const data = await getLastNDays(days, clientId);
  return data.map(d => d.tasa_contacto_pct);
}

export async function getVolumeSparkline(days: number, clientId = 'credismart'): Promise<number[]> {
  const data = await getLastNDays(days, clientId);
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

// ─── Client Branding ──────────────────────────────────────────────────────────

export interface ClientBranding {
  client_id: string;
  logo_url: string | null;
  primary_color: string;
  company_name: string;
  tagline: string | null;
  website_url: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
  facebook_url: string | null;
  industry_description: string | null;
  contact_email: string | null;
  phone: string | null;
  updated_at: string;
}

// ─── Configuración de cliente (parámetros EBITDA por cliente) ─────────────────
export interface ClientConfig {
  client_id: string;
  client_name: string;
  industry?: string;
  country?: string;           // 'colombia' | 'peru' | 'mexico' | ...
  currency?: string;          // 'COP' | 'PEN' | 'MXN' | ...
  timezone?: string;
  active?: boolean;
  costo_agente_mes?: number;  // costo real empresa por agente/mes en moneda local
  agentes_activos?: number;   // headcount actual
  nomina_total_mes?: number;  // nómina total = costo_agente_mes × agentes_activos
  trm_cop?: number;           // TRM si la moneda no es COP
  notas?: string;
  created_at?: string;
  updated_at?: string;
  // Fix 1B: umbrales de alerta dinámicos por cliente (columnas en Supabase)
  alert_tasa_critica?: number;    // % — tasa de contacto crítica (default 30)
  alert_tasa_warning?: number;    // % — tasa de contacto warning (default 38)
  alert_delta_critico?: number;   // pp — caída vs 7d crítica (default -5)
  alert_delta_warning?: number;   // pp — caída vs 7d warning (default -2.5)
  alert_volumen_minimo?: number;  // llamadas/día mínimo (default 5000)
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

// ─── Alert Log ────────────────────────────────────────────────────────────────

export interface AlertLogEntry {
  id?: number;
  fired_at?: string;
  severity: 'critical' | 'warning' | 'info';
  metric: string;
  title: string;
  description?: string;
  threshold?: number;
  actual_value?: number;
  source?: string;
  client_id?: string;
  notified?: boolean;
  metadata?: Record<string, unknown>;
}

export async function insertAlertLog(entry: AlertLogEntry): Promise<void> {
  const { error } = await supabase
    .from('alert_log')
    .insert({
      ...entry,
      source: entry.source ?? 'cdr_daily_metrics',
      client_id: entry.client_id ?? 'credismart',
    });
  if (error) throw error;
}

export async function getRecentAlertLog(limit = 10): Promise<AlertLogEntry[]> {
  const { data, error } = await supabase
    .from('alert_log')
    .select('*')
    .order('fired_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as AlertLogEntry[];
}

// ─── Vicky Conversations ──────────────────────────────────────────────────────

export interface VickyConversation {
  id?: number;
  session_id: string;
  created_at?: string;
  client_id?: string;
  question: string;
  answer: string;
  confidence?: 'Alta' | 'Media' | 'Baja';
  sources?: string[];
  follow_ups?: string[];
  model_used?: string;
  tokens_used?: number;
  latency_ms?: number;
}

export async function saveVickyConversation(entry: VickyConversation): Promise<void> {
  const { error } = await supabase
    .from('vicky_conversations')
    .insert({
      ...entry,
      client_id: entry.client_id ?? 'credismart',
      model_used: entry.model_used ?? 'gpt-4o',
    });
  if (error) throw error;
}

export async function getVickyHistory(sessionId?: string, limit = 20): Promise<VickyConversation[]> {
  let query = supabase
    .from('vicky_conversations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (sessionId) {
    query = query.eq('session_id', sessionId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as VickyConversation[];
}
