/**
 * Auth helpers — verify Supabase JWT y extracción de client_id desde custom claim.
 *
 * Sprint 0 · P0-5 y P0-7 — antes el `client_id` se confiaba del body (IDOR).
 * Ahora se lee SIEMPRE del custom claim `client_id` del JWT.
 *
 * Setup en Supabase requerido (ver RUNBOOK-SPRINT-0.md):
 *   1. Auth Hook `custom_access_token` que inyecta `client_id` desde app_users
 *   2. Variable env SUPABASE_JWT_SECRET en Cloudflare Pages
 */

import { log } from './logger';

export interface AuthClaims {
  sub: string;           // auth.users.id
  email?: string;
  client_id: string;     // custom claim
  role?: string;         // custom claim (CEO / supervisor / agent / admin)
  aud?: string;
  exp?: number;
  iat?: number;
}

export class AuthError extends Error {
  status: number;
  constructor(msg: string, status = 401) {
    super(msg);
    this.status = status;
  }
}

function base64urlDecode(input: string): string {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  const b64 = (input + pad).replace(/-/g, '+').replace(/_/g, '/');
  return atob(b64);
}

function base64urlToBytes(input: string): Uint8Array {
  const str = base64urlDecode(input);
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
}

/**
 * Verifica un JWT HS256 firmado con el secret de Supabase.
 * Lanza AuthError(401) si la firma o el `exp` fallan.
 */
export async function verifyJwt(token: string, secret: string): Promise<AuthClaims> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new AuthError('Malformed JWT');

  const headerB64 = parts[0]!;
  const payloadB64 = parts[1]!;
  const signatureB64 = parts[2]!;
  const key = await importHmacKey(secret);
  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signature = base64urlToBytes(signatureB64);

  const ok = await crypto.subtle.verify('HMAC', key, signature, data);
  if (!ok) throw new AuthError('Invalid JWT signature');

  let claims: AuthClaims;
  try {
    claims = JSON.parse(base64urlDecode(payloadB64));
  } catch {
    throw new AuthError('Invalid JWT payload');
  }

  const now = Math.floor(Date.now() / 1000);
  if (claims.exp && claims.exp < now) throw new AuthError('JWT expired');
  if (!claims.sub) throw new AuthError('JWT missing sub claim');

  return claims;
}

/**
 * Extrae bearer token del header Authorization.
 */
export function extractBearer(request: Request): string | null {
  const auth = request.headers.get('Authorization') || request.headers.get('authorization');
  if (!auth) return null;
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m && m[1] ? m[1] : null;
}

/**
 * Verifica JWT y exige presencia de client_id en el claim.
 * Si no hay client_id, lanza 403 (token válido pero sin tenant asignado).
 */
export async function requireAuth(
  request: Request,
  env: Record<string, string | undefined>
): Promise<AuthClaims> {
  const token = extractBearer(request);
  if (!token) throw new AuthError('Missing bearer token', 401);

  const secret = env.SUPABASE_JWT_SECRET;
  if (!secret) {
    log.error('SUPABASE_JWT_SECRET no configurado en env', {});
    throw new AuthError('Server misconfiguration', 500);
  }

  const claims = await verifyJwt(token, secret);
  if (!claims.client_id) {
    throw new AuthError('JWT missing client_id custom claim', 403);
  }
  return claims;
}

/**
 * Para endpoints donde el JWT es opcional pero, si viene, debe ser válido.
 */
export async function optionalAuth(
  request: Request,
  env: Record<string, string | undefined>
): Promise<AuthClaims | null> {
  const token = extractBearer(request);
  if (!token) return null;
  try {
    return await requireAuth(request, env);
  } catch {
    return null;
  }
}
