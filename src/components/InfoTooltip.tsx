import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface InfoTooltipProps {
  text: string;
  size?: number;
  className?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

export function InfoTooltip({ text, size = 13, className = '', side = 'top' }: InfoTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn('inline-flex items-center cursor-help', className)}>
          <Info size={size} className="text-muted-foreground hover:text-primary transition-colors" />
        </span>
      </TooltipTrigger>
      <TooltipContent
        side={side}
        align="center"
        avoidCollisions={true}
        className="max-w-[220px] text-xs leading-relaxed"
      >
        {text}
      </TooltipContent>
    </Tooltip>
  );
}
