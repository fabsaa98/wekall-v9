import { useState } from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InfoTooltipProps {
  text: string;
  size?: number;
  className?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function InfoTooltip({ text, size = 13, className = '', position = 'top' }: InfoTooltipProps) {
  const [visible, setVisible] = useState(false);

  const positionClasses: Record<string, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <span
      className={cn('relative inline-flex items-center cursor-help', className)}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onTouchStart={() => setVisible(v => !v)}
    >
      <Info size={size} className="text-muted-foreground hover:text-primary transition-colors" />
      {visible && (
        <div
          className={cn(
            'absolute z-50 w-64 rounded-lg border border-border bg-popover px-3 py-2.5 text-xs text-popover-foreground shadow-xl',
            positionClasses[position],
          )}
        >
          {text}
        </div>
      )}
    </span>
  );
}
