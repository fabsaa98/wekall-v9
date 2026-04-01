import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Hotword } from '@/types';

export function useHotwords() {
  return useQuery({
    queryKey: ['hotwords'],
    queryFn: api.getHotwords,
    staleTime: 5 * 60_000,
  });
}

export function useCreateHotword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (hw: Omit<Hotword, 'id'>) => api.createHotword(hw),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hotwords'] }),
  });
}

export function useDeleteHotword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteHotword(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hotwords'] }),
  });
}
