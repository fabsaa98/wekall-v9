import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useAuditLogs() {
  return useQuery({
    queryKey: ['audit-logs'],
    queryFn: api.getAuditLogs,
    staleTime: 60_000,
  });
}
