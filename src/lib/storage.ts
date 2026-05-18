/**
 * storage<T>() — wrapper tipado sobre localStorage / sessionStorage.
 *
 * Sprint 2 · P2-6 · referenciado en ADR 0001.
 *
 * Antes:
 *   localStorage.setItem('wki_client_id', JSON.stringify({ id: 'saludtotal' }));
 *   const raw = localStorage.getItem('wki_client_id');
 *   const parsed = JSON.parse(raw || '{}'); // sin tipo
 *
 * Después:
 *   const clientStorage = storage<{ id: string }>('wki_client_id');
 *   clientStorage.set({ id: 'saludtotal' });
 *   const c = clientStorage.get(); // tipo: { id: string } | null
 */

export interface TypedStorage<T> {
  get(): T | null;
  set(value: T): void;
  remove(): void;
  exists(): boolean;
}

export interface StorageOpts<T> {
  /** Si true, usa sessionStorage (muere al cerrar tab) en lugar de localStorage. */
  session?: boolean;
  /** Validador opcional: si retorna false, get() retorna null. */
  validate?: (value: unknown) => value is T;
}

function safeBackend(opts?: StorageOpts<unknown>): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return opts?.session ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

export function storage<T>(key: string, opts?: StorageOpts<T>): TypedStorage<T> {
  const backend = safeBackend(opts);

  return {
    get(): T | null {
      if (!backend) return null;
      try {
        const raw = backend.getItem(key);
        if (raw === null) return null;
        const parsed = JSON.parse(raw) as unknown;
        if (opts?.validate && !opts.validate(parsed)) return null;
        return parsed as T;
      } catch {
        return null;
      }
    },
    set(value: T): void {
      if (!backend) return;
      try {
        backend.setItem(key, JSON.stringify(value));
      } catch (err) {
        // QuotaExceeded o storage disabled — falla silenciosa pero loguea.
        console.warn(`[storage:${key}] set failed`, err);
      }
    },
    remove(): void {
      if (!backend) return;
      try {
        backend.removeItem(key);
      } catch {
        /* ignore */
      }
    },
    exists(): boolean {
      if (!backend) return false;
      try {
        return backend.getItem(key) !== null;
      } catch {
        return false;
      }
    },
  };
}

// ─── Stores predefinidos · seguros y descubribles ───────────────────────────

/** Cliente / tenant activo (UI memory). NO es source-of-truth de auth. */
export const clientIdStore = storage<{ id: string; name?: string }>('wki_client_id');

/** Session id de Vicky para mantener thread de conversación. */
export const vickySessionStore = storage<{ session_id: string }>('wki_vicky_session', {
  session: true, // muere al cerrar el browser
});

/** Preferencias de UI persistentes. */
export const uiPrefsStore = storage<{
  theme?: 'light' | 'dark';
  sidebarCollapsed?: boolean;
  density?: 'compact' | 'cozy';
}>('wki_ui_prefs');
