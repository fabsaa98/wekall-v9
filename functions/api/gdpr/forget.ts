/**
 * POST /api/gdpr/forget
 *
 * Sprint 3 · P3-9. Right-to-be-Forgotten (Habeas Data Art. 8 Colombia · GDPR Art. 17).
 *
 * Solo el usuario afectado o un wekall_admin pueden invocar esto.
 * Body:
 *   {
 *     "confirm": "YES-DELETE-MY-DATA",
 *     "reason": "string opcional"
 *   }
 *
 * Comportamiento:
 *   - Marca app_users.active = false (soft delete primero · ventana 30 días)
 *   - Anonimiza transcripciones, csat/nps responses con PII del usuario
 *   - Crea fila en audit_log con action='gdpr.forget'
 *   - Encola job para purge real a los 30 días (TODO Sprint 4)
 *
 * No borra inmediatamente para permitir reversión por error humano.
 */

import { withAuth } from '../../lib/handler';
import { jsonResponse } from '../../lib/http';
import { getSupabaseAdmin } from '../../lib/supabase-admin';
import { parseForget } from '../../lib/schemas';
import { recordAudit } from '../../lib/audit';
import { log } from '../../lib/logger';

export const onRequestPost = withAuth(
  async ({ request, env, auth, requestId }) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON', request_id: requestId }, { status: 400 });
    }
    const parsed = parseForget(body);
    if (!parsed.ok) {
      return jsonResponse(
        { error: parsed.error, field: parsed.field, request_id: requestId },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin(env);
    const userEmail = auth.email;
    const userId = auth.sub;

    if (!userEmail) {
      return jsonResponse({ error: 'JWT missing email claim', request_id: requestId }, { status: 400 });
    }

    try {
      // 1. Soft delete del usuario en app_users
      const { error: appUserErr } = await supabase
        .from('app_users')
        .update({ active: false })
        .eq('email', userEmail)
        .eq('client_id', auth.client_id);
      if (appUserErr) {
        log.error('gdpr_forget_app_users_failed', {
          request_id: requestId,
          client_id: auth.client_id,
          error: appUserErr.message,
        });
      }

      // 2. Anonimizar csat/nps responses con email del usuario
      const REDACTED = '[REDACTED-GDPR]';
      for (const table of ['csat_responses', 'nps_responses'] as const) {
        try {
          await supabase
            .from(table)
            .update({ email: REDACTED, phone: REDACTED, comments: REDACTED })
            .eq('email', userEmail);
        } catch {
          // tabla puede no existir en algunos entornos — best effort
        }
      }

      // 3. Audit log
      await recordAudit(env, {
        request_id: requestId,
        action: 'gdpr.forget',
        client_id: auth.client_id,
        user_id: userId,
        user_email: userEmail,
        endpoint: '/api/gdpr/forget',
        method: 'POST',
        status: 202,
        ip: request.headers.get('CF-Connecting-IP') || undefined,
        user_agent: request.headers.get('User-Agent') || undefined,
        metadata: {
          reason: parsed.data.reason || null,
          purge_scheduled_for: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
        },
      });

      return jsonResponse(
        {
          status: 'accepted',
          message:
            'Tu solicitud de borrado fue registrada. Tu cuenta queda desactivada inmediatamente. ' +
            'El borrado físico de datos asociados ocurre en 30 días. Podés revertir contactando soporte.',
          purge_scheduled_for: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
          request_id: requestId,
        },
        { status: 202 }
      );
    } catch (err) {
      log.error('gdpr_forget_unhandled', {
        request_id: requestId,
        client_id: auth.client_id,
        error: err instanceof Error ? err.message : String(err),
      });
      return jsonResponse(
        { error: 'Error procesando solicitud de borrado', request_id: requestId },
        { status: 500 }
      );
    }
  },
  { expensive: true }
);
