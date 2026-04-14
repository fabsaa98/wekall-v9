# WeKall Intelligence — Cloudflare Worker

**Worker name:** `wekall-vicky-proxy`  
**URL de producción:** `https://wekall-vicky-proxy.fabsaa98.workers.dev`  
**Repo local:** `/Users/celeru/.openclaw/workspace/wekall-proxy/`  
**Account:** fabsaa98@gmail.com  
**Plan:** Workers Free (100,000 req/día gratis)

---

## Propósito

El Worker actúa como **proxy seguro** entre el frontend (React/Cloudflare Pages) y las APIs externas (OpenAI, Supabase, Mac Mini). Su función principal: **la API key de OpenAI nunca se expone en el frontend**.

```
Frontend (browser)
    │
    ▼
Cloudflare Worker (wekall-vicky-proxy)
    ├── /chat     → OpenAI GPT-4o
    ├── /transcribe → OpenAI Whisper-1
    ├── /rag-query  → OpenAI Embeddings + Supabase pgvector + GPT-4o
    ├── /ingest     → Whisper + GPT + Embeddings + Supabase (pipeline completo)
    └── /diarize    → Mac Mini pyannote via Cloudflare Tunnel
```

---

## Variables de Entorno / Secrets

### Vars (en `wrangler.toml` — públicas)

```toml
[vars]
ALLOWED_ORIGIN = "https://fabsaa98.github.io"
```

> **Nota:** `ALLOWED_ORIGIN` está desactualizado — el deploy en Cloudflare Pages tiene una CORS diferente. El Worker actualmente acepta `*` para CORS. Ver sección de CORS abajo.

### Secrets (en Cloudflare Dashboard — privados, nunca en código)

```
OPENAI_API_KEY     → API key de OpenAI (gpt-4o, whisper-1, text-embedding-3-small)
SUPABASE_URL       → https://iszodrpublcnsyvtgjcg.supabase.co
SUPABASE_ANON_KEY  → sb_publishable_eRRG-QSyURpWV-FstJUc4g_M-xmD6v_
DIARIZATION_URL    → URL del Cloudflare Tunnel al Mac Mini (cambia en cada reinicio)
```

**Cómo actualizar un secret:**
```bash
cd /Users/celeru/.openclaw/workspace/wekall-proxy
wrangler secret put OPENAI_API_KEY
# Ingresa el valor cuando se solicite — nunca aparece en texto plano
```

---

## Rutas Disponibles

### `GET /health`
**Descripción:** Health check público del Worker.  
**Auth:** No requerida.

**Request:**
```http
GET https://wekall-vicky-proxy.fabsaa98.workers.dev/health
```

**Response:**
```json
{
  "status": "ok",
  "service": "wekall-vicky-proxy"
}
```

**Costo:** $0 (Worker Free — no consume tokens de OpenAI)

---

### `POST /chat` (o `POST /`)
**Descripción:** Proxy para chat completions de OpenAI. Pasa el request directamente a `gpt-4o` o cualquier modelo especificado en el body.

**Auth:** No requerida (CORS abierto — el Worker es el límite de seguridad via API key).

**Request:**
```http
POST https://wekall-vicky-proxy.fabsaa98.workers.dev/chat
Content-Type: application/json

{
  "model": "gpt-4o",
  "messages": [
    { "role": "system", "content": "Eres Vicky, analista experta de contact center..." },
    { "role": "user", "content": "¿Cómo estuvo la operación hoy?" }
  ],
  "max_tokens": 800,
  "temperature": 0.7,
  "tools": [...]  // opcional — Function Calling
}
```

**Response:** Mismo formato que OpenAI Chat Completions API.

```json
{
  "id": "chatcmpl-xxx",
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "El día de hoy la operación procesó..."
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 1200,
    "completion_tokens": 350,
    "total_tokens": 1550
  }
}
```

**Costo estimado:** $0.005–$0.015 por consulta (depende de tokens — GPT-4o: $2.50/$10.00 per 1M tokens input/output)

---

### `POST /transcribe`
**Descripción:** Proxy para Whisper-1 STT (Speech-to-Text). Acepta audio en FormData y retorna la transcripción.

**Usado para:** Input de voz en el chat de Vicky Insights.

**Request:**
```http
POST https://wekall-vicky-proxy.fabsaa98.workers.dev/transcribe
Content-Type: multipart/form-data

file=<audio_blob>      # MP3, WAV, M4A, WebM
model=whisper-1        # siempre whisper-1
language=es            # español
```

**Response:**
```json
{
  "text": "¿Cuántas llamadas tuvimos ayer?"
}
```

**Costo estimado:** $0.006/minuto de audio (~$0.003 por consulta de 30 segundos)

---

### `POST /diarize`
**Descripción:** Proxy al servicio de diarización pyannote corriendo en Mac Mini. Identifica automáticamente los hablantes (AGENTE vs CLIENTE) en una grabación.

**Host del servicio:** Mac Mini de Celeru, puerto 8765, expuesto via Cloudflare Tunnel.  
**URL del tunnel:** Se actualiza automáticamente en `DIARIZATION_URL` secret cada vez que se reinicia el servicio.

**Request:**
```http
POST https://wekall-vicky-proxy.fabsaa98.workers.dev/diarize
Content-Type: audio/wav

<audio_binary_data>
```

**Response:**
```json
{
  "status": "ok",
  "segments": [
    { "speaker": "SPEAKER_00", "start": 0.065, "end": 1.145, "duration": 1.08 },
    { "speaker": "SPEAKER_01", "start": 1.200, "end": 3.450, "duration": 2.25 },
    { "speaker": "SPEAKER_00", "start": 3.500, "end": 5.200, "duration": 1.70 }
  ],
  "num_speakers": 2,
  "total_duration": 5.2
}
```

**Costo estimado:** $0 (local en Mac Mini)

**Nota:** Si el Mac Mini está apagado o el tunnel cambió, esta ruta retorna error. El Worker usa `DIARIZATION_URL` del CF Secret; actualizar con `wrangler secret put DIARIZATION_URL`.

---

### `POST /rag-query`
**Descripción:** RAG completo con aislamiento por cliente — embeds la pregunta, busca transcripciones del cliente específico en Supabase pgvector, y responde con contexto real de llamadas.

**Actualización V20:** Acepta `client_id` en el body para filtrar transcripciones por cliente. Sin `client_id`, la búsqueda opera sobre todas las transcripciones (backward-compatible).

**Usado para:** Preguntas de Vicky que mencionan agentes, transcripciones, frases específicas.

**Request:**
```http
POST https://wekall-vicky-proxy.fabsaa98.workers.dev/rag-query
Content-Type: application/json

{
  "query": "¿Qué objeciones mencionan más los clientes de cobranzas?",
  "match_count": 5,
  "client_id": "credismart"
}
```

**Parámetros del body:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `query` | `string` | ✅ | Pregunta en lenguaje natural |
| `match_count` | `number` | No (default: 5) | Número de transcripciones a recuperar |
| `client_id` | `string` | No (default: null) | **V20** Filtra transcripciones por cliente — aislamiento RAG |

**Proceso interno del Worker (V20):**
1. Genera embedding de `query` via `text-embedding-3-small`
2. Llama a `search_transcriptions` pasando `client_id_filter` — **solo transcripciones del cliente**
3. Construye prompt con contexto de transcripciones filtradas
4. Llama a GPT-4o con ese contexto enriquecido
5. Retorna respuesta + fuentes

**Response:**
```json
{
  "answer": "Basado en 5 transcripciones reales de credismart, las principales objeciones son...",
  "sources": ["Llamada 2026-03-30 - Agente NELCY", "Llamada 2026-03-28 - Agente ANA MARIA"],
  "context_used": 5
}
```

**Costo estimado:** ~$0.01 por consulta (embedding + tokens de contexto de transcripciones + GPT-4o)

---

### `POST /ingest`
**Descripción:** Pipeline automático completo post-llamada. Descarga el audio desde una URL, transcribe, resume, genera embedding y guarda todo en Supabase. La transcripción queda indexada para RAG aislado por cliente.

**Actualización V20:** Acepta y persiste `client_id` en la tabla `transcriptions` — garantiza que las grabaciones ingresadas queden asociadas al cliente correcto y sean recuperables via `/rag-query` con `client_id_filter`.

**Usado para:** Activar automáticamente desde WeKall como webhook post-llamada.

**Request:**
```http
POST https://wekall-vicky-proxy.fabsaa98.workers.dev/ingest
Content-Type: application/json
X-WeKall-Token: <token_secreto>

{
  "audio_url": "https://storage.wekall.co/llamadas/2026-04-05/call123.wav",
  "agent_id": "10982",
  "agent_name": "NELCY JOSEFINA CONTASTI GONZALEZ",
  "campaign_id": "cobranzas_crediminuto_co",
  "call_date": "2026-04-05",
  "call_type": "outbound",
  "client_id": "credismart"
}
```

**Parámetros del body:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `audio_url` | `string` | ✅ | URL pública del audio a procesar |
| `agent_id` | `string` | ✅ | ID del agente en WeKall |
| `agent_name` | `string` | ✅ | Nombre completo del agente |
| `campaign_id` | `string` | No | Campaña a la que pertenece la llamada |
| `call_date` | `string` | No | Fecha de la llamada (ISO YYYY-MM-DD) |
| `call_type` | `string` | No | `inbound` o `outbound` |
| `client_id` | `string` | No (default: `credismart`) | **V20** ID del cliente — asocia la transcripción para RAG aislado |

**Proceso interno (V20):**
1. Descarga audio desde `audio_url`
2. Transcribe con Whisper-1
3. Genera resumen ejecutivo con GPT-4o-mini (3 líneas: tema, tono cliente, resultado)
4. Genera embedding `text-embedding-3-small` del transcript
5. Guarda todo en `transcriptions` de Supabase **con `client_id` del payload**

**Response:**
```json
{
  "status": "ok",
  "agent_id": "10982",
  "client_id": "credismart",
  "transcript_length": 2847,
  "summary": "Cliente con mora de 45 días. Tono defensivo. Se acordó promesa de pago parcial del 40% para el viernes."
}
```

**Costo estimado:** ~$0.02 por llamada (Whisper + GPT-4o-mini resumen + embedding)

---

## CORS

El Worker acepta requests desde cualquier origen (`*`). Para restringir a solo el dominio de producción, actualizar en `src/worker.js`:

```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || 'https://wekall-intelligence.pages.dev',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-WeKall-Token',
};
```

**Orígenes permitidos en producción:**
- `https://wekall-intelligence.pages.dev`
- `https://fabsaa98.github.io` (historial — ya no activo)

---

## Cómo Deployar Cambios

### Deploy estándar

```bash
cd /Users/celeru/.openclaw/workspace/wekall-proxy

# Verificar que estás autenticado
wrangler whoami

# Deploy
wrangler deploy
```

El deploy tarda ~10 segundos y no tiene downtime (Cloudflare hace rolling deploy).

### Actualizar un secret

```bash
wrangler secret put OPENAI_API_KEY
# Ingresar nuevo valor cuando se solicite

wrangler secret put DIARIZATION_URL
# Ingresar nueva URL del tunnel
```

### Verificar el deploy

```bash
# Health check
curl https://wekall-vicky-proxy.fabsaa98.workers.dev/health

# Ver logs en tiempo real
wrangler tail
```

### Ver logs históricos

1. Abrir https://dash.cloudflare.com
2. Workers & Pages → wekall-vicky-proxy
3. Logs → Filter por fecha/status

---

## Costos Estimados

### Cloudflare Workers (gratis hasta 100K req/día)

Con el volumen actual (piloto, ~50 consultas/día):

| Ruta | Req/día estimadas | Costo CF |
|------|------------------|----------|
| `/chat` | 40 | Gratis |
| `/transcribe` | 5 | Gratis |
| `/rag-query` | 5 | Gratis |
| **Total** | 50 | **$0** |

> Con 100K req/día gratuitas, WeKall Intelligence necesitaría ~2,000 clientes activos diarios para exceder el tier gratuito.

### OpenAI (por uso real)

| Ruta | Costo por request | 50 req/día | 500 req/día |
|------|------------------|-----------|------------|
| `/chat` (GPT-4o) | ~$0.010 | $0.50/día | $5.00/día |
| `/transcribe` | ~$0.003 | $0.015/día | $0.15/día |
| `/rag-query` | ~$0.012 | $0.06/día | $0.60/día |
| `/ingest` | ~$0.020 | $1.00/día | $10.00/día |
| **Total estimado** | — | **~$1.57/día** | **~$15.75/día** |

> Costo mensual estimado en piloto (50 req/día): ~$47/mes en OpenAI.

---

## Estructura del Worker

```
wekall-proxy/
├── src/
│   └── worker.js          # Todo el código del Worker (un solo archivo)
├── wrangler.toml          # Configuración del Worker
└── package.json           # Dependencias (minimal)
```

**Nota:** El Worker es intencionalmente simple — un archivo JS de ~250 líneas con routing manual. No usa frameworks ni bundlers complejos para minimizar cold starts y tamaño del bundle.
