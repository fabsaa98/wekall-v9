import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Integration } from '@/types';

export function useIntegrations() {
  return useQuery({
    queryKey: ['integrations'],
    queryFn: api.getIntegrations,
    staleTime: 5 * 60_000,
  });
}

export function useUpdateIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Integration> }) =>
      api.updateIntegration(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['integrations'] }),
  });
}
