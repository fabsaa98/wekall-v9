import { Smiley, SmileyMeh, SmileyAngry, SmileyXEyes } from '@phosphor-icons/react';

interface SentimentBadgeProps {
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  size?: 'sm' | 'md';
}

const config = {
  positive: { label: 'Positivo', icon: Smiley, bg: 'bg-wk-green/10', text: 'text-wk-green-dark', dot: 'bg-wk-green' },
  negative: { label: 'Negativo', icon: SmileyAngry, bg: 'bg-wk-red/10', text: 'text-wk-red-dark', dot: 'bg-wk-red' },
  neutral: { label: 'Neutro', icon: SmileyMeh, bg: 'bg-wk-yellow/10', text: 'text-wk-yellow-dark', dot: 'bg-wk-yellow' },
  mixed: { label: 'Mixto', icon: SmileyXEyes, bg: 'bg-wk-yellow/10', text: 'text-wk-yellow-dark', dot: 'bg-wk-yellow' },
};

export function SentimentBadge({ sentiment, size = 'md' }: SentimentBadgeProps) {
  const c = config[sentiment];
  const Icon = c.icon;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${c.bg} ${c.text} ${sizeClasses}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      <Icon size={size === 'sm' ? 14 : 16} weight="light" />
      {c.label}
    </span>
  );
}
