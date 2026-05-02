/**
 * POST /api/jobs/create
 * Crea un job de análisis y lo encola para procesamiento background
 * 
 * Body: { fileName, fileContent (base64), clientId }
 * Returns: { jobId, status, fileName, estimatedTime }
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://iszodrpublcnsyvtgjcg.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlzem9kcnB1YmxjbnN5dnRnanNnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzY1NzYyOSwiZXhwIjoyMDU5MjMzNjI5fQ.Oi5GRYSc0krtjJAn0XsN1wY9Gr-N8p3HL0rEJMO8L8o';

// Upstash Redis REST API credentials from env

interface CreateJobRequest {
  fileName: string;
  fileContent?: string;  // base64 encoded file content
  fileUrl?: string;  // O una URL si ya está en storage
  clientId: string;
}

export async function onRequestPost(context: any) {
  const UPSTASH_REDIS_URL = context.env.UPSTASH_REDIS_REST_URL || '';
  const UPSTASH_REDIS_TOKEN = context.env.UPSTASH_REDIS_REST_TOKEN || '';
  try {
    const body: CreateJobRequest = await context.request.json();
    const { fileName, fileContent, fileUrl, clientId } = body;

    if (!fileName || !clientId) {
      return new Response(
        JSON.stringify({ error: 'fileName y clientId son requeridos' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!fileContent && !fileUrl) {
      return new Response(
        JSON.stringify({ error: 'Debe proporcionar fileContent o fileUrl' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validar tamaño (max 15 MB en base64 = ~20 MB encoded)
    if (fileContent && fileContent.length > 20_000_000) {
      return new Response(
        JSON.stringify({ error: 'Archivo demasiado grande. Máximo 15 MB.' }),
        { status: 413, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Crear job en DB
    const { data: job, error: dbError } = await supabase
      .from('executive_insights_jobs')
      .insert({
        client_id: clientId,
        file_name: fileName,
        file_url: fileUrl || null,
        file_size_bytes: fileContent ? Math.floor(fileContent.length * 0.75) : null, // aprox decoded size
        status: 'queued',
        progress: 0,
        message: 'En cola de procesamiento...'
      })
      .select()
      .single();

    if (dbError || !job) {
      console.error('Error creando job en DB:', dbError);
      return new Response(
        JSON.stringify({ error: 'Error creando job', details: dbError?.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Publicar a Redis queue (si está configurado)
    if (UPSTASH_REDIS_URL && UPSTASH_REDIS_TOKEN) {
      try {
        const queuePayload = {
          jobId: job.id,
          fileName: job.file_name,
          fileContent: fileContent || null,
          fileUrl: fileUrl || null,
          clientId: job.client_id
        };

        // Upstash Redis REST API: LPUSH
        await fetch(`${UPSTASH_REDIS_URL}/lpush/analyze-queue/${encodeURIComponent(JSON.stringify(queuePayload))}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${UPSTASH_REDIS_TOKEN}`
          }
        });

        console.log(`Job ${job.id} enqueued to Redis`);
      } catch (redisErr) {
        console.error('Error publishing to Redis queue:', redisErr);
        // No fallar el request si Redis falla, el job ya está en DB
      }
    }

    // Retornar respuesta inmediata
    return new Response(
      JSON.stringify({
        jobId: job.id,
        status: job.status,
        fileName: job.file_name,
        progress: job.progress,
        message: job.message,
        estimatedTime: 60,  // segundos
        createdAt: job.created_at
      }),
      { 
        status: 202,  // Accepted (processing asynchronously)
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (err: any) {
    console.error('Error en /api/jobs/create:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
