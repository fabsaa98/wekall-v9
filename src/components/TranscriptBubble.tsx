import { TranscriptSegment } from '@/types';

interface TranscriptBubbleProps {
  segment: TranscriptSegment;
  agentName: string;
  clientName: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function TranscriptBubble({ segment, agentName, clientName }: TranscriptBubbleProps) {
  const isAgent = segment.speaker === 'agent';
  return (
    <div className={`flex ${isAgent ? 'justify-start' : 'justify-end'} mb-3`}>
      <div className={`max-w-[75%] rounded-xl px-4 py-3 ${isAgent ? 'bg-wk-blue/5 rounded-bl-sm' : 'bg-secondary rounded-br-sm'}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs font-medium ${isAgent ? 'text-wk-blue' : 'text-wk-black-light'}`}>
            {isAgent ? agentName : clientName}
          </span>
          <span className="text-[10px] text-muted-foreground">[{formatTime(segment.startTime)}]</span>
        </div>
        <p className="text-sm text-card-foreground leading-relaxed">{segment.text}</p>
      </div>
    </div>
  );
}
