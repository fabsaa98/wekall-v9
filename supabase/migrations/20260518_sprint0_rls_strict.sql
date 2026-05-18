-- ═══════════════════════════════════════════════════════════════════════════
-- Migration · 2026-05-18 · Sprint 0 · RLS strict multi-tenant
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Cierra P0-1 (leak cross-tenant via ANON key) y P0-7 (sin custom claim
-- client_id en JWT). Verificado: con `USING (true)` en policies, la ANON
-- key publicada en el bundle permitía leer transcripciones, app_users
-- (con emails de CEOs) y client_config de TODOS los tenants.
--
-- Cambios:
--   1. Custom claim helpers — current_client_id(), current_role_app()
--   2. RLS strict en todas las tablas con PII / client_id
--   3. Revoca SELECT del rol anon en tablas con datos sensibles
--   4. Policies basadas en custom claim del JWT
--
-- DEPENDENCIA: requiere que Supabase Auth Hook `custom_access_token` esté
-- configurado para inyectar `client_id` y `role` en el JWT (ver script
-- 20260518_sprint0_auth_hook.sql).
--
-- VERIFICACIÓN POST-DEPLOY:
--   curl -sS "$SUPABASE_URL/rest/v1/transcriptions?select=client_id,agent_name&limit=1" \
--        -H "apikey: $ANON_KEY"
--   --> debe retornar [] o 401 (antes retornaba filas cross-tenant)
--
-- ROLLBACK: existe `20260518_sprint0_rls_strict_ROLLBACK.sql` con las
-- policies abiertas previas. NO usar en prod salvo emergencia.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. Helper functions para leer custom claims del JWT ─────────────────────

CREATE OR REPLACE FUNCTION public.current_client_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'client_id',
    ''
  );
$$;

CREATE OR REPLACE FUNCTION public.current_role_app()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    ''
  );
$$;

CREATE OR REPLACE FUNCTION public.is_wekall_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.current_role_app() = 'wekall_admin';
$$;

GRANT EXECUTE ON FUNCTION public.current_client_id() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.current_role_app() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_wekall_admin() TO authenticated, service_role;

-- ─── 2. Revoke anon SELECT en tablas con PII ────────────────────────────────
-- Defensa en profundidad: aunque la policy de abajo bloquee, también
-- quitamos el GRANT base para que un error en la policy no abra todo.

DO $$
DECLARE
  t text;
  tables_pii text[] := ARRAY[
    'transcriptions',
    'app_users',
    'client_config',
    'client_branding',
    'cdr_daily_metrics',
    'cdr_campaign_metrics',
    'cdr_hourly_metrics',
    'agents_performance',
    'agents',
    'campaigns',
    'transcripts',
    'vicky_conversations',
    'alert_log',
    'executive_insights_jobs',
    'executive_insights',
    'voicebot_metrics',
    'customer_journeys',
    'channel_costs',
    'qa_evaluations',
    'csat_responses',
    'nps_responses'
  ];
BEGIN
  FOREACH t IN ARRAY tables_pii LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('REVOKE SELECT, INSERT, UPDATE, DELETE ON public.%I FROM anon', t);
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
END $$;

-- ─── 3. Drop policies abiertas anteriores ────────────────────────────────────

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (qual LIKE '%true%' OR roles::text LIKE '%anon%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- ─── 4. Policies strict basadas en current_client_id() ──────────────────────

-- Macro: una tabla con columna client_id → policies SELECT/INSERT/UPDATE/DELETE
-- filtradas por current_client_id(). Permitir bypass total para is_wekall_admin().

DO $$
DECLARE
  t text;
  tables_with_client_id text[] := ARRAY[
    'transcriptions',
    'cdr_daily_metrics',
    'cdr_campaign_metrics',
    'cdr_hourly_metrics',
    'agents_performance',
    'agents',
    'campaigns',
    'transcripts',
    'vicky_conversations',
    'alert_log',
    'executive_insights_jobs',
    'executive_insights',
    'voicebot_metrics',
    'customer_journeys',
    'channel_costs',
    'qa_evaluations',
    'csat_responses',
    'nps_responses',
    'client_config',
    'client_branding'
  ];
BEGIN
  FOREACH t IN ARRAY tables_with_client_id LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=t AND column_name='client_id'
    ) THEN
      EXECUTE format($f$
        CREATE POLICY "tenant_select" ON public.%I
          FOR SELECT TO authenticated
          USING (client_id = public.current_client_id() OR public.is_wekall_admin())
      $f$, t);

      EXECUTE format($f$
        CREATE POLICY "tenant_insert" ON public.%I
          FOR INSERT TO authenticated
          WITH CHECK (client_id = public.current_client_id() OR public.is_wekall_admin())
      $f$, t);

      EXECUTE format($f$
        CREATE POLICY "tenant_update" ON public.%I
          FOR UPDATE TO authenticated
          USING (client_id = public.current_client_id() OR public.is_wekall_admin())
          WITH CHECK (client_id = public.current_client_id() OR public.is_wekall_admin())
      $f$, t);

      EXECUTE format($f$
        CREATE POLICY "tenant_delete" ON public.%I
          FOR DELETE TO authenticated
          USING (client_id = public.current_client_id() OR public.is_wekall_admin())
      $f$, t);

      -- service_role bypass siempre (Worker + background jobs)
      EXECUTE format($f$
        CREATE POLICY "service_all" ON public.%I
          FOR ALL TO service_role
          USING (true) WITH CHECK (true)
      $f$, t);
    END IF;
  END LOOP;
END $$;

-- ─── 5. app_users — caso especial (filtro por email = JWT email) ─────────────

DROP POLICY IF EXISTS "tenant_select" ON public.app_users;
DROP POLICY IF EXISTS "tenant_insert" ON public.app_users;
DROP POLICY IF EXISTS "tenant_update" ON public.app_users;
DROP POLICY IF EXISTS "tenant_delete" ON public.app_users;

-- Usuario solo se ve a sí mismo en su tenant. Admins WeKall ven todo.
CREATE POLICY "app_users_self_select" ON public.app_users
  FOR SELECT TO authenticated
  USING (
    (client_id = public.current_client_id() AND email = (auth.jwt() ->> 'email'))
    OR public.is_wekall_admin()
  );

-- Solo wekall_admin puede crear / modificar usuarios.
CREATE POLICY "app_users_admin_all" ON public.app_users
  FOR ALL TO authenticated
  USING (public.is_wekall_admin())
  WITH CHECK (public.is_wekall_admin());

CREATE POLICY "app_users_service" ON public.app_users
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ─── 6. Auditoría — log de cambios de RLS ────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.rls_migration_log (
  id bigserial PRIMARY KEY,
  migration_name text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

INSERT INTO public.rls_migration_log (migration_name, notes) VALUES (
  '20260518_sprint0_rls_strict',
  'RLS strict aplicado. Custom claim client_id requerido en JWT. ' ||
  'Antes: anon podía leer cross-tenant (P0-1). Después: solo authenticated con su client_id.'
);

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN POST-DEPLOY
-- ═══════════════════════════════════════════════════════════════════════════
--
-- 1. Anon NO debe poder leer transcriptions:
--    SET ROLE anon;
--    SELECT count(*) FROM transcriptions;  -- esperado: 0 filas o error de RLS
--    RESET ROLE;
--
-- 2. Authenticated con client_id=saludtotal solo ve sus transcripciones:
--    -- (test desde la app real con un usuario de saludtotal)
--    SELECT count(*) FROM transcriptions GROUP BY client_id;
--    -- esperado: solo cuenta de saludtotal
--
-- 3. Service role sigue viendo todo (Worker + jobs):
--    SET ROLE service_role;
--    SELECT count(distinct client_id) FROM transcriptions;
--    -- esperado: 7 (saludtotal, crediminuto, bold, bold2, wekall, loggro, demo_empresa)
--    RESET ROLE;
-- ═══════════════════════════════════════════════════════════════════════════
