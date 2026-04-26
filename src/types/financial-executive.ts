/**
 * Scale-A: Executive Metrics Types
 * Fecha: 25 abril 2026
 * Fuente: Queries SQL PostgreSQL (get_recaudo_*)
 */

export interface RecaudoHoy {
  recaudo_cop: number;
  recaudo_usd: number;
  promesas_cumplidas: number;
  costo_op_cop: number;
  margen_cop: number;
  roi: number;
  registros: number;
}

export interface RecaudoMTD {
  mes: string; // '2026-04-01'
  recaudo_mtd_cop: number;
  recaudo_mtd_usd: number;
  dias_transcurridos: number;
  dias_totales_mes: number;
  promedio_diario_cop: number;
  proyeccion_mes_cop: number;
  promesas_cumplidas_mtd: number;
  costo_op_mtd_cop: number;
  margen_mtd_cop: number;
  roi_mtd: number;
}

export interface RecaudoDoD {
  fecha: string; // '2026-04-24'
  recaudo_cop: number;
  recaudo_cop_prev: number;
  dod_pct: number; // Day-over-Day %
  promesas_cumplidas: number;
  promesas_cumplidas_prev: number;
  es_ayer: boolean;
}

export interface RecaudoMoM {
  mes: string; // '2026-04-01'
  recaudo_cop: number;
  recaudo_cop_prev: number;
  mom_pct: number; // Month-over-Month %
  dias_laborables: number;
  promedio_diario_cop: number;
  es_mes_actual: boolean;
}

export interface RecaudoYoY {
  year: number; // 2026
  recaudo_ytd_cop: number;
  recaudo_ytd_cop_prev: number;
  yoy_pct: number; // Year-over-Year %
  dias_transcurridos: number;
  es_year_actual: boolean;
}

export interface RecaudoQoQ {
  quarter: string; // '2026Q2'
  recaudo_cop: number;
  recaudo_cop_prev: number;
  qoq_pct: number; // Quarter-over-Quarter %
  dias_laborables: number;
  promedio_diario_cop: number;
  es_quarter_actual: boolean;
}

export interface RecaudoSparkline {
  fecha: string; // '2026-03-27'
  recaudo_cop: number;
  promesas_cumplidas: number;
  promedio_movil_7d: number;
}
