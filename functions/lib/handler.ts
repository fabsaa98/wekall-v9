/**
 * Pages Function handler wrapper — auth + rate-limit + structured logs + errors.
 *
 * Sprint 1 · P0-5 propagado a las 12 Pages Functions restantes
 * (`agents/*`, `cdr/*`, `client/*`, `dashboard/*`, `transcriptions/*`, `vicky/*`).
 *
 * Uso:
 *   export const onRequestGet = withAuth(async ({ auth, request, env }) => {
 *     // auth.client_id ya validado contra el JWT — usalo en lugar de query params.
 *     return jsonResponse({...});
 *   });
 */

import { requireAuth, AuthError, type AuthClaims } from './auth';
import { checkRateLimit, buildRateLimitOpts, rateLimitHeaders } from './rate-limit';
import { jsonResponse } from './http';
import { log, newRequestId } from './logger';

export interface AuthedContext {
  request: Request;
  env: Record<string, string | undefined>;
  auth: AuthClaims;
  requestId: string;
  params: Record<string, string>;
}

export interface WithAuthOptions {
  expensive?: boolean;        // applies stricter rate-limit
  endpoint?: string;          // override endpoint name in rate-limit key
}

export function withAuth<T = unknown>(
  handler: (ctx: AuthedContext) => Promise<Response>,
  opts: WithAuthOptions = {}
) {
  return async (context: {
    request: Request;
    env: Record<string, string | undefined>;
    params?: Record<string, string>;
  }): Promise<Response> => {
    const requestId = context.request.headers.get('X-Request-Id') || newRequestId();
    const endpoint = opts.endpoint || new URL(context.request.url).pathname;

    try {
      // 1. Auth
      const auth = await requireAuth(context.request, context.env);

      // 2. Rate limit por usuario (defensa en profundidad — middleware global ya hace IP-level)
      const rl = await checkRateLimit(
        context.env,
        buildRateLimitOpts(context.request, auth, endpoint, { expensive: opts.expensive })
      );
      if (!rl.allowed) {
        log.warn('rate_limit_exceeded', {
          request_id: requestId,
          endpoint,
          client_id: auth.client_id,
          user_id: auth.sub,
        });
        return new Response(
          JSON.stringify({ error: 'Too many requests', retry_after: rl.reset, request_id: requestId }),
          { status: 429, headers: { 'Content-Type': 'application/json', ...rateLimitHeaders(rl) } }
        );
      }

      // 3. Run handler
      const ctx: AuthedContext = {
        request: context.request,
        env: context.env,
        auth,
        requestId,
        params: context.params || {},
      };
      const response = await handler(ctx);

      // 4. Adjuntar rate-limit headers a la respuesta
      const merged = new Headers(response.headers);
      for (const [k, v] of Object.entries(rateLimitHeaders(rl))) merged.set(k, v);
      merged.set('X-Request-Id', requestId);
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: merged,
      });
    } catch (err) {
      if (err instanceof AuthError) {
        return jsonResponse({ error: err.message, request_id: requestId }, { status: err.status });
      }
      log.error('handler_unhandled', {
        request_id: requestId,
        endpoint,
        error: err instanceof Error ? err.message : String(err),
      });
      return jsonResponse(
        { error: 'Internal server error', request_id: requestId },
        { status: 500 }
      );
    }
  };
}

/**
 * Versión para endpoints públicos donde el JWT es opcional (ej. /api/share/*).
 * No bloquea por falta de auth, pero loguea quién es si vino.
 */
export function withOptionalAuth(
  handler: (ctx: Omit<AuthedContext, 'auth'> & { auth: AuthClaims | null }) => Promise<Response>
) {
  return async (context: {
    request: Request;
    env: Record<string, string | undefined>;
    params?: Record<string, string>;
  }): Promise<Response> => {
    const requestId = context.request.headers.get('X-Request-Id') || newRequestId();
    try {
      let auth: AuthClaims | null = null;
      try {
        auth = await requireAuth(context.request, context.env);
      } catch {
        auth = null;
      }
      return await handler({
        request: context.request,
        env: context.env,
        auth,
        requestId,
        params: context.params || {},
      });
    } catch (err) {
      log.error('handler_optional_unhandled', {
        request_id: requestId,
        error: err instanceof Error ? err.message : String(err),
      });
      return jsonResponse({ error: 'Internal server error', request_id: requestId }, { status: 500 });
    }
  };
}
