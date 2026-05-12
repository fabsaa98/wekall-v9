-- Migration P5: Create forecast_revenue RPC function
-- Scale-A Financial Intelligence — Forecast Omnicanal
-- 12 mayo 2026

-- ─── RPC Function: forecast_revenue ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.forecast_revenue(
  p_client_id text,
  p_horizon_dias integer DEFAULT 30
)
RETURNS TABLE(
  fecha date,
  proyeccion_cop numeric,
  intervalo_min numeric,
  intervalo_max numeric,
  confianza text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_avg_recaudo numeric;
  v_stddev numeric;
  v_trend_slope numeric;
  v_count integer;
  v_base_date date;
  v_weekend_factor numeric := 0.65; -- Sábados/domingos bajan 35%
  v_end_month_factor numeric := 1.15; -- Últimos 3 días del mes suben 15%
BEGIN
  -- Base date: hoy
  v_base_date := CURRENT_DATE;

  -- Calcular estadísticas de últimos 90 días
  SELECT 
    AVG(monto_recaudado_cop),
    STDDEV(monto_recaudado_cop),
    COUNT(*)
  INTO v_avg_recaudo, v_stddev, v_count
  FROM public.financial_results
  WHERE client_id = p_client_id
    AND fecha >= v_base_date - INTERVAL '90 days'
    AND fecha < v_base_date;

  -- Si no hay datos suficientes, retornar vacío
  IF v_count < 30 THEN
    RETURN;
  END IF;

  -- Calcular tendencia (regresión lineal simple)
  -- Slope = Σ((x - x_avg)(y - y_avg)) / Σ((x - x_avg)²)
  WITH numbered AS (
    SELECT 
      ROW_NUMBER() OVER (ORDER BY fecha) AS x,
      monto_recaudado_cop AS y
    FROM public.financial_results
    WHERE client_id = p_client_id
      AND fecha >= v_base_date - INTERVAL '90 days'
      AND fecha < v_base_date
  ),
  stats AS (
    SELECT AVG(x) AS x_avg, AVG(y) AS y_avg FROM numbered
  )
  SELECT 
    COALESCE(
      SUM((n.x - s.x_avg) * (n.y - s.y_avg)) / NULLIF(SUM((n.x - s.x_avg) * (n.x - s.x_avg)), 0),
      0
    )
  INTO v_trend_slope
  FROM numbered n, stats s;

  -- Generar proyección día a día
  RETURN QUERY
  WITH forecast_days AS (
    SELECT 
      v_base_date + i AS f_fecha,
      i AS days_ahead
    FROM generate_series(1, p_horizon_dias) AS i
  ),
  projections AS (
    SELECT
      f_fecha,
      days_ahead,
      -- Proyección base = promedio + tendencia × días
      v_avg_recaudo + (v_trend_slope * days_ahead) AS base_projection,
      -- Factor de fin de semana
      CASE 
        WHEN EXTRACT(DOW FROM f_fecha) IN (0, 6) THEN v_weekend_factor
        ELSE 1.0
      END AS weekend_adj,
      -- Factor fin de mes (últimos 3 días)
      CASE 
        WHEN EXTRACT(DAY FROM f_fecha + INTERVAL '3 days') > EXTRACT(DAY FROM DATE_TRUNC('month', f_fecha + INTERVAL '1 month')) 
        THEN v_end_month_factor
        ELSE 1.0
      END AS eom_adj,
      -- Confianza degrada con horizonte
      CASE 
        WHEN days_ahead <= 7 THEN 'alta'
        WHEN days_ahead <= 21 THEN 'media'
        ELSE 'baja'
      END AS conf
    FROM forecast_days
  )
  SELECT
    p.f_fecha,
    ROUND(p.base_projection * p.weekend_adj * p.eom_adj, 2) AS proyeccion_cop,
    ROUND((p.base_projection * p.weekend_adj * p.eom_adj) - (v_stddev * 1.5), 2) AS intervalo_min,
    ROUND((p.base_projection * p.weekend_adj * p.eom_adj) + (v_stddev * 1.5), 2) AS intervalo_max,
    p.conf
  FROM projections p
  ORDER BY p.f_fecha;
END;
$$;

-- ─── Función auxiliar: Validar precisión del forecast ──────────────────────────

CREATE OR REPLACE FUNCTION public.forecast_accuracy_check(
  p_client_id text
)
RETURNS TABLE(
  periodo text,
  real_cop numeric,
  forecast_cop numeric,
  error_pct numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Comparar forecast de hace 30 días vs real
  RETURN QUERY
  WITH forecast_30d_ago AS (
    SELECT * FROM public.forecast_revenue(p_client_id, 30)
  ),
  actual_data AS (
    SELECT 
      fecha,
      SUM(monto_recaudado_cop) AS real
    FROM public.financial_results
    WHERE client_id = p_client_id
      AND fecha >= CURRENT_DATE - INTERVAL '30 days'
      AND fecha < CURRENT_DATE
    GROUP BY fecha
  )
  SELECT
    TO_CHAR(a.fecha, 'YYYY-MM-DD') AS periodo,
    a.real AS real_cop,
    COALESCE(f.proyeccion_cop, 0) AS forecast_cop,
    ROUND(
      CASE 
        WHEN a.real > 0 
        THEN ABS(a.real - COALESCE(f.proyeccion_cop, 0)) / a.real * 100
        ELSE 0
      END,
      2
    ) AS error_pct
  FROM actual_data a
  LEFT JOIN forecast_30d_ago f ON f.fecha = a.fecha
  ORDER BY a.fecha DESC;
END;
$$;

COMMENT ON FUNCTION public.forecast_revenue IS 'P5 Scale-A: Proyección de recaudo con regresión lineal + ajustes estacionales';
COMMENT ON FUNCTION public.forecast_accuracy_check IS 'P5 Scale-A: Validar precisión del forecast comparando vs datos reales';
