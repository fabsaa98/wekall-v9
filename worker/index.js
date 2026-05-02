/**
 * Cloudflare Worker - Executive Insights Job Processor
 * 
 * Triggered by cron every 10 seconds
 * Processes one job from Redis queue per execution
 */

// ========================================
// REDIS QUEUE OPERATIONS (Upstash REST API)
// ========================================

async function popJob(env) {
  const UPSTASH_REDIS_URL = env.UPSTASH_REDIS_REST_URL;
  const UPSTASH_REDIS_TOKEN = env.UPSTASH_REDIS_REST_TOKEN;

  if (!UPSTASH_REDIS_URL || !UPSTASH_REDIS_TOKEN) {
    console.error('Upstash credentials not configured');
    return null;
  }

  try {
    const response = await fetch(`${UPSTASH_REDIS_URL}/rpop/analyze-queue`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${UPSTASH_REDIS_TOKEN}` }
    });

    if (!response.ok) {
      console.error('Redis RPOP failed:', response.status);
      return null;
    }

    const data = await response.json();
    if (!data.result) return null;  // Queue empty

    return JSON.parse(data.result);
  } catch (err) {
    console.error('Error popping job from queue:', err);
    return null;
  }
}

// ========================================
// JOB UPDATES (Supabase)
// ========================================

async function updateJob(jobId, updates, env) {
  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_KEY;

  const response = await fetch(`${SUPABASE_URL}/rest/v1/executive_insights_jobs?id=eq.${jobId}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(updates)
  });

  if (!response.ok) {
    console.error(`Error updating job ${jobId}:`, response.status, await response.text());
  }
}

// ========================================
// PDF EXTRACTION (Simple text extraction)
// ========================================

async function extractPDFContent(job) {
  // Para Workers, usamos extracción simple
  // El PDF real se procesaría con pdf-parse en Node.js o con API externa
  
  let buffer;

  if (job.fileContent) {
    // Decode base64
    const binaryString = atob(job.fileContent);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    buffer = bytes.buffer;
  } else if (job.fileUrl) {
    // Download from URL
    const response = await fetch(job.fileUrl);
    buffer = await response.arrayBuffer();
  } else {
    throw new Error('No file content or URL provided');
  }

  // Extracción simple: buscar strings de texto en el PDF
  // Esto es una aproximación - idealmente usar pdf.js o API externa
  const text = new TextDecoder().decode(buffer);
  
  // Limpiar caracteres binarios
  const cleanText = text.replace(/[^\x20-\x7E\n\r]/g, ' ').trim();
  
  // Limitar a 20k chars
  return cleanText.slice(0, 20000);
}

// ========================================
// SINGLE-SHOT LLM ANALYSIS
// ========================================

async function analyzeSingleShot(text, fileName, clientId, env) {
  const PROXY_URL = env.PROXY_URL;

  const prompt = `Eres Vicky, la asesora ejecutiva de WeKall Intelligence.

Analiza el siguiente documento y retorna un JSON estructurado con:

{
  "analysis": "<Análisis completo en 300-400 palabras. Identifica insights clave, tendencias, fortalezas, áreas de mejora y recomendaciones accionables.>",
  "executiveBrief": "<Resumen ejecutivo en 80-100 palabras para CEO. Directo, orientado a decisiones.>",
  "benchmarks": [
    { "metric": "Nombre de la métrica", "value": "Valor numérico o descriptivo", "source": "Página o sección del documento" }
  ]
}

**IMPORTANTE:**
- Retorna SOLO JSON válido, sin texto adicional antes o después
- Si el documento no contiene métricas cuantificables, retorna array vacío en benchmarks
- Usa lenguaje ejecutivo, directo, orientado a impacto de negocio

**Contexto del cliente:**
- ID: ${clientId}
- Documento: ${fileName}

**Contenido del documento:**
${text.slice(0, 12000)}

Retorna el JSON ahora:`;

  const response = await fetch(`${PROXY_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1500,
      temperature: 0.3
    })
  });

  if (!response.ok) {
    throw new Error(`LLM API failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '{}';

  // Parse JSON response
  try {
    const result = JSON.parse(content);
    return result;
  } catch (parseErr) {
    console.error('Failed to parse LLM JSON response:', content);
    throw new Error('LLM returned invalid JSON');
  }
}

// ========================================
// MAIN WORKER HANDLER
// ========================================

async function processJob(job, env) {
  const startTime = Date.now();
  console.log(`[Worker] Processing job ${job.jobId}: ${job.fileName}`);

  try {
    // Step 1: Update status to processing
    await updateJob(job.jobId, {
      status: 'processing',
      progress: 10,
      message: 'Extrayendo contenido del PDF...'
    }, env);

    // Step 2: Extract PDF
    const extractedText = await extractPDFContent(job);
    await updateJob(job.jobId, {
      progress: 40,
      message: 'Analizando con Vicky...'
    }, env);

    // Step 3: Single-shot LLM analysis
    const result = await analyzeSingleShot(extractedText, job.fileName, job.clientId, env);
    await updateJob(job.jobId, {
      progress: 90,
      message: 'Finalizando...'
    }, env);

    // Step 4: Save result
    const processingTime = Date.now() - startTime;
    await updateJob(job.jobId, {
      status: 'completed',
      progress: 100,
      message: 'Análisis completado',
      result,
      completed_at: new Date().toISOString(),
      processing_time_ms: processingTime
    }, env);

    console.log(`[Worker] Job ${job.jobId} completed in ${processingTime}ms`);

  } catch (err) {
    console.error(`[Worker] Job ${job.jobId} failed:`, err);
    await updateJob(job.jobId, {
      status: 'failed',
      error: err.message || 'Unknown error',
      message: `Error: ${err.message}`
    }, env);
  }
}

// ========================================
// CLOUDFLARE WORKER EXPORT
// ========================================

export default {
  async scheduled(event, env, ctx) {
    // Triggered by cron every 10 seconds
    console.log('[Worker] Cron triggered, checking queue...');
    
    const job = await popJob(env);
    
    if (job) {
      console.log(`[Worker] Found job ${job.jobId}, processing...`);
      ctx.waitUntil(processJob(job, env));
    } else {
      console.log('[Worker] Queue empty, nothing to process');
    }
  }
};
