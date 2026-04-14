import { createClient } from '@supabase/supabase-js';

// ⚠️ Security: load from env vars; fallback only for local dev (never commit real keys to source)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string || 'https://iszodrpublcnsyvtgjcg.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string || 'sb_publishable_eRRG-QSyURpWV-FstJUc4g_M-xmD6v_';

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
 * Sign in via Worker proxy — evita bloqueos del cliente JS de Supabase en redes móviles.
 * El Worker llama a Supabase Auth REST directamente y retorna { access_token, refresh_token, user, client_id }.
 * @param clientIdHint — client_id explícito (ej. desde preset URL). El Worker lo prioriza sobre user_metadata.
 */
export async function signIn(email: string, password: string, clientIdHint?: string) {
  const PROXY = (import.meta.env.VITE_PROXY_URL || 'https://wekall-vicky-proxy.fabsaa98.workers.dev').replace(/\/$/, '');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const resp = await fetch(`${PROXY}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, ...(clientIdHint ? { client_id_hint: clientIdHint } : {}) }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({})) as Record<string, string>;
      throw new Error(err.error || 'auth_error');
    }

    const json = await resp.json() as { access_token: string; refresh_token: string; user: { email: string; user_metadata?: Record<string, unknown> }; client_id: string | null };

    // Sincronizar sesión con el cliente de supabase (con timeout corto para no bloquear)
    if (json.access_token) {
      try {
        await Promise.race([
          supabase.auth.setSession({
            access_token: json.access_token,
            refresh_token: json.refresh_token,
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('setSession timeout')), 3000)),
        ]);
      } catch {
        // Si setSession falla/timeout, la app sigue funcionando con las keys anon
      }
    }

    return json; // { access_token, refresh_token, user, client_id }
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') throw new Error('auth_timeout');
    throw err;
  }
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
  aht_minutos?: number;
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

// ─── Proxy helper — enruta queries por el Worker para evitar bloqueos en redes móviles ──

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

// Queries
export async function getLastNDays(n: number, clientId: string, minLlamadas?: number): Promise<CDRDayMetric[]> {
  // [Security] clientId requerido — sin fallback para evitar data leak entre tenants
  if (!clientId) {
    console.error('[Security] getLastNDays: clientId requerido — abortando query');
    return [];
  }
  // minLlamadas: si no se pasa, usar 1 (sin filtro mínimo) — cada cliente tiene volúmenes distintos
  // El filtro de volumen mínimo debe aplicarse en la capa de presentación usando alert_volumen_minimo del client_config
  const min = minLlamadas ?? 1;
  const data = await proxyQuery<CDRDayMetric[]>({
    table: 'cdr_daily_metrics',
    select: 'fecha,total_llamadas,contactos_efectivos,tasa_contacto_pct',
    filters: {
      'client_id': `eq.${clientId}`,
      'total_llamadas': `gte.${min}`,
    },
    order: 'fecha.desc',
    limit: n,
  });
  return (data || []).reverse();
}

export async function getLatestDay(clientId: string): Promise<CDRDayMetric | null> {
  if (!clientId) {
    console.error('[Security] getLatestDay: clientId requerido — abortando query');
    return null;
  }
  const days = await getLastNDays(1, clientId);
  return days[0] || null;
}

export async function getSparkline(days: number, clientId: string): Promise<number[]> {
  if (!clientId) {
    console.error('[Security] getSparkline: clientId requerido — abortando query');
    return [];
  }
  const data = await getLastNDays(days, clientId);
  return data.map(d => d.tasa_contacto_pct);
}

export async function getVolumeSparkline(days: number, clientId: string): Promise<number[]> {
  if (!clientId) {
    console.error('[Security] getVolumeSparkline: clientId requerido — abortando query');
    return [];
  }
  const data = await getLastNDays(days, clientId);
  return data.map(d => d.total_llamadas);
}

export async function getLatestCampaigns(clientId: string): Promise<CDRCampaignMetric[]> {
  if (!clientId) {
    console.error('[Security] getLatestCampaigns: clientId requerido — abortando query');
    return [];
  }
  const latest = await getLatestDay(clientId);
  if (!latest) return [];
  const data = await proxyQuery<CDRCampaignMetric[]>({
    table: 'cdr_campaign_metrics',
    select: '*',
    filters: { 'fecha': `eq.${latest.fecha}` },
    order: 'total_llamadas.desc',
  });
  return data || [];
}

export async function getHourlyDistribution(fecha: string): Promise<CDRHourlyMetric[]> {
  const data = await proxyQuery<CDRHourlyMetric[]>({
    table: 'cdr_hourly_metrics',
    select: '*',
    filters: { 'fecha': `eq.${fecha}` },
    order: 'hora.asc',
  });
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
  const data = await proxyQuery<ClientConfig[]>({
    table: 'client_config',
    select: '*',
    filters: { 'client_id': `eq.${clientId}` },
    limit: 1,
  });
  return data?.[0] ?? null;
}

export async function getActiveClientConfig(): Promise<ClientConfig | null> {
  const data = await proxyQuery<ClientConfig[]>({
    table: 'client_config',
    select: '*',
    order: 'updated_at.desc',
    limit: 1,
  });
  return data?.[0] ?? null;
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
  // [Security] client_id requerido — sin fallback para evitar data leak entre tenants
  if (!entry.client_id) {
    console.error('[Security] insertAlertLog: client_id requerido — abortando insert');
    return;
  }
  // INSERT goes direct — proxy only supports GET queries; writes use supabase client directly
  const { error } = await supabase
    .from('alert_log')
    .insert({
      ...entry,
      source: entry.source ?? 'cdr_daily_metrics',
    });
  if (error) throw error;
}

export async function getRecentAlertLog(clientId: string, limit = 10): Promise<AlertLogEntry[]> {
  // [Security] clientId requerido — sin fallback para evitar data leak entre tenants
  if (!clientId) {
    console.error('[Security] getRecentAlertLog: clientId requerido — abortando query');
    return [];
  }
  const data = await proxyQuery<AlertLogEntry[]>({
    table: 'alert_log',
    select: '*',
    filters: { 'client_id': `eq.${clientId}` },
    order: 'fired_at.desc',
    limit,
  });
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
      model_used: entry.model_used ?? 'gpt-4o',
    });
  if (error) throw error;
}

export async function getVickyHistory(clientId: string, sessionId?: string, limit = 20): Promise<VickyConversation[]> {
  // [Security] clientId requerido — sin fallback para evitar data leak entre tenants
  if (!clientId) {
    console.error('[Security] getVickyHistory: clientId requerido — abortando query');
    return [];
  }
  const filters: Record<string, string> = { 'client_id': `eq.${clientId}` };
  if (sessionId) filters['session_id'] = `eq.${sessionId}`;
  const data = await proxyQuery<VickyConversation[]>({
    table: 'vicky_conversations',
    select: '*',
    filters,
    order: 'created_at.desc',
    limit,
  });
  return (data || []) as VickyConversation[];
}
