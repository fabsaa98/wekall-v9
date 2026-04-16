/**
 * vicky-mocks.ts
 * Mocks compartidos para los tests UAT de Vicky Insights.
 * Datos reales de Crediminuto / CrediSmart.
 */

import type { ClientConfig } from '@/contexts/ClientContext';
import type { CDRDayMetric } from '@/lib/supabase';
import type { ChatMessage } from '@/data/mockData';

// ─── ClientConfig mock ────────────────────────────────────────────────────────

export const mockClientConfig: ClientConfig = {
  client_id: 'credismart',
  client_name: 'CrediSmart / Crediminuto',
  industry: 'cobranzas',
  country: 'colombia',
  currency: 'COP',
  agentes_activos: 81,
  costo_agente_mes: 3000000,
  nomina_total_mes: 243000000,
  trm_cop: 4100,
  active: true,
};

// ─── CDR data mocks ───────────────────────────────────────────────────────────

export const mockLatestDay: CDRDayMetric = {
  fecha: '2026-04-13',
  total_llamadas: 16129,
  contactos_efectivos: 6952,
  tasa_contacto_pct: 43.1,
  aht_minutos: 8.1,
};

export function buildMockLast30Days(): CDRDayMetric[] {
  const days: CDRDayMetric[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date('2026-04-13');
    d.setDate(d.getDate() - i);
    days.push({
      fecha: d.toISOString().split('T')[0],
      total_llamadas: 14000 + Math.round(Math.random() * 4000),
      contactos_efectivos: 5800 + Math.round(Math.random() * 2000),
      tasa_contacto_pct: 38 + Math.round(Math.random() * 12 * 10) / 10,
      aht_minutos: 7.5 + Math.round(Math.random() * 1.5 * 10) / 10,
    });
  }
  return days;
}

export const mockLast30Days = buildMockLast30Days();

export const mockCDRData = {
  loading: false,
  error: null,
  latestDay: mockLatestDay,
  last30Days: mockLast30Days,
  last7Days: mockLast30Days.slice(-7),
  sparklineTasa: mockLast30Days.map(d => d.tasa_contacto_pct),
  sparklineVolumen: mockLast30Days.map(d => d.total_llamadas),
  promedio7dTasa: 42.5,
  promedio30dTasa: 43.1,
  deltaTasa: 0.6,
  anomaly: null,
  forecast: [],
};

export const mockCDRDataEmpty = {
  loading: false,
  error: null,
  latestDay: null,
  last30Days: [],
  last7Days: [],
  sparklineTasa: [],
  sparklineVolumen: [],
  promedio7dTasa: 0,
  promedio30dTasa: 0,
  deltaTasa: 0,
  anomaly: null,
  forecast: [],
};

// ─── Worker proxy response mocks ──────────────────────────────────────────────

export const mockWorkerResponses = {
  chat_success: {
    choices: [{
      message: {
        content: 'Tu operación está funcionando bien. La tasa de contacto es del 43.1% y tienes 16,129 llamadas diarias.',
        role: 'assistant',
      },
      finish_reason: 'stop',
    }],
    usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
  },
  chat_error: {
    error: { message: 'Service unavailable', type: 'server_error', code: 503 },
  },
  unauthorized: {
    status: 401,
    error: 'Unauthorized',
  },
  rag_success: {
    choices: [{
      message: {
        content: 'Joel Jose tiene 160 llamadas promedio por día, está en el top 10 de la operación.',
        role: 'assistant',
      },
      finish_reason: 'stop',
    }],
  },
};

// ─── OPS mocks ────────────────────────────────────────────────────────────────

export const mockOPSVacio = {
  llamadasTotales: 0,
  contactosEfectivos: 0,
  tasaContacto: 0,
  promesasPago: 0,
  tasaPromesa: 0,
  agentesActivos: 0,
  promedioLlamadasAgente: 0,
  p10Agentes: 0,
  p25Agentes: 0,
  p50Agentes: 0,
  p75Agentes: 0,
  p90Agentes: 0,
  topAgente: 0,
  ahtMinutos: 0,
  horasTrabajo: 8,
  diasLaborales: 22,
  costoAgenteMes: 0,
  nominaActivaMes: 0,
  costoAgentePorMinuto: 0,
  currency: 'COP',
  country: 'colombia',
  trmCopUsd: 4100,
};

export const mockOPSCargado = {
  llamadasTotales: 16129,
  contactosEfectivos: 6952,
  tasaContacto: 0.431,
  promesasPago: 2780,
  tasaPromesa: 0.4,
  agentesActivos: 81,
  promedioLlamadasAgente: 110.7,
  p10Agentes: 49,
  p25Agentes: 76,
  p50Agentes: 120,
  p75Agentes: 143,
  p90Agentes: 154,
  topAgente: 261,
  ahtMinutos: 8.1,
  horasTrabajo: 8,
  diasLaborales: 22,
  costoAgenteMes: 3000000,
  nominaActivaMes: 243000000,
  costoAgentePorMinuto: 284,
  currency: 'COP',
  country: 'colombia',
  trmCopUsd: 4100,
};

// ─── ChatMessage mocks ────────────────────────────────────────────────────────

export const mockUserMessage: ChatMessage = {
  id: 'user-001',
  role: 'user',
  content: '¿cómo está mi negocio?',
  timestamp: new Date('2026-04-13T10:00:00'),
};

export const mockVickyMessage: ChatMessage = {
  id: 'vicky-001',
  role: 'vicky',
  content: 'Tu operación tiene una tasa de contacto del 43.1%, con 16,129 llamadas procesadas.',
  timestamp: new Date('2026-04-13T10:00:05'),
  sources: ['CDR Supabase · datos reales'],
  confidence: 'Alta',
  rootCauses: [
    { label: 'Tasa de contacto baja', impact: 75, color: '#ef4444' },
    { label: 'AHT elevado', impact: 45, color: '#f97316' },
  ],
  followUps: ['¿Qué agentes rinden mejor?', '¿Cuánto ahorro si bajo el AHT?'],
  reasoning: 'Analicé el CDR histórico: tasa promedio 43.1%, AHT 8.1 min.',
};

export const mockVickyMessageNoConfidence: ChatMessage = {
  id: 'vicky-002',
  role: 'vicky',
  content: 'Estoy procesando tu consulta.',
  timestamp: new Date('2026-04-13T10:01:00'),
};

export const mockVickyMessageNoRootCauses: ChatMessage = {
  id: 'vicky-003',
  role: 'vicky',
  content: 'La operación funciona correctamente.',
  timestamp: new Date('2026-04-13T10:02:00'),
  confidence: 'Media',
  rootCauses: [],
};

// ─── Supabase getActiveClientConfig mock ─────────────────────────────────────

export const mockGetActiveClientConfig = {
  id: 'credismart',
  client_id: 'credismart',
  client_name: 'CrediSmart / Crediminuto',
  industry: 'cobranzas',
  country: 'colombia',
  currency: 'COP',
  agentes_activos: 81,
  costo_agente_mes: 3000000,
  nomina_total_mes: 243000000,
};
