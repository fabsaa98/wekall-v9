import { Sparkle, X } from '@phosphor-icons/react';

interface TagPillProps {
  label: string;
  source: 'ai' | 'manual';
  onRemove?: () => void;
}

export function TagPill({ label, source, onRemove }: TagPillProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
      {source === 'ai' && <Sparkle size={12} weight="light" className="text-primary" />}
      {label}
      {onRemove && (
        <button onClick={onRemove} className="ml-0.5 rounded-full p-0.5 hover:bg-muted">
          <X size={10} weight="light" />
        </button>
      )}
    </span>
  );
}
