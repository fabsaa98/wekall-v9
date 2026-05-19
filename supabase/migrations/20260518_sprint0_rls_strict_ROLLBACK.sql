-- ═══════════════════════════════════════════════════════════════════════════
-- ROLLBACK · 2026-05-18 · Sprint 0 RLS strict
-- ═══════════════════════════════════════════════════════════════════════════
--
-- USAR SOLO EN EMERGENCIA. Esto re-abre el leak cross-tenant (P0-1).
-- Justificación válida: la app no puede leer datos porque el Auth Hook
-- no quedó configurado y hay clientes activos sin acceso.
--
-- Antes de ejecutar:
--   1. Avisar a Fabián y GlorIA.
--   2. Abrir incidente.
--   3. Fijar fecha de re-aplicación (no debe pasar de 24h).
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

DO $$
DECLARE
  t text;
  pol record;
  tables_pii text[] := ARRAY[
    'transcriptions','app_users','client_config','client_branding',
    'cdr_daily_metrics','cdr_campaign_metrics','cdr_hourly_metrics',
    'agents_performance','agents','campaigns','transcripts',
    'vicky_conversations','alert_log','executive_insights_jobs',
    'executive_insights','voicebot_metrics','customer_journeys',
    'channel_costs','qa_evaluations','csat_responses','nps_responses'
  ];
BEGIN
  -- Drop policies strict
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname='public' AND policyname IN
      ('tenant_select','tenant_insert','tenant_update','tenant_delete',
       'service_all','app_users_self_select','app_users_admin_all','app_users_service')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
      pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;

  -- Restaurar grant + policy abierta (estado pre-Sprint-0)
  FOREACH t IN ARRAY tables_pii LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('GRANT SELECT ON public.%I TO anon', t);
      EXECUTE format('ALTER TABLE public.%I NO FORCE ROW LEVEL SECURITY', t);
      EXECUTE format($f$
        CREATE POLICY "rollback_anon_read" ON public.%I
          FOR SELECT TO anon, authenticated
          USING (true)
      $f$, t);
    END IF;
  END LOOP;
END $$;

INSERT INTO public.rls_migration_log (migration_name, notes) VALUES (
  '20260518_sprint0_rls_strict_ROLLBACK',
  'EMERGENCIA — re-abierto cross-tenant. P0-1 está activo de nuevo. Fix forward ASAP.'
);

COMMIT;
