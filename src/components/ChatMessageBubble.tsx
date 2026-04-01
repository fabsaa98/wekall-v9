import { useState } from 'react';
import { Sparkle, Copy, ThumbsUp, ThumbsDown, Check } from '@phosphor-icons/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface Source {
  transcriptionId: string;
  agentName: string;
  date: string;
  timestamp: string;
}

interface ChatMessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
}

export function ChatMessageBubble({ role, content, sources }: ChatMessageBubbleProps) {
  const isUser = role === 'user';
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const navigate = useNavigate();

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatSource = (s: Source) => {
    try {
      const date = format(new Date(s.timestamp), "d MMM yyyy, HH:mm", { locale: es });
      return `${s.agentName} · ${date}`;
    } catch {
      return `${s.agentName} · ${s.date}`;
    }
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[80%] rounded-xl px-4 py-3 ${isUser
        ? 'bg-primary/10 rounded-br-sm'
        : 'bg-card border border-border rounded-bl-sm shadow-wk-xs'
      }`}>

        {!isUser && (
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Sparkle size={16} weight="light" className="text-primary" />
              <span className="text-xs font-medium text-primary">We Insights AI</span>
            </div>
            {/* Acciones */}
            <div className="flex items-center gap-1 ml-4">
              <button
                onClick={handleCopy}
                title="Copiar respuesta"
                className="rounded p-1 text-muted-foreground hover:text-card-foreground hover:bg-secondary transition-colors"
              >
                {copied ? <Check size={13} weight="bold" className="text-green-500" /> : <Copy size={13} weight="light" />}
              </button>
              <button
                onClick={() => setFeedback('up')}
                title="Respuesta útil"
                className={`rounded p-1 transition-colors ${feedback === 'up' ? 'text-green-500' : 'text-muted-foreground hover:text-green-500 hover:bg-secondary'}`}
              >
                <ThumbsUp size={13} weight={feedback === 'up' ? 'fill' : 'light'} />
              </button>
              <button
                onClick={() => setFeedback('down')}
                title="Respuesta incorrecta"
                className={`rounded p-1 transition-colors ${feedback === 'down' ? 'text-red-400' : 'text-muted-foreground hover:text-red-400 hover:bg-secondary'}`}
              >
                <ThumbsDown size={13} weight={feedback === 'down' ? 'fill' : 'light'} />
              </button>
            </div>
          </div>
        )}

        <div className="text-sm text-card-foreground leading-relaxed whitespace-pre-wrap">{content}</div>

        {/* Fuentes */}
        {sources && sources.length > 0 && (
          <div className="mt-3 border-t border-border pt-2 space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Fuentes</p>
            {sources.map((s, i) => (
              <button
                key={i}
                onClick={() => navigate(`/transcriptions/${s.transcriptionId}`)}
                className="flex items-center gap-2 w-full text-left rounded-md px-2 py-1 hover:bg-secondary transition-colors group"
              >
                <span className="shrink-0 flex items-center justify-center w-4 h-4 rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                  {i + 1}
                </span>
                <span className="text-xs text-muted-foreground group-hover:text-card-foreground truncate">
                  {formatSource(s)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
