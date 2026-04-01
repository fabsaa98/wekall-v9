import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type TranscriptionsParams } from '@/lib/api';
import type { Tag } from '@/types';

export function useTranscriptions(params: TranscriptionsParams = {}) {
  return useQuery({
    queryKey: ['transcriptions', params],
    queryFn: () => api.getTranscriptions(params),
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
