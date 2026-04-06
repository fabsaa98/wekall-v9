// proactiveInsights.ts — WeKall Intelligence V20
// Generación dinámica de insights proactivos basados en datos reales de Supabase

import { CDRDayMetric } from '@/lib/supabase';
import { AnomalyResult } from '@/hooks/useCDRData';

export interface WeeklyInsight {
  headline: string;        // 1 línea ejecutiva
  body: string;            // 2-3 líneas de contexto
  action: string;          // qué hacer
  trend: 'positive' | 'negative' | 'neutral';
  vickyQuery: string;      // pregunta para Vicky
  type: 'warning' | 'success' | 'info';
}

function calcMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function formatPct(n: number): string {
  return `${Math.round(n * 10) / 10}%`;
}

export function generateWeeklyInsight(
  last7Days: CDRDayMetric[],
  last30Days: CDRDayMetric[],
  anomaly: AnomalyResult | null,
  clientName: string,
): WeeklyInsight[] {
  const insights: WeeklyInsight[] = [];

  // Datos insuficientes
  if (last7Days.length === 0 || last30Days.length < 7) {
    return [
      {
        headline: `${clientName} — Datos en carga`,
        body: 'Conectando con Supabase para obtener métricas operativas. Los insights aparecerán una vez cargados los datos CDR.',
        action: 'Ver análisis en Vicky →',
        trend: 'neutral',
        vickyQuery: `Dame un resumen ejecutivo de la operación de ${clientName}`,
        type: 'info',
      },
    ];
  }

  const tasa7d = last7Days.map(d => d.tasa_contacto_pct);
  const tasa30d = last30Days.map(d => d.tasa_contacto_pct);
  const vol7d = last7Days.map(d => d.total_llamadas);

  const mean7d = calcMean(tasa7d);
  const mean30d = calcMean(tasa30d);
  const meanVol7d = calcMean(vol7d);
  const deltaSemanal = Math.round((mean7d - mean30d) * 10) / 10;

  // ── Insight 1: Anomalía (si detectada) ──────────────────────────────────
  if (anomaly?.detected) {
    if (anomaly.direction === 'down') {
      insights.push({
        headline: `⚠️ Alerta: tasa de contacto ${formatPct(anomaly.valorHoy)} — ${anomaly.magnitude}pp por debajo del promedio`,
        body: `La tasa de contacto cayó a ${formatPct(anomaly.valorHoy)} hoy, ${anomaly.magnitude}pp por debajo del promedio 30d (${formatPct(anomaly.promedio30d)}). Desviación: ${Math.abs(anomaly.zScore)}σ. Posibles causas: incidencia en dialer, base de datos con números vencidos, o día con baja penetración de cartera.`,
        action: 'Diagnósticar con Vicky →',
        trend: 'negative',
        vickyQuery: `La tasa de contacto hoy es ${anomaly.valorHoy}%, cayó ${anomaly.magnitude}pp vs promedio 30d (${anomaly.promedio30d}%). z-score: ${anomaly.zScore}. ¿Cuál es el diagnóstico y qué acciones correctivas recomiendas?`,
        type: 'warning',
      });
    } else {
      insights.push({
        headline: `📈 Pico positivo: tasa de contacto en ${formatPct(anomaly.valorHoy)} — récord reciente`,
        body: `La tasa de contacto alcanzó ${formatPct(anomaly.valorHoy)} hoy, ${anomaly.magnitude}pp por encima del promedio 30d (${formatPct(anomaly.promedio30d)}). Desviación: +${anomaly.zScore}σ. Identifica qué factores impulsaron este resultado para replicarlo.`,
        action: 'Analizar con Vicky →',
        trend: 'positive',
        vickyQuery: `La tasa de contacto alcanzó ${anomaly.valorHoy}% hoy — ${anomaly.magnitude}pp sobre el promedio 30d. ¿Qué factores explican este pico y cómo lo sostenemos?`,
        type: 'success',
      });
    }
  }

  // ── Insight 2: Tendencia semanal vs 30d ────────────────────────────────
  if (deltaSemanal > 1) {
    insights.push({
      headline: `Semana positiva: tasa promedio ${formatPct(mean7d)} (+${deltaSemanal}pp vs mes)`,
      body: `La tasa de contacto promedio de los últimos 7 días (${formatPct(mean7d)}) supera el promedio 30d (${formatPct(mean30d)}) en ${deltaSemanal}pp. Volumen promedio: ${Math.round(meanVol7d).toLocaleString('es-CO')} llamadas/día.`,
      action: 'Ver análisis completo en Vicky →',
      trend: 'positive',
      vickyQuery: `La tasa de contacto promedio esta semana es ${formatPct(mean7d)}, ${deltaSemanal}pp sobre el promedio 30d de ${formatPct(mean30d)}. ¿Qué campañas o agentes están impulsando esta mejora?`,
      type: 'success',
    });
  } else if (deltaSemanal < -1) {
    insights.push({
      headline: `Atención: semana por debajo del promedio — ${formatPct(mean7d)} (${deltaSemanal}pp)`,
      body: `La tasa de contacto promedio de los últimos 7 días (${formatPct(mean7d)}) está ${Math.abs(deltaSemanal)}pp por debajo del promedio 30d (${formatPct(mean30d)}). Volumen promedio: ${Math.round(meanVol7d).toLocaleString('es-CO')} llamadas/día. Se recomienda revisar calidad de base de datos y eficiencia del dialer.`,
      action: 'Investigar con Vicky →',
      trend: 'negative',
      vickyQuery: `La tasa de contacto esta semana (${formatPct(mean7d)}) está ${Math.abs(deltaSemanal)}pp debajo del promedio 30d (${formatPct(mean30d)}). ¿Cuál es la causa y qué acciones correctivas propones?`,
      type: 'warning',
    });
  } else {
    insights.push({
      headline: `Operación estable: ${formatPct(mean7d)} tasa de contacto (${deltaSemanal > 0 ? '+' : ''}${deltaSemanal}pp vs mes)`,
      body: `La semana cierra con una tasa de contacto promedio de ${formatPct(mean7d)}, en línea con el promedio 30d (${formatPct(mean30d)}). Volumen promedio: ${Math.round(meanVol7d).toLocaleString('es-CO')} llamadas/día. Operación dentro de rangos normales.`,
      action: 'Ver resumen en Vicky →',
      trend: 'neutral',
      vickyQuery: `Resume el desempeño operativo de ${clientName} esta semana: tasa de contacto ${formatPct(mean7d)}, volumen ${Math.round(meanVol7d).toLocaleString()} llamadas/día. ¿Dónde están las mayores oportunidades de mejora?`,
      type: 'info',
    });
  }

  // ── Insight 3: Patrón de volumen ───────────────────────────────────────
  const vol30d = last30Days.map(d => d.total_llamadas);
  const meanVol30d = calcMean(vol30d);
  const volGrowth = meanVol7d > 0 && meanVol30d > 0
    ? Math.round(((meanVol7d - meanVol30d) / meanVol30d) * 1000) / 10
    : 0;

  if (Math.abs(volGrowth) > 5) {
    insights.push({
      headline: volGrowth > 0
        ? `Volumen al alza: +${volGrowth}% vs promedio 30d`
        : `Volumen a la baja: ${volGrowth}% vs promedio 30d`,
      body: `Volumen promedio últimos 7 días: ${Math.round(meanVol7d).toLocaleString('es-CO')} llamadas/día vs ${Math.round(meanVol30d).toLocaleString('es-CO')} en el mes. ${volGrowth > 0 ? 'La operación está escalando — verificar capacidad de agentes.' : 'Posible reducción de base de datos o días no hábiles en el período.'}`,
      action: volGrowth > 0 ? 'Analizar capacidad con Vicky →' : 'Revisar causa con Vicky →',
      trend: volGrowth > 0 ? 'positive' : 'negative',
      vickyQuery: `El volumen de llamadas esta semana (${Math.round(meanVol7d).toLocaleString()}/día) cambió ${volGrowth}% vs el promedio 30d (${Math.round(meanVol30d).toLocaleString()}/día). ¿Qué explica este cambio y cuáles son las implicaciones operativas?`,
      type: volGrowth > 0 ? 'success' : 'warning',
    });
  }

  return insights.slice(0, 3); // Máximo 3 insights
}
