/**
 * Global Middleware for Cloudflare Pages Functions
 *
 * Sprint 0 ajustes:
 *  - P0-4: CORS allowlist por entorno (antes era `*`)
 *  - P1-9: Content Security Policy + HSTS + frame protection
 *  - P0-6: rate limiting baseline (IP anónimo / user autenticado)
 *  - P2-4: logs estructurados JSON
 *
 * Las verificaciones de auth y rate-limit específicas por endpoint se hacen
 * dentro de cada handler usando `functions/lib/auth.ts` y `functions/lib/rate-limit.ts`.
 * Este middleware solo aplica CORS, security headers y logging global.
 */

import { buildCorsHeaders, applyCors } from './lib/cors';
import { buildSecurityHeaders } from './lib/security-headers';
import { log, newRequestId } from './lib/logger';
import { buildRateLimitOpts, checkRateLimit, rateLimitHeaders } from './lib/rate-limit';

export const onRequest: PagesFunction = async (context) => {
  const { request, next, env } = context;
  const startTime = Date.now();
  const url = new URL(request.url);
  const requestId = request.headers.get('X-Request-Id') || newRequestId();
  const envRecord = env as unknown as Record<string, string | undefined>;
  const cors = buildCorsHeaders(request, envRecord);

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: cors as unknown as HeadersInit });
  }

  // Rate limit global por IP solo para /api/* (los assets estáticos pasan libres).
  if (url.pathname.startsWith('/api/')) {
    const opts = buildRateLimitOpts(request, null, 'global');
    const rl = await checkRateLimit(envRecord, opts);
    if (!rl.allowed) {
      log.warn('rate_limit_exceeded', {
        request_id: requestId,
        endpoint: url.pathname,
        ip: request.headers.get('CF-Connecting-IP') || undefined,
      });
      const resp = new Response(
        JSON.stringify({ error: 'Too many requests', retry_after: rl.reset }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...rateLimitHeaders(rl),
          },
        }
      );
      return applyCors(resp, cors);
    }
  }

  try {
    const response = await next();
    const duration = Date.now() - startTime;

    log.info('request', {
      request_id: requestId,
      method: request.method,
      endpoint: url.pathname,
      status: response.status,
      latency_ms: duration,
      ip: request.headers.get('CF-Connecting-IP') || undefined,
    });

    const merged = new Headers(response.headers);
    for (const [k, v] of Object.entries(cors)) merged.set(k, v as string);
    for (const [k, v] of Object.entries(buildSecurityHeaders(envRecord))) merged.set(k, v);
    merged.set('X-Response-Time', `${duration}ms`);
    merged.set('X-Request-Id', requestId);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: merged,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error('middleware_error', {
      request_id: requestId,
      endpoint: url.pathname,
      latency_ms: duration,
      error: error instanceof Error ? error.message : String(error),
    });
    const errResp = new Response(
      JSON.stringify({
        error: 'Internal server error',
        request_id: requestId,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
    return applyCors(errResp, cors);
  }
};
