-- ═══════════════════════════════════════════════════════════════════════════
-- Scale-A: Funciones Ejecutivas CORREGIDAS
-- Fecha: 27 abril 2026
-- Fix: Columnas ambiguas calificadas con nombre de tabla
-- 
-- INSTRUCCIONES:
-- 1. Abrir Supabase SQL Editor: https://supabase.com/dashboard/project/iszodrpublcnsyvtgjcg/sql
-- 2. Copy/paste este archivo completo
-- 3. Click "Run" (o Cmd+Enter)
-- 4. Verificar con: SELECT * FROM get_recaudo_hoy('crediminuto');
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 1. RECAUDO HOY (Real-time)
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_recaudo_hoy(p_client_id TEXT)
RETURNS TABLE (
  recaudo_cop NUMERIC,
  recaudo_usd NUMERIC,
  promesas_cumplidas INTEGER,
  costo_op_cop NUMERIC,
  margen_cop NUMERIC,
  roi NUMERIC,
  registros INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(fr.monto_recaudado_cop), 0)::NUMERIC as recaudo_cop,
    COALESCE(SUM(fr.monto_recaudado_usd), 0)::NUMERIC as recaudo_usd,
    COALESCE(SUM(fr.promesas_cumplidas), 0)::INTEGER as promesas_cumplidas,
    COALESCE(SUM(fr.costo_operacion_cop), 0)::NUMERIC as costo_op_cop,
    COALESCE(SUM(fr.margen_cop), 0)::NUMERIC as margen_cop,
    CASE 
      WHEN SUM(fr.costo_operacion_cop) > 0 
      THEN (SUM(fr.monto_recaudado_cop) / SUM(fr.costo_operacion_cop))::NUMERIC
      ELSE 0
    END as roi,
    COUNT(*)::INTEGER as registros
  FROM financial_results fr
  WHERE fr.client_id = p_client_id
    AND fr.fecha = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql STABLE;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. MONTH-TO-DATE (MTD) con proyección
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
      DATE_TRUNC('month', CURRENT_DATE)::DATE as mes,
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
    mes,
    recaudo_cop::NUMERIC,
    recaudo_usd::NUMERIC,
    dias_transcurridos::INTEGER,
    dias_totales::INTEGER,
    (recaudo_cop / NULLIF(dias_transcurridos, 0))::NUMERIC as promedio_diario_cop,
    ((recaudo_cop / NULLIF(dias_transcurridos, 0)) * dias_totales)::NUMERIC as proyeccion_mes_cop,
    promesas::INTEGER,
    costo_op::NUMERIC,
    margen::NUMERIC,
    CASE 
      WHEN costo_op > 0 THEN (recaudo_cop / costo_op)::NUMERIC
      ELSE 0 
    END as roi_mtd
  FROM mtd;
END;
$$ LANGUAGE plpgsql STABLE;

-- ───────────────────────────────────────────────────────────────────────────
-- 3. MONTH-OVER-MONTH (MoM)
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_recaudo_mom(p_client_id TEXT)
RETURNS TABLE (
  mes DATE,
  recaudo_cop NUMERIC,
  recaudo_cop_prev NUMERIC,
  mom_pct NUMERIC,
  dias_laborables INTEGER,
  promedio_diario_cop NUMERIC,
  es_mes_actual BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH monthly AS (
    SELECT 
      DATE_TRUNC('month', fr.fecha)::DATE as mes,
      COALESCE(SUM(fr.monto_recaudado_cop), 0) as recaudo,
      COUNT(DISTINCT fr.fecha) as dias,
      LAG(COALESCE(SUM(fr.monto_recaudado_cop), 0)) OVER (ORDER BY DATE_TRUNC('month', fr.fecha)) as recaudo_prev
    FROM financial_results fr
    WHERE fr.client_id = p_client_id
      AND fr.fecha >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '2 months'
    GROUP BY DATE_TRUNC('month', fr.fecha)
  )
  SELECT 
    mes,
    recaudo::NUMERIC,
    COALESCE(recaudo_prev, 0)::NUMERIC,
    ROUND(
      ((recaudo - COALESCE(recaudo_prev, 0)) / NULLIF(recaudo_prev, 0) * 100)::NUMERIC, 
      1
    ) as mom_pct,
    dias::INTEGER,
    (recaudo / NULLIF(dias, 0))::NUMERIC as promedio_diario_cop,
    (mes = DATE_TRUNC('month', CURRENT_DATE)::DATE) as es_mes_actual
  FROM monthly
  WHERE recaudo > 0
  ORDER BY mes DESC
  LIMIT 2;
END;
$$ LANGUAGE plpgsql STABLE;

-- ───────────────────────────────────────────────────────────────────────────
-- 4. YEAR-OVER-YEAR (YoY)
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_recaudo_yoy(p_client_id TEXT)
RETURNS TABLE (
  year INTEGER,
  recaudo_ytd_cop NUMERIC,
  recaudo_ytd_cop_prev NUMERIC,
  yoy_pct NUMERIC,
  dias_transcurridos INTEGER,
  es_year_actual BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH ytd AS (
    SELECT 
      EXTRACT(YEAR FROM fr.fecha)::INTEGER as year,
      COALESCE(SUM(fr.monto_recaudado_cop), 0) as recaudo_ytd,
      COUNT(DISTINCT fr.fecha) as dias
    FROM financial_results fr
    WHERE fr.client_id = p_client_id
      AND EXTRACT(DOY FROM fr.fecha) <= EXTRACT(DOY FROM CURRENT_DATE)
    GROUP BY EXTRACT(YEAR FROM fr.fecha)
  ),
  with_lag AS (
    SELECT 
      year,
      recaudo_ytd,
      dias,
      LAG(recaudo_ytd) OVER (ORDER BY year) as recaudo_ytd_prev
    FROM ytd
  )
  SELECT 
    year,
    recaudo_ytd::NUMERIC,
    COALESCE(recaudo_ytd_prev, 0)::NUMERIC,
    ROUND(
      ((recaudo_ytd - COALESCE(recaudo_ytd_prev, 0)) / NULLIF(recaudo_ytd_prev, 0) * 100)::NUMERIC, 
      1
    ) as yoy_pct,
    dias::INTEGER,
    (year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER) as es_year_actual
  FROM with_lag
  WHERE recaudo_ytd > 0
  ORDER BY year DESC
  LIMIT 2;
END;
$$ LANGUAGE plpgsql STABLE;

-- ───────────────────────────────────────────────────────────────────────────
-- 5. QUARTER-OVER-QUARTER (QoQ)
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_recaudo_qoq(p_client_id TEXT)
RETURNS TABLE (
  quarter TEXT,
  recaudo_cop NUMERIC,
  recaudo_cop_prev NUMERIC,
  qoq_pct NUMERIC,
  dias_laborables INTEGER,
  promedio_diario_cop NUMERIC,
  es_quarter_actual BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH quarterly AS (
    SELECT 
      EXTRACT(YEAR FROM fr.fecha)::TEXT || '-Q' || EXTRACT(QUARTER FROM fr.fecha)::TEXT as quarter,
      EXTRACT(YEAR FROM fr.fecha)::INTEGER as year,
      EXTRACT(QUARTER FROM fr.fecha)::INTEGER as q,
      COALESCE(SUM(fr.monto_recaudado_cop), 0) as recaudo,
      COUNT(DISTINCT fr.fecha) as dias,
      LAG(COALESCE(SUM(fr.monto_recaudado_cop), 0)) OVER (
        ORDER BY EXTRACT(YEAR FROM fr.fecha), EXTRACT(QUARTER FROM fr.fecha)
      ) as recaudo_prev
    FROM financial_results fr
    WHERE fr.client_id = p_client_id
      AND fr.fecha >= DATE_TRUNC('quarter', CURRENT_DATE) - INTERVAL '1 quarter'
    GROUP BY 
      EXTRACT(YEAR FROM fr.fecha), 
      EXTRACT(QUARTER FROM fr.fecha)
  )
  SELECT 
    quarter,
    recaudo::NUMERIC,
    COALESCE(recaudo_prev, 0)::NUMERIC,
    ROUND(
      ((recaudo - COALESCE(recaudo_prev, 0)) / NULLIF(recaudo_prev, 0) * 100)::NUMERIC, 
      1
    ) as qoq_pct,
    dias::INTEGER,
    (recaudo / NULLIF(dias, 0))::NUMERIC as promedio_diario_cop,
    (year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER 
     AND q = EXTRACT(QUARTER FROM CURRENT_DATE)::INTEGER) as es_quarter_actual
  FROM quarterly
  WHERE recaudo > 0
  ORDER BY year DESC, q DESC
  LIMIT 2;
END;
$$ LANGUAGE plpgsql STABLE;

-- ───────────────────────────────────────────────────────────────────────────
-- 6. SPARKLINE (últimos 30 días + promedio móvil 7d)
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_recaudo_sparkline(p_client_id TEXT, p_dias INTEGER DEFAULT 30)
RETURNS TABLE (
  fecha DATE,
  recaudo_cop NUMERIC,
  promedio_movil_7d NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH daily AS (
    SELECT 
      fr.fecha,
      COALESCE(SUM(fr.monto_recaudado_cop), 0) as recaudo
    FROM financial_results fr
    WHERE fr.client_id = p_client_id
      AND fr.fecha >= CURRENT_DATE - (p_dias || ' days')::INTERVAL
    GROUP BY fr.fecha
  )
  SELECT 
    fecha,
    recaudo::NUMERIC,
    AVG(recaudo) OVER (
      ORDER BY fecha 
      ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    )::NUMERIC as promedio_movil_7d
  FROM daily
  ORDER BY fecha;
END;
$$ LANGUAGE plpgsql STABLE;

-- ═══════════════════════════════════════════════════════════════════════════
-- FIN - Funciones ejecutivas corregidas
-- Próximo paso: SELECT * FROM get_recaudo_hoy('crediminuto');
-- ═══════════════════════════════════════════════════════════════════════════
