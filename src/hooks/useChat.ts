import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useChatConversations() {
  return useQuery({
    queryKey: ['chat', 'conversations'],
    queryFn: api.getConversations,
    staleTime: 30_000,
  });
}

export function useChatConversation(id: string) {
  return useQuery({
    queryKey: ['chat', 'conversation', id],
    queryFn: () => api.getConversation(id),
    enabled: !!id,
    staleTime: 0,
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.sendMessage,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['chat', 'conversations'] });
      qc.invalidateQueries({ queryKey: ['chat', 'conversation', data.conversationId] });
    },
  });
}
