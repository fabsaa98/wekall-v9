import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type TranscriptionsParams } from '@/lib/api';
import type { Tag } from '@/types';
import { useClient } from '@/contexts/ClientContext';

const PROXY_URL = (import.meta.env.VITE_PROXY_URL || 'https://wekall-vicky-proxy.fabsaa98.workers.dev').replace(/\/$/, '');

interface SupabaseTranscription {
  id: string;
  agent_name?: string;
  call_date?: string;
  call_type?: string;
  summary?: string;
  transcript?: string;
  campaign?: string;
  client_id?: string;
}

// Adapter: convierte el formato Supabase → formato esperado por TranscriptionList
function adaptTranscription(t: SupabaseTranscription) {
  return {
    id: t.id,
    agentName: t.agent_name || 'Agente',
    clientName: '',
    clientPhone: '',
    startedAt: t.call_date ? `${t.call_date}T08:00:00` : new Date().toISOString(),
    duration: 0,
    status: 'completed' as const,
    sentiment: 'neutral' as const,
    summary: t.summary || '',
    transcript: t.transcript || '',
    tags: [],
    callType: t.call_type || 'collection',
    campaign: t.campaign || '',
    client_id: t.client_id || '',
  };
}

export function useTranscriptions(params: TranscriptionsParams = {}) {
  const { clientId } = useClient();

  return useQuery({
    queryKey: ['transcriptions', params, clientId],
    queryFn: async () => {
      const filters: Record<string, string> = { 'client_id': `eq.${clientId}` };

      const resp = await fetch(`${PROXY_URL}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'transcriptions',
          select: 'id,agent_name,call_date,call_type,summary,transcript,campaign,client_id',
          filters,
          order: 'call_date.desc',
          limit: params.limit || 50,
        }),
      });

      if (!resp.ok) throw new Error('Error cargando transcripciones');
      const data = await resp.json() as SupabaseTranscription[];

      // Filtrar por búsqueda si se proporcionó
      let filtered = data || [];
      if (params.search) {
        const q = params.search.toLowerCase();
        filtered = filtered.filter(t =>
          (t.agent_name || '').toLowerCase().includes(q) ||
          (t.summary || '').toLowerCase().includes(q) ||
          (t.transcript || '').toLowerCase().includes(q) ||
          (t.call_type || '').toLowerCase().includes(q)
        );
      }

      return {
        data: filtered.map(adaptTranscription),
        total: filtered.length,
        page: 1,
        limit: params.limit || 50,
      };
    },
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });
}

export function useTranscription(id: string) {
  return useQuery({
    queryKey: ['transcription', id],
    queryFn: () => api.getTranscription(id),
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
