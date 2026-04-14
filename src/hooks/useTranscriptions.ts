/**
 * useTranscriptions — Fix 2A/2C (V20):
 * Lee de Supabase directamente en lugar del Worker (/query no existe).
 * Filtra siempre por clientId del contexto — SEGURIDAD MULTI-TENANT.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useClient } from '@/contexts/ClientContext';
import { api, type TranscriptionsParams } from '@/lib/api';
import type { Tag } from '@/types';

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

// Adapter: convierte el formato Supabase → formato esperado por TranscriptionList/Detail
function adaptTranscription(t: SupabaseTranscription) {
  return {
    id: t.id,
    agent: { name: t.agent_name || 'Agente', id: '' },
    client: { name: '', phone: '' },
    agentName: t.agent_name || 'Agente',
    clientName: '',
    clientPhone: '',
    startedAt: t.call_date ? `${t.call_date}T08:00:00` : new Date().toISOString(),
    duration: 0,
    status: 'completed' as const,
    classification: {
      sentiment: 'neutral' as const,
      callType: t.call_type || 'collection',
    },
    sentiment: 'neutral' as const,
    summary: t.summary || '',
    transcript: t.transcript || '',
    tags: [],
    callType: t.call_type || 'collection',
    campaign: t.campaign || '',
    client_id: t.client_id || '',
    direction: 'outbound' as const,
  };
}

export function useTranscriptions(params: TranscriptionsParams = {}) {
  const { clientId } = useClient();

  return useQuery({
    queryKey: ['transcriptions', params, clientId],
    queryFn: async () => {
      // Consulta Supabase directamente — filtra por client_id del contexto
      let query = supabase
        .from('transcriptions')
        .select('id,agent_name,call_date,call_type,summary,transcript,campaign,client_id')
        .eq('client_id', clientId)
        .order('call_date', { ascending: false })
        .limit(params.limit || 50);

      // Búsqueda por texto (ILIKE en agent_name o summary)
      if (params.search) {
        query = query.or(
          `agent_name.ilike.%${params.search}%,summary.ilike.%${params.search}%,transcript.ilike.%${params.search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      const rows = (data || []) as SupabaseTranscription[];
      return {
        data: rows.map(adaptTranscription),
        total: rows.length,
        page: 1,
        limit: params.limit || 50,
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
