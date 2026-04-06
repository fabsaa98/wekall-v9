-- ============================================================
-- WeKall Intelligence V20 — SQL Migrations
-- Ejecutar en Supabase Dashboard > SQL Editor
-- ============================================================

-- Fix 1A: Actualizar search_transcriptions para filtrar por client_id
-- CRÍTICO: evita que clientes vean transcripciones de otros clientes
CREATE OR REPLACE FUNCTION public.search_transcriptions(
  query_embedding vector(1536),
  agent_name_filter text DEFAULT NULL,
  campaign_filter text DEFAULT NULL,
  client_id_filter text DEFAULT NULL,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  agent_name text,
  campaign text,
  call_date date,
  result text,
  transcript text,
  summary text,
  similarity float
)
LANGUAGE sql STABLE AS $$
  SELECT
    t.id, t.agent_name, t.campaign, t.call_date, t.result,
    t.transcript, t.summary,
    1 - (t.embedding <=> query_embedding) AS similarity
  FROM transcriptions t
  WHERE
    (agent_name_filter IS NULL OR t.agent_name ILIKE '%' || agent_name_filter || '%')
    AND (campaign_filter IS NULL OR t.campaign ILIKE '%' || campaign_filter || '%')
    AND (client_id_filter IS NULL OR t.client_id = client_id_filter)
  ORDER BY t.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Fix 1B: Agregar columnas de umbrales de alerta a client_config
ALTER TABLE public.client_config
  ADD COLUMN IF NOT EXISTS alert_tasa_critica numeric DEFAULT 30,
  ADD COLUMN IF NOT EXISTS alert_tasa_warning numeric DEFAULT 38,
  ADD COLUMN IF NOT EXISTS alert_delta_critico numeric DEFAULT -5,
  ADD COLUMN IF NOT EXISTS alert_delta_warning numeric DEFAULT -2.5,
  ADD COLUMN IF NOT EXISTS alert_volumen_minimo integer DEFAULT 5000;

-- Valores específicos de credismart (anteriormente Crediminuto)
UPDATE public.client_config SET
  alert_tasa_critica = 30,
  alert_tasa_warning = 38,
  alert_delta_critico = -5,
  alert_delta_warning = -2.5,
  alert_volumen_minimo = 5000
WHERE client_id = 'credismart';

-- Valores neutros para demo_empresa y wekall (usar defaults)
-- No es necesario UPDATE explícito, los DEFAULT cubrirán los nuevos registros.
-- Si ya existen esas filas y no tienen valores, forzar defaults:
UPDATE public.client_config SET
  alert_tasa_critica = COALESCE(alert_tasa_critica, 30),
  alert_tasa_warning = COALESCE(alert_tasa_warning, 38),
  alert_delta_critico = COALESCE(alert_delta_critico, -5),
  alert_delta_warning = COALESCE(alert_delta_warning, -2.5),
  alert_volumen_minimo = COALESCE(alert_volumen_minimo, 5000)
WHERE client_id IN ('demo_empresa', 'wekall');
