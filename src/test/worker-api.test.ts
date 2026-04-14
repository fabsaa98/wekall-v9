/**
 * worker-api.test.ts
 * Tests de la API del Worker (Cloudflare) y del API client interno
 * Mock de fetch global
 * ~20 tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Configuración del mock de fetch ─────────────────────────────────────────
const PROXY_URL = 'https://wekall-vicky-proxy.fabsaa98.workers.dev';

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

function mockFetchReject(error: Error) {
  return vi.fn().mockRejectedValue(error);
}

// ─── Helper: simula llamada al Worker /query ──────────────────────────────────
async function callWorkerQuery(
  token: string,
  body: Record<string, unknown>,
  fetchFn: typeof fetch = fetch
): Promise<{ data?: unknown; error?: string; status: number }> {
  const resp = await fetchFn(`${PROXY_URL}/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({})) as { error?: string };
    return { error: err.error || `error_${resp.status}`, status: resp.status };
  }
  const data = await resp.json();
  return { data, status: resp.status };
}

// ─── Helper: simula llamada al Worker /auth ───────────────────────────────────
async function callWorkerAuth(
  email: string,
  password: string,
  fetchFn: typeof fetch = fetch
): Promise<{ token?: string; error?: string; status: number }> {
  const resp = await fetchFn(`${PROXY_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({})) as { error?: string };
    return { error: err.error || 'auth_error', status: resp.status };
  }
  const data = await resp.json() as { access_token?: string };
  return { token: data.access_token, status: resp.status };
}

// ─── Helper: simula API interna /api/* ────────────────────────────────────────
async function apiFetch<T>(
  path: string,
  fetchFn: typeof fetch = fetch
): Promise<T> {
  const res = await fetchFn(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText })) as { message?: string };
    throw new Error(err.message || `Error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── Tests Worker /query ──────────────────────────────────────────────────────
describe('Worker API — /query', () => {
  it('llamada exitosa retorna data y status 200', async () => {
    const mockData = [{ id: 1, value: 100 }];
    const fetchFn = mockFetch(200, mockData) as unknown as typeof fetch;
    const result = await callWorkerQuery('test-token', { table: 'cdr_daily_metrics' }, fetchFn);
    expect(result.status).toBe(200);
    expect(result.data).toEqual(mockData);
  });

  it('incluye header Authorization: Bearer', async () => {
    const fetchFn = mockFetch(200, []) as unknown as typeof fetch;
    await callWorkerQuery('my-secret-token', { table: 'test' }, fetchFn);
    const call = vi.mocked(fetchFn).mock.calls[0];
    const headers = call[1]?.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer my-secret-token');
  });

  it('incluye Content-Type: application/json', async () => {
    const fetchFn = mockFetch(200, []) as unknown as typeof fetch;
    await callWorkerQuery('token', { table: 'test' }, fetchFn);
    const call = vi.mocked(fetchFn).mock.calls[0];
    const headers = call[1]?.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('llama al endpoint correcto', async () => {
    const fetchFn = mockFetch(200, []) as unknown as typeof fetch;
    await callWorkerQuery('token', { table: 'test' }, fetchFn);
    const url = vi.mocked(fetchFn).mock.calls[0][0];
    expect(String(url)).toContain('/query');
  });

  it('usa método POST', async () => {
    const fetchFn = mockFetch(200, []) as unknown as typeof fetch;
    await callWorkerQuery('token', { table: 'test' }, fetchFn);
    const options = vi.mocked(fetchFn).mock.calls[0][1];
    expect(options?.method).toBe('POST');
  });

  it('401 Unauthorized retorna error', async () => {
    const fetchFn = mockFetch(401, { error: 'unauthorized' }) as unknown as typeof fetch;
    const result = await callWorkerQuery('bad-token', { table: 'test' }, fetchFn);
    expect(result.status).toBe(401);
    expect(result.error).toBeTruthy();
  });

  it('403 Forbidden retorna error', async () => {
    const fetchFn = mockFetch(403, { error: 'forbidden' }) as unknown as typeof fetch;
    const result = await callWorkerQuery('token', { table: 'forbidden_table' }, fetchFn);
    expect(result.status).toBe(403);
  });

  it('500 retorna error', async () => {
    const fetchFn = mockFetch(500, { error: 'internal_server_error' }) as unknown as typeof fetch;
    const result = await callWorkerQuery('token', { table: 'test' }, fetchFn);
    expect(result.status).toBe(500);
    expect(result.error).toBeTruthy();
  });
});

// ─── Tests Worker /auth ───────────────────────────────────────────────────────
describe('Worker API — /auth', () => {
  it('login exitoso retorna token', async () => {
    const fetchFn = mockFetch(200, { access_token: 'jwt-abc123' }) as unknown as typeof fetch;
    const result = await callWorkerAuth('user@test.com', 'pass', fetchFn);
    expect(result.token).toBe('jwt-abc123');
    expect(result.status).toBe(200);
  });

  it('credenciales inválidas retornan error', async () => {
    const fetchFn = mockFetch(401, { error: 'invalid_credentials' }) as unknown as typeof fetch;
    const result = await callWorkerAuth('bad@test.com', 'wrong', fetchFn);
    expect(result.error).toBeTruthy();
    expect(result.token).toBeUndefined();
  });

  it('llama al endpoint /auth', async () => {
    const fetchFn = mockFetch(200, { access_token: 'token' }) as unknown as typeof fetch;
    await callWorkerAuth('user@test.com', 'pass', fetchFn);
    const url = vi.mocked(fetchFn).mock.calls[0][0];
    expect(String(url)).toContain('/auth');
  });

  it('usa método POST', async () => {
    const fetchFn = mockFetch(200, { access_token: 'token' }) as unknown as typeof fetch;
    await callWorkerAuth('user@test.com', 'pass', fetchFn);
    const options = vi.mocked(fetchFn).mock.calls[0][1];
    expect(options?.method).toBe('POST');
  });
});

// ─── Tests API interna /api/* ──────────────────────────────────────────────────
describe('API interna — /api/*', () => {
  it('GET /api/alerts retorna datos correctamente', async () => {
    const mockAlerts = [{ id: '1', severity: 'critical', title: 'Test' }];
    const fetchFn = mockFetch(200, mockAlerts) as unknown as typeof fetch;
    const data = await apiFetch('/alerts', fetchFn);
    expect(data).toEqual(mockAlerts);
  });

  it('error 404 lanza excepción', async () => {
    const fetchFn = mockFetch(404, { message: 'Not Found' }) as unknown as typeof fetch;
    await expect(apiFetch('/nonexistent', fetchFn)).rejects.toThrow();
  });

  it('error 500 lanza excepción', async () => {
    const fetchFn = mockFetch(500, { message: 'Server Error' }) as unknown as typeof fetch;
    await expect(apiFetch('/dashboard/kpis', fetchFn)).rejects.toThrow();
  });

  it('network error (fetch rechazado) lanza excepción', async () => {
    const fetchFn = mockFetchReject(new Error('Network Error')) as unknown as typeof fetch;
    await expect(apiFetch('/transcriptions', fetchFn)).rejects.toThrow('Network Error');
  });

  it('llama a la URL correcta con prefijo /api', async () => {
    const fetchFn = mockFetch(200, []) as unknown as typeof fetch;
    await apiFetch('/dashboard/kpis', fetchFn);
    const url = vi.mocked(fetchFn).mock.calls[0][0];
    expect(String(url)).toBe('/api/dashboard/kpis');
  });

  it('response 200 con array vacío es válida', async () => {
    const fetchFn = mockFetch(200, []) as unknown as typeof fetch;
    const data = await apiFetch('/hotwords', fetchFn);
    expect(Array.isArray(data)).toBe(true);
    expect((data as unknown[]).length).toBe(0);
  });

  it('401 lanza error con mensaje', async () => {
    const fetchFn = mockFetch(401, { message: 'Unauthorized' }) as unknown as typeof fetch;
    await expect(apiFetch('/protected', fetchFn)).rejects.toThrow('Unauthorized');
  });

  it('403 lanza error con mensaje', async () => {
    const fetchFn = mockFetch(403, { message: 'Forbidden' }) as unknown as typeof fetch;
    await expect(apiFetch('/admin', fetchFn)).rejects.toThrow('Forbidden');
  });
});
