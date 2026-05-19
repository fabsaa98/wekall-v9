/**
 * Validación de bodies / query params.
 *
 * Sprint 2 · P2-3 — antes cada handler validaba a mano (error-prone).
 * Ahora hay funciones puras `parseX()` que retornan `{ ok, data | error }`.
 *
 * Por qué no Zod directo: agregar otra dependencia al Pages Function bundle
 * suma 30-40KB por isolate. Estas validators a mano son livianas y suficientes
 * para el subset que necesitamos. Si en Sprint 3 se introduce `@valibot/valibot`
 * o `zod-mini`, migrar este archivo.
 */

export type ParseResult<T> = { ok: true; data: T } | { ok: false; error: string; field?: string };

function isNonEmptyString(v: unknown, max = 1000): v is string {
  return typeof v === 'string' && v.length > 0 && v.length <= max;
}

function isOptionalString(v: unknown, max = 1000): v is string | undefined {
  return v === undefined || (typeof v === 'string' && v.length <= max);
}

function isPositiveInt(v: unknown, max = Number.MAX_SAFE_INTEGER): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v > 0 && v <= max;
}

// ─── /api/jobs/create ──────────────────────────────────────────────────────

export interface CreateJobInput {
  fileName: string;
  fileContent?: string;
  fileUrl?: string;
}

export function parseCreateJob(body: unknown): ParseResult<CreateJobInput> {
  if (!body || typeof body !== 'object') return { ok: false, error: 'body must be JSON object' };
  const b = body as Record<string, unknown>;
  if (!isNonEmptyString(b.fileName, 256)) return { ok: false, error: 'fileName required', field: 'fileName' };
  if (!isOptionalString(b.fileContent, 20_000_000)) return { ok: false, error: 'fileContent too long', field: 'fileContent' };
  if (!isOptionalString(b.fileUrl, 2048)) return { ok: false, error: 'fileUrl invalid', field: 'fileUrl' };
  if (!b.fileContent && !b.fileUrl) return { ok: false, error: 'fileContent or fileUrl required' };
  return {
    ok: true,
    data: {
      fileName: b.fileName as string,
      fileContent: b.fileContent as string | undefined,
      fileUrl: b.fileUrl as string | undefined,
    },
  };
}

// ─── /api/vicky/chat ───────────────────────────────────────────────────────

export interface VickyChatInput {
  question: string;
  conversation_id?: string;
}

export function parseVickyChat(body: unknown): ParseResult<VickyChatInput> {
  if (!body || typeof body !== 'object') return { ok: false, error: 'body must be JSON object' };
  const b = body as Record<string, unknown>;
  if (!isNonEmptyString(b.question, 4000)) {
    return { ok: false, error: 'question required (1-4000 chars)', field: 'question' };
  }
  if (b.conversation_id !== undefined && !isNonEmptyString(b.conversation_id, 128)) {
    return { ok: false, error: 'conversation_id invalid', field: 'conversation_id' };
  }
  return {
    ok: true,
    data: {
      question: (b.question as string).trim(),
      conversation_id: b.conversation_id as string | undefined,
    },
  };
}

// ─── Pagination helpers ────────────────────────────────────────────────────

export interface PaginationInput {
  page: number;
  limit: number;
}

export function parsePagination(params: URLSearchParams, defaults = { page: 1, limit: 20, max: 100 }): PaginationInput {
  const page = Math.max(1, parseInt(params.get('page') || String(defaults.page), 10) || defaults.page);
  const limit = Math.min(
    defaults.max,
    Math.max(1, parseInt(params.get('limit') || String(defaults.limit), 10) || defaults.limit)
  );
  return { page, limit };
}

// ─── Date range ────────────────────────────────────────────────────────────

export interface DateRangeInput {
  days: number;
  fromISO: string;
  toISO: string;
}

export function parseDateRange(params: URLSearchParams, defaultDays = 30, maxDays = 365): DateRangeInput {
  const days = Math.min(maxDays, Math.max(1, parseInt(params.get('days') || String(defaultDays), 10) || defaultDays));
  const today = new Date();
  const from = new Date(today);
  from.setDate(today.getDate() - days);
  return {
    days,
    fromISO: from.toISOString().split('T')[0]!,
    toISO: today.toISOString().split('T')[0]!,
  };
}

// ─── Right-to-be-forgotten ─────────────────────────────────────────────────

export interface ForgetInput {
  confirm: 'YES-DELETE-MY-DATA';
  reason?: string;
}

export function parseForget(body: unknown): ParseResult<ForgetInput> {
  if (!body || typeof body !== 'object') return { ok: false, error: 'body must be JSON object' };
  const b = body as Record<string, unknown>;
  if (b.confirm !== 'YES-DELETE-MY-DATA') {
    return { ok: false, error: 'confirm must be the literal string "YES-DELETE-MY-DATA"', field: 'confirm' };
  }
  if (b.reason !== undefined && !isOptionalString(b.reason, 500)) {
    return { ok: false, error: 'reason too long', field: 'reason' };
  }
  return {
    ok: true,
    data: { confirm: 'YES-DELETE-MY-DATA', reason: b.reason as string | undefined },
  };
}
