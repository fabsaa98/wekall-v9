-- ═══════════════════════════════════════════════════════════════════════════
-- Migration · 2026-05-18 · Sprint 1 · RBAC explícito
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Sprint 1 · P1-8. Reemplaza el RBAC implícito (`if user.role === 'ceo'`
-- disperso por el frontend) con una tabla normalizada.
--
-- Roles canónicos (alineados con WeKall):
--   wekall_admin   — staff WeKall, ve todos los tenants
--   ceo            — CEO del tenant
--   supervisor     — supervisor de operación
--   agent          — agente individual
--   analyst        — analítica / BI sin escritura
--   viewer         — solo lectura
--
-- Permisos canónicos:
--   read.*, write.*, admin.users, admin.billing, admin.config
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. Catálogo de roles ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.app_roles (
  role text PRIMARY KEY,
  description text NOT NULL,
  permissions text[] NOT NULL DEFAULT '{}',
  is_wekall_internal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.app_roles (role, description, permissions, is_wekall_internal) VALUES
  ('wekall_admin', 'Staff WeKall — acceso completo a todos los tenants',
   ARRAY['*'], true),
  ('ceo', 'CEO del tenant — lectura completa + admin de equipo',
   ARRAY['read.*', 'write.config', 'write.alerts', 'admin.users'], false),
  ('supervisor', 'Supervisor — gestión operativa diaria',
   ARRAY['read.*', 'write.qa', 'write.coaching', 'write.alerts'], false),
  ('agent', 'Agente — solo sus transcripciones y QA',
   ARRAY['read.own_transcriptions', 'read.own_qa', 'read.coaching'], false),
  ('analyst', 'Analista BI — lectura + exports',
   ARRAY['read.*', 'export.*'], false),
  ('viewer', 'Solo lectura básica',
   ARRAY['read.dashboard', 'read.transcriptions'], false)
ON CONFLICT (role) DO UPDATE SET
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  is_wekall_internal = EXCLUDED.is_wekall_internal;

-- ─── 2. Migrar app_users.role para usar el catálogo ─────────────────────────

ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS role_validated boolean GENERATED ALWAYS AS
    (role IN ('wekall_admin','ceo','supervisor','agent','analyst','viewer')) STORED;

-- Backfill: cualquier role no canónico → 'viewer' (más restrictivo).
UPDATE public.app_users
SET role = 'viewer'
WHERE role NOT IN ('wekall_admin','ceo','supervisor','agent','analyst','viewer');

-- ─── 3. FK opcional (no rompe inserts si app_roles no existe) ───────────────

-- (intencionalmente sin FK rígida para permitir bootstrap; se valida via CHECK)
ALTER TABLE public.app_users
  DROP CONSTRAINT IF EXISTS app_users_role_check;

ALTER TABLE public.app_users
  ADD CONSTRAINT app_users_role_check
  CHECK (role IN ('wekall_admin','ceo','supervisor','agent','analyst','viewer'));

-- ─── 4. Helpers SQL ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.user_has_permission(perm text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.app_roles
    WHERE role = public.current_role_app()
      AND (
        '*' = ANY(permissions)
        OR perm = ANY(permissions)
        OR (split_part(perm,'.',1) || '.*') = ANY(permissions)
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_has_permission(text) TO authenticated, service_role;

COMMIT;
