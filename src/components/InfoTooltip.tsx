import { useState, useEffect, useRef } from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InfoTooltipProps {
  text: string;
  size?: number;
  className?: string;
}

export function InfoTooltip({ text, size = 13, className = '' }: InfoTooltipProps) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  // Cerrar al tocar fuera
  useEffect(() => {
    if (!visible) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setVisible(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [visible]);

  return (
    <span
      ref={ref}
      className={cn('relative inline-flex items-center cursor-pointer shrink-0', className)}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); setVisible(v => !v); }}
      onClick={(e) => { e.stopPropagation(); }}
    >
      <Info
        size={size}
        className={cn(
          'transition-colors',
          visible ? 'text-primary' : 'text-muted-foreground hover:text-primary',
        )}
      />
      {visible && (
        <span
          className={cn(
            'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-[9999]',
            'w-52 rounded-lg border border-border bg-card text-card-foreground',
            'px-3 py-2 text-[11px] leading-relaxed shadow-xl',
            'whitespace-normal break-words pointer-events-none',
          )}
          role="tooltip"
        >
          {text}
        </span>
      )}
    </span>
  );
}
