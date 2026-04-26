/**
 * MTDCard — Month-to-Date con proyección
 * Scale-A Fase 2 (25 abril 2026)
 */
import { Calendar, TrendingUp } from 'lucide-react';
import type { RecaudoMTD } from '@/types/financial-executive';

interface MTDCardProps {
  data: RecaudoMTD | null;
  loading?: boolean;
}

function fmtCOP(n: number): string {
  if (Math.abs(n) >= 1_000_000_000) return `$${(n/1_000_000_000).toFixed(2)}B`;
  if (Math.abs(n) >= 1_000_000)     return `$${(n/1_000_000).toFixed(1)}M`;
  return `$${n.toLocaleString('es-CO')}`;
}

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

export function MTDCard({ data, loading = false }: MTDCardProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 shadow-wk-sm animate-pulse">
        <div className="h-4 bg-secondary/50 rounded w-1/2 mb-3" />
        <div className="h-8 bg-secondary/50 rounded w-3/4 mb-2" />
        <div className="h-6 bg-secondary/50 rounded w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 shadow-wk-sm">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-muted-foreground">MTD</h3>
        </div>
        <p className="text-xs text-muted-foreground">Sin datos disponibles</p>
      </div>
    );
  }

  const mesDate = new Date(data.mes + 'T00:00:00');
  const mesLabel = `${MONTH_NAMES[mesDate.getMonth()]} ${mesDate.getFullYear()}`;
  const pctTranscurrido = data.dias_totales_mes > 0 
    ? (data.dias_transcurridos / data.dias_totales_mes) * 100 
    : 0;

  return (
    <div className="rounded-xl border border-border bg-gradient-to-br from-card to-secondary/30 p-5 shadow-wk-sm hover:shadow-wk-md transition-shadow">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">MTD {mesLabel}</h3>
      </div>

      {/* Recaudo MTD */}
      <div className="mb-3">
        <div className="text-3xl font-bold text-primary mb-1">
          {fmtCOP(data.recaudo_mtd_cop)}
        </div>
        <div className="text-sm text-muted-foreground">
          {data.dias_transcurridos} de {data.dias_totales_mes} días ({pctTranscurrido.toFixed(1)}%)
        </div>
      </div>

      {/* Promedio diario */}
      <div className="mb-2 text-sm">
        <span className="text-muted-foreground">Promedio diario:</span>
        <span className="ml-2 font-semibold text-foreground">
          {fmtCOP(data.promedio_diario_cop)}
        </span>
      </div>

      {/* Proyección mes */}
      <div className="flex items-center gap-2 mb-4 text-sm">
        <TrendingUp className="h-4 w-4 text-emerald-500" />
        <span className="text-muted-foreground">Proyección mes:</span>
        <span className="font-bold text-emerald-700 dark:text-emerald-300">
          {fmtCOP(data.proyeccion_mes_cop)}
        </span>
      </div>

      {/* Barra de progreso */}
      <div className="mt-4 pt-3 border-t border-border/50">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
          <span>Progreso mes</span>
          <span className="font-semibold">{pctTranscurrido.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-secondary/50 rounded-full h-2 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-primary to-primary/70 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(pctTranscurrido, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
