import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useDashboardKPIs() {
  return useQuery({
    queryKey: ['dashboard', 'kpis'],
    queryFn: api.getDashboardKPIs,
    staleTime: 5 * 60_000,
  });
}

export function useCallsPerDay() {
  return useQuery({
    queryKey: ['dashboard', 'calls-per-day'],
    queryFn: api.getCallsPerDay,
    staleTime: 5 * 60_000,
  });
}

export function useSentimentDistribution() {
  return useQuery({
    queryKey: ['dashboard', 'sentiment-distribution'],
    queryFn: api.getSentimentDistribution,
    staleTime: 5 * 60_000,
  });
}

export function useAgentStats() {
  return useQuery({
    queryKey: ['dashboard', 'agent-stats'],
    queryFn: api.getAgentStats,
    staleTime: 5 * 60_000,
  });
}

export function useAIInsights() {
  return useQuery({
    queryKey: ['dashboard', 'ai-insights'],
    queryFn: api.getAIInsights,
    staleTime: 5 * 60_000,
  });
}
