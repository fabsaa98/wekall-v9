import { ReactNode, useState } from 'react';
import { CaretDown, CaretUp } from '@phosphor-icons/react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface VerticalSectionProps {
  icon: ReactNode;
  name: string;
  kpiCount: number;
  accentColor: string;
  children: ReactNode;
}

export function VerticalSection({ icon, name, kpiCount, accentColor, children }: VerticalSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-5 py-3 shadow-wk-sm transition-shadow hover:shadow-wk-md">
        <div className="flex items-center gap-3">
          <span style={{ color: accentColor }}>{icon}</span>
          <span className="text-sm font-medium text-card-foreground">{name}</span>
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
            style={{ backgroundColor: accentColor }}
          >
            {kpiCount}
          </span>
        </div>
        {isOpen
          ? <CaretUp size={18} weight="light" className="text-muted-foreground" />
          : <CaretDown size={18} weight="light" className="text-muted-foreground" />
        }
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
