-- ═══════════════════════════════════════════════════════════════════════════
-- Migration · 2026-05-18 · Sprint 2 · Usage log para costos por tenant
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Sprint 2 · P2-11. Sin esto no podemos saber cuánto cuesta cada tenant en
-- llamadas a OpenAI / Deepgram / etc. Crítico para pricing y unit economics.
--
-- El Worker debe insertar en esta tabla en cada llamada externa con
-- (client_id, provider, model, tokens_in, tokens_out, cost_usd).
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE IF NOT EXISTS public.usage_log (
  id bigserial PRIMARY KEY,
  ts timestamptz NOT NULL DEFAULT now(),
  client_id text NOT NULL,
  user_id uuid,
  provider text NOT NULL,                -- 'openai', 'deepgram', 'anthropic'
  service text NOT NULL,                  -- 'chat', 'transcribe', 'embed'
  model text,                             -- 'gpt-4o-mini', 'whisper-1', etc.
  tokens_in int,
  tokens_out int,
  audio_seconds numeric(10,2),            -- para STT
  cost_usd numeric(12,6),
  request_id text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS usage_log_client_ts_idx ON public.usage_log (client_id, ts DESC);
CREATE INDEX IF NOT EXISTS usage_log_client_provider_ts_idx ON public.usage_log (client_id, provider, ts DESC);
CREATE INDEX IF NOT EXISTS usage_log_ts_idx ON public.usage_log (ts DESC);

ALTER TABLE public.usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_log FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.usage_log FROM anon;
GRANT SELECT ON public.usage_log TO authenticated;
GRANT INSERT, SELECT ON public.usage_log TO service_role;

CREATE POLICY "usage_log_service_all" ON public.usage_log
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "usage_log_tenant_read" ON public.usage_log
  FOR SELECT TO authenticated
  USING (client_id = public.current_client_id() OR public.is_wekall_admin());

-- ─── Vista agregada para dashboard de costos ─────────────────────────────────

CREATE OR REPLACE VIEW public.usage_summary_daily AS
SELECT
  client_id,
  date_trunc('day', ts)::date AS fecha,
  provider,
  service,
  count(*) AS calls,
  coalesce(sum(tokens_in), 0)::bigint AS total_tokens_in,
  coalesce(sum(tokens_out), 0)::bigint AS total_tokens_out,
  coalesce(sum(audio_seconds), 0)::numeric(12,2) AS total_audio_seconds,
  coalesce(sum(cost_usd), 0)::numeric(12,4) AS total_cost_usd
FROM public.usage_log
GROUP BY client_id, date_trunc('day', ts), provider, service;

GRANT SELECT ON public.usage_summary_daily TO authenticated, service_role;

CREATE OR REPLACE VIEW public.usage_summary_monthly AS
SELECT
  client_id,
  date_trunc('month', ts)::date AS mes,
  provider,
  count(*) AS calls,
  coalesce(sum(cost_usd), 0)::numeric(12,4) AS total_cost_usd
FROM public.usage_log
GROUP BY client_id, date_trunc('month', ts), provider;

GRANT SELECT ON public.usage_summary_monthly TO authenticated, service_role;

-- ─── Agregar a data_classification ──────────────────────────────────────────

INSERT INTO public.data_classification (table_name, sensitivity, pii_kinds, retention_days, legal_basis, notes)
VALUES
  ('usage_log', 'confidential', ARRAY[]::text[], 1095, 'Operación · facturación', 'Necesario para billing y compliance fiscal · 3 años.')
ON CONFLICT (table_name) DO UPDATE SET notes = EXCLUDED.notes;

COMMIT;
