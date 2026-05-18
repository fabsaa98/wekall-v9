/**
 * Supabase admin client factory — lee SERVICE key del env binding.
 *
 * Sprint 0 · P0-3 — antes el JWT estaba hardcodeado en cada Pages Function
 * (functions/api/jobs/create.ts:12 y functions/api/jobs/[jobId].ts:11) y
 * además apuntaba a un proyecto Supabase legacy (`iszodrpublcnsyvtgjsg`)
 * distinto del proyecto activo (`iszodrpublcnsyvtgjcg`).
 *
 * Configuración requerida en Cloudflare Pages (production secrets):
 *   - SUPABASE_URL          (ya existe en algunos paths)
 *   - SUPABASE_SERVICE_KEY  (nuevo — rotar antes de configurar)
 *
 * NUNCA exponer el SERVICE key al cliente. Solo se usa server-side.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseEnv {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_KEY?: string;
}

export function getSupabaseAdmin(env: SupabaseEnv): SupabaseClient {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_KEY;
  if (!url) throw new Error('SUPABASE_URL not configured in Pages Function env');
  if (!key) throw new Error('SUPABASE_SERVICE_KEY not configured in Pages Function env');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
