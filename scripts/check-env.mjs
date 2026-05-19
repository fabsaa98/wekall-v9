#!/usr/bin/env node
/**
 * scripts/check-env.mjs
 *
 * Sprint 2 · P2-13 — valida que las env vars necesarias están seteadas.
 *
 * Modos:
 *   --mode=build       (default) — chequea VITE_* necesarias para vite build
 *   --mode=pages       — chequea env de Pages Functions (server-side)
 *   --mode=all         — combina ambos
 *
 * Salida: exit code 0 si OK, 1 si falta algo crítico.
 */

import process from 'node:process';

const args = new Map(process.argv.slice(2).map((a) => a.split('=', 2)));
const mode = args.get('--mode') || 'build';

const REQUIRED_BUILD = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_PROXY_URL'];
const RECOMMENDED_BUILD = ['VITE_BASE_URL'];

const REQUIRED_PAGES = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'SUPABASE_JWT_SECRET',
];
const RECOMMENDED_PAGES = [
  'ALLOWED_ORIGINS',
  'WORKER_URL',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
];

const FORBIDDEN = [
  // Variables que NO deben existir con prefix VITE_ porque irían al bundle público.
  'VITE_OPENAI_KEY',
  'VITE_OPENAI_API_KEY',
  'VITE_ANTHROPIC_API_KEY',
  'VITE_SUPABASE_SERVICE_KEY',
  'VITE_SUPABASE_SERVICE_ROLE_KEY',
  'VITE_SUPABASE_JWT_SECRET',
];

let exitCode = 0;
const missing = [];
const warnings = [];
const security = [];

function check(name, list, optional = false) {
  if (!process.env[name] || process.env[name].trim() === '') {
    if (optional) warnings.push(`  - ${name}`);
    else missing.push(`  - ${name}`);
  }
}

if (mode === 'build' || mode === 'all') {
  for (const k of REQUIRED_BUILD) check(k, missing);
  for (const k of RECOMMENDED_BUILD) check(k, warnings, true);
}

if (mode === 'pages' || mode === 'all') {
  for (const k of REQUIRED_PAGES) check(k, missing);
  for (const k of RECOMMENDED_PAGES) check(k, warnings, true);
}

for (const k of FORBIDDEN) {
  if (process.env[k]) {
    security.push(`  - ${k} está SETEADA · esta var con prefix VITE_ termina en el JS bundle público.`);
    exitCode = 1;
  }
}

console.log(`[check-env] mode=${mode}`);

if (security.length > 0) {
  console.error('\n❌ SECURITY: variables prohibidas presentes:');
  security.forEach((l) => console.error(l));
}

if (missing.length > 0) {
  console.error('\n❌ Faltan variables requeridas:');
  missing.forEach((l) => console.error(l));
  exitCode = 1;
}

if (warnings.length > 0) {
  console.warn('\n⚠ Recomendadas pero no críticas:');
  warnings.forEach((l) => console.warn(l));
}

if (exitCode === 0) {
  console.log('\n[check-env] OK · todas las variables requeridas presentes.');
}

process.exit(exitCode);
