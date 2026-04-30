-- ═══════════════════════════════════════════════════════════════════════════
-- Scale-A: Fix MoM columna ambigua
-- Fecha: 28 abril 2026, 23:30
-- Fix: Columna "mes" ambigua en get_recaudo_mom
-- ═══════════════════════════════════════════════════════════════════════════

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

GRANT EXECUTE ON FUNCTION get_recaudo_mom(TEXT) TO anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- FIN - MoM corregido
-- ═══════════════════════════════════════════════════════════════════════════
