/**
 * Background Worker - Executive Insights Job Processor
 * 
 * Consume jobs from Upstash Redis queue and process them:
 * 1. Extract PDF content
 * 2. Analyze with single-shot LLM call (analysis + brief + benchmarks)
 * 3. Update job progress in real-time
 * 4. Save result to Supabase
 * 
 * Deploy: Cloudflare Worker or standalone Node.js process
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://iszodrpublcnsyvtgjcg.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const PROXY_URL = process.env.VITE_PROXY_URL || 'https://wekall-vicky-proxy.fabsaa98.workers.dev';
const UPSTASH_REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const UPSTASH_REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';

interface Job {
  jobId: string;
  fileName: string;
  fileContent?: string;  // base64
  fileUrl?: string;
  clientId: string;
}

interface AnalysisResult {
  analysis: string;
  executiveBrief: string;
  benchmarks: Array<{ metric: string; value: string; source: string }>;
}

// ========================================
// REDIS QUEUE OPERATIONS (Upstash REST API)
// ========================================

async function popJob(): Promise<Job | null> {
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

    return JSON.parse(data.result) as Job;
  } catch (err) {
    console.error('Error popping job from queue:', err);
    return null;
  }
}

// ========================================
// JOB UPDATES (Supabase)
// ========================================

async function updateJob(jobId: string, updates: {
  status?: string;
  progress?: number;
  message?: string;
  result?: any;
  error?: string;
  completed_at?: string;
  processing_time_ms?: number;
}) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { error } = await supabase
    .from('executive_insights_jobs')
    .update(updates)
    .eq('id', jobId);

  if (error) {
    console.error(`Error updating job ${jobId}:`, error);
  }
}

// ========================================
// PDF EXTRACTION
// ========================================

async function extractPDFContent(job: Job): Promise<string> {
  const pdfParse = (await import('pdf-parse')).default;

  let buffer: Buffer;

  if (job.fileContent) {
    // Decode base64
    buffer = Buffer.from(job.fileContent, 'base64');
  } else if (job.fileUrl) {
    // Download from URL
    const response = await fetch(job.fileUrl);
    const arrayBuffer = await response.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } else {
    throw new Error('No file content or URL provided');
  }

  // Extract text from PDF
  const data = await pdfParse(buffer, {
    max: 30,  // Max 30 pages (consistent with current limit)
  });

  const text = data.text || '';

  // Limit to 20k chars (consistent with current limit)
  return text.slice(0, 20000);
}

// ========================================
// SINGLE-SHOT LLM ANALYSIS
// ========================================

async function analyzeSingleShot(
  text: string,
  fileName: string,
  clientId: string
): Promise<AnalysisResult> {
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
    return result as AnalysisResult;
  } catch (parseErr) {
    console.error('Failed to parse LLM JSON response:', content);
    throw new Error('LLM returned invalid JSON');
  }
}

// ========================================
// MAIN WORKER LOOP
// ========================================

async function processJob(job: Job) {
  const startTime = Date.now();
  console.log(`[Worker] Processing job ${job.jobId}: ${job.fileName}`);

  try {
    // Step 1: Update status to processing
    await updateJob(job.jobId, {
      status: 'processing',
      progress: 10,
      message: 'Extrayendo contenido del PDF...'
    });

    // Step 2: Extract PDF
    const extractedText = await extractPDFContent(job);
    await updateJob(job.jobId, {
      progress: 40,
      message: 'Analizando con Vicky...'
    });

    // Step 3: Single-shot LLM analysis
    const result = await analyzeSingleShot(extractedText, job.fileName, job.clientId);
    await updateJob(job.jobId, {
      progress: 90,
      message: 'Finalizando...'
    });

    // Step 4: Save result
    const processingTime = Date.now() - startTime;
    await updateJob(job.jobId, {
      status: 'completed',
      progress: 100,
      message: 'Análisis completado',
      result,
      completed_at: new Date().toISOString(),
      processing_time_ms: processingTime
    });

    console.log(`[Worker] Job ${job.jobId} completed in ${processingTime}ms`);

  } catch (err: any) {
    console.error(`[Worker] Job ${job.jobId} failed:`, err);
    await updateJob(job.jobId, {
      status: 'failed',
      error: err.message || 'Unknown error',
      message: `Error: ${err.message}`
    });
  }
}

// ========================================
// WORKER MAIN LOOP
// ========================================

async function runWorker() {
  console.log('[Worker] Starting Executive Insights job processor...');

  while (true) {
    try {
      const job = await popJob();

      if (job) {
        await processJob(job);
      } else {
        // No jobs in queue, wait 2 seconds
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (err) {
      console.error('[Worker] Error in main loop:', err);
      await new Promise(resolve => setTimeout(resolve, 5000));  // Wait 5s on error
    }
  }
}

// Start worker
if (require.main === module) {
  runWorker().catch(console.error);
}

export { processJob, runWorker };
