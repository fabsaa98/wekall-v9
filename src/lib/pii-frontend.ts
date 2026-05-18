/**
 * PII masking (frontend mirror).
 *
 * Sprint 3 · P3-6. Versión frontend de functions/lib/pii.ts.
 * Idéntica lógica para garantizar que cualquier log que escape al cliente
 * (Sentry, console, exports) también esté enmascarado.
 */

const REGEX_EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const REGEX_PHONE_CO = /\b(\+?57)?\s?3\d{2}[\s\-.]?\d{3}[\s\-.]?\d{4}\b/g;
const REGEX_CEDULA = /\b\d{8,10}\b/g;

export function maskPii(text: string): string {
  return text
    .replace(REGEX_EMAIL, (m) => {
      const [user, domain] = m.split('@');
      if (!user || !domain) return '[email]';
      return `${user.slice(0, 2)}***@${domain}`;
    })
    .replace(REGEX_PHONE_CO, (m) => '+57 *** *** ' + m.slice(-2))
    .replace(REGEX_CEDULA, (m) => m.slice(0, 2) + '***' + m.slice(-2));
}

export function safeForLog(value: unknown): string {
  if (typeof value === 'string') return maskPii(value);
  if (value === null || value === undefined) return String(value);
  try {
    return maskPii(JSON.stringify(value));
  } catch {
    return '[unserializable]';
  }
}
