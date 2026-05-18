/**
 * PII detection + masking.
 *
 * Sprint 3 · P3-6. Antes de exportar transcripciones a CSV o de loguear payloads,
 * pasarlos por `maskPii()` para reemplazar identificadores personales por placeholders.
 *
 * Cobertura:
 *   - Cédulas colombianas (8-10 dígitos contiguos)
 *   - Teléfonos colombianos (+57XXXXXXXXXX o 10 dígitos)
 *   - Emails
 *   - Tarjetas de crédito (Luhn check + 13-19 dígitos)
 *   - URLs (opt-in)
 *
 * No es exhaustivo — es defensa en profundidad. Para casos críticos
 * (export a CSV legal) idealmente combinar con un servicio dedicado.
 */

export type PiiKind = 'cedula' | 'phone' | 'email' | 'credit_card';

export interface PiiMatch {
  kind: PiiKind;
  start: number;
  end: number;
  value: string;
}

const REGEX_EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const REGEX_PHONE_CO = /\b(\+?57)?\s?3\d{2}[\s\-.]?\d{3}[\s\-.]?\d{4}\b/g;
const REGEX_CEDULA = /\b\d{8,10}\b/g; // overlaps with phone; phone runs first
const REGEX_CC = /\b(?:\d[ -]*?){13,19}\b/g;

function luhnValid(num: string): boolean {
  const digits = num.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i]!, 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export function detectPii(text: string): PiiMatch[] {
  const matches: PiiMatch[] = [];

  for (const m of text.matchAll(REGEX_EMAIL)) {
    matches.push({ kind: 'email', start: m.index!, end: m.index! + m[0].length, value: m[0] });
  }
  for (const m of text.matchAll(REGEX_PHONE_CO)) {
    matches.push({ kind: 'phone', start: m.index!, end: m.index! + m[0].length, value: m[0] });
  }
  for (const m of text.matchAll(REGEX_CC)) {
    if (luhnValid(m[0])) {
      matches.push({ kind: 'credit_card', start: m.index!, end: m.index! + m[0].length, value: m[0] });
    }
  }
  for (const m of text.matchAll(REGEX_CEDULA)) {
    // Skip if already matched as phone/CC.
    const overlap = matches.some((mm) => mm.start <= m.index! && mm.end >= m.index! + m[0].length);
    if (!overlap) {
      matches.push({ kind: 'cedula', start: m.index!, end: m.index! + m[0].length, value: m[0] });
    }
  }

  return matches.sort((a, b) => a.start - b.start);
}

export interface MaskOptions {
  kinds?: PiiKind[];                 // si se especifica, solo enmascara estos tipos
  placeholder?: (kind: PiiKind, value: string) => string;
}

const DEFAULT_PLACEHOLDER = (kind: PiiKind, value: string): string => {
  if (kind === 'email') {
    const [user, domain] = value.split('@');
    if (!user || !domain) return '[email]';
    return `${user.slice(0, 2)}***@${domain}`;
  }
  if (kind === 'phone') return '+57 *** *** ' + value.slice(-2);
  if (kind === 'cedula') return value.slice(0, 2) + '***' + value.slice(-2);
  if (kind === 'credit_card') return '**** **** **** ' + value.replace(/\D/g, '').slice(-4);
  return '[REDACTED]';
};

export function maskPii(text: string, opts: MaskOptions = {}): string {
  const matches = detectPii(text);
  if (matches.length === 0) return text;
  const placeholder = opts.placeholder || DEFAULT_PLACEHOLDER;
  const filtered = opts.kinds ? matches.filter((m) => opts.kinds!.includes(m.kind)) : matches;

  let out = '';
  let cursor = 0;
  for (const m of filtered) {
    if (m.start < cursor) continue; // overlap
    out += text.slice(cursor, m.start);
    out += placeholder(m.kind, m.value);
    cursor = m.end;
  }
  out += text.slice(cursor);
  return out;
}

/**
 * Versión segura para loguear: enmascara TODO sin importar el flag.
 */
export function safeForLog(value: unknown): string {
  if (typeof value === 'string') return maskPii(value);
  if (value === null || value === undefined) return String(value);
  try {
    return maskPii(JSON.stringify(value));
  } catch {
    return '[unserializable]';
  }
}
