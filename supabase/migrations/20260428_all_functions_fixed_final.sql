-- ═══════════════════════════════════════════════════════════════════════════
-- Scale-A: TODAS las funciones ejecutivas CORREGIDAS (versión final)
-- Fecha: 28 abril 2026, 23:36
-- Fix: TODAS las columnas ambiguas resueltas con aliases
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
      DATE_TRUNC('month', fr.fecha)::DATE as mes_calc,
      COALESCE(SUM(fr.monto_recaudado_cop), 0) as recaudo,
      COUNT(DISTINCT fr.fecha) as dias,
      LAG(COALESCE(SUM(fr.monto_recaudado_cop), 0)) OVER (ORDER BY DATE_TRUNC('month', fr.fecha)) as recaudo_prev
    FROM financial_results fr
    WHERE fr.client_id = p_client_id
      AND fr.fecha >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '2 months'
    GROUP BY DATE_TRUNC('month', fr.fecha)
  )
  SELECT 
    monthly.mes_calc::DATE,
    monthly.recaudo::NUMERIC,
    COALESCE(monthly.recaudo_prev, 0)::NUMERIC,
    ROUND(
      ((monthly.recaudo - COALESCE(monthly.recaudo_prev, 0)) / NULLIF(monthly.recaudo_prev, 0) * 100)::NUMERIC, 
      1
    ) as mom_pct,
    monthly.dias::INTEGER,
    (monthly.recaudo / NULLIF(monthly.dias, 0))::NUMERIC as promedio_diario_cop,
    (monthly.mes_calc = DATE_TRUNC('month', CURRENT_DATE)::DATE) as es_mes_actual
  FROM monthly
  WHERE monthly.recaudo > 0
  ORDER BY monthly.mes_calc DESC
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
      EXTRACT(YEAR FROM fr.fecha)::INTEGER as year_calc,
      COALESCE(SUM(fr.monto_recaudado_cop), 0) as recaudo_ytd,
      COUNT(DISTINCT fr.fecha) as dias
    FROM financial_results fr
    WHERE fr.client_id = p_client_id
      AND EXTRACT(DOY FROM fr.fecha) <= EXTRACT(DOY FROM CURRENT_DATE)
    GROUP BY EXTRACT(YEAR FROM fr.fecha)
  ),
  with_lag AS (
    SELECT 
      ytd.year_calc,
      ytd.recaudo_ytd,
      ytd.dias,
      LAG(ytd.recaudo_ytd) OVER (ORDER BY ytd.year_calc) as recaudo_ytd_prev
    FROM ytd
  )
  SELECT 
    with_lag.year_calc::INTEGER,
    with_lag.recaudo_ytd::NUMERIC,
    COALESCE(with_lag.recaudo_ytd_prev, 0)::NUMERIC,
    ROUND(
      ((with_lag.recaudo_ytd - COALESCE(with_lag.recaudo_ytd_prev, 0)) / NULLIF(with_lag.recaudo_ytd_prev, 0) * 100)::NUMERIC, 
      1
    ) as yoy_pct,
    with_lag.dias::INTEGER,
    (with_lag.year_calc = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER) as es_year_actual
  FROM with_lag
  WHERE with_lag.recaudo_ytd > 0
  ORDER BY with_lag.year_calc DESC
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
      EXTRACT(YEAR FROM fr.fecha)::TEXT || '-Q' || EXTRACT(QUARTER FROM fr.fecha)::TEXT as quarter_calc,
      EXTRACT(YEAR FROM fr.fecha)::INTEGER as year_calc,
      EXTRACT(QUARTER FROM fr.fecha)::INTEGER as q_calc,
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
    quarterly.quarter_calc,
    quarterly.recaudo::NUMERIC,
    COALESCE(quarterly.recaudo_prev, 0)::NUMERIC,
    ROUND(
      ((quarterly.recaudo - COALESCE(quarterly.recaudo_prev, 0)) / NULLIF(quarterly.recaudo_prev, 0) * 100)::NUMERIC, 
      1
    ) as qoq_pct,
    quarterly.dias::INTEGER,
    (quarterly.recaudo / NULLIF(quarterly.dias, 0))::NUMERIC as promedio_diario_cop,
    (quarterly.year_calc = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER 
     AND quarterly.q_calc = EXTRACT(QUARTER FROM CURRENT_DATE)::INTEGER) as es_quarter_actual
  FROM quarterly
  WHERE quarterly.recaudo > 0
  ORDER BY quarterly.year_calc DESC, quarterly.q_calc DESC
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
      fr.fecha as fecha_calc,
      COALESCE(SUM(fr.monto_recaudado_cop), 0) as recaudo
    FROM financial_results fr
    WHERE fr.client_id = p_client_id
      AND fr.fecha >= CURRENT_DATE - (p_dias || ' days')::INTERVAL
    GROUP BY fr.fecha
  )
  SELECT 
    daily.fecha_calc::DATE,
    daily.recaudo::NUMERIC,
    AVG(daily.recaudo) OVER (
      ORDER BY daily.fecha_calc 
      ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    )::NUMERIC as promedio_movil_7d
  FROM daily
  ORDER BY daily.fecha_calc;
END;
$$ LANGUAGE plpgsql STABLE;

-- ───────────────────────────────────────────────────────────────────────────
-- GRANT EXECUTE (todas las funciones)
-- ───────────────────────────────────────────────────────────────────────────

GRANT EXECUTE ON FUNCTION get_recaudo_hoy(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_recaudo_mtd(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_recaudo_mom(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_recaudo_yoy(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_recaudo_qoq(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_recaudo_sparkline(TEXT, INTEGER) TO anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- FIN - TODAS las funciones corregidas
-- Próximo paso: Hard refresh dashboard
-- ═══════════════════════════════════════════════════════════════════════════
