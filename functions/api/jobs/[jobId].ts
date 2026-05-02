/**
 * GET /api/jobs/{jobId}
 * Consulta el estado de un job de análisis
 * 
 * Returns: { jobId, status, progress, message, result?, error? }
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://iszodrpublcnsyvtgjcg.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlzem9kcnB1YmxjbnN5dnRnanNnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzY1NzYyOSwiZXhwIjoyMDU5MjMzNjI5fQ.Oi5GRYSc0krtjJAn0XsN1wY9Gr-N8p3HL0rEJMO8L8o';

export async function onRequestGet(context: any) {
  try {
    const { jobId } = context.params;

    if (!jobId) {
      return new Response(
        JSON.stringify({ error: 'jobId es requerido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: job, error } = await supabase
      .from('executive_insights_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error || !job) {
      return new Response(
        JSON.stringify({ error: 'Job no encontrado', jobId }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Calcular tiempo estimado restante
    let estimatedTimeLeft: number | null = null;
    if (job.status === 'processing' || job.status === 'queued') {
      const elapsed = Date.now() - new Date(job.created_at).getTime();
      const totalEstimated = 60000; // 60 segundos
      estimatedTimeLeft = Math.max(0, Math.floor((totalEstimated - elapsed) / 1000));
    }

    // Respuesta
    const response: any = {
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      message: job.message,
      fileName: job.file_name,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
      estimatedTimeLeft
    };

    if (job.status === 'completed') {
      response.result = job.result;
      response.completedAt = job.completed_at;
      response.processingTimeMs = job.processing_time_ms;
    }

    if (job.status === 'failed') {
      response.error = job.error;
    }

    return new Response(
      JSON.stringify(response),
      { 
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': job.status === 'completed' || job.status === 'failed' 
            ? 'public, max-age=3600'  // Cache resultados finales 1 hora
            : 'no-cache'  // No cachear estados intermedios
        } 
      }
    );

  } catch (err: any) {
    console.error('Error en /api/jobs/[jobId]:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
