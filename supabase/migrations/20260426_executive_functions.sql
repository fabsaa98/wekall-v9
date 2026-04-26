-- ═══════════════════════════════════════════════════════════════════════════
-- Scale-A: Funciones Ejecutivas para Financial Intelligence
-- Fecha: 26 abril 2026
-- Propósito: Métricas CEO-relevantes (HOY, MTD, MoM, YoY, QoQ, Sparkline)
-- 
-- INSTRUCCIONES:
-- 1. Abrir Supabase SQL Editor: https://supabase.com/dashboard/project/iszodrpublcnsyvtgjcg/sql
-- 2. Copy/paste este archivo completo
-- 3. Click "Run" (o Cmd+Enter)
-- 4. Refrescar dashboard WeKall Intelligence
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
    COALESCE(SUM(monto_recaudado_cop), 0)::NUMERIC as recaudo_cop,
    COALESCE(SUM(monto_recaudado_usd), 0)::NUMERIC as recaudo_usd,
    COALESCE(SUM(promesas_cumplidas), 0)::INTEGER as promesas_cumplidas,
    COALESCE(SUM(costo_operacion_cop), 0)::NUMERIC as costo_op_cop,
    COALESCE(SUM(margen_cop), 0)::NUMERIC as margen_cop,
    CASE 
      WHEN SUM(costo_operacion_cop) > 0 
      THEN (SUM(monto_recaudado_cop) / SUM(costo_operacion_cop))::NUMERIC
      ELSE 0
    END as roi,
    COUNT(*)::INTEGER as registros
  FROM financial_results
  WHERE client_id = p_client_id
    AND fecha = CURRENT_DATE;
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
      COALESCE(SUM(monto_recaudado_cop), 0) as recaudo_cop,
      COALESCE(SUM(monto_recaudado_usd), 0) as recaudo_usd,
      COALESCE(SUM(promesas_cumplidas), 0) as promesas,
      COALESCE(SUM(costo_operacion_cop), 0) as costo_op,
      COALESCE(SUM(margen_cop), 0) as margen,
      COUNT(DISTINCT fecha) as dias_transcurridos,
      EXTRACT(DAY FROM (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day'))::INTEGER as dias_totales
    FROM financial_results
    WHERE client_id = p_client_id
      AND fecha >= DATE_TRUNC('month', CURRENT_DATE)
      AND fecha <= CURRENT_DATE
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
      DATE_TRUNC('month', fecha)::DATE as mes,
      COALESCE(SUM(monto_recaudado_cop), 0) as recaudo,
      COUNT(DISTINCT fecha) as dias,
      LAG(COALESCE(SUM(monto_recaudado_cop), 0)) OVER (ORDER BY DATE_TRUNC('month', fecha)) as recaudo_prev
    FROM financial_results
    WHERE client_id = p_client_id
      AND fecha >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '2 months'
    GROUP BY DATE_TRUNC('month', fecha)
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
  WHERE recaudo > 0  -- Solo meses con datos
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
      EXTRACT(YEAR FROM fecha)::INTEGER as year,
      COALESCE(SUM(monto_recaudado_cop), 0) as recaudo_ytd,
      COUNT(DISTINCT fecha) as dias
    FROM financial_results
    WHERE client_id = p_client_id
      AND EXTRACT(DOY FROM fecha) <= EXTRACT(DOY FROM CURRENT_DATE)
    GROUP BY EXTRACT(YEAR FROM fecha)
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
  WHERE recaudo_ytd > 0  -- Solo años con datos
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
      TO_CHAR(DATE_TRUNC('quarter', fecha), 'YYYY"Q"Q') as quarter,
      DATE_TRUNC('quarter', fecha) as quarter_date,
      COALESCE(SUM(monto_recaudado_cop), 0) as recaudo,
      COUNT(DISTINCT fecha) as dias,
      LAG(COALESCE(SUM(monto_recaudado_cop), 0)) OVER (ORDER BY DATE_TRUNC('quarter', fecha)) as recaudo_prev
    FROM financial_results
    WHERE client_id = p_client_id
      AND fecha >= DATE_TRUNC('quarter', CURRENT_DATE) - INTERVAL '3 months'
    GROUP BY DATE_TRUNC('quarter', fecha)
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
    (quarter_date = DATE_TRUNC('quarter', CURRENT_DATE)) as es_quarter_actual
  FROM quarterly
  WHERE recaudo > 0  -- Solo quarters con datos
  ORDER BY quarter_date DESC
  LIMIT 2;
END;
$$ LANGUAGE plpgsql STABLE;

-- ───────────────────────────────────────────────────────────────────────────
-- 6. SPARKLINE (últimos 30 días con promedio móvil)
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_recaudo_sparkline(p_client_id TEXT, p_dias INTEGER DEFAULT 30)
RETURNS TABLE (
  fecha DATE,
  recaudo_cop NUMERIC,
  promesas_cumplidas INTEGER,
  promedio_movil_7d NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH daily AS (
    SELECT 
      fecha,
      COALESCE(SUM(monto_recaudado_cop), 0) as recaudo,
      COALESCE(SUM(promesas_cumplidas), 0) as promesas
    FROM financial_results
    WHERE client_id = p_client_id
      AND fecha >= CURRENT_DATE - (p_dias || ' days')::INTERVAL
      AND fecha < CURRENT_DATE
    GROUP BY fecha
  )
  SELECT 
    fecha,
    recaudo::NUMERIC,
    promesas::INTEGER,
    AVG(recaudo) OVER (
      ORDER BY fecha 
      ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    )::NUMERIC as promedio_movil_7d
  FROM daily
  ORDER BY fecha ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- ═══════════════════════════════════════════════════════════════════════════
-- TESTING (descomenta para validar)
-- ═══════════════════════════════════════════════════════════════════════════

-- SELECT * FROM get_recaudo_hoy('crediminuto');
-- SELECT * FROM get_recaudo_mtd('crediminuto');
-- SELECT * FROM get_recaudo_mom('crediminuto');
-- SELECT * FROM get_recaudo_yoy('crediminuto');
-- SELECT * FROM get_recaudo_qoq('crediminuto');
-- SELECT * FROM get_recaudo_sparkline('crediminuto', 30);
