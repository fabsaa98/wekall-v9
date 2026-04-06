/**
 * ChatRAG — Interfaz alternativa de RAG/chat con transcripciones.
 *
 * DECISIÓN FIX 2D (V20): Este componente NO está enrutado en App.tsx.
 * Razón: Es funcionalmente redundante con VickyInsights (/vicky), que ya implementa:
 *   - RAG semántico sobre transcripciones (via Worker /rag-query)
 *   - Chat con contexto de llamadas
 *   - Motor EBITDA y cálculos determinísticos
 *
 * Si en el futuro se necesitan features específicos de ChatRAG (historial de
 * conversaciones multi-sesión via useChat, sidebar de conversaciones previas),
 * considerar integrarlos en VickyInsights en lugar de enrutar este componente.
 */
import { useState, useRef, useEffect } from 'react';
import { Plus, PaperPlaneRight, Sparkle, ChatText } from '@phosphor-icons/react';
import { ChatMessageBubble } from '@/components/ChatMessageBubble';
import { useChatConversations, useChatConversation, useSendMessage } from '@/hooks/useChat';
import type { ChatMessage } from '@/types';

const suggestedQueries = [
  '¿Cuáles son los temas de queja más frecuentes esta semana?',
  '¿Qué patrones de queja tiene el agente Carlos?',
  'Resume las 5 llamadas más largas del mes',
  '¿Qué productos mencionaron los clientes de Banco W?',
  '¿Cuántas llamadas mencionaron problemas de facturación?',
];

export default function ChatRAG() {
  const { data: conversationsData, refetch: refetchConversations } = useChatConversations();
  const sendMessage = useSendMessage();

  const conversations = conversationsData ?? [];
  const [activeConvId, setActiveConvId] = useState<string>('');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Cargar mensajes de conversación seleccionada
  const { data: activeConvData } = useChatConversation(activeConvId);

  const handleNewChat = () => {
    setActiveConvId('');
    setMessages([]);
  };

  const handleSend = () => {
    if (!input.trim() || sendMessage.isPending) return;
    const text = input.trim();
    setInput('');

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);

    sendMessage.mutate(
      { conversationId: activeConvId || undefined, message: text },
      {
        onSuccess: (res) => {
          setMessages(prev => [...prev, res.message]);
          setActiveConvId(res.conversationId);
          refetchConversations();
        },
        onError: () => {
          setMessages(prev => [...prev, {
            id: `msg-err-${Date.now()}`,
            role: 'assistant',
            content: 'Error al procesar tu pregunta. Intenta de nuevo.',
            createdAt: new Date().toISOString(),
          }]);
        },
      }
    );
  };

  // Cuando carga la conversación activa, mostrar sus mensajes
  useEffect(() => {
    if (activeConvData?.messages && messages.length === 0) {
      setMessages(activeConvData.messages);
    }
  }, [activeConvData]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sendMessage.isPending]);

  return (
    <div className="flex gap-4 h-[calc(100vh-160px)]">
      {/* Sidebar — hidden on mobile */}
      <div className="hidden sm:flex w-56 shrink-0 rounded-lg border border-border bg-card p-3 flex-col">
        <button
          onClick={handleNewChat}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground hover:bg-wk-violet-dark transition-colors mb-3"
        >
          <Plus size={16} weight="light" /> Nuevo chat
        </button>
        <div className="flex-1 overflow-y-auto space-y-1">
          {conversations.map(c => (
            <button key={c.id} onClick={() => { setActiveConvId(c.id); setMessages([]); }}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${activeConvId === c.id ? 'bg-primary/5 text-primary font-medium' : 'text-muted-foreground hover:bg-secondary'}`}
            >
              <p className="truncate">{c.title}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(c.createdAt).toLocaleDateString('es')}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col rounded-lg border border-border bg-card shadow-wk-sm">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 && !sendMessage.isPending ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="rounded-full bg-primary/10 p-4 mb-4">
                <Sparkle size={32} weight="light" className="text-primary" />
              </div>
              <h3 className="text-lg font-medium text-card-foreground mb-1">Chat AI — We Insights</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md">Pregunta en lenguaje natural sobre tus llamadas. El modelo analiza todas las transcripciones para darte respuestas con fuentes.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg">
                {suggestedQueries.map((q, i) => (
                  <button key={i} onClick={() => setInput(q)}
                    className="rounded-lg border border-border p-3 text-left text-xs text-muted-foreground hover:bg-secondary hover:text-card-foreground transition-colors"
                  >
                    <ChatText size={14} weight="light" className="mb-1 text-primary" />
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map(msg => (
                <ChatMessageBubble key={msg.id} role={msg.role} content={msg.content} sources={msg.sources} />
              ))}
              {sendMessage.isPending && (
                <div className="flex items-center gap-3 py-3 px-4 rounded-lg bg-primary/5 mx-2">
                  <div className="rounded-full bg-primary/10 p-1.5 shrink-0">
                    <Sparkle size={14} weight="light" className="text-primary animate-pulse" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="h-2 w-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="h-2 w-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground">Analizando transcripciones con IA local...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border p-3">
          <div className="flex gap-2">
            <input
              type="text" value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Pregunta sobre tus llamadas..."
              disabled={sendMessage.isPending}
              className="flex-1 rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={sendMessage.isPending || !input.trim()}
              className="rounded-lg bg-primary px-4 py-2.5 text-primary-foreground hover:bg-wk-violet-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PaperPlaneRight size={18} weight="light" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
