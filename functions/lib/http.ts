/**
 * HTTP helpers — respuestas JSON consistentes + error mapping.
 */

import { AuthError } from './auth';

export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
}

export function errorResponse(err: unknown, fallbackStatus = 500): Response {
  if (err instanceof AuthError) {
    return jsonResponse({ error: err.message }, { status: err.status });
  }
  if (err instanceof Error) {
    return jsonResponse({ error: err.message }, { status: fallbackStatus });
  }
  return jsonResponse({ error: 'Internal error' }, { status: fallbackStatus });
}

/**
 * Retry con exponential backoff para llamadas externas idempotentes.
 * Sprint 1 · P1-4.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { retries?: number; baseMs?: number; maxMs?: number } = {}
): Promise<T> {
  const retries = opts.retries ?? 2;
  const baseMs = opts.baseMs ?? 250;
  const maxMs = opts.maxMs ?? 4000;

  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retries) throw err;
      const delay = Math.min(maxMs, baseMs * Math.pow(2, attempt)) + Math.random() * 100;
      await new Promise((r) => setTimeout(r, delay));
      attempt++;
    }
  }
}
