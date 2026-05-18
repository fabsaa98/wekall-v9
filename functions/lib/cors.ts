/**
 * CORS helpers — allowlist por entorno
 *
 * Sprint 0 · P0-4 — reemplaza `Allow-Origin: *` por allowlist explícita.
 * Lee `ALLOWED_ORIGINS` del env (CSV) y siempre acepta `localhost:5173` en dev.
 */

const DEFAULT_ALLOWED = [
  'https://wekall-intelligence.pages.dev',
  'https://intel.wekall.co',
  'https://wekall.co',
  'https://www.wekall.co',
  'http://localhost:5173',
  'http://localhost:4173',
];

export interface CorsHeaders {
  'Access-Control-Allow-Origin': string;
  'Access-Control-Allow-Methods': string;
  'Access-Control-Allow-Headers': string;
  'Access-Control-Allow-Credentials': string;
  'Access-Control-Max-Age': string;
  Vary: string;
}

export function buildCorsHeaders(request: Request, env: Record<string, string | undefined>): CorsHeaders {
  const origin = request.headers.get('Origin') || '';
  const extra = (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const allowed = new Set<string>([...DEFAULT_ALLOWED, ...extra]);

  const fallback = DEFAULT_ALLOWED[0] ?? 'https://wekall.co';
  const allowOrigin = allowed.has(origin) ? origin : fallback;

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-ID, X-Request-Id',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export function applyCors(response: Response, cors: CorsHeaders): Response {
  const newHeaders = new Headers(response.headers);
  for (const [k, v] of Object.entries(cors)) {
    newHeaders.set(k, v);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}
