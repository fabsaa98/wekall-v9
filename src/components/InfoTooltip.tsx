import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InfoTooltipProps {
  text: string;
  size?: number;
  className?: string;
}

export function InfoTooltip({ text, size = 13, className = '' }: InfoTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const iconRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!visible) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (iconRef.current && !iconRef.current.contains(e.target as Node)) {
        setVisible(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [visible]);

  function show() {
    if (!iconRef.current) return;
    const rect = iconRef.current.getBoundingClientRect();
    setPos({
      top: rect.top + window.scrollY - 8, // arriba del ícono
      left: rect.left + window.scrollX + rect.width / 2,
    });
    setVisible(true);
  }

  return (
    <>
      <span
        ref={iconRef}
        className={cn('relative inline-flex items-center cursor-pointer shrink-0', className)}
        onMouseEnter={show}
        onMouseLeave={() => setVisible(false)}
        onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); visible ? setVisible(false) : show(); }}
        onClick={(e) => e.stopPropagation()}
      >
        <Info
          size={size}
          className={cn('transition-colors', visible ? 'text-primary' : 'text-muted-foreground hover:text-primary')}
        />
      </span>

      {visible && createPortal(
        <div
          style={{
            position: 'absolute',
            top: pos.top,
            left: pos.left,
            transform: 'translate(-50%, -100%)',
            zIndex: 99999,
          }}
          className="pointer-events-none"
        >
          <div className="w-52 rounded-lg border border-border bg-card text-card-foreground px-3 py-2 text-[11px] leading-relaxed shadow-xl">
            {text}
          </div>
          <div className="flex justify-center">
            <div className="w-2 h-2 rotate-45 bg-card border-b border-r border-border -mt-1" />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
