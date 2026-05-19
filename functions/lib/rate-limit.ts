/**
 * Rate limiter — sliding window con Upstash Redis REST.
 *
 * Sprint 0 · P0-6 — antes los endpoints no tenían freno; un atacante
 * podía vaciar la cuota de OpenAI llamando /transcribe masivamente
 * o saturar Supabase via /ingest.
 *
 * Estrategia:
 *   - Anónimo:       60 req/min por IP
 *   - Autenticado:   600 req/min por user_id+client_id
 *   - Endpoints caros (jobs/create): 20 req/min
 *
 * Si Upstash no está configurado, retorna { allowed: true } (fail-open en dev).
 * En prod hay que asegurar las env vars `UPSTASH_REDIS_REST_URL` y
 * `UPSTASH_REDIS_REST_TOKEN` están seteadas.
 */

import { log } from './logger';

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number; // epoch seconds
}

export interface RateLimitOpts {
  key: string;         // identificador único (ej. "ip:1.2.3.4" o "user:<sub>:<client_id>")
  limit: number;       // requests permitidas en la ventana
  windowSec: number;   // tamaño de la ventana en segundos
}

interface UpstashEnv {
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
}

/**
 * Sliding window counter usando INCR + EXPIRE en Upstash.
 * Bucket por minuto (o ventana arbitraria) — simple, suficiente para la mayoría de casos.
 */
export async function checkRateLimit(
  env: UpstashEnv,
  opts: RateLimitOpts
): Promise<RateLimitResult> {
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;

  // Fail-open si Upstash no está configurado — solo en dev/staging.
  if (!url || !token) {
    return { allowed: true, limit: opts.limit, remaining: opts.limit, reset: 0 };
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const bucket = Math.floor(nowSec / opts.windowSec);
  const redisKey = `rl:${opts.key}:${bucket}`;
  const ttl = opts.windowSec + 5; // grace TTL

  try {
    // Pipeline: INCR + EXPIRE
    const incrResp = await fetch(`${url}/incr/${encodeURIComponent(redisKey)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!incrResp.ok) throw new Error(`Upstash INCR failed: ${incrResp.status}`);
    const incrData = (await incrResp.json()) as { result: number };
    const count = incrData.result;

    if (count === 1) {
      // Primera vez en este bucket — set TTL
      await fetch(`${url}/expire/${encodeURIComponent(redisKey)}/${ttl}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    }

    const reset = (bucket + 1) * opts.windowSec;
    const allowed = count <= opts.limit;
    const remaining = Math.max(0, opts.limit - count);

    return { allowed, limit: opts.limit, remaining, reset };
  } catch (err) {
    log.warn('rate-limit upstash error · fail-open', {
      error: err instanceof Error ? err.message : String(err),
      key: opts.key,
    });
    return { allowed: true, limit: opts.limit, remaining: opts.limit, reset: 0 };
  }
}

export function rateLimitHeaders(r: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(r.limit),
    'X-RateLimit-Remaining': String(r.remaining),
    'X-RateLimit-Reset': String(r.reset),
  };
}

/**
 * Selecciona la key + límites apropiados según el contexto.
 * - Si hay auth: user-level (600 rpm o más permisivo).
 * - Si no hay auth: IP-level (60 rpm).
 * - Endpoints caros: override con `expensive=true`.
 */
export function buildRateLimitOpts(
  request: Request,
  auth: { sub?: string; client_id?: string } | null,
  endpoint: string,
  opts: { expensive?: boolean } = {}
): RateLimitOpts {
  if (auth?.sub) {
    return {
      key: `user:${auth.sub}:${auth.client_id || 'none'}:${endpoint}`,
      limit: opts.expensive ? 60 : 600,
      windowSec: 60,
    };
  }
  const ip =
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'unknown';
  return {
    key: `ip:${ip}:${endpoint}`,
    limit: opts.expensive ? 20 : 60,
    windowSec: 60,
  };
}
