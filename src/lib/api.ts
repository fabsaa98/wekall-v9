import type {
  Transcription, Tag, DashboardKPIs, AgentStats, AIInsight,
  Alert, AlertRule, Hotword, Integration, ChatMessage, ChatConversation, AuditLog,
} from '@/types';

// ─── API-specific types not in types/index.ts ──────────────────────────────

export interface CallsPerDay {
  date: string;
  label: string;
  calls: number;
}

export interface SentimentDistribution {
  name: string;
  value: number;
  color: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface TranscriptionsParams {
  page?: number;
  limit?: number;
  search?: string;
  sentiment?: string;
}

export interface ChatSendResponse {
  message: ChatMessage;
  conversationId: string;
}

// ─── Client ID normalization ──────────────────────────────────────────────

function normalizeClientId(clientId: string): string {
  const mapping: Record<string, string> = {
    'credismart': 'crediminuto',
    'credi': 'crediminuto',
  };
  return mapping[clientId.toLowerCase()] || clientId;
}

/**
 * Resuelve el client_id activo SIN defaults inventados (no fallback a 'credismart').
 * Prioridad: ClientContext (localStorage 'wki_client_id') → URL param → vacío (con warning).
 *
 * Si retorna vacío, las llamadas al backend producirán un error explícito
 * "client_id requerido" — preferible a mostrar datos de otro cliente silenciosamente.
 */
function getActiveClientId(): string {
  // 1. localStorage (set por ClientContext / Login)
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem('wki_client_id');
      if (stored && stored.trim()) return normalizeClientId(stored.trim());
    }
  } catch { /* localStorage unavailable */ }
  // 2. URL param (fallback compatibilidad)
  try {
    if (typeof window !== 'undefined' && window.location) {
      const fromUrl = new URL(window.location.href).searchParams.get('client_id');
      if (fromUrl && fromUrl.trim()) return normalizeClientId(fromUrl.trim());
    }
  } catch { /* SSR / no window */ }
  // 3. Sin cliente activo: log + vacío para que el backend devuelva 4xx visible
  if (typeof console !== 'undefined') {
    console.warn('[api] client_id no disponible en localStorage ni URL. La request fallará con error explícito.');
  }
  return '';
}

// ─── Base fetch ────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  // Use full URL in production (Pages Functions are at /api)
  // In development, proxy via vite.config or use full URL
  const baseUrl = import.meta.env.PROD 
    ? '' // Production: relative paths work with Pages Functions
    : (import.meta.env.VITE_API_URL || ''); // Dev: optional proxy
  
  const res = await fetch(`${baseUrl}/api${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `Error ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ─── API client ───────────────────────────────────────────────────────────

export const api = {
  // Transcriptions - NOW USING REAL API
  getTranscriptions: (params: TranscriptionsParams = {}) => {
    const client_id = getActiveClientId();
    const qs = new URLSearchParams({
      client_id,
      page: String(params.page ?? 1),
      limit: String(params.limit ?? 20),
      search: params.search ?? '',
      sentiment: params.sentiment ?? '',
    });
    return apiFetch<PaginatedResponse<Transcription>>(`/transcriptions/list?${qs}`);
  },

  getTranscription: (id: string) => {
    const client_id = getActiveClientId();
    return apiFetch<Transcription>(`/transcriptions/${id}?client_id=${client_id}`);
  },
  updateTranscription: (id: string, body: { agentName?: string; clientName?: string; clientPhone?: string }) =>
    apiFetch<Transcription>(`/transcriptions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  addTag: (transcriptionId: string, tag: Omit<Tag, 'id'>) =>
    apiFetch<Tag>(`/transcriptions/${transcriptionId}/tags`, {
      method: 'POST',
      body: JSON.stringify(tag),
    }),

  deleteTag: (transcriptionId: string, tagId: string) =>
    apiFetch<void>(`/transcriptions/${transcriptionId}/tags/${tagId}`, {
      method: 'DELETE',
    }),

  // Client Config
  getClientConfig: async (clientId?: string): Promise<any> => {
    const client_id = clientId ? normalizeClientId(clientId) : getActiveClientId();
    return apiFetch(`/client/config?client_id=${client_id}`);
  },

  // Client Campaigns
  getClientCampaigns: async (clientId?: string, days = 7): Promise<any> => {
    const client_id = clientId ? normalizeClientId(clientId) : getActiveClientId();
    return apiFetch(`/client/campaigns?client_id=${client_id}&days=${days}`);
  },

  // Dashboard - NOW USING REAL API
  getDashboardKPIs: async (): Promise<any> => {
    const client_id = getActiveClientId();
    return apiFetch(`/dashboard/kpis?client_id=${client_id}`);
  },

  getCallsPerDay: async (): Promise<CallsPerDay[]> => {
    const client_id = getActiveClientId();
    return apiFetch(`/dashboard/calls-per-day?client_id=${client_id}`);
  },

  getSentimentDistribution: () =>
    apiFetch<SentimentDistribution[]>('/dashboard/sentiment-distribution'),

  getAgentStats: async (): Promise<AgentStats[]> => {
    const client_id = getActiveClientId();
    return apiFetch(`/agents/stats?client_id=${client_id}`);
  },

  getAIInsights: () =>
    apiFetch<AIInsight[]>('/dashboard/ai-insights'),

  // Chat - Vicky AI
  sendMessage: (body: { conversationId?: string; message: string; question?: string }) => {
    const client_id = getActiveClientId();
    return apiFetch<any>('/vicky/chat', {
      method: 'POST',
      body: JSON.stringify({
        question: body.question || body.message,
        client_id,
        conversation_id: body.conversationId,
      }),
    });
  },

  getConversations: () =>
    apiFetch<ChatConversation[]>('/chat/conversations'),

  getConversation: (id: string) =>
    apiFetch<ChatConversation>(`/chat/conversations/${id}`),

  // Alerts
  getAlerts: () =>
    apiFetch<Alert[]>('/alerts'),

  getAlertRules: () =>
    apiFetch<AlertRule[]>('/alert-rules'),

  createAlertRule: (rule: Omit<AlertRule, 'id' | 'triggerCount' | 'createdAt'>) =>
    apiFetch<AlertRule>('/alert-rules', { method: 'POST', body: JSON.stringify(rule) }),

  updateAlertRule: (id: string, data: Partial<AlertRule>) =>
    apiFetch<AlertRule>(`/alert-rules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteAlertRule: (id: string) =>
    apiFetch<void>(`/alert-rules/${id}`, { method: 'DELETE' }),

  // Hotwords
  getHotwords: () =>
    apiFetch<Hotword[]>('/hotwords'),

  createHotword: (hw: Omit<Hotword, 'id'>) =>
    apiFetch<Hotword>('/hotwords', { method: 'POST', body: JSON.stringify(hw) }),

  deleteHotword: (id: string) =>
    apiFetch<void>(`/hotwords/${id}`, { method: 'DELETE' }),

  // Integrations
  getIntegrations: () =>
    apiFetch<Integration[]>('/integrations'),

  updateIntegration: (id: string, data: Partial<Integration>) =>
    apiFetch<Integration>(`/integrations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Audit Logs
  getAuditLogs: () =>
    apiFetch<AuditLog[]>('/audit-logs'),
};
