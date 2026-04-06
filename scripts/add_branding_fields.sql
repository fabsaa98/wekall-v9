-- ─── Agregar campos de branding extendido a client_branding ──────────────────
-- Ejecutar en Supabase Dashboard > SQL Editor

ALTER TABLE public.client_branding
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS twitter_url TEXT,
  ADD COLUMN IF NOT EXISTS facebook_url TEXT,
  ADD COLUMN IF NOT EXISTS industry_description TEXT,  -- descripción corta de qué hace la empresa
  ADD COLUMN IF NOT EXISTS contact_email TEXT,         -- email de contacto general
  ADD COLUMN IF NOT EXISTS phone TEXT;                  -- teléfono general

-- Actualizar credismart con datos de ejemplo
UPDATE public.client_branding SET
  website_url = 'https://crediminuto.com',
  industry_description = 'Entidad financiera especializada en microcréditos para Colombia y Perú',
  contact_email = 'contacto@crediminuto.com'
WHERE client_id = 'credismart';
