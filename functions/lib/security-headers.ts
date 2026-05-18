/**
 * Security headers — CSP, HSTS, frame protection.
 *
 * Sprint 0 · P1-9 — Content Security Policy estricta.
 * Allowlist explícita para Supabase, Worker, OpenAI, Sentry.
 */

export function buildSecurityHeaders(env: Record<string, string | undefined>): Record<string, string> {
  const supabaseHost = (env.SUPABASE_URL || 'https://iszodrpublcnsyvtgjcg.supabase.co').replace(/\/$/, '');
  const workerHost = (env.WORKER_URL || 'https://wekall-vicky-proxy.fabsaa98.workers.dev').replace(/\/$/, '');

  const connectSrc = [
    "'self'",
    supabaseHost,
    `wss://${new URL(supabaseHost).host}`,
    workerHost,
    'https://*.openai.com',
    'https://api.deepgram.com',
    'https://*.sentry.io',
  ].join(' ');

  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https: blob:",
    `connect-src ${connectSrc}`,
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join('; ');

  return {
    'Content-Security-Policy': csp,
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(self), geolocation=()',
  };
}
