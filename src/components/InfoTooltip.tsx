import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InfoTooltipProps {
  text: string;
  size?: number;
  className?: string;
}

// Tooltip CSS puro — funciona en cualquier contexto, sin conflictos con shadcn/Radix
export function InfoTooltip({ text, size = 13, className = '' }: InfoTooltipProps) {
  return (
    <span
      className={cn('group relative inline-flex items-center cursor-help shrink-0', className)}
      tabIndex={0}
    >
      <Info size={size} className="text-muted-foreground group-hover:text-primary group-focus:text-primary transition-colors" />
      <span
        className={cn(
          'pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-[9999]',
          'w-56 rounded-md border border-border bg-background text-foreground',
          'px-3 py-2 text-[11px] leading-relaxed shadow-lg',
          'opacity-0 group-hover:opacity-100 group-focus:opacity-100',
          'transition-opacity duration-150',
          'whitespace-normal break-words',
        )}
        role="tooltip"
      >
        {text}
        {/* Flecha */}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-border" />
      </span>
    </span>
  );
}
