/**
 * Type definitions for Cloudflare Pages Functions
 * 
 * Provides type safety for environment variables and context
 */

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  SUPABASE_ANON_KEY?: string;
  WORKER_PROXY_URL?: string;
}

interface CloudflareExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

declare type PagesFunction<Env = unknown> = (
  context: EventContext<Env, any, Record<string, unknown>>
) => Response | Promise<Response>;

interface EventContext<Env = unknown, P = unknown, Data = Record<string, unknown>> {
  request: Request;
  env: Env;
  params: P;
  data: Data;
  next: (input?: RequestInfo, init?: RequestInit) => Promise<Response>;
  waitUntil: (promise: Promise<any>) => void;
}
