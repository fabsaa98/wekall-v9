// PageTabs — componente de tabs estilo browser para toda la plataforma WeKall Intelligence
// Uso: reemplaza TabsList/TabsTrigger en cualquier página para homogeneidad total

import { cn } from '@/lib/utils';
import { InfoTooltip } from '@/components/InfoTooltip';
import type { ReactNode } from 'react';

export interface PageTab {
  value: string;
  label: string;
  icon?: ReactNode;
  badge?: ReactNode;
  tooltip?: string;
}

interface PageTabsProps {
  tabs: PageTab[];
  activeTab: string;
  onChange: (value: string) => void;
  className?: string;
}

export function PageTabs({ tabs, activeTab, onChange, className }: PageTabsProps) {
  return (
    <div className={cn('flex items-end gap-1', className)}>
      {tabs.map(tab => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border border-b-0 transition-all whitespace-nowrap',
            activeTab === tab.value
              ? 'bg-background border-primary/60 text-foreground shadow-sm -mb-px z-10'
              : 'bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50',
          )}
        >
          {tab.icon && (
            <span className="text-primary shrink-0">{tab.icon}</span>
          )}
          <span>{tab.label}</span>
          {tab.badge && tab.badge}
          {tab.tooltip && <InfoTooltip text={tab.tooltip} size={12} />}
        </button>
      ))}
    </div>
  );
}

// Contenedor de la franja de tabs (borde inferior, fondo)
export function PageTabsBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('border-b border-border bg-card/50 px-4 pt-3 pb-0', className)}>
      {children}
    </div>
  );
}
