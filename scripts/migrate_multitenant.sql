-- ============================================================
-- WeKall Intelligence — Migración Multi-Tenant
-- Ejecutar en Supabase Dashboard > SQL Editor
-- Fecha: 2026-04-05
-- ============================================================

-- ─── 1. Agregar client_id a tablas existentes ─────────────────────────────────

ALTER TABLE public.cdr_daily_metrics
  ADD COLUMN IF NOT EXISTS client_id TEXT NOT NULL DEFAULT 'credismart';

ALTER TABLE public.transcriptions
  ADD COLUMN IF NOT EXISTS client_id TEXT NOT NULL DEFAULT 'credismart';

ALTER TABLE public.agents_performance
  ADD COLUMN IF NOT EXISTS client_id TEXT NOT NULL DEFAULT 'credismart';

-- ─── 2. Actualizar registros existentes con client_id = 'credismart' ──────────

UPDATE public.cdr_daily_metrics
SET client_id = 'credismart'
WHERE client_id IS NULL OR client_id = '';

UPDATE public.transcriptions
SET client_id = 'credismart'
WHERE client_id IS NULL OR client_id = '';

UPDATE public.agents_performance
SET client_id = 'credismart'
WHERE client_id IS NULL OR client_id = '';

-- ─── 3. Índices por client_id ─────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_cdr_daily_metrics_client_id
  ON public.cdr_daily_metrics(client_id);

CREATE INDEX IF NOT EXISTS idx_transcriptions_client_id
  ON public.transcriptions(client_id);

CREATE INDEX IF NOT EXISTS idx_agents_performance_client_id
  ON public.agents_performance(client_id);

-- Índices compuestos para queries frecuentes
CREATE INDEX IF NOT EXISTS idx_cdr_daily_metrics_client_fecha
  ON public.cdr_daily_metrics(client_id, fecha DESC);

CREATE INDEX IF NOT EXISTS idx_agents_performance_client_fecha
  ON public.agents_performance(client_id, fecha DESC);

-- ─── 4. Tabla app_users ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  client_id text NOT NULL REFERENCES public.client_config(client_id),
  role text NOT NULL DEFAULT 'CEO' CHECK (role IN ('CEO', 'VP Ventas', 'VP CX', 'COO', 'admin')),
  name text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  last_login timestamptz
);

CREATE INDEX IF NOT EXISTS idx_app_users_client_id ON public.app_users(client_id);
CREATE INDEX IF NOT EXISTS idx_app_users_email ON public.app_users(email);

-- ─── 5. Usuario inicial ───────────────────────────────────────────────────────

INSERT INTO public.app_users (email, client_id, role, name)
VALUES ('fabian@wekall.co', 'credismart', 'admin', 'Fabián Saavedra')
ON CONFLICT (email) DO NOTHING;

-- ─── 6. RLS Policies (permisivas con anon key — auth real viene después) ─────

-- Habilitar RLS si no está habilitado
ALTER TABLE public.cdr_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- Eliminar policies anteriores (si existen) para recrearlas
DROP POLICY IF EXISTS "Allow anon read cdr_daily_metrics" ON public.cdr_daily_metrics;
DROP POLICY IF EXISTS "Allow anon read transcriptions" ON public.transcriptions;
DROP POLICY IF EXISTS "Allow anon read agents_performance" ON public.agents_performance;
DROP POLICY IF EXISTS "Allow anon read app_users" ON public.app_users;
DROP POLICY IF EXISTS "Allow anon insert cdr_daily_metrics" ON public.cdr_daily_metrics;
DROP POLICY IF EXISTS "Allow anon insert agents_performance" ON public.agents_performance;

-- Policies permisivas para anon key (MVP — reemplazar con auth real en v2)
-- Lectura pública por client_id
CREATE POLICY "Allow anon read cdr_daily_metrics"
  ON public.cdr_daily_metrics
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow anon read transcriptions"
  ON public.transcriptions
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow anon read agents_performance"
  ON public.agents_performance
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow anon read app_users"
  ON public.app_users
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Escritura para alert_log y vicky_conversations (ya tienen client_id)
CREATE POLICY IF NOT EXISTS "Allow anon insert alert_log"
  ON public.alert_log
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow anon insert vicky_conversations"
  ON public.vicky_conversations
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- ─── 7. Tabla client_branding ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.client_branding (
  client_id text PRIMARY KEY REFERENCES public.client_config(client_id),
  logo_url text,
  primary_color text DEFAULT '#6334C0',
  company_name text,
  tagline text,
  updated_at timestamptz DEFAULT now()
);

-- RLS para client_branding
ALTER TABLE public.client_branding ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read client_branding" ON public.client_branding;
CREATE POLICY "Allow anon read client_branding"
  ON public.client_branding
  FOR SELECT
  TO anon, authenticated
  USING (true);

INSERT INTO public.client_branding (client_id, company_name, tagline)
VALUES ('credismart', 'CrediSmart / Crediminuto', 'Cobranzas Crediminuto Colombia')
ON CONFLICT (client_id) DO NOTHING;

-- RLS para client_config (lectura pública)
ALTER TABLE public.client_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read client_config" ON public.client_config;
CREATE POLICY "Allow anon read client_config"
  ON public.client_config
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- ─── FIN MIGRACIÓN ────────────────────────────────────────────────────────────
-- Verificar con:
-- SELECT table_name, column_name FROM information_schema.columns
--   WHERE table_name IN ('cdr_daily_metrics','transcriptions','agents_performance')
--   AND column_name = 'client_id';
