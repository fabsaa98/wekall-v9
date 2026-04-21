/**
 * useAgentKPIs — Hook de KPIs operativos de agentes
 * Calcula ocupación estimada, llamadas/hora y métricas agregadas
 * desde agents_performance (Engage360 / Supabase).
 *
 * Sprint 2B — Parte 1 & 2
 */

import { useMemo } from 'react';
import { useAgentsData } from './useAgentsData';

export interface AgentKPIsSummary {
  // Parte 1 — Ocupación estimada
  ocupacionPromedio: number;       // % — (aht_seg × llamadas) / (8h × 3600) × 100
  ocupacionMaxima: number;         // % — agente con mayor ocupación
  ocupacionMinima: number;         // % — agente con menor ocupación

  // Parte 2 — Llamadas por hora
  llamadasXHoraPromedio: number;   // llamadas_total / 8h
  llamadasXHoraMax: number;        // top agente
  llamadasXHoraMin: number;        // agente más bajo

  // KPIs de calidad para Vicky / alertas
  csatPromedio: number;            // promedio últimos 30d
  fcrPromedio: number;             // %
  escalacionesPromedio: number;    // %
  agentesActivos: number;          // cantidad de agentes con datos

  // Flags de estado
  loading: boolean;
  error: string | null;
}

const HORAS_TRABAJO = 8;

export function useAgentKPIs(): AgentKPIsSummary {
  const { loading, error, agents } = useAgentsData();

  return useMemo(() => {
    if (loading || error || agents.length === 0) {
      return {
        ocupacionPromedio: 0,
        ocupacionMaxima: 0,
        ocupacionMinima: 0,
        llamadasXHoraPromedio: 0,
        llamadasXHoraMax: 0,
        llamadasXHoraMin: 0,
        csatPromedio: 0,
        fcrPromedio: 0,
        escalacionesPromedio: 0,
        agentesActivos: 0,
        loading,
        error,
      };
    }

    // Ocupación estimada por agente:
    // Usar contactos (no llamadas_total) × AHT — solo llamadas conectadas consumen tiempo real
    // ocupacion = (aht_seg × contactos_prom_dia) / (horas_trabajo × 3600) × 100
    // Cap en 95% — 100% exacto es matemáticamente imposible en producción real
    const ocupaciones = agents.map(a => {
      const contactosDia = a.days_count > 0 ? (a.total_promesas * 2.5) / a.days_count : 0;
      // Estimación conservadora: contactos/día desde promesas (tasa_promesa ~40%)
      // Fallback: llamadas/día × tasa_contacto promedio (~25%)
      const llamasDia = a.days_count > 0 ? a.total_llamadas / a.days_count : 0;
      const contactosEstimados = a.avg_tasa_contacto > 0
        ? llamasDia * (a.avg_tasa_contacto / 100)
        : contactosDia;
      const tiempoEnLlamadas = a.avg_aht_segundos * contactosEstimados;
      const tiempoDisponible = HORAS_TRABAJO * 3600;
      return Math.min(95, (tiempoEnLlamadas / tiempoDisponible) * 100); // cap 95%
    });

    const ocupacionPromedio = ocupaciones.length > 0
      ? Math.round(ocupaciones.reduce((s, v) => s + v, 0) / ocupaciones.length * 10) / 10
      : 0;
    const ocupacionMaxima = Math.round(Math.max(...ocupaciones) * 10) / 10;
    const ocupacionMinima = Math.round(Math.min(...ocupaciones) * 10) / 10;

    // Llamadas por hora = total_llamadas / (days_count × horas_trabajo)
    const llamadasXHora = agents.map(a => {
      const llamasDia = a.days_count > 0 ? a.total_llamadas / a.days_count : 0;
      return llamasDia / HORAS_TRABAJO;
    });

    const llamadasXHoraPromedio = llamadasXHora.length > 0
      ? Math.round(llamadasXHora.reduce((s, v) => s + v, 0) / llamadasXHora.length * 10) / 10
      : 0;
    const llamadasXHoraMax = Math.round(Math.max(...llamadasXHora) * 10) / 10;
    const llamadasXHoraMin = Math.round(Math.min(...llamadasXHora) * 10) / 10;

    // KPIs de calidad (promedios del equipo — últimos 30d)
    const avg = (arr: number[]) => arr.length > 0
      ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length * 10) / 10
      : 0;

    const csatPromedio = avg(agents.map(a => a.avg_csat));
    const fcrPromedio = avg(agents.map(a => a.avg_fcr));
    const escalacionesPromedio = avg(agents.map(a => a.avg_escalaciones));

    return {
      ocupacionPromedio,
      ocupacionMaxima,
      ocupacionMinima,
      llamadasXHoraPromedio,
      llamadasXHoraMax,
      llamadasXHoraMin,
      csatPromedio,
      fcrPromedio,
      escalacionesPromedio,
      agentesActivos: agents.length,
      loading: false,
      error: null,
    };
  }, [loading, error, agents]);
}
