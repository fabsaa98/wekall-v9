import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AlertRule } from '@/types';

export function useAlerts() {
  return useQuery({
    queryKey: ['alerts'],
    queryFn: api.getAlerts,
    staleTime: 60_000,
  });
}

export function useAlertRules() {
  return useQuery({
    queryKey: ['alert-rules'],
    queryFn: api.getAlertRules,
    staleTime: 60_000,
  });
}

export function useCreateAlertRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createAlertRule,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alert-rules'] }),
  });
}

export function useUpdateAlertRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AlertRule> }) =>
      api.updateAlertRule(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alert-rules'] }),
  });
}

export function useDeleteAlertRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteAlertRule,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alert-rules'] }),
  });
}
