-- Migration P2: Create channel_costs table
-- Scale-A Financial Intelligence — Costo por Canal (Vicky IA vs Agente Humano)
-- 12 mayo 2026

CREATE TABLE IF NOT EXISTS public.channel_costs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id text REFERENCES public.client_config(client_id),
  channel text NOT NULL CHECK (channel IN ('voz', 'vicky', 'whatsapp', 'email', 'chat')),
  costo_por_interaccion numeric NOT NULL DEFAULT 0,
  tiempo_promedio_segundos integer DEFAULT 0,
  vigente_desde date NOT NULL DEFAULT CURRENT_DATE,
  notas text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_channel_costs_client 
  ON public.channel_costs(client_id, channel, vigente_desde DESC);

-- RLS
ALTER TABLE public.channel_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_full_access_channel_costs" ON public.channel_costs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "anon_read_channel_costs" ON public.channel_costs
  FOR SELECT TO anon USING (true);

-- ─── RPC Function: get_channel_cost_comparison ────────────────────────────────

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

  -- Volúmenes últimos 30 días (desde CDR)
  SELECT 
    COALESCE(SUM(CASE WHEN voicebot_used THEN 1 ELSE 0 END), 0) AS vicky,
    COALESCE(SUM(CASE WHEN NOT voicebot_used THEN 1 ELSE 0 END), 0) AS humano
  INTO v_volumen_vicky, v_volumen_humano
  FROM public.cdr_daily_metrics
  WHERE client_id = p_client_id
    AND fecha >= CURRENT_DATE - INTERVAL '30 days';

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

-- ─── Seed Data: Crediminuto ────────────────────────────────────────────────────

-- Costo agente humano (voz)
-- Suposición: Agente $3M/mes, 22 días, 100 interacciones/día = $1,363 COP/interacción
INSERT INTO public.channel_costs (client_id, channel, costo_por_interaccion, tiempo_promedio_segundos, vigente_desde, notas)
VALUES 
  ('crediminuto', 'voz', 1363, 180, '2026-05-01', 'Agente humano: $3M/mes ÷ 22 días ÷ 100 interacciones'),
  ('crediminuto', 'vicky', 85, 120, '2026-05-01', 'Vicky IA: ~850 tokens × $0.10/1K = $85 COP/interacción'),
  ('crediminuto', 'whatsapp', 50, 90, '2026-05-01', 'WhatsApp bot: bajo costo token'),
  ('crediminuto', 'email', 20, 0, '2026-05-01', 'Email automatizado: costo mínimo')
ON CONFLICT DO NOTHING;

-- WeKall (datos ejemplo)
INSERT INTO public.channel_costs (client_id, channel, costo_por_interaccion, tiempo_promedio_segundos, vigente_desde, notas)
VALUES 
  ('wekall', 'voz', 1500, 200, '2026-05-01', 'Agente humano WeKall'),
  ('wekall', 'vicky', 90, 130, '2026-05-01', 'Vicky IA WeKall'),
  ('wekall', 'whatsapp', 60, 100, '2026-05-01', 'WhatsApp WeKall'),
  ('wekall', 'email', 25, 0, '2026-05-01', 'Email WeKall')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE public.channel_costs IS 'P2 Scale-A: Costo operativo por canal de atención (IA vs humano)';
COMMENT ON FUNCTION public.get_channel_cost_comparison IS 'P2 Scale-A: Comparativa de costos Vicky IA vs Agente Humano + volúmenes';
