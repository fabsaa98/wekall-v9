/**
 * POST /api/jobs/create
 * Crea un job de análisis y lo encola para procesamiento background.
 *
 * Sprint 0 fixes:
 *  - P0-3: SERVICE_KEY ahora viene de env binding, NO hardcoded.
 *  - P0-5/P0-7: requireAuth() valida JWT + extrae client_id del custom claim
 *               (antes el client_id se confiaba del body → IDOR cross-tenant).
 *  - P0-6: rate-limit 20 req/min por usuario (endpoint caro — toca OpenAI).
 *
 * Body: { fileName, fileContent (base64) | fileUrl }
 * El client_id se IGNORA del body y se toma del JWT.
 *
 * Returns: { jobId, status, fileName, estimatedTime }
 */

import { requireAuth, AuthError } from '../../lib/auth';
import { getSupabaseAdmin } from '../../lib/supabase-admin';
import { checkRateLimit, buildRateLimitOpts, rateLimitHeaders } from '../../lib/rate-limit';
import { log, newRequestId } from '../../lib/logger';
import { jsonResponse, errorResponse } from '../../lib/http';

interface CreateJobRequest {
  fileName: string;
  fileContent?: string;
  fileUrl?: string;
}

export async function onRequestPost(context: any) {
  const env = context.env as Record<string, string | undefined>;
  const request = context.request as Request;
  const requestId = newRequestId();

  try {
    // 1. Auth
    let auth;
    try {
      auth = await requireAuth(request, env);
    } catch (err) {
      if (err instanceof AuthError) return jsonResponse({ error: err.message, request_id: requestId }, { status: err.status });
      throw err;
    }

    // 2. Rate limit (endpoint caro)
    const rl = await checkRateLimit(env, buildRateLimitOpts(request, auth, 'jobs/create', { expensive: true }));
    if (!rl.allowed) {
      log.warn('rate_limit_exceeded', { request_id: requestId, endpoint: 'jobs/create', client_id: auth.client_id });
      return new Response(
        JSON.stringify({ error: 'Too many requests', retry_after: rl.reset, request_id: requestId }),
        { status: 429, headers: { 'Content-Type': 'application/json', ...rateLimitHeaders(rl) } }
      );
    }

    // 3. Body validation
    const body: CreateJobRequest = await request.json();
    const { fileName, fileContent, fileUrl } = body;

    if (!fileName) return jsonResponse({ error: 'fileName es requerido', request_id: requestId }, { status: 400 });
    if (!fileContent && !fileUrl) {
      return jsonResponse({ error: 'Debe proporcionar fileContent o fileUrl', request_id: requestId }, { status: 400 });
    }
    if (fileContent && fileContent.length > 20_000_000) {
      return jsonResponse({ error: 'Archivo demasiado grande. Máximo 15 MB.', request_id: requestId }, { status: 413 });
    }

    // 4. Insert job (client_id viene del JWT, NO del body)
    const supabase = getSupabaseAdmin(env);
    const { data: job, error: dbError } = await supabase
      .from('executive_insights_jobs')
      .insert({
        client_id: auth.client_id,
        file_name: fileName,
        file_url: fileUrl || null,
        file_size_bytes: fileContent ? Math.floor(fileContent.length * 0.75) : null,
        status: 'queued',
        progress: 0,
        message: 'En cola de procesamiento...',
        created_by: auth.sub,
      })
      .select()
      .single();

    if (dbError || !job) {
      log.error('jobs_create_db_error', {
        request_id: requestId,
        client_id: auth.client_id,
        error: dbError?.message,
      });
      return jsonResponse({ error: 'Error creando job', request_id: requestId }, { status: 500 });
    }

    // 5. Publicar a Redis queue
    const upstashUrl = env.UPSTASH_REDIS_REST_URL;
    const upstashToken = env.UPSTASH_REDIS_REST_TOKEN;
    if (upstashUrl && upstashToken) {
      try {
        const queuePayload = {
          jobId: job.id,
          fileName: job.file_name,
          fileContent: fileContent || null,
          fileUrl: fileUrl || null,
          clientId: job.client_id,
        };
        await fetch(`${upstashUrl}/lpush/analyze-queue/${encodeURIComponent(JSON.stringify(queuePayload))}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${upstashToken}` },
        });
        log.info('job_enqueued', { request_id: requestId, job_id: job.id, client_id: auth.client_id });
      } catch (redisErr) {
        log.warn('redis_publish_failed', {
          request_id: requestId,
          job_id: job.id,
          error: redisErr instanceof Error ? redisErr.message : String(redisErr),
        });
      }
    }

    return jsonResponse(
      {
        jobId: job.id,
        status: job.status,
        fileName: job.file_name,
        progress: job.progress,
        message: job.message,
        estimatedTime: 60,
        createdAt: job.created_at,
        request_id: requestId,
      },
      { status: 202, headers: rateLimitHeaders(rl) }
    );
  } catch (err) {
    log.error('jobs_create_unhandled', {
      request_id: requestId,
      error: err instanceof Error ? err.message : String(err),
    });
    return errorResponse(err);
  }
}
