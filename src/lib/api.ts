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
  const res = await fetch(`/api${path}`, {
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

  // Dashboard
  getDashboardKPIs: () =>
    apiFetch<DashboardKPIs>('/dashboard/kpis'),

  getCallsPerDay: () =>
    apiFetch<CallsPerDay[]>('/dashboard/calls-per-day'),

  getSentimentDistribution: () =>
    apiFetch<SentimentDistribution[]>('/dashboard/sentiment-distribution'),

  getAgentStats: () =>
    apiFetch<AgentStats[]>('/dashboard/agent-stats'),

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
