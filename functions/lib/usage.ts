/**
 * Usage tracking — insert en usage_log por cada llamada a provider externo.
 *
 * Sprint 2 · P2-11. Para tracking de costos por tenant y unit economics.
 *
 * El Worker idealmente llama esto en cada /chat, /transcribe, /embed.
 * Acá lo dejamos disponible para que Pages Functions también puedan loguear
 * uso cuando llaman directo a OpenAI / Deepgram (rare path).
 *
 * Precios (USD por 1M tokens / minuto audio) al 2026-05:
 *   - gpt-4o-mini:                 0.15  in / 0.60  out
 *   - gpt-4o:                      2.50  in / 10.00 out
 *   - text-embedding-3-small:      0.02  in
 *   - whisper-1:                   0.006/min
 *   - deepgram nova-2:             0.0043/min
 *
 * Mantener actualizado en `PRICING` y revisar mensual.
 */

import { getSupabaseAdmin } from './supabase-admin';
import { log } from './logger';

interface PricingEntry {
  in?: number;   // USD per 1M input tokens
  out?: number;  // USD per 1M output tokens
  audio?: number; // USD per minute
}

export const PRICING: Record<string, PricingEntry> = {
  'gpt-4o-mini': { in: 0.15, out: 0.60 },
  'gpt-4o': { in: 2.50, out: 10.00 },
  'text-embedding-3-small': { in: 0.02 },
  'text-embedding-3-large': { in: 0.13 },
  'whisper-1': { audio: 0.006 },
  'deepgram-nova-2': { audio: 0.0043 },
  'claude-haiku-4-5': { in: 0.80, out: 4.00 },
  'claude-sonnet-4-6': { in: 3.00, out: 15.00 },
};

export interface UsageEntry {
  client_id: string;
  user_id?: string | null;
  provider: 'openai' | 'deepgram' | 'anthropic';
  service: 'chat' | 'transcribe' | 'embed' | 'completion';
  model: string;
  tokens_in?: number;
  tokens_out?: number;
  audio_seconds?: number;
  request_id?: string;
  metadata?: Record<string, unknown>;
}

export function computeCost(entry: UsageEntry): number {
  const p = PRICING[entry.model];
  if (!p) return 0;
  let cost = 0;
  if (p.in && entry.tokens_in) cost += (entry.tokens_in / 1_000_000) * p.in;
  if (p.out && entry.tokens_out) cost += (entry.tokens_out / 1_000_000) * p.out;
  if (p.audio && entry.audio_seconds) cost += (entry.audio_seconds / 60) * p.audio;
  return Math.round(cost * 1_000_000) / 1_000_000; // 6 decimales
}

export async function recordUsage(
  env: Record<string, string | undefined>,
  entry: UsageEntry
): Promise<void> {
  try {
    const cost_usd = computeCost(entry);
    const supabase = getSupabaseAdmin(env);
    const { error } = await supabase.from('usage_log').insert({
      ts: new Date().toISOString(),
      client_id: entry.client_id,
      user_id: entry.user_id ?? null,
      provider: entry.provider,
      service: entry.service,
      model: entry.model,
      tokens_in: entry.tokens_in ?? null,
      tokens_out: entry.tokens_out ?? null,
      audio_seconds: entry.audio_seconds ?? null,
      cost_usd,
      request_id: entry.request_id ?? null,
      metadata: entry.metadata ?? null,
    });
    if (error) {
      log.warn('usage_insert_failed', {
        error: error.message,
        client_id: entry.client_id,
        provider: entry.provider,
        model: entry.model,
      });
    }
  } catch (err) {
    log.warn('usage_unhandled', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export function recordUsageAsync(env: Record<string, string | undefined>, entry: UsageEntry): void {
  void recordUsage(env, entry);
}
