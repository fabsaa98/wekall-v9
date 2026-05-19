/**
 * GET /api/jobs/{jobId}
 * Consulta el estado de un job de análisis.
 *
 * Sprint 0 fixes:
 *  - P0-3: SERVICE_KEY desde env binding.
 *  - P0-5/P0-7: requireAuth + verificación de que el job pertenezca al client_id del JWT.
 *               Antes cualquiera con el jobId leía cualquier job (IDOR).
 */

import { requireAuth, AuthError } from '../../lib/auth';
import { getSupabaseAdmin } from '../../lib/supabase-admin';
import { log, newRequestId } from '../../lib/logger';
import { jsonResponse, errorResponse } from '../../lib/http';

export async function onRequestGet(context: any) {
  const env = context.env as Record<string, string | undefined>;
  const request = context.request as Request;
  const requestId = newRequestId();

  try {
    let auth;
    try {
      auth = await requireAuth(request, env);
    } catch (err) {
      if (err instanceof AuthError) return jsonResponse({ error: err.message, request_id: requestId }, { status: err.status });
      throw err;
    }

    const { jobId } = context.params;
    if (!jobId) return jsonResponse({ error: 'jobId es requerido', request_id: requestId }, { status: 400 });

    const supabase = getSupabaseAdmin(env);

    // Filtro por client_id del JWT — defensa en profundidad (también lo hace RLS)
    const { data: job, error } = await supabase
      .from('executive_insights_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('client_id', auth.client_id)
      .single();

    if (error || !job) {
      return jsonResponse({ error: 'Job no encontrado', jobId, request_id: requestId }, { status: 404 });
    }

    let estimatedTimeLeft: number | null = null;
    if (job.status === 'processing' || job.status === 'queued') {
      const elapsed = Date.now() - new Date(job.created_at).getTime();
      const totalEstimated = 60000;
      estimatedTimeLeft = Math.max(0, Math.floor((totalEstimated - elapsed) / 1000));
    }

    const response: any = {
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      message: job.message,
      fileName: job.file_name,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
      estimatedTimeLeft,
      request_id: requestId,
    };

    if (job.status === 'completed') {
      response.result = job.result;
      response.completedAt = job.completed_at;
      response.processingTimeMs = job.processing_time_ms;
    }
    if (job.status === 'failed') {
      response.error = job.error;
    }

    return jsonResponse(response, {
      status: 200,
      headers: {
        'Cache-Control': job.status === 'completed' || job.status === 'failed' ? 'private, max-age=3600' : 'no-cache',
      },
    });
  } catch (err) {
    log.error('jobs_get_unhandled', {
      request_id: requestId,
      error: err instanceof Error ? err.message : String(err),
    });
    return errorResponse(err);
  }
}
