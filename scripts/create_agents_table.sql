-- =============================================================================
-- WeKall Intelligence — Script de creación de tablas
-- =============================================================================
-- INSTRUCCIONES:
--   1. Abre el Supabase Dashboard: https://supabase.com/dashboard/project/iszodrpublcnsyvtgjcg
--   2. Ve a "SQL Editor" en el menú izquierdo
--   3. Pega este script completo y haz clic en "Run"
--   4. Verifica en "Table Editor" que las tres tablas existen
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. TABLA: agents_performance
--    Performance diaria de agentes en campañas de cobranzas
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.agents_performance (
  id              BIGSERIAL PRIMARY KEY,
  fecha           DATE        NOT NULL,
  agent_id        TEXT        NOT NULL,  -- Ej: "10982", "5515"
  agent_name      TEXT        NOT NULL,  -- Nombre completo del agente
  campaign_id     TEXT        NOT NULL DEFAULT 'cobranzas_crediminuto_co',
  area            TEXT        NOT NULL DEFAULT 'Cobranzas',

  -- KPIs de cobranzas
  tasa_contacto   NUMERIC(5,2) NOT NULL DEFAULT 0,  -- % de llamadas con contacto efectivo
  tasa_promesa    NUMERIC(5,2) NOT NULL DEFAULT 0,  -- % de contactos que generan promesa de pago
  aht_segundos    INTEGER      NOT NULL DEFAULT 0,  -- Tiempo promedio de atención en segundos
  csat            NUMERIC(3,1) NOT NULL DEFAULT 0,  -- Satisfacción del cliente (1.0 - 5.0)
  fcr             NUMERIC(5,2) NOT NULL DEFAULT 0,  -- First Call Resolution %
  escalaciones    NUMERIC(5,2) NOT NULL DEFAULT 0,  -- % de llamadas escaladas

  -- Volúmenes
  llamadas_total  INTEGER      NOT NULL DEFAULT 0,
  contactos       INTEGER      NOT NULL DEFAULT 0,
  promesas        INTEGER      NOT NULL DEFAULT 0,

  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  UNIQUE (fecha, agent_id)
);

-- Índices para performance en queries
CREATE INDEX IF NOT EXISTS idx_agents_performance_fecha
  ON public.agents_performance (fecha DESC);

CREATE INDEX IF NOT EXISTS idx_agents_performance_agent_id
  ON public.agents_performance (agent_id);

CREATE INDEX IF NOT EXISTS idx_agents_performance_agent_fecha
  ON public.agents_performance (agent_id, fecha DESC);

-- RLS: habilitar pero permitir lectura anónima (el frontend usa anon key)
ALTER TABLE public.agents_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_agents_performance"
  ON public.agents_performance FOR SELECT
  TO anon, authenticated
  USING (true);

-- Para escritura desde el seed script (anon key):
-- NOTA: Si el seed falla por RLS, ejecutar esta policy temporalmente:
-- CREATE POLICY "anon_insert_agents_performance"
--   ON public.agents_performance FOR INSERT
--   TO anon
--   WITH CHECK (true);
-- Borrarla después de cargar los datos de seed.

COMMENT ON TABLE public.agents_performance IS
  'Performance diaria de agentes WeKall — Cobranzas Crediminuto Colombia';


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. TABLA: alert_log
--    Historial de alertas disparadas por el sistema de monitoreo
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.alert_log (
  id            BIGSERIAL PRIMARY KEY,
  fired_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  severity      TEXT         NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  metric        TEXT         NOT NULL,   -- nombre de la métrica que disparó la alerta
  title         TEXT         NOT NULL,
  description   TEXT,
  threshold     NUMERIC,                 -- valor umbral configurado
  actual_value  NUMERIC,                 -- valor real en el momento del disparo
  source        TEXT         NOT NULL DEFAULT 'cdr_daily_metrics',  -- tabla/origen
  client_id     TEXT         NOT NULL DEFAULT 'credismart',
  notified      BOOLEAN      NOT NULL DEFAULT FALSE,  -- si ya se notificó por wacli/etc.
  notified_at   TIMESTAMPTZ,
  metadata      JSONB                    -- datos adicionales en JSON
);

-- Índice para historial reciente
CREATE INDEX IF NOT EXISTS idx_alert_log_fired_at
  ON public.alert_log (fired_at DESC);

CREATE INDEX IF NOT EXISTS idx_alert_log_severity
  ON public.alert_log (severity, fired_at DESC);

-- RLS: lectura y escritura para anon (el frontend inserta alertas)
ALTER TABLE public.alert_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_alert_log"
  ON public.alert_log FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "anon_insert_alert_log"
  ON public.alert_log FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

COMMENT ON TABLE public.alert_log IS
  'Historial de alertas disparadas por WeKall Intelligence — monitoreadas por GlorIA';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. TABLA: vicky_conversations
--    Historial de conversaciones con Vicky Insights
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.vicky_conversations (
  id            BIGSERIAL PRIMARY KEY,
  session_id    TEXT         NOT NULL,   -- UUID de sesión del usuario
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  client_id     TEXT         NOT NULL DEFAULT 'credismart',

  -- La pregunta del usuario
  question      TEXT         NOT NULL,

  -- La respuesta de Vicky
  answer        TEXT         NOT NULL,

  -- Metadatos del mensaje
  confidence    TEXT         CHECK (confidence IN ('Alta', 'Media', 'Baja')),
  sources       TEXT[],                  -- array de strings con fuentes citadas
  follow_ups    TEXT[],                  -- sugerencias de follow-up generadas
  model_used    TEXT         DEFAULT 'gpt-4o',

  -- Para análisis interno
  tokens_used   INTEGER,
  latency_ms    INTEGER
);

-- Índice para historial por sesión y fecha
CREATE INDEX IF NOT EXISTS idx_vicky_conversations_session
  ON public.vicky_conversations (session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vicky_conversations_created_at
  ON public.vicky_conversations (created_at DESC);

-- RLS: lectura y escritura para anon
ALTER TABLE public.vicky_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_vicky_conversations"
  ON public.vicky_conversations FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "anon_insert_vicky_conversations"
  ON public.vicky_conversations FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

COMMENT ON TABLE public.vicky_conversations IS
  'Historial de Q&A con Vicky Insights — WeKall Intelligence';


-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICACIÓN: listar las tablas creadas
-- ─────────────────────────────────────────────────────────────────────────────

SELECT table_name, pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) AS size
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('agents_performance', 'alert_log', 'vicky_conversations')
ORDER BY table_name;
