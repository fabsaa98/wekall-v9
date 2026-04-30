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
  // Transcriptions
  getTranscriptions: (params: TranscriptionsParams = {}) => {
    const qs = new URLSearchParams({
      page: String(params.page ?? 1),
      limit: String(params.limit ?? 20),
      search: params.search ?? '',
      sentiment: params.sentiment ?? '',
    });
    return apiFetch<PaginatedResponse<Transcription>>(`/transcriptions?${qs}`);
  },

  getTranscription: (id: string) =>
    apiFetch<Transcription>(`/transcriptions/${id}`),
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

  // Dashboard - NOW USING REAL API
  getDashboardKPIs: async (): Promise<any> => {
    // Call real API endpoint
    const url = new URL(window.location.href);
    const client_id = url.searchParams.get('client_id') || 'credismart';
    return apiFetch(`/dashboard/kpis?client_id=${client_id}`);
  },

  getCallsPerDay: async (): Promise<CallsPerDay[]> => {
    const url = new URL(window.location.href);
    const client_id = url.searchParams.get('client_id') || 'credismart';
    return apiFetch(`/dashboard/calls-per-day?client_id=${client_id}`);
  },

  getSentimentDistribution: () =>
    apiFetch<SentimentDistribution[]>('/dashboard/sentiment-distribution'),

  getAgentStats: async (): Promise<AgentStats[]> => {
    const url = new URL(window.location.href);
    const client_id = url.searchParams.get('client_id') || 'credismart';
    return apiFetch(`/agents/stats?client_id=${client_id}`);
  },

  getAIInsights: () =>
    apiFetch<AIInsight[]>('/dashboard/ai-insights'),

  // Chat
  sendMessage: (body: { conversationId?: string; message: string }) =>
    apiFetch<ChatSendResponse>('/chat', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

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
