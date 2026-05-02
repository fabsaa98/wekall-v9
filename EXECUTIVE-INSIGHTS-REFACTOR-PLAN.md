# Executive Insights - Plan de Refactorización Profesional

**Fecha:** 02 mayo 2026  
**Problema:** Análisis de documentos tarda 4-15 minutos (o nunca termina)  
**Causa raíz:** 3 llamadas secuenciales a GPT-4o sin arquitectura async  

---

## 🔍 Diagnóstico Final

### Arquitectura Actual (BROKEN)

```
User Upload → Frontend 
  ↓
Extract PDF (30-60s) 
  ↓
API Call #1: Análisis (20-40s) ← TIMEOUT AQUÍ
  ↓
API Call #2: Executive Brief (10-20s)
  ↓
API Call #3: Benchmarks (10-20s)
  ↓
Frontend recibe respuesta (NUNCA LLEGA)
```

**Problemas:**
1. **Sincrónico:** Frontend espera 70-140s sin feedback
2. **3 llamadas seriales:** Si una falla/se demora, todo se cae
3. **Sin persistencia:** Si el browser se cierra, se pierde todo
4. **No escalable:** 10 usuarios concurrentes = colapso

---

## ✅ Arquitectura Profesional (BEST PRACTICES)

### Patrón: Async Job Queue + Polling/Webhook

```
┌─────────────────────────────────────────────────────────┐
│ FASE 1: UPLOAD (Instant)                                │
└─────────────────────────────────────────────────────────┘
User Upload → Frontend
  ↓
Valida tamaño/formato (<5s)
  ↓
Guarda archivo en storage
  ↓
Retorna: { jobId, status: "uploaded", fileName, size }
Frontend: ✅ "Archivo cargado: CX COPC.pdf (6 MB)"

┌─────────────────────────────────────────────────────────┐
│ FASE 2: PROCESAMIENTO (Background Worker)               │
└─────────────────────────────────────────────────────────┘
User hace clic "Analizar ahora"
  ↓
Frontend → POST /api/jobs/analyze
  ↓
Backend:
  1. Crea job en DB: { jobId, status: "queued", createdAt }
  2. Publica mensaje a queue (Redis/BullMQ/RabbitMQ)
  3. Retorna INMEDIATO: { jobId, status: "queued", estimatedTime: 60 }
  ↓
Frontend: "⏳ En cola... Tiempo estimado: 1 min"

Worker (proceso separado):
  1. Consume job de la queue
  2. Actualiza status: "processing"
  3. Extrae PDF (30-60s) → actualiza progress: 30%
  4. **SINGLE-SHOT LLM CALL** (30-45s) → actualiza progress: 80%
     - Prompt consolidado: análisis + brief + benchmarks en 1 llamada
     - Timeout: 60s (si falla, retry automático 2x)
  5. Guarda resultado en DB
  6. Actualiza status: "completed"
  7. (Opcional) Dispara webhook/notificación

┌─────────────────────────────────────────────────────────┐
│ FASE 3: POLLING / WEBHOOK (Frontend)                    │
└─────────────────────────────────────────────────────────┘
Frontend → cada 2s: GET /api/jobs/{jobId}
  ↓
Respuesta:
  {
    jobId,
    status: "processing",
    progress: 45,  
    message: "Analizando con Vicky...",
    estimatedTimeLeft: 30
  }
  ↓
UI actualiza: "🧠 Analizando... 45% (30s restantes)"

Cuando status === "completed":
  ↓
Frontend → GET /api/jobs/{jobId}/result
  ↓
Recibe:
  {
    analysis,
    executiveBrief,
    benchmarks,
    sources,
    createdAt
  }
  ↓
UI: Muestra resultado completo + opción de guardar
```

---

## 🏗️ Stack Técnico Recomendado

### Option A: Full Node.js (Recomendado para WeIntelligence)

**Backend:**
- **API:** Cloudflare Pages Functions (ya tienes)
- **Queue:** BullMQ + Upstash Redis (serverless, $10/mes)
- **Worker:** Cloudflare Worker Durable Objects O Vercel serverless function
- **Storage:** Supabase Storage (PDFs) + Supabase DB (jobs, results)

**Pros:**
- Todo en Cloudflare/Vercel (ya deployado)
- Escalable automáticamente
- Redis serverless (no infra)

**Cons:**
- Workers tienen timeout de 30s en free tier (upgrade a $5/mes = 15 min)

### Option B: Hybrid (Python Worker + Node API)

**Backend:**
- **API:** Cloudflare Pages Functions
- **Queue:** Upstash Redis
- **Worker:** Railway/Render Python app (pdf.js + langchain)
- **Storage:** Supabase

**Pros:**
- Python mejor para PDF processing
- Worker sin límite de tiempo

**Cons:**
- Otro servicio que mantener

---

## 📐 Implementación por Fases

### **Fase 1: Async Job Queue (2-3 horas)**

1. **Crear tabla `jobs` en Supabase:**
   ```sql
   CREATE TABLE jobs (
     id UUID PRIMARY KEY,
     client_id TEXT,
     file_name TEXT,
     file_url TEXT,  -- Supabase Storage URL
     status TEXT,  -- queued, processing, completed, failed
     progress INT,
     result JSONB,
     error TEXT,
     created_at TIMESTAMP,
     updated_at TIMESTAMP
   );
   ```

2. **Endpoint POST /api/jobs/analyze:**
   ```typescript
   // functions/api/jobs/analyze.ts
   export async function onRequest(context) {
     const { fileName, fileUrl, clientId } = await context.request.json();
     
     // Crear job
     const job = await supabase.from('jobs').insert({
       id: uuidv4(),
       client_id: clientId,
       file_name: fileName,
       file_url: fileUrl,
       status: 'queued',
       progress: 0
     }).single();
     
     // Publicar a queue (Redis)
     await redis.lpush('analyze-queue', JSON.stringify({ jobId: job.id }));
     
     return new Response(JSON.stringify(job), { status: 202 });
   }
   ```

3. **Endpoint GET /api/jobs/{jobId}:**
   ```typescript
   // functions/api/jobs/[jobId].ts
   export async function onRequest(context) {
     const { jobId } = context.params;
     const job = await supabase.from('jobs').select('*').eq('id', jobId).single();
     return new Response(JSON.stringify(job));
   }
   ```

### **Fase 2: Worker Background (2-3 horas)**

1. **Worker que consume la queue:**
   ```typescript
   // worker/process-job.ts
   import { Worker } from 'bullmq';
   
   const worker = new Worker('analyze-queue', async (job) => {
     const { jobId } = job.data;
     
     // Actualizar status
     await updateJob(jobId, { status: 'processing', progress: 10 });
     
     try {
       // Extraer PDF
       const text = await extractPDF(job.file_url);
       await updateJob(jobId, { progress: 40 });
       
       // SINGLE-SHOT LLM (1 llamada con todo)
       const result = await analyzeSingleShot(text, jobId);
       await updateJob(jobId, { progress: 90 });
       
       // Guardar resultado
       await updateJob(jobId, { 
         status: 'completed', 
         progress: 100,
         result 
       });
     } catch (err) {
       await updateJob(jobId, { 
         status: 'failed', 
         error: err.message 
       });
     }
   }, {
     connection: redisConnection,
     concurrency: 5,  // 5 PDFs en paralelo
     limiter: {
       max: 100,  // max 100 jobs
       duration: 60000  // por minuto
     }
   });
   ```

2. **Función single-shot (1 llamada GPT-4o):**
   ```typescript
   async function analyzeSingleShot(text: string, jobId: string) {
     const prompt = `
       Analiza este documento y retorna JSON con:
       {
         "analysis": "<análisis completo 400 palabras>",
         "executiveBrief": "<brief 100 palabras>",
         "benchmarks": [{ metric, value, source }]
       }
       
       Texto: ${text.slice(0, 12000)}
     `;
     
     const response = await fetchWithTimeout(
       `${PROXY_URL}/chat`,
       {
         method: 'POST',
         body: JSON.stringify({
           model: 'gpt-4o',
           messages: [{ role: 'user', content: prompt }],
           max_tokens: 1200,
           temperature: 0.3
         })
       },
       60000  // 60s timeout
     );
     
     const data = await response.json();
     return JSON.parse(data.choices[0].message.content);
   }
   ```

### **Fase 3: Frontend Polling (1 hora)**

```typescript
// Frontend: polling cada 2s
async function startAnalysis(jobId: string) {
  setPolling(true);
  
  const interval = setInterval(async () => {
    const job = await fetch(`/api/jobs/${jobId}`).then(r => r.json());
    
    setProgress(job.progress);
    setStatus(job.status);
    
    if (job.status === 'completed') {
      clearInterval(interval);
      setResult(job.result);
      setPolling(false);
    }
    
    if (job.status === 'failed') {
      clearInterval(interval);
      setError(job.error);
      setPolling(false);
    }
  }, 2000);
}
```

---

## 📊 Beneficios vs Arquitectura Actual

| Métrica | Actual | Nuevo |
|---------|--------|-------|
| **Tiempo de respuesta API** | 70-140s | <500ms |
| **Timeout frontend** | Frecuente | Imposible |
| **Feedback al usuario** | Spinner mudo | Progress bar tiempo real |
| **Escalabilidad** | 1-2 usuarios | 100+ usuarios |
| **Recuperación de errores** | Empieza de cero | Resume desde checkpoint |
| **Persistencia** | Se pierde si refrescas | Guardado en DB |
| **Cancelación** | No funciona | Worker detiene proceso |
| **Llamadas LLM** | 3 secuenciales | 1 optimizada |
| **Tiempo total** | 4-15 min | 30-90s |

---

## 💰 Costos Estimados (Mensual)

**Infraestructura:**
- Upstash Redis: $10/mes (10k jobs/día)
- Cloudflare Workers: $5/mes (CPU time upgrade)
- Supabase Storage: $0 (25 GB incluidos)

**LLM API:**
- Actual: 3 llamadas × $0.03 = $0.09/documento
- Nuevo: 1 llamada × $0.025 = $0.025/documento (70% más barato)

**Total: ~$15/mes fijo + variable por uso**

---

## ⏱️ Timeline Realista

- **Fase 1 (Job Queue):** 2-3 horas
- **Fase 2 (Worker):** 2-3 horas
- **Fase 3 (Frontend):** 1 hora
- **Testing + Deploy:** 1-2 horas

**Total:** 6-9 horas de trabajo enfocado

---

## 🎯 Próximos Pasos

1. **Decisión arquitectura:** ¿Full Node.js (Option A) o Hybrid (Option B)?
2. **Setup Upstash Redis:** Crear cuenta + obtener credentials
3. **Implementar Fase 1** (Job Queue API)
4. **Implementar Fase 2** (Worker)
5. **Implementar Fase 3** (Frontend polling)
6. **Testing end-to-end** con PDF de 89 páginas
7. **Deploy a producción** con feature flag

---

## 📝 Notas

- Este patrón es **industry standard** para document processing APIs (OpenAI, Anthropic, Google)
- **No reinventamos la rueda** — usamos patterns probados por millones de usuarios
- **Escalable desde día 1** — el mismo código maneja 10 o 10,000 usuarios
- **Monitoring built-in** — sabes exactamente qué está pasando en cada momento

---

**¿Listo para implementar esto, Fabián?** 🚀
