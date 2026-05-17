# wekall-vicky-proxy

Cloudflare Worker que proxiea OpenAI (chat, Whisper, embeddings) y ejecuta el pipeline de ingesta de transcripciones a Supabase.

Versionado en este repo desde 2026-05-17 (antes vivía solo en el deployment Cloudflare). El versionado se hizo para aplicar los fixes documentados en `_backups/onboardings/auditoria-hardcoded-2026-05-15.md` P1.2.

## Endpoints

| Ruta | Método | Función |
|---|---|---|
| `/health` | GET | Health check |
| `/chat` o `/` | POST | Chat GPT-4o / GPT-4o-mini con Function Calling |
| `/transcribe` | POST FormData | Whisper-1 STT (audio binario en `file`) |
| `/diarize` | POST | Diarización pyannote via Mac Mini (Cloudflare Tunnel) |
| `/ingest` | POST JSON | Pipeline completo: audio_url → Whisper → GPT-4o-mini summary → embedding → INSERT en `transcriptions` |
| `/rag-query` | POST JSON | RAG semántico sobre `transcriptions` con pgvector |

## Fixes aplicados (vs versión que estaba en producción al 2026-05-15)

### Fix 1 · `/ingest` ya NO mete datos en Supabase con ANON_KEY

**Antes:** el endpoint hacía `INSERT` a `transcriptions` con `SUPABASE_ANON_KEY`. La tabla tiene RLS habilitado que **bloquea anon INSERT**, causando HTTP 500 silencioso. Cualquier llamada al pipeline de cliente nuevo fallaba sin razón visible.

**Después:** usa `SUPABASE_SERVICE_KEY` (bypassa RLS). Fallback a ANON_KEY si SERVICE_KEY no está seteado (comportamiento legacy + log warning).

### Fix 2 · Vocabulario por cliente para el resumen GPT

**Antes:** un único branch hardcoded:
```js
const domainVocab = client_id === "credismart" ? "mora, cartera vencida, ..." : "cliente, servicio, soporte, ...";
```

Esto hacía que el LLM resumiera llamadas de salud, fintech o retail con vocabulario genérico inútil.

**Después:** lookup table por `client_id` con vocabularios específicos (cobranzas, salud, fintech, telecom, software). Default a un vocabulario genérico si el cliente no está mapeado. Cuando se agregue un cliente nuevo, basta con agregar la entrada al lookup.

### Fix 3 · `/ingest` requiere `client_id` explícito en el body

**Antes:** `client_id = "credismart"` como default si el body no lo traía.

**Después:** retorna `HTTP 400 { error: "Se requiere client_id en el body" }` si falta. Sin defaults silenciosos.

## Setup local

```bash
cd workers/wekall-vicky-proxy
npx wrangler dev --port 8788
```

Necesita un archivo `.dev.vars` (no commiteado) con las mismas keys del production env.

## Deploy

```bash
npx wrangler deploy
```

Requiere `wrangler login` previo. **Producción al deployar:** sobrescribe el Worker en `wekall-vicky-proxy.fabsaa98.workers.dev`. Los Secrets no se tocan (se configuran aparte con `wrangler secret put`).
