/**
 * HMAC webhook signature verification.
 *
 * Sprint 3 · P3-2. Twilio y Meta firman sus webhooks con HMAC-SHA256
 * (Meta) o HMAC-SHA1 (Twilio legacy). Esta lib expone helpers para
 * verificar firmas antes de procesar el payload.
 *
 * Uso típico:
 *   export const onRequestPost = async (ctx) => {
 *     const raw = await ctx.request.text();
 *     const sig = ctx.request.headers.get('X-Twilio-Signature') || '';
 *     const url = ctx.request.url;
 *     const ok = await verifyTwilioSignature(ctx.env.TWILIO_AUTH_TOKEN, url, raw, sig);
 *     if (!ok) return new Response('invalid signature', { status: 401 });
 *     // ...
 *   };
 */

function bytesToHex(bytes: ArrayBuffer): string {
  const arr = new Uint8Array(bytes);
  let out = '';
  for (let i = 0; i < arr.length; i++) out += arr[i]!.toString(16).padStart(2, '0');
  return out;
}

function bytesToBase64(bytes: ArrayBuffer): string {
  const arr = new Uint8Array(bytes);
  let bin = '';
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]!);
  return btoa(bin);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmacImport(secret: string, algo: 'SHA-1' | 'SHA-256'): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: algo },
    false,
    ['sign']
  );
}

// ─── Twilio ────────────────────────────────────────────────────────────────
// Algoritmo Twilio:
//   signature = base64(HMAC-SHA1(authToken, fullUrl + sortedFormParams))
// Para webhooks JSON Twilio usa el body crudo en lugar de form params.

export async function verifyTwilioSignature(
  authToken: string,
  url: string,
  body: string,
  receivedSignature: string
): Promise<boolean> {
  if (!authToken || !receivedSignature) return false;
  const key = await hmacImport(authToken, 'SHA-1');
  const data = new TextEncoder().encode(url + body);
  const sig = await crypto.subtle.sign('HMAC', key, data);
  const expected = bytesToBase64(sig);
  return constantTimeEqual(expected, receivedSignature);
}

// ─── Meta / WhatsApp Business API ──────────────────────────────────────────
// Header: X-Hub-Signature-256: sha256=<hex>

export async function verifyMetaSignature(
  appSecret: string,
  body: string,
  receivedHeader: string
): Promise<boolean> {
  if (!appSecret || !receivedHeader.startsWith('sha256=')) return false;
  const received = receivedHeader.slice('sha256='.length);
  const key = await hmacImport(appSecret, 'SHA-256');
  const data = new TextEncoder().encode(body);
  const sig = await crypto.subtle.sign('HMAC', key, data);
  const expected = bytesToHex(sig);
  return constantTimeEqual(expected, received);
}

// ─── Genérico HMAC-SHA256 (para webhooks custom internos) ──────────────────

export async function verifyHmacSha256Hex(
  secret: string,
  body: string,
  receivedHex: string
): Promise<boolean> {
  if (!secret || !receivedHex) return false;
  const key = await hmacImport(secret, 'SHA-256');
  const data = new TextEncoder().encode(body);
  const sig = await crypto.subtle.sign('HMAC', key, data);
  const expected = bytesToHex(sig);
  return constantTimeEqual(expected, receivedHex.toLowerCase());
}
