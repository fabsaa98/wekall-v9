-- ═══════════════════════════════════════════════════════════════════════════
-- Scale-A: Fix YoY y QoQ columnas ambiguas
-- Fecha: 28 abril 2026, 23:24
-- Fix: Columnas "year" y "quarter" ambiguas en get_recaudo_yoy y get_recaudo_qoq
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 4. YEAR-OVER-YEAR (YoY) — FIX
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
-- 5. QUARTER-OVER-QUARTER (QoQ) — FIX
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
-- GRANT EXECUTE (asegurar permisos)
-- ───────────────────────────────────────────────────────────────────────────

GRANT EXECUTE ON FUNCTION get_recaudo_yoy(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_recaudo_qoq(TEXT) TO anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- FIN - YoY y QoQ corregidos
-- Próximo paso: Refrescar dashboard
-- ═══════════════════════════════════════════════════════════════════════════
