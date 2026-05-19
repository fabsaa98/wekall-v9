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

/**
 * Circuit breaker simple en memoria (per-isolate de CF Worker / Pages Function).
 * Útil para servicios externos: si fallan >threshold en una ventana, abrir circuito
 * y rechazar fast hasta que la ventana de cooldown termine.
 *
 * NOTA: como CF Pages Functions corre N isolates, cada uno tiene su propio estado.
 * Para circuit breaker realmente global usar Durable Object (out of scope Sprint 1).
 */
export interface CircuitBreakerState {
  failures: number;
  openedAt: number | null;
}

export class CircuitBreaker {
  private state: CircuitBreakerState = { failures: 0, openedAt: null };
  constructor(
    private readonly name: string,
    private readonly threshold = 5,
    private readonly cooldownMs = 30_000
  ) {}

  isOpen(): boolean {
    if (this.state.openedAt === null) return false;
    const elapsed = Date.now() - this.state.openedAt;
    if (elapsed > this.cooldownMs) {
      // Half-open: dejar pasar el próximo request para probar.
      this.state.openedAt = null;
      this.state.failures = Math.floor(this.threshold / 2);
      return false;
    }
    return true;
  }

  recordSuccess(): void {
    this.state.failures = 0;
    this.state.openedAt = null;
  }

  recordFailure(): void {
    this.state.failures++;
    if (this.state.failures >= this.threshold) {
      this.state.openedAt = Date.now();
    }
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new Error(`circuit_open:${this.name}`);
    }
    try {
      const r = await fn();
      this.recordSuccess();
      return r;
    } catch (err) {
      this.recordFailure();
      throw err;
    }
  }
}

// Singletons compartidos entre handlers (per-isolate).
export const workerProxyCircuit = new CircuitBreaker('worker-proxy', 8, 30_000);
export const openaiCircuit = new CircuitBreaker('openai', 5, 60_000);
