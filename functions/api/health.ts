/**
 * GET /api/health
 *
 * Sprint 3 · P3-4. Health check endpoint para alertas externas.
 *
 * Chequea:
 *   - Conectividad a Supabase (SELECT 1)
 *   - Conectividad al Worker proxy (HEAD /health del Worker)
 *   - Latencia
 *
 * Respuesta:
 *   200 OK            → todo verde
 *   503 Unavailable   → algún componente caído
 *
 * Cron-job externo (UptimeRobot / Cronitor / Slack workflow):
 *   curl -fsS https://intel.wekall.co/api/health || alert_pagerduty
 */

import { getSupabaseAdmin } from '../lib/supabase-admin';
import { jsonResponse } from '../lib/http';
import { log } from '../lib/logger';

interface CheckResult {
  ok: boolean;
  latency_ms: number;
  detail?: string;
}

async function checkSupabase(env: Record<string, string | undefined>): Promise<CheckResult> {
  const start = Date.now();
  try {
    const supabase = getSupabaseAdmin(env);
    // SELECT count(*) FROM rls_migration_log LIMIT 1 → barato + valida RLS strict
    const { error } = await supabase
      .from('rls_migration_log')
      .select('id', { count: 'exact', head: true })
      .limit(1);
    if (error) throw new Error(error.message);
    return { ok: true, latency_ms: Date.now() - start };
  } catch (err) {
    return {
      ok: false,
      latency_ms: Date.now() - start,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

async function checkWorker(env: Record<string, string | undefined>): Promise<CheckResult> {
  const start = Date.now();
  const url = env.WORKER_URL || 'https://wekall-vicky-proxy.fabsaa98.workers.dev';
  try {
    const res = await fetch(`${url}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    return {
      ok: res.ok,
      latency_ms: Date.now() - start,
      detail: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      ok: false,
      latency_ms: Date.now() - start,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function onRequestGet(context: { request: Request; env: Record<string, string | undefined> }) {
  const start = Date.now();
  const [supabase, worker] = await Promise.all([
    checkSupabase(context.env),
    checkWorker(context.env),
  ]);

  const healthy = supabase.ok && worker.ok;
  const body = {
    status: healthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    latency_ms: Date.now() - start,
    checks: { supabase, worker },
    version: context.env.VERSION || 'unknown',
  };

  if (!healthy) {
    log.warn('health_degraded', {
      supabase_ok: supabase.ok,
      worker_ok: worker.ok,
      supabase_detail: supabase.detail,
      worker_detail: worker.detail,
    });
  }

  return jsonResponse(body, {
    status: healthy ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  });
}
