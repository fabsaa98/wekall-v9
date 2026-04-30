DROP FUNCTION IF EXISTS get_recaudo_hoy(text);
DROP FUNCTION IF EXISTS get_recaudo_mtd(text);
DROP FUNCTION IF EXISTS get_recaudo_mom(text);
DROP FUNCTION IF EXISTS get_recaudo_yoy(text);
DROP FUNCTION IF EXISTS get_recaudo_qoq(text);
DROP FUNCTION IF EXISTS get_recaudo_sparkline(text, integer);
DROP FUNCTION IF EXISTS get_recaudo_sparkline(text);

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
    COALESCE(SUM(fr.monto_recaudado_cop), 0)::NUMERIC,
    COALESCE(SUM(fr.monto_recaudado_usd), 0)::NUMERIC,
    COALESCE(SUM(fr.promesas_cumplidas), 0)::INTEGER,
    COALESCE(SUM(fr.costo_operacion_cop), 0)::NUMERIC,
    COALESCE(SUM(fr.margen_cop), 0)::NUMERIC,
    CASE 
      WHEN SUM(fr.costo_operacion_cop) > 0 
      THEN (SUM(fr.monto_recaudado_cop) / SUM(fr.costo_operacion_cop))::NUMERIC
      ELSE 0
    END,
    COUNT(*)::INTEGER
  FROM financial_results fr
  WHERE fr.client_id = p_client_id
    AND fr.fecha = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql STABLE;

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
      DATE_TRUNC('month', CURRENT_DATE)::DATE as mes_cte,
      COALESCE(SUM(fr.monto_recaudado_cop), 0) as recaudo_cop_cte,
      COALESCE(SUM(fr.monto_recaudado_usd), 0) as recaudo_usd_cte,
      COALESCE(SUM(fr.promesas_cumplidas), 0) as promesas_cte,
      COALESCE(SUM(fr.costo_operacion_cop), 0) as costo_op_cte,
      COALESCE(SUM(fr.margen_cop), 0) as margen_cte,
      COUNT(DISTINCT fr.fecha) as dias_transcurridos_cte,
      EXTRACT(DAY FROM (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day'))::INTEGER as dias_totales_cte
    FROM financial_results fr
    WHERE fr.client_id = p_client_id
      AND fr.fecha >= DATE_TRUNC('month', CURRENT_DATE)
      AND fr.fecha <= CURRENT_DATE
  )
  SELECT 
    mtd.mes_cte::DATE,
    mtd.recaudo_cop_cte::NUMERIC,
    mtd.recaudo_usd_cte::NUMERIC,
    mtd.dias_transcurridos_cte::INTEGER,
    mtd.dias_totales_cte::INTEGER,
    (mtd.recaudo_cop_cte / NULLIF(mtd.dias_transcurridos_cte, 0))::NUMERIC,
    ((mtd.recaudo_cop_cte / NULLIF(mtd.dias_transcurridos_cte, 0)) * mtd.dias_totales_cte)::NUMERIC,
    mtd.promesas_cte::INTEGER,
    mtd.costo_op_cte::NUMERIC,
    mtd.margen_cte::NUMERIC,
    CASE 
      WHEN mtd.costo_op_cte > 0 THEN (mtd.recaudo_cop_cte / mtd.costo_op_cte)::NUMERIC
      ELSE 0 
    END
  FROM mtd;
END;
$$ LANGUAGE plpgsql STABLE;

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
      DATE_TRUNC('month', fr.fecha)::DATE as mes_cte,
      COALESCE(SUM(fr.monto_recaudado_cop), 0) as recaudo_cte,
      COUNT(DISTINCT fr.fecha) as dias_cte,
      LAG(COALESCE(SUM(fr.monto_recaudado_cop), 0)) OVER (ORDER BY DATE_TRUNC('month', fr.fecha)) as recaudo_prev_cte
    FROM financial_results fr
    WHERE fr.client_id = p_client_id
      AND fr.fecha >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '2 months'
    GROUP BY DATE_TRUNC('month', fr.fecha)
  )
  SELECT 
    monthly.mes_cte::DATE,
    monthly.recaudo_cte::NUMERIC,
    COALESCE(monthly.recaudo_prev_cte, 0)::NUMERIC,
    ROUND(
      ((monthly.recaudo_cte - COALESCE(monthly.recaudo_prev_cte, 0)) / NULLIF(monthly.recaudo_prev_cte, 0) * 100)::NUMERIC, 
      1
    ),
    monthly.dias_cte::INTEGER,
    (monthly.recaudo_cte / NULLIF(monthly.dias_cte, 0))::NUMERIC,
    (monthly.mes_cte = DATE_TRUNC('month', CURRENT_DATE)::DATE)
  FROM monthly
  WHERE monthly.recaudo_cte > 0
  ORDER BY monthly.mes_cte DESC
  LIMIT 2;
END;
$$ LANGUAGE plpgsql STABLE;

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
      EXTRACT(YEAR FROM fr.fecha)::INTEGER as year_cte,
      COALESCE(SUM(fr.monto_recaudado_cop), 0) as recaudo_ytd_cte,
      COUNT(DISTINCT fr.fecha) as dias_cte
    FROM financial_results fr
    WHERE fr.client_id = p_client_id
      AND EXTRACT(DOY FROM fr.fecha) <= EXTRACT(DOY FROM CURRENT_DATE)
    GROUP BY EXTRACT(YEAR FROM fr.fecha)
  ),
  with_lag AS (
    SELECT 
      ytd.year_cte,
      ytd.recaudo_ytd_cte,
      ytd.dias_cte,
      LAG(ytd.recaudo_ytd_cte) OVER (ORDER BY ytd.year_cte) as recaudo_ytd_prev_cte
    FROM ytd
  )
  SELECT 
    with_lag.year_cte::INTEGER,
    with_lag.recaudo_ytd_cte::NUMERIC,
    COALESCE(with_lag.recaudo_ytd_prev_cte, 0)::NUMERIC,
    ROUND(
      ((with_lag.recaudo_ytd_cte - COALESCE(with_lag.recaudo_ytd_prev_cte, 0)) / NULLIF(with_lag.recaudo_ytd_prev_cte, 0) * 100)::NUMERIC, 
      1
    ),
    with_lag.dias_cte::INTEGER,
    (with_lag.year_cte = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER)
  FROM with_lag
  WHERE with_lag.recaudo_ytd_cte > 0
  ORDER BY with_lag.year_cte DESC
  LIMIT 2;
END;
$$ LANGUAGE plpgsql STABLE;

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
      EXTRACT(YEAR FROM fr.fecha)::TEXT || '-Q' || EXTRACT(QUARTER FROM fr.fecha)::TEXT as quarter_cte,
      EXTRACT(YEAR FROM fr.fecha)::INTEGER as year_cte,
      EXTRACT(QUARTER FROM fr.fecha)::INTEGER as q_cte,
      COALESCE(SUM(fr.monto_recaudado_cop), 0) as recaudo_cte,
      COUNT(DISTINCT fr.fecha) as dias_cte,
      LAG(COALESCE(SUM(fr.monto_recaudado_cop), 0)) OVER (
        ORDER BY EXTRACT(YEAR FROM fr.fecha), EXTRACT(QUARTER FROM fr.fecha)
      ) as recaudo_prev_cte
    FROM financial_results fr
    WHERE fr.client_id = p_client_id
      AND fr.fecha >= DATE_TRUNC('quarter', CURRENT_DATE) - INTERVAL '1 quarter'
    GROUP BY 
      EXTRACT(YEAR FROM fr.fecha), 
      EXTRACT(QUARTER FROM fr.fecha)
  )
  SELECT 
    quarterly.quarter_cte::TEXT,
    quarterly.recaudo_cte::NUMERIC,
    COALESCE(quarterly.recaudo_prev_cte, 0)::NUMERIC,
    ROUND(
      ((quarterly.recaudo_cte - COALESCE(quarterly.recaudo_prev_cte, 0)) / NULLIF(quarterly.recaudo_prev_cte, 0) * 100)::NUMERIC, 
      1
    ),
    quarterly.dias_cte::INTEGER,
    (quarterly.recaudo_cte / NULLIF(quarterly.dias_cte, 0))::NUMERIC,
    (quarterly.year_cte = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER 
     AND quarterly.q_cte = EXTRACT(QUARTER FROM CURRENT_DATE)::INTEGER)
  FROM quarterly
  WHERE quarterly.recaudo_cte > 0
  ORDER BY quarterly.year_cte DESC, quarterly.q_cte DESC
  LIMIT 2;
END;
$$ LANGUAGE plpgsql STABLE;

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
      fr.fecha as fecha_cte,
      COALESCE(SUM(fr.monto_recaudado_cop), 0) as recaudo_cte
    FROM financial_results fr
    WHERE fr.client_id = p_client_id
      AND fr.fecha >= CURRENT_DATE - (p_dias || ' days')::INTERVAL
    GROUP BY fr.fecha
  )
  SELECT 
    daily.fecha_cte::DATE,
    daily.recaudo_cte::NUMERIC,
    AVG(daily.recaudo_cte) OVER (
      ORDER BY daily.fecha_cte 
      ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    )::NUMERIC
  FROM daily
  ORDER BY daily.fecha_cte;
END;
$$ LANGUAGE plpgsql STABLE;
