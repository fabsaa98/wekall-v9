-- Migration: Fix get_channel_cost_comparison() — eliminar referencia a voicebot_used
-- Fecha: 13 mayo 2026
-- Problema: cdr_daily_metrics NO tiene columna voicebot_used
-- Solución temporal: volúmenes en 0 hasta que se agregue la columna

CREATE OR REPLACE FUNCTION public.get_channel_cost_comparison(p_client_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_costo_vicky numeric;
  v_costo_humano numeric;
  v_volumen_vicky integer;
  v_volumen_humano integer;
  v_ahorro_pct numeric;
BEGIN
  -- Obtener costo Vicky
  SELECT costo_por_interaccion INTO v_costo_vicky
  FROM public.channel_costs
  WHERE client_id = p_client_id 
    AND channel = 'vicky'
    AND vigente_desde <= CURRENT_DATE
  ORDER BY vigente_desde DESC
  LIMIT 1;

  -- Obtener costo agente humano (voz)
  SELECT costo_por_interaccion INTO v_costo_humano
  FROM public.channel_costs
  WHERE client_id = p_client_id 
    AND channel = 'voz'
    AND vigente_desde <= CURRENT_DATE
  ORDER BY vigente_desde DESC
  LIMIT 1;

  -- ─── FIX TEMPORAL ─────────────────────────────────────────────────────────────
  -- TODO: Agregar columna voicebot_used BOOLEAN a cdr_daily_metrics
  -- Por ahora, volúmenes en 0 (el dashboard mostrará solo costos, sin volúmenes)
  v_volumen_vicky := 0;
  v_volumen_humano := 0;

  -- Query original (comentado hasta que exista la columna):
  /*
  SELECT 
    COALESCE(SUM(CASE WHEN voicebot_used THEN 1 ELSE 0 END), 0) AS vicky,
    COALESCE(SUM(CASE WHEN NOT voicebot_used THEN 1 ELSE 0 END), 0) AS humano
  INTO v_volumen_vicky, v_volumen_humano
  FROM public.cdr_daily_metrics
  WHERE client_id = p_client_id
    AND fecha >= CURRENT_DATE - INTERVAL '30 days';
  */
  -- ──────────────────────────────────────────────────────────────────────────────

  -- Calcular ahorro porcentual
  IF v_costo_humano > 0 AND v_costo_vicky IS NOT NULL THEN
    v_ahorro_pct := ((v_costo_humano - v_costo_vicky) / v_costo_humano) * 100;
  ELSE
    v_ahorro_pct := 0;
  END IF;

  -- Construir resultado
  v_result := jsonb_build_object(
    'costo_humano', COALESCE(v_costo_humano, 0),
    'costo_vicky', COALESCE(v_costo_vicky, 0),
    'ahorro_pct', ROUND(v_ahorro_pct, 2),
    'volumen_vicky', v_volumen_vicky,
    'volumen_humano', v_volumen_humano,
    'canales', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'channel', channel,
          'costo', costo_por_interaccion,
          'tiempo_seg', tiempo_promedio_segundos
        )
      )
      FROM public.channel_costs
      WHERE client_id = p_client_id
        AND vigente_desde <= CURRENT_DATE
      ORDER BY vigente_desde DESC
    )
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_channel_cost_comparison IS 
  'P2 Scale-A: Comparativa de costos Vicky IA vs Agente Humano (FIX: volúmenes en 0 temporal hasta agregar voicebot_used)';
