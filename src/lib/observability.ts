/**
 * Observability bootstrap — Sentry + console fallback.
 *
 * Sprint 2 · P2-14. Wiring sin agregar dependencia obligatoria:
 *  - Si `VITE_SENTRY_DSN` está set → carga Sentry dinámicamente.
 *  - Si no → captura todo a console.error con contexto estructurado.
 *
 * Para activar Sentry en prod:
 *   1. `npm install @sentry/react`
 *   2. setear `VITE_SENTRY_DSN` en CF Pages production
 *   3. `initObservability()` se llama en main.tsx
 */

import { maskPii } from './pii-frontend';

type SeverityLevel = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

interface Breadcrumb {
  category: string;
  message: string;
  level?: SeverityLevel;
  data?: Record<string, unknown>;
}

interface ObservabilityAdapter {
  captureException: (err: unknown, ctx?: Record<string, unknown>) => void;
  captureMessage: (msg: string, level?: SeverityLevel, ctx?: Record<string, unknown>) => void;
  setUser: (user: { id?: string; client_id?: string; role?: string } | null) => void;
  addBreadcrumb: (b: Breadcrumb) => void;
}

class ConsoleAdapter implements ObservabilityAdapter {
  captureException(err: unknown, ctx?: Record<string, unknown>) {
    console.error('[obs]', err instanceof Error ? err.message : err, ctx ? { ctx } : '');
  }
  captureMessage(msg: string, level: SeverityLevel = 'info', ctx?: Record<string, unknown>) {
    const m = `[obs:${level}] ${maskPii(msg)}`;
    if (level === 'error' || level === 'fatal') console.error(m, ctx ?? '');
    else if (level === 'warning') console.warn(m, ctx ?? '');
    else console.log(m, ctx ?? '');
  }
  setUser(_user: unknown) { /* noop */ }
  addBreadcrumb(_b: Breadcrumb) { /* noop */ }
}

let adapter: ObservabilityAdapter = new ConsoleAdapter();

/**
 * Inicializa el adapter de observability.
 * Llamar desde main.tsx antes de renderizar la app.
 */
export async function initObservability(): Promise<void> {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) {
    return; // fallback a console
  }

  try {
    // dynamic import → si @sentry/react no está instalado, no rompe build.
    // El @ts-ignore previene error de typecheck cuando la dep no está agregada al package.json.
    // @ts-ignore — optional peer dep
    const Sentry = await import(/* @vite-ignore */ '@sentry/react').catch(() => null);
    if (!Sentry) {
      console.warn('[obs] VITE_SENTRY_DSN seteado pero @sentry/react no instalado · usando console fallback');
      return;
    }
    (Sentry as any).init({
      dsn,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 1.0,
      ignoreErrors: ['Network Error', 'AbortError'],
      beforeSend(event: any) {
        // PII masking en breadcrumbs y messages.
        if (event.message) event.message = maskPii(event.message);
        if (event.breadcrumbs) {
          event.breadcrumbs = event.breadcrumbs.map((b: any) => ({
            ...b,
            message: b.message ? maskPii(b.message) : b.message,
          }));
        }
        return event;
      },
    });

    adapter = {
      captureException: (err, ctx) => (Sentry as any).captureException(err, { extra: ctx }),
      captureMessage: (msg, level, ctx) => (Sentry as any).captureMessage(maskPii(msg), { level, extra: ctx }),
      setUser: (user) => (Sentry as any).setUser(user),
      addBreadcrumb: (b) => (Sentry as any).addBreadcrumb(b),
    };
  } catch (err) {
    console.warn('[obs] init failed, falling back to console', err);
  }
}

export function captureException(err: unknown, ctx?: Record<string, unknown>): void {
  adapter.captureException(err, ctx);
}
export function captureMessage(msg: string, level?: SeverityLevel, ctx?: Record<string, unknown>): void {
  adapter.captureMessage(msg, level, ctx);
}
export function setObservabilityUser(user: { id?: string; client_id?: string; role?: string } | null): void {
  adapter.setUser(user);
}
export function addBreadcrumb(b: Breadcrumb): void {
  adapter.addBreadcrumb(b);
}
