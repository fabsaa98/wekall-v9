import { type Vertical, verticalColors } from '@/types';

interface VerticalBadgeProps {
  vertical: Vertical;
  className?: string;
}

export function VerticalBadge({ vertical, className = '' }: VerticalBadgeProps) {
  const config = verticalColors[vertical];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium ${config.bg} ${config.text} ${className}`}>
      {config.label}
    </span>
  );
}
