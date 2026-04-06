-- WeKall Intelligence — Supabase Auth Setup
-- Ejecutar en Supabase SQL Editor (Dashboard > SQL Editor)
-- Este script enlaza auth.users con app_users para autenticación real

-- ─── 1. Agregar auth_id a app_users ──────────────────────────────────────────
ALTER TABLE public.app_users 
  ADD COLUMN IF NOT EXISTS auth_id uuid REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_app_users_auth_id ON public.app_users(auth_id);

-- ─── 2. Función que enlaza auth.users con app_users al hacer signup ───────────
-- Cuando alguien se registra via Supabase Auth, buscar su entrada en app_users
-- y actualizar el auth_id para el enlace (puede haber múltiples filas por email)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  UPDATE public.app_users 
  SET auth_id = NEW.id
  WHERE email = NEW.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 3. Trigger en auth.users ─────────────────────────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ─── 4. Función para obtener client_id del usuario autenticado ────────────────
-- Usada en RLS policies para multi-tenant seguro
CREATE OR REPLACE FUNCTION public.get_user_client_id()
RETURNS text AS $$
  SELECT client_id FROM public.app_users WHERE auth_id = auth.uid() LIMIT 1
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─── 5. RLS policies (plantilla — activar cuando Auth esté en producción) ─────
-- Por ahora las policies son permisivas con anon key para no romper el acceso
-- Descomentar cuando todo esté migrado a Auth real:

-- ALTER TABLE public.cdr_daily_metrics ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "users_see_own_client_data" ON public.cdr_daily_metrics
--   FOR SELECT USING (client_id = public.get_user_client_id());

-- ─── Verificación ─────────────────────────────────────────────────────────────
SELECT 
  'auth_id column' as check,
  COUNT(*) as app_users_with_auth_id
FROM public.app_users 
WHERE auth_id IS NOT NULL;
