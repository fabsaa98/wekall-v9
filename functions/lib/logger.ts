/**
 * Structured logger — JSON output para CF Logpush / SIEM.
 *
 * Sprint 0 · P2-4 — reemplaza `console.log()` con strings concatenados
 * por logs estructurados consultables.
 */

type Level = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  request_id?: string;
  client_id?: string | null;
  user_id?: string | null;
  endpoint?: string;
  method?: string;
  status?: number;
  latency_ms?: number;
  ip?: string;
  user_agent?: string;
  [key: string]: unknown;
}

function emit(level: Level, msg: string, ctx: LogContext): void {
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...ctx,
  };
  const line = JSON.stringify(entry);
  if (level === 'error' || level === 'warn') {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const log = {
  debug: (msg: string, ctx: LogContext = {}) => emit('debug', msg, ctx),
  info: (msg: string, ctx: LogContext = {}) => emit('info', msg, ctx),
  warn: (msg: string, ctx: LogContext = {}) => emit('warn', msg, ctx),
  error: (msg: string, ctx: LogContext = {}) => emit('error', msg, ctx),
};

export function newRequestId(): string {
  return (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`);
}
