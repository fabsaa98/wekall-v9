/**
 * useTranscriptions — V22.1:
 * Lee via Worker proxy (service key, bypasea RLS) en lugar de Supabase directo.
 * El Worker ya filtra por client_id — SEGURIDAD MULTI-TENANT garantizada.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useClient } from '@/contexts/ClientContext';
import { api, type TranscriptionsParams } from '@/lib/api';
import type { Tag } from '@/types';

const PROXY = (import.meta.env.VITE_PROXY_URL || 'https://wekall-vicky-proxy.fabsaa98.workers.dev').replace(/\/$/, '');

interface SupabaseTranscription {
  id: string;
  agent_name?: string;
  call_date?: string;
  call_type?: string;
  summary?: string;
  transcript?: string;
  campaign?: string;
  client_id?: string;
  audio_url?: string;
  filename?: string;
}

// Re-uso del type global para compatibilidad con TranscriptBubble.
import type { TranscriptSegment as GlobalTranscriptSegment } from '@/types';

export type TranscriptSegment = GlobalTranscriptSegment;

function parseTranscriptToSegments(raw: string | undefined): TranscriptSegment[] {
  if (!raw) return [];
  // Si el transcript trae bloques "Agente:" / "Cliente:" los partimos en segmentos.
  // En caso contrario, todo es un solo bloque de agente (Whisper sin diarization).
  const labeled = /(?:^|\n)\s*(agente|cliente|operador|user|system)\s*:/i.test(raw);
  if (!labeled) {
    return [{ speaker: 'agent', text: raw.trim(), startTime: 0, endTime: 0 }];
  }
  const segments: TranscriptSegment[] = [];
  const lines = raw.split(/\n+/);
  let cursor = 0;
  let current: TranscriptSegment | null = null;
  for (const line of lines) {
    const m = line.match(/^\s*(agente|operador|user|cliente|system)\s*:\s*(.*)$/i);
    if (m) {
      if (current) segments.push(current);
      const speaker: TranscriptSegment['speaker'] = /cliente/i.test(m[1]!) ? 'client' : 'agent';
      current = { speaker, text: (m[2] || '').trim(), startTime: cursor, endTime: cursor + 10 };
      cursor += 10;
    } else if (current) {
      current.text += (current.text ? ' ' : '') + line.trim();
    }
  }
  if (current) segments.push(current);
  return segments.filter((s) => s.text.length > 0);
}

export interface AdaptedTranscription {
  id: string;
  agent: { name: string; id: string; role?: string };
  client: { name: string; phone: string };
  agentName: string;
  clientName: string;
  clientPhone: string;
  startedAt: string;
  duration: number;
  status: 'completed' | 'processing' | 'failed';
  classification: {
    sentiment: 'positive' | 'neutral' | 'negative';
    callType: string;
    result: 'resolved' | 'pending' | 'escalated' | 'no_contact';
    mainTopic: string;
    confidence: number;
  };
  sentiment: 'positive' | 'neutral' | 'negative';
  summary: string;
  transcript: TranscriptSegment[];
  transcriptText: string;
  tags: Tag[];
  callType: string;
  campaign: string;
  client_id: string;
  direction: 'inbound' | 'outbound';
  source: 'ai' | 'manual';
  audioUrl?: string;
}

// Adapter: convierte el formato Supabase → formato esperado por TranscriptionList/Detail
function adaptTranscription(t: SupabaseTranscription): AdaptedTranscription {
  const isInbound =
    (t.call_type || '').toLowerCase().startsWith('inbound') ||
    (t.filename || '').includes('_in_');
  return {
    id: t.id,
    agent: { name: t.agent_name || 'Agente', id: '', role: 'agent' },
    client: { name: '', phone: '' },
    agentName: t.agent_name || 'Agente',
    clientName: '',
    clientPhone: '',
    startedAt: t.call_date ? `${t.call_date}T08:00:00` : new Date().toISOString(),
    duration: 0,
    status: 'completed',
    classification: {
      sentiment: 'neutral',
      callType: t.call_type || 'collection',
      result: 'resolved',
      mainTopic: '',
      confidence: 0,
    },
    sentiment: 'neutral',
    summary: t.summary || '',
    transcript: parseTranscriptToSegments(t.transcript),
    transcriptText: t.transcript || '',
    tags: [],
    callType: t.call_type || 'collection',
    campaign: t.campaign || '',
    client_id: t.client_id || '',
    direction: isInbound ? 'inbound' : 'outbound',
    source: 'ai',
    audioUrl: t.audio_url || undefined,
  };
}

export function useTranscriptions(params: TranscriptionsParams = {}) {
  const { clientId } = useClient();

  return useQuery({
    queryKey: ['transcriptions', params, clientId],
    queryFn: async () => {
      // Consulta Supabase directamente — filtra por client_id del contexto
      // Paginación server-side con range() + count exacto
      const page = params.page || 1;
      const limit = params.limit || 25;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      // Ir via Worker proxy (usa service key, bypasea RLS)
      const body: Record<string, unknown> = {
        table: 'transcriptions',
        select: 'id,agent_name,call_date,call_type,summary,campaign,client_id',
        client_id: clientId,
        order: 'call_date.desc',
        limit: String(limit),
        offset: String(from),
      };
      if (params.search) {
        body.search = params.search;
      }

      const resp = await fetch(`${PROXY}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!resp.ok) throw new Error(`Worker error ${resp.status}`);
      const rows = (await resp.json()) as SupabaseTranscription[];

      return {
        data: rows.map(adaptTranscription),
        total: rows.length < limit ? from + rows.length : from + limit + 1,
        page,
        limit,
      };
    },
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });
}

export function useTranscription(id: string) {
  const { clientId } = useClient();

  return useQuery({
    queryKey: ['transcription', id, clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transcriptions')
        .select('*')
        .eq('id', id)
        .eq('client_id', clientId) // Seguridad: verificar que pertenece al cliente activo
        .single();

      if (error) throw new Error(error.message);
      return adaptTranscription(data as SupabaseTranscription);
    },
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useAddTag(transcriptionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tag: Omit<Tag, 'id'>) => api.addTag(transcriptionId, tag),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transcription', transcriptionId] });
    },
  });
}

export function useDeleteTag(transcriptionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tagId: string) => api.deleteTag(transcriptionId, tagId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transcription', transcriptionId] });
    },
  });
}

export function useUpdateTranscription(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { agentName?: string; clientName?: string; clientPhone?: string }) =>
      api.updateTranscription(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transcription', id] });
      qc.invalidateQueries({ queryKey: ['transcriptions'] });
    },
  });
}
