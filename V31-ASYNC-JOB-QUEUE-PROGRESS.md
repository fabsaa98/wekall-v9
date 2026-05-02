# V31 — Async Job Queue Implementation Progress

**Fecha:** 02 mayo 2026 15:50 COT  
**Objetivo:** Refactorizar Executive Insights con patrón async job queue profesional  
**Arquitectura:** Option A — Full Node.js (Cloudflare + Upstash + Supabase)

---

## ✅ COMPLETADO (Fase 1 + Fase 2 Parcial)

### 1. Dependencias Instaladas
```bash
npm install bullmq ioredis uuid --save
```
- ✅ `bullmq@5.76.5` — Redis job queue
- ✅ `ioredis@5.10.1` — Redis client
- ✅ `uuid@14.0.0` — Generate job IDs

### 2. Database Schema
**Archivo:** `supabase-jobs-table.sql`

Tabla `executive_insights_jobs`:
- ✅ Campos: id, client_id, file_name, file_url, status, progress, result, error, timestamps
- ✅ Índices optimizados
- ✅ Trigger auto-update `updated_at`
- ✅ Row Level Security (RLS) policies

**⚠️ PENDIENTE:** Ejecutar manualmente en Supabase SQL Editor (ver instrucciones abajo)

### 3. API Endpoints Creados

**POST /api/jobs/create**
- ✅ Crea job en DB
- ✅ Publica a Redis queue (cuando esté configurado)
- ✅ Retorna 202 Accepted con jobId
- ✅ Validación: tamaño max 15 MB

**GET /api/jobs/{jobId}**
- ✅ Consulta estado del job
- ✅ Retorna: status, progress, message, estimatedTimeLeft
- ✅ Cache control: 1h para completed/failed, no-cache para processing

---

## ⏳ PENDIENTE

### Fase 1 (En Progreso)

**1. Setup Upstash Redis** ← **BLOQUEADO (Requiere acción manual)**

**ACCIÓN REQUERIDA:**
1. Ir a: https://console.upstash.com/
2. Sign up con `fabsaa98@gmail.com`
3. Create Database:
   - Name: `wekall-jobs`
   - Type: Regional
   - Region: `us-east-1`
   - Enable TLS: ✅
4. Copiar:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
5. Configurar en Cloudflare Pages env vars

**2. Ejecutar SQL en Supabase:**
```bash
# Abrir: https://supabase.com/dashboard/project/iszodrpublcnsyvtgjcg/sql/new
# Pegar contenido de: supabase-jobs-table.sql
# Ejecutar
```

**3. Configurar env vars en Cloudflare Pages:**
```bash
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=Ax...
```

### 4. Worker Background Processor
**Archivo:** `worker/process-jobs.ts`

- ✅ Worker que consume Redis queue (Upstash REST API)
- ✅ Single-shot LLM call implementado (1 llamada con JSON estructurado)
- ✅ Actualiza job progress en tiempo real (10% → 40% → 90% → 100%)
- ✅ Manejo de errores + update a status='failed'
- ✅ PDF extraction con pdf-parse (max 30 páginas, 20k chars)
- ✅ Logging de tiempos de procesamiento

**⚠️ PENDIENTE:** Deploy del worker (necesita credenciales Upstash)

### Fase 2 (Casi Completa)

### Fase 3 (No Iniciada)

**5. Frontend Polling**
- [ ] Modificar `DocumentAnalysis.tsx` para usar nuevo flow
- [ ] Implementar polling cada 2s
- [ ] Progress bar tiempo real
- [ ] Mostrar mensaje de estado
- [ ] Cargar resultado cuando status === 'completed'

### Fase 4 (No Iniciada)

**6. Testing End-to-End**
- [ ] Test con PDF pequeño (5 páginas)
- [ ] Test con PDF grande (89 páginas "CX COPC.pdf")
- [ ] Validar timeouts
- [ ] Validar cancelación
- [ ] Validar retry automático en errores

**7. Deploy a Producción**
- [ ] Build + deploy Cloudflare Pages
- [ ] Deploy worker background
- [ ] Configurar monitoring (logs, alertas)
- [ ] Feature flag para rollout gradual

---

## 📊 MÉTRICAS OBJETIVO

| Métrica | Actual (V30) | Target (V31) |
|---------|--------------|--------------|
| Respuesta API | 70-140s | <500ms |
| Tiempo total | 4-15 min | 30-90s |
| Llamadas LLM | 3 secuenciales | 1 optimizada |
| UX | Spinner mudo | Progress bar |
| Escalabilidad | 1-2 usuarios | 100+ usuarios |

---

## 🚧 BLOQUEADORES ACTUALES

1. **Upstash Redis credentials** — Requiere signup manual
2. **Supabase SQL execution** — Requiere ejecutar script manual

**Estimado tiempo restante (después de desbloquear):** 4-6 horas

---

## 📝 PRÓXIMOS PASOS

**AHORA MISMO:**
1. ✅ Tú (Fabián): Crear cuenta Upstash + obtener credenciales
2. ✅ Tú (Fabián): Ejecutar `supabase-jobs-table.sql` en Supabase
3. ⏸️ Yo (Gloria): Configuro env vars + continúo con Worker (Fase 2)

**Cuando tengas las credenciales, pégalas aquí y continúo automáticamente.**

---

**Status:** ⏸️ **PAUSADO — Esperando credenciales Upstash Redis**
