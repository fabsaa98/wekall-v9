export interface Participant {
  name: string;
  role: string;
  extension?: string;
  phone?: string;
  avatar?: string;
}

export interface TranscriptSegment {
  speaker: 'agent' | 'client';
  text: string;
  startTime: number;
  endTime: number;
  confidence?: number;
}

export interface Tag {
  id: string;
  label: string;
  source: 'ai' | 'manual';
  category?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface AIClassification {
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  callType: 'sale' | 'support' | 'collection' | 'informational' | 'complaint' | 'other';
  mainTopic: string;
  result: 'resolved' | 'pending' | 'escalated' | 'no_contact';
  confidence: number;
}

export interface Transcription {
  id: string;
  tenantId: string;
  callId: string;
  agent: Participant;
  client: Participant;
  direction: 'inbound' | 'outbound';
  startedAt: string;
  duration: number;
  status: 'completed' | 'processing' | 'failed';
  transcript: TranscriptSegment[];
  summary: string;
  classification: AIClassification;
  tags: Tag[];
  language: string;
  audioUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type Vertical = 'ventas' | 'servicio_cx' | 'cobranzas';

export const verticalColors: Record<Vertical, { bg: string; text: string; label: string; accent: string }> = {
  ventas: { bg: 'bg-primary/10', text: 'text-primary', label: 'Ventas', accent: 'hsl(var(--wk-violet))' },
  servicio_cx: { bg: 'bg-[hsl(var(--wk-blue))]/10', text: 'text-[hsl(var(--wk-blue))]', label: 'Servicio CX', accent: 'hsl(var(--wk-blue))' },
  cobranzas: { bg: 'bg-[hsl(var(--wk-green))]/10', text: 'text-[hsl(var(--wk-green-dark))]', label: 'Cobranzas', accent: 'hsl(var(--wk-green))' },
};

export interface KPIMetric {
  key: string;
  label: string;
  value: string;
  change: number;
  changeLabel?: string;
  description: string;
  icon: string;
  color?: string;
  tooltip?: string;
  invertColor?: boolean;
}

export interface DashboardKPIs {
  universal: KPIMetric[];
  ventas: KPIMetric[];
  servicio_cx: KPIMetric[];
  cobranzas: KPIMetric[];
}

// Keep legacy for backward compat
export interface DashboardKPI {
  totalCalls: number;
  avgDuration: number;
  positivePercent: number;
  complaintsCount: number;
  changeVsYesterday: {
    totalCalls: number;
    avgDuration: number;
    positivePercent: number;
    complaintsCount: number;
  };
}

export interface AIInsight {
  id: string;
  text: string;
  vertical?: Vertical;
  createdAt: string;
}

export interface AlertRule {
  id: string;
  name: string;
  conditions: {
    field: string;
    operator: 'equals' | 'contains' | 'greater_than' | 'less_than';
    value: string;
    logic?: 'AND' | 'OR';
  }[];
  severity: 'critical' | 'warning' | 'info';
  channels: ('email' | 'slack' | 'webhook')[];
  active: boolean;
  triggerCount: number;
  createdAt: string;
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  transcriptionId: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  channel: string;
  sentAt: string;
}

export interface Hotword {
  id: string;
  word: string;
  category: 'proper_name' | 'company' | 'product' | 'other';
  boost: number;
}

export interface Integration {
  id: string;
  type: 'hubspot' | 'salesforce' | 'webhook' | 'zoho';
  name: string;
  description: string;
  status: 'connected' | 'disconnected' | 'error' | 'coming_soon';
  config: {
    sendSummary: boolean;
    sendTranscript: boolean;
    sendTags: boolean;
    webhookUrl?: string;
  };
  lastSync?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: {
    transcriptionId: string;
    agentName: string;
    date: string;
    timestamp: string;
  }[];
  createdAt: string;
}

export interface ChatConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
}

export interface AuditLog {
  id: string;
  user: string;
  action: 'view' | 'search' | 'export' | 'chat' | 'edit' | 'delete';
  callId?: string;
  details: string;
  timestamp: string;
}

export interface AgentStats {
  agent: Participant;
  vertical: Vertical;
  totalCalls: number;
  avgDuration: number;
  sentimentScore: number;
  talkToListenRatio: string;
  topTopics: string[];
}
