-- ═══════════════════════════════════════════════════════════════════════════
-- Migration · 2026-05-18 · Sprint 0 · Auth Hook custom claims
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Sprint 0 · P0-7. Esta función se conecta como Auth Hook
-- (Supabase Dashboard → Auth → Hooks → "Customize Access Token") y se ejecuta
-- cada vez que se emite un JWT. Inyecta `client_id` y `role` en el payload
-- del token desde la tabla `app_users`.
--
-- Después del deploy, hay que configurar el hook MANUALMENTE en el dashboard:
--   Authentication → Hooks → Customize Access Token (Beta) →
--     Hook to call: postgres function `public.custom_access_token`
--     Enabled: ON
--
-- Una vez activo, los JWTs van a tener:
--   {
--     "sub": "uuid-del-user",
--     "email": "ceo@saludtotal.com.co",
--     "client_id": "saludtotal",          ← NUEVO
--     "role_app": "ceo",                  ← NUEVO (no confundir con `role` JWT)
--     ...
--   }
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- Función llamada por el Auth Hook.
-- Recibe: event jsonb { user_id, claims, ... }
-- Retorna: el mismo event con claims modificados.

CREATE OR REPLACE FUNCTION public.custom_access_token(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  user_email text;
  user_client_id text;
  user_role text;
  claims jsonb;
BEGIN
  claims := event->'claims';

  -- Buscar app_user activo por email del JWT
  user_email := claims->>'email';

  SELECT au.client_id, coalesce(au.role, 'viewer')
    INTO user_client_id, user_role
  FROM public.app_users au
  WHERE au.email = user_email
    AND au.active = true
  ORDER BY au.last_login DESC NULLS LAST
  LIMIT 1;

  IF user_client_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{client_id}', to_jsonb(user_client_id));
    claims := jsonb_set(claims, '{role_app}', to_jsonb(user_role));
  ELSE
    -- Usuario sin registro en app_users → token sin client_id.
    -- Las policies RLS lo van a bloquear (current_client_id() = '').
    claims := jsonb_set(claims, '{client_id}', to_jsonb(''::text));
    claims := jsonb_set(claims, '{role_app}', to_jsonb('viewer'::text));
  END IF;

  -- Re-empaquetar el event
  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

-- El hook necesita ser invocado por supabase_auth_admin
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token TO supabase_auth_admin;
GRANT SELECT ON public.app_users TO supabase_auth_admin;

-- Revoke a roles no autorizados (defensa en profundidad)
REVOKE EXECUTE ON FUNCTION public.custom_access_token FROM authenticated, anon, public;

COMMENT ON FUNCTION public.custom_access_token IS
'Sprint 0 P0-7. Auth Hook que inyecta client_id y role_app en el JWT desde app_users. ' ||
'Configurar en Dashboard → Auth → Hooks → Customize Access Token.';

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- TEST POST-DEPLOY
-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Activar el hook en el dashboard (paso manual).
-- 2. Hacer login en la app con un usuario conocido.
-- 3. Decodificar el JWT en jwt.io → verificar que tiene `client_id` y `role_app`.
-- 4. SQL test:
--    SELECT public.custom_access_token(jsonb_build_object(
--      'claims', jsonb_build_object('email', 'fabian@wekall.co')
--    ));
--    -- Debe retornar event con claims.client_id poblado.
-- ═══════════════════════════════════════════════════════════════════════════
