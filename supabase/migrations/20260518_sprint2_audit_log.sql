-- ═══════════════════════════════════════════════════════════════════════════
-- Migration · 2026-05-18 · Sprint 2 · Audit log
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Sprint 2 · P2-10. Tabla append-only que registra cada acceso a recursos
-- sensibles (transcripciones, configs, downloads) y eventos auth.
--
-- Diseño:
--   - append-only (sin UPDATE/DELETE para authenticated)
--   - particionable por mes (TODO Sprint 3 con P2-1)
--   - índices para queries forenses por client_id, user_id, ts
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE IF NOT EXISTS public.audit_log (
  id bigserial PRIMARY KEY,
  ts timestamptz NOT NULL DEFAULT now(),
  request_id text,
  user_id uuid,
  user_email text,
  client_id text,
  action text NOT NULL,            -- 'api.get.transcription', 'auth.login', 'auth.failed_login', 'gdpr.forget', ...
  resource_type text,              -- 'transcription', 'app_user', 'client_config', 'job', ...
  resource_id text,
  endpoint text,
  method text,
  status int,
  ip text,
  user_agent text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_client_ts_idx ON public.audit_log (client_id, ts DESC);
CREATE INDEX IF NOT EXISTS audit_log_user_ts_idx ON public.audit_log (user_id, ts DESC);
CREATE INDEX IF NOT EXISTS audit_log_action_ts_idx ON public.audit_log (action, ts DESC);
CREATE INDEX IF NOT EXISTS audit_log_resource_idx ON public.audit_log (resource_type, resource_id) WHERE resource_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS audit_log_status_idx ON public.audit_log (status) WHERE status >= 400;

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log FORCE ROW LEVEL SECURITY;

-- service_role escribe libremente
REVOKE ALL ON public.audit_log FROM anon, authenticated;
GRANT INSERT, SELECT ON public.audit_log TO service_role;

CREATE POLICY "audit_service_all" ON public.audit_log
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- wekall_admin puede leer todo (forensia)
CREATE POLICY "audit_wekall_admin_read" ON public.audit_log
  FOR SELECT TO authenticated
  USING (public.is_wekall_admin());

-- Tenants pueden ver SU PROPIO audit log (transparencia GDPR / Habeas Data Art. 8)
CREATE POLICY "audit_tenant_self_read" ON public.audit_log
  FOR SELECT TO authenticated
  USING (
    client_id = public.current_client_id()
    AND public.user_has_permission('admin.audit')
  );

-- NO permitir UPDATE/DELETE a nadie (append-only) — solo service_role.
-- Las policies de arriba ya restringen a SELECT para authenticated.

-- Helper RPC para insertar desde el middleware (vía PostgREST)
CREATE OR REPLACE FUNCTION public.record_audit(
  p_action text,
  p_resource_type text DEFAULT NULL,
  p_resource_id text DEFAULT NULL,
  p_endpoint text DEFAULT NULL,
  p_method text DEFAULT NULL,
  p_status int DEFAULT NULL,
  p_ip text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_request_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id bigint;
  v_uid uuid;
  v_email text;
BEGIN
  v_uid := (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
  v_email := nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email';

  INSERT INTO public.audit_log (
    ts, request_id, user_id, user_email, client_id, action,
    resource_type, resource_id, endpoint, method, status, ip, user_agent, metadata
  ) VALUES (
    now(), p_request_id, v_uid, v_email, public.current_client_id(), p_action,
    p_resource_type, p_resource_id, p_endpoint, p_method, p_status, p_ip, p_user_agent, p_metadata
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_audit TO authenticated, service_role;

COMMIT;
