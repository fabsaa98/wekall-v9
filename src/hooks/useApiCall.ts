/**
 * useApiCall — hook para llamadas autenticadas a Pages Functions.
 *
 * Sprint 2 · P2-7. Reemplaza el patrón disperso de fetch + try/catch + toast
 * por un hook con estados `loading/error/empty/success` consistentes.
 *
 * Adjunta el JWT activo de Supabase Auth en cada request (`Authorization: Bearer ...`).
 * Maneja:
 *  - 401 → forza re-login (limpia sesión)
 *  - 403 → muestra "sin permiso"
 *  - 429 → retry-after header
 *  - 5xx → muestra mensaje genérico, loguea en consola dev
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type ApiState = 'idle' | 'loading' | 'success' | 'error' | 'empty';

export interface ApiCallResult<T> {
  data: T | null;
  error: string | null;
  state: ApiState;
  status: number | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

export interface UseApiCallOptions<T> {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  enabled?: boolean;          // si false, no se ejecuta automáticamente
  onSuccess?: (data: T) => void;
  onError?: (err: { message: string; status: number | null }) => void;
  isEmpty?: (data: T) => boolean;
}

async function getAuthHeader(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function useApiCall<T = unknown>(opts: UseApiCallOptions<T>): ApiCallResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<ApiState>('idle');
  const [status, setStatus] = useState<number | null>(null);
  const aborterRef = useRef<AbortController | null>(null);

  const execute = useCallback(async (): Promise<void> => {
    aborterRef.current?.abort();
    const controller = new AbortController();
    aborterRef.current = controller;

    setState('loading');
    setError(null);

    try {
      const authHeaders = await getAuthHeader();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...authHeaders,
      };
      const res = await fetch(opts.url, {
        method: opts.method || 'GET',
        headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal: controller.signal,
      });
      setStatus(res.status);

      if (res.status === 401) {
        // Sesión inválida → forzar re-login
        await supabase.auth.signOut();
        const msg = 'Sesión expirada. Volvé a iniciar sesión.';
        setError(msg);
        setState('error');
        opts.onError?.({ message: msg, status: 401 });
        return;
      }
      if (res.status === 403) {
        const msg = 'No tenés permiso para esta acción.';
        setError(msg);
        setState('error');
        opts.onError?.({ message: msg, status: 403 });
        return;
      }
      if (res.status === 429) {
        const retry = res.headers.get('X-RateLimit-Reset') || res.headers.get('Retry-After') || '';
        const msg = `Demasiadas requests. Esperá unos segundos${retry ? ` (reset ${retry})` : ''}.`;
        setError(msg);
        setState('error');
        opts.onError?.({ message: msg, status: 429 });
        return;
      }
      if (!res.ok) {
        let detail = '';
        try {
          const j = (await res.json()) as { error?: string };
          detail = j?.error || '';
        } catch {
          /* ignore */
        }
        const msg = detail || `Error ${res.status}`;
        setError(msg);
        setState('error');
        opts.onError?.({ message: msg, status: res.status });
        return;
      }

      const payload = (await res.json()) as T;
      setData(payload);
      const empty = opts.isEmpty
        ? opts.isEmpty(payload)
        : Array.isArray(payload) && payload.length === 0;
      setState(empty ? 'empty' : 'success');
      opts.onSuccess?.(payload);
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      setError(msg);
      setState('error');
      opts.onError?.({ message: msg, status: null });
    }
  }, [opts.url, opts.method, opts.body]);

  useEffect(() => {
    if (opts.enabled === false) return;
    void execute();
    return () => aborterRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.url, opts.method, JSON.stringify(opts.body), opts.enabled]);

  return {
    data,
    error,
    state,
    status,
    loading: state === 'loading',
    refetch: execute,
  };
}
