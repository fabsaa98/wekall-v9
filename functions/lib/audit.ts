/**
 * Audit log helper — inserta filas en `audit_log` vía Worker o REST directo.
 *
 * Sprint 2 · P2-10. Idempotente best-effort: si la inserción falla no
 * rompemos la request del usuario (audit log no debe bloquear el flujo).
 */

import { getSupabaseAdmin } from './supabase-admin';
import { log } from './logger';

export interface AuditEntry {
  request_id?: string;
  client_id?: string | null;
  user_id?: string | null;
  user_email?: string | null;
  action: string;
  resource_type?: string;
  resource_id?: string;
  endpoint?: string;
  method?: string;
  status?: number;
  ip?: string;
  user_agent?: string;
  metadata?: Record<string, unknown>;
}

export async function recordAudit(
  env: Record<string, string | undefined>,
  entry: AuditEntry
): Promise<void> {
  try {
    const supabase = getSupabaseAdmin(env);
    const { error } = await supabase.from('audit_log').insert({
      ts: new Date().toISOString(),
      ...entry,
    });
    if (error) {
      log.warn('audit_insert_failed', {
        error: error.message,
        action: entry.action,
        client_id: entry.client_id || undefined,
      });
    }
  } catch (err) {
    // Best-effort: no rompemos la request por una falla del audit log.
    log.warn('audit_unhandled', {
      error: err instanceof Error ? err.message : String(err),
      action: entry.action,
    });
  }
}

/**
 * Versión fire-and-forget que no espera la inserción.
 * Útil para endpoints en hot path.
 */
export function recordAuditAsync(env: Record<string, string | undefined>, entry: AuditEntry): void {
  // No await — el ExecutionContext.waitUntil() ideal, pero en CF Pages está disponible
  // como context.waitUntil; aquí lo dejamos como promesa no esperada (mejor que nada).
  void recordAudit(env, entry);
}
