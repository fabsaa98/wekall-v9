/**
 * ExecutiveSummary — Resumen ejecutivo dinámico CEO
 * Scale-A Fase 2 (25 abril 2026)
 * Reemplaza ExecutiveBrief con métricas reales de queries SQL
 */
import { FileText, Zap, AlertTriangle } from 'lucide-react';
import type { RecaudoHoy, RecaudoMTD, RecaudoMoM, RecaudoYoY } from '@/types/financial-executive';

interface ExecutiveSummaryProps {
  today: RecaudoHoy | null;
  mtd: RecaudoMTD | null;
  mom: RecaudoMoM[];
  yoy: RecaudoYoY[];
  industry?: string;
  hasRealData?: boolean;
  loading?: boolean;
}

const BM_COSTO_CC_PCT = 15.0; // Benchmark costo CC / recaudo
const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function fmtCOP(n: number): string {
  if (Math.abs(n) >= 1_000_000_000) return `$${(n/1_000_000_000).toFixed(2)}B`;
  if (Math.abs(n) >= 1_000_000)     return `$${(n/1_000_000).toFixed(1)}M`;
  return `$${n.toLocaleString('es-CO')}`;
}

export function ExecutiveSummary({ 
  today, 
  mtd, 
  mom, 
  yoy, 
  industry, 
  hasRealData = false,
  loading = false 
}: ExecutiveSummaryProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 shadow-wk-sm animate-pulse">
        <div className="h-4 bg-secondary/50 rounded w-1/3 mb-3" />
        <div className="space-y-2">
          <div className="h-3 bg-secondary/50 rounded w-full" />
          <div className="h-3 bg-secondary/50 rounded w-5/6" />
          <div className="h-3 bg-secondary/50 rounded w-4/6" />
        </div>
      </div>
    );
  }

  // Calcular métricas
  const mesLabel = mtd ? `${MONTH_NAMES[new Date(mtd.mes).getMonth()]} ${new Date(mtd.mes).getFullYear()}` : '';
  const costoPct = mtd && mtd.recaudo_mtd_cop > 0 && mtd.costo_op_mtd_cop > 0
    ? (mtd.costo_op_mtd_cop / mtd.recaudo_mtd_cop) * 100
    : 0;
  const margenOk = costoPct > 0 && costoPct <= BM_COSTO_CC_PCT;
  
  const momCurrent = mom.find(m => m.es_mes_actual);
  const yoyCurrent = yoy.find(y => y.es_year_actual);
  
  const tendenciaMom = momCurrent?.mom_pct ?? 0;
  const tendenciaYoy = yoyCurrent?.yoy_pct ?? 0;
  const tendOk = tendenciaMom >= 0;

  const isFintech = industry === 'fintech_pagos';

  // Detectar mes parcial (< 10 días transcurridos)
  const mesParcial = mtd && mtd.dias_transcurridos < 10;

  const statusColor = margenOk 
    ? 'text-emerald-700 dark:text-emerald-300' 
    : 'text-red-600 dark:text-red-400';
  const statusText = margenOk 
    ? 'Costo CC dentro de benchmark' 
    : 'Costo CC supera benchmark';

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-wk-sm">
      {/* Header */}
      <div className="flex items-start gap-2 mb-3">
        <FileText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div>
          <h2 className="text-sm font-semibold text-foreground">Executive Summary — {mesLabel}</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Síntesis ejecutiva · {hasRealData ? 'Datos reales' : 'Basado en queries ejecutivas'}
          </p>
        </div>
      </div>

      {/* Status badge */}
      {!isFintech && costoPct > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <div className={`h-2 w-2 rounded-full ${margenOk ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse`} />
          <span className={`text-sm font-bold ${statusColor}`}>{statusText}</span>
        </div>
      )}

      {/* Narrative */}
      <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
        {/* Paragraph 1: MTD overview */}
        {mtd && (
          <p>
            En <span className="text-foreground font-medium">{mesLabel}</span>{' '}
            {mesParcial ? (
              <>
                la operación registra <span className="text-foreground font-semibold">{fmtCOP(mtd.recaudo_mtd_cop)}</span>{' '}
                MTD ({mtd.dias_transcurridos} {mtd.dias_transcurridos === 1 ? 'día' : 'días'} transcurridos).{' '}
                <span className="text-amber-700 dark:text-amber-300 font-medium">Datos parciales</span> — proyección mes:{' '}
                <span className="text-foreground font-semibold">{fmtCOP(mtd.proyeccion_mes_cop)}</span>.
              </>
            ) : (
              <>
                el recaudo acumulado MTD es{' '}
                <span className="text-foreground font-semibold">{fmtCOP(mtd.recaudo_mtd_cop)}</span>{' '}
                ({mtd.dias_transcurridos} días transcurridos de {mtd.dias_totales_mes}).{' '}
                Proyección fin de mes:{' '}
                <span className="text-foreground font-semibold">{fmtCOP(mtd.proyeccion_mes_cop)}</span>.
              </>
            )}
          </p>
        )}

        {/* Paragraph 2: Tendencias */}
        {momCurrent && yoyCurrent && (
          <p>
            Tendencia MoM:{' '}
            {tendOk ? (
              <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                +{tendenciaMom.toFixed(1)}% vs mes anterior
              </span>
            ) : (
              <span className="text-red-600 dark:text-red-400 font-semibold">
                {tendenciaMom.toFixed(1)}% vs mes anterior
              </span>
            )}
            {mesParcial && <span className="text-muted-foreground/80"> (mes parcial, normal)</span>}.{' '}
            YoY:{' '}
            {tendenciaYoy >= 0 ? (
              <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                +{tendenciaYoy.toFixed(1)}% vs 2025
              </span>
            ) : (
              <span className="text-red-600 dark:text-red-400 font-semibold">
                {tendenciaYoy.toFixed(1)}% vs 2025
              </span>
            )}.
          </p>
        )}

        {/* Paragraph 3: ROI y costos (solo cobranza) */}
        {!isFintech && mtd && today && (
          <p>
            ROI de operación:{' '}
            <span className={`font-semibold ${
              today.roi > 3 
                ? 'text-emerald-700 dark:text-emerald-300' 
                : today.roi > 1 
                  ? 'text-yellow-700 dark:text-yellow-300' 
                  : 'text-red-600 dark:text-red-400'
            }`}>
              {today.roi.toFixed(1)}x
            </span>{' '}
            (recaudo/costo).{' '}
            {costoPct > 0 && (
              <>
                El costo del contact center representa{' '}
                <span className={`font-semibold ${statusColor}`}>
                  {costoPct.toFixed(1)}% del recaudo
                </span>
                {margenOk 
                  ? ` (benchmark: ≤${BM_COSTO_CC_PCT}%).` 
                  : ` — por encima del benchmark de ≤${BM_COSTO_CC_PCT}%.`
                }
              </>
            )}
          </p>
        )}

        {/* Paragraph 4: Hoy */}
        {today && today.recaudo_cop > 0 && (
          <p>
            Hoy:{' '}
            <span className="text-foreground font-semibold">{fmtCOP(today.recaudo_cop)}</span>{' '}
            ({today.promesas_cumplidas.toLocaleString('es-CO')} promesas cumplidas){' '}
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-500 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-800 dark:text-emerald-200 uppercase tracking-wide">
              REAL
            </span>.
          </p>
        )}
      </div>

      {/* Alert: Costo CC alto */}
      {!isFintech && !margenOk && costoPct > 0 && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-orange-500/10 border border-orange-500/20 p-3">
          <Zap className="h-3.5 w-3.5 text-orange-400 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-900 dark:text-amber-100 leading-relaxed">
            <strong>Atención:</strong> El costo del CC supera el benchmark de ≤{BM_COSTO_CC_PCT}%.{' '}
            {hasRealData 
              ? 'Revisar eficiencia operativa y distribución de costos.' 
              : 'Conectar datos reales de recaudo para diagnóstico preciso.'
            }
          </p>
        </div>
      )}

      {/* Alert: Tendencia negativa fuerte */}
      {!mesParcial && tendenciaMom < -20 && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3">
          <AlertTriangle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
          <p className="text-xs text-red-900 dark:text-red-100 leading-relaxed">
            <strong>Alerta:</strong> Caída significativa MoM ({tendenciaMom.toFixed(1)}%).{' '}
            Revisar campañas, contactabilidad y cumplimiento de promesas.
          </p>
        </div>
      )}

      {/* Footer: Fuente de datos */}
      <p className="mt-3 text-[11px] leading-relaxed border-t border-border/50 pt-3 text-muted-foreground/50">
        {isFintech
          ? 'Datos basados en queries ejecutivas PostgreSQL. Métricas de servicio y atención.'
          : hasRealData
            ? '✅ Basado en datos reales de recaudo (financial_results) + queries ejecutivas.'
            : '⚠️ Basado en queries ejecutivas y estimativos. Conectar datos reales para mayor precisión.'
        }
      </p>
    </div>
  );
}
