-- ═══════════════════════════════════════════════════════════════════════════
-- Scale-A: Funciones Ejecutivas FIX V2
-- Fecha: 28 abril 2026, 22:48
-- Fix: Columna "mes" ambigua en get_recaudo_mtd
-- 
-- INSTRUCCIONES:
-- 1. Abrir Supabase SQL Editor: https://supabase.com/dashboard/project/iszodrpublcnsyvtgjcg/sql
-- 2. Copy/paste este archivo completo
-- 3. Click "Run" (o Cmd+Enter)
-- 4. Verificar con: SELECT * FROM get_recaudo_mtd('crediminuto');
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 2. MONTH-TO-DATE (MTD) con proyección — FIX V2
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_recaudo_mtd(p_client_id TEXT)
RETURNS TABLE (
  mes DATE,
  recaudo_mtd_cop NUMERIC,
  recaudo_mtd_usd NUMERIC,
  dias_transcurridos INTEGER,
  dias_totales_mes INTEGER,
  promedio_diario_cop NUMERIC,
  proyeccion_mes_cop NUMERIC,
  promesas_cumplidas_mtd INTEGER,
  costo_op_mtd_cop NUMERIC,
  margen_mtd_cop NUMERIC,
  roi_mtd NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH mtd AS (
    SELECT 
      DATE_TRUNC('month', CURRENT_DATE)::DATE as mes_calc,
      COALESCE(SUM(fr.monto_recaudado_cop), 0) as recaudo_cop,
      COALESCE(SUM(fr.monto_recaudado_usd), 0) as recaudo_usd,
      COALESCE(SUM(fr.promesas_cumplidas), 0) as promesas,
      COALESCE(SUM(fr.costo_operacion_cop), 0) as costo_op,
      COALESCE(SUM(fr.margen_cop), 0) as margen,
      COUNT(DISTINCT fr.fecha) as dias_transcurridos,
      EXTRACT(DAY FROM (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day'))::INTEGER as dias_totales
    FROM financial_results fr
    WHERE fr.client_id = p_client_id
      AND fr.fecha >= DATE_TRUNC('month', CURRENT_DATE)
      AND fr.fecha <= CURRENT_DATE
  )
  SELECT 
    mtd.mes_calc::DATE,
    mtd.recaudo_cop::NUMERIC,
    mtd.recaudo_usd::NUMERIC,
    mtd.dias_transcurridos::INTEGER,
    mtd.dias_totales::INTEGER,
    (mtd.recaudo_cop / NULLIF(mtd.dias_transcurridos, 0))::NUMERIC as promedio_diario_cop,
    ((mtd.recaudo_cop / NULLIF(mtd.dias_transcurridos, 0)) * mtd.dias_totales)::NUMERIC as proyeccion_mes_cop,
    mtd.promesas::INTEGER,
    mtd.costo_op::NUMERIC,
    mtd.margen::NUMERIC,
    CASE 
      WHEN mtd.costo_op > 0 THEN (mtd.recaudo_cop / mtd.costo_op)::NUMERIC
      ELSE 0 
    END as roi_mtd
  FROM mtd;
END;
$$ LANGUAGE plpgsql STABLE;

-- ═══════════════════════════════════════════════════════════════════════════
-- FIN - Función MTD corregida
-- Próximo paso: SELECT * FROM get_recaudo_mtd('crediminuto');
-- ═══════════════════════════════════════════════════════════════════════════
