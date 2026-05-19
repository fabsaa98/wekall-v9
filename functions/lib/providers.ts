/**
 * LLM / Speech / Embedding provider abstraction.
 *
 * Sprint 1 · P1-10 — Strategy pattern para evitar lock-in con OpenAI.
 *
 * Hoy el Worker `wekall-vicky-proxy` llama directamente a `api.openai.com`.
 * Este archivo define los contratos que cada provider debe satisfacer.
 * Cuando se modularice el Worker (P1-3) cada implementación va a
 * `workers/wekall-vicky-proxy/src/providers/{openai,anthropic,deepgram}.ts`.
 *
 * Por ahora estos tipos viven en functions/lib porque también los va a usar
 * el frontend para tipar la respuesta del Worker.
 *
 * Configuración por tenant en `client_config.llm_provider`, `speech_provider`, etc.
 */

// ─── LLM (chat / completions) ──────────────────────────────────────────────

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMRequest {
  model?: string;            // ej. 'gpt-4o-mini', 'claude-haiku-4-5'
  messages: LLMMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: 'text' | 'json';
}

export interface LLMResponse {
  content: string;
  model: string;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  cost_usd?: number;
}

export interface LLMProvider {
  readonly name: 'openai' | 'anthropic' | 'mock';
  chat(req: LLMRequest): Promise<LLMResponse>;
}

// ─── Speech-to-text ────────────────────────────────────────────────────────

export interface SpeechTranscribeRequest {
  audio: Blob | ArrayBuffer;
  language?: string;         // ISO-639-1, ej. 'es', 'en'
  model?: string;            // ej. 'whisper-1', 'nova-2'
  diarization?: boolean;
}

export interface SpeechTranscribeResponse {
  text: string;
  language?: string;
  duration_sec?: number;
  segments?: Array<{ start: number; end: number; text: string; speaker?: string }>;
  cost_usd?: number;
}

export interface SpeechProvider {
  readonly name: 'openai-whisper' | 'deepgram' | 'mock';
  transcribe(req: SpeechTranscribeRequest): Promise<SpeechTranscribeResponse>;
}

// ─── Embeddings ────────────────────────────────────────────────────────────

export interface EmbeddingRequest {
  text: string;
  model?: string;            // ej. 'text-embedding-3-small'
}

export interface EmbeddingResponse {
  embedding: number[];
  dims: number;
  model: string;
  cost_usd?: number;
}

export interface EmbeddingProvider {
  readonly name: 'openai' | 'cohere' | 'mock';
  embed(req: EmbeddingRequest): Promise<EmbeddingResponse>;
}

// ─── Resolver por tenant ───────────────────────────────────────────────────

export interface ProviderConfig {
  llm?: 'openai' | 'anthropic';
  llm_model?: string;
  speech?: 'openai-whisper' | 'deepgram';
  speech_model?: string;
  embedding?: 'openai' | 'cohere';
  embedding_model?: string;
}

/**
 * Devuelve config de providers para un tenant.
 * Hoy retorna defaults; cuando esté el campo `client_config.providers jsonb`
 * en Supabase, lee de ahí.
 */
export function resolveProvidersForClient(_clientId: string): ProviderConfig {
  return {
    llm: 'openai',
    llm_model: 'gpt-4o-mini',
    speech: 'openai-whisper',
    speech_model: 'whisper-1',
    embedding: 'openai',
    embedding_model: 'text-embedding-3-small',
  };
}
