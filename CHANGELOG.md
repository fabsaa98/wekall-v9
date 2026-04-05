# WeKall Intelligence — CHANGELOG

---

## [V19.0.0] — 2026-04-05 — Arquitectura Multi-Tenant

### Migración de single-tenant a multi-tenant

- **`client_id` en todas las tablas:** `cdr_daily_metrics`, `transcriptions`, `agents_performance` — columna `TEXT NOT NULL DEFAULT 'credismart'` con índices compuestos
- **ClientContext:** contexto React global que gestiona el cliente activo en el frontend — persistido en localStorage (`wki_client_id`)
- **Login page:** auth mock via tabla `app_users` — email + código de empresa → sesión guardada en localStorage
- **AuthGuard:** protección de rutas con default `'credismart'` para mantener cero breaking changes con el acceso existente de Fabián
- **Tabla `app_users`:** usuarios por empresa con roles (`CEO` / `VP Ventas` / `VP CX` / `COO` / `admin`), campo `last_login`, FK a `client_config`
- **Tabla `client_branding`:** personalización por cliente — colores primarios, logo URL, tagline
- **Configuración → pestaña "Mi Empresa":** datos del cliente cargados dinámicamente desde Supabase
- **Script `onboard_client.py`:** CLI para onboardear clientes en 1 comando (crea `client_config` + `client_branding` + usuario inicial)
- **SQL `migrate_multitenant.sql`:** script completo con todos los cambios de schema, RLS policies y datos iniciales
- Build exitoso, deploy en Cloudflare Pages

---

## [V18.0.0] — 2026-04-05 — Datos Reales de Agentes + Alertas + Anomaly Detection

### Equipos: datos reales de agentes desde Supabase
- **`agents_performance`:** tabla Supabase con 22 agentes reales Crediminuto × 30 días hábiles = 660 registros
- **`useAgentsData` hook:** lee datos reales, calcula promedios (30d) y tendencias (7d vs 30d) — indicadores ↑↓→ con umbral ±3%
- **Equipos page:** 100% conectada a datos reales de Supabase (sin ningún dato mock)

### Sistema de Alertas
- **`alert_log`:** historial persistente de alertas en Supabase con severity (critical/warning/info)
- Evaluación automática de umbrales desde datos CDR en tiempo real
- Botón "Probar alerta" para disparo manual
- Historial de las últimas 10 alertas con timestamp y valores reales vs umbrales

### Vicky Insights: historial persistente
- **`vicky_conversations`:** cada Q&A de Vicky guardado en Supabase con metadatos (modelo, tokens, latencia)
- **Tab "Historial":** 20 conversaciones más recientes, colapsables, con recarga automática al abrir el chat

### Anomaly Detection
- Cálculo de desviación estándar sobre los últimos 30 días de CDR
- Banner proactivo en Overview cuando `|hoy − media 30d| > 1.5σ`
- Muestra delta exacto y contexto para el CEO

- Build exitoso, deploy en Cloudflare Pages

---

# WeKall Intelligence — CHANGELOG

> Repositorio del producto real (stack de producción).  
> Para el historial completo de versiones V1–V8 (prototipo HTML), ver: https://github.com/fabsaa98/wekall-intelligence

---

## Identidad del Producto

**Nombre:** WeKall Intelligence  
**Chat IA:** Vicky Insights  
**Tagline:** Business Intelligence for CEOs & C-Suite  
**Stack:** React 18 + TypeScript + Vite + Tailwind + shadcn/ui + Recharts  
**Deploy:** Cloudflare Pages → https://wekall-intelligence.pages.dev

---

## REGLA PERMANENTE — Cero Hardcodeo (2026-04-03)

> **"NUNCA más datos de negocio hardcodeados en el código."**

- Todo dato de operación en Supabase, leído dinámicamente
- Pipeline CDR nuevo: script → Supabase → app lee automáticamente
- Pipeline grabación: `/ingest` → Whisper → embedding → Supabase → Vicky disponible
- Aplica a: KPIs, tasas, agentes, alertas, sparklines, promedios, transcripciones

---

## [V15.1.0] — 2026-04-04 — Cloudflare Worker Completo

### Rutas activas en wekall-vicky-proxy

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/health` | GET | Status del proxy |
| `/chat` o `/` | POST | Chat con GPT-4o |
| `/transcribe` | POST | Whisper STT ($0.006/min) |
| `/diarize` | POST | Diarización → Mac Mini pyannote |
| `/rag-query` | POST | RAG sobre transcripciones Supabase |
| `/ingest` | POST | Pipeline auto: audio → Whisper → embedding → Supabase |

**CORS:** Actualizado para `wekall-intelligence.pages.dev` y `fabsaa98.github.io`

---

## [V15.0.0] — 2026-04-03/04 — Diarización Estéreo (pyannote)

### Feature: Identificación automática de hablantes (AGENTE vs CLIENTE)

**Modelo:** pyannote/speaker-diarization-3.1  
**Host:** Mac Mini de Celeru (puerto 8765) — Cloudflare Tunnel → Worker `/diarize`

**Instalación:**
- pyannote.audio 4.0.4 + torch 2.11.0
- Cuenta HuggingFace: fabsaa98@gmail.com — 3 modelos con términos aceptados
- LaunchAgent `com.wekall.diarization` — auto-arranque en reinicios del Mac Mini
- Script `start-diarization.sh` — actualiza CF secret con nueva URL del tunnel automáticamente

**Endpoint:** `POST /diarize` — audio binario → JSON con segmentos por hablante
```json
{
  "status": "ok",
  "segments": [{"speaker": "SPEAKER_00", "start": 0.065, "end": 1.145, "duration": 1.08}],
  "num_speakers": 2,
  "total_duration": 5.2
}
```

**Decisión:** Mac Mini (no CF Workers) — CF Workers tiene límite 128MB RAM; pyannote necesita ~2-4GB.  
**Cloudflare Tunnel** para exposición pública con auto-actualización de URL en CF secret.

---

## [V14.1.0] — 2026-04-03 — Webhook /ingest (Pipeline Automático)

### Feature: Ingesta automática post-llamada

**Endpoint:** `POST https://wekall-vicky-proxy.fabsaa98.workers.dev/ingest`

**Payload:** `{ audio_url, agent_id, agent_name, campaign_id, call_date, call_type }`

**Flujo:** Descarga audio → Whisper-1 → Resumen GPT-4o-mini → Embedding → Supabase (automático)

**Para activar en WeKall:** Configurar webhook post-llamada con header `X-WeKall-Token`.

---

## [V14.0.0] — 2026-04-03 — RAG Pipeline con Supabase

### Feature: Retrieval-Augmented Generation

- Supabase pgvector: tabla `transcriptions` + función `search_transcriptions` (cosine similarity)
- 50 transcripciones cargadas con embeddings `text-embedding-3-small`
- Worker: `/rag-query` busca en pgvector antes de responder
- VickyInsights: palabras clave de agentes → `/rag-query`, resto → `/chat`

**Decisión:** Supabase sobre Pinecone/Weaviate — plan gratuito, pgvector nativo, región São Paulo (LATAM).

---

## [V13.0.0] — 2026-04-03 — Document Intelligence

### Feature: Análisis de Documentos con Vicky

Nueva página `/document-analysis`. Tipos soportados:
- **Audio (MP3/WAV/M4A):** Transcripción via Whisper + análisis contextual
- **PDF:** pdfjs-dist (hasta 20 páginas, 100% browser)
- **Excel/CSV:** SheetJS (xlsx)
- **Word (.docx):** Extracción XML interna
- **Imágenes:** Base64 → GPT-4o Vision

**Arquitectura:** Extracción en browser → texto + contexto CDR → GPT-4o via Cloudflare → respuesta ejecutiva.

---

## [V12.0.0] — 2026-04-02 — Arquitectura Function Calling

### Decisión arquitectural: LLM interpreta, código calcula

- LLM: interpreta la pregunta, decide qué análisis hacer
- Código TypeScript (`vickyCalculations.ts`): ejecuta el cálculo — siempre correcto, reproducible
- LLM: presenta el resultado en lenguaje ejecutivo

**Funciones:** `calcularImpactoAHT`, `calcularImpactoContactRate`, `calcularImpactoAgentes`, `getEstadoOperativo`

### V12.4 — Prosa garantizada (dos capas)
1. Prompt con prohibición absoluta de listas/headers + ejemplos ❌/✅
2. Post-procesamiento `convertirMarkdownAProsa` en código — garantía estructural independiente del modelo

### V12.5 — Input de voz (Whisper)
- Botón micrófono → MediaRecorder → Whisper-1 via `/transcribe` → texto en chat
- Costo: ~$0.006/min = ~$0.003 por consulta de 30s

### V12.3 — CEO Language + Multi-país
- Sin jerga estadística: P75 → "operaciones líderes en el sector"
- Costos laborales: Colombia COP $3M/mes · Perú ≈ COP $1.6M/mes
- Tool `buscarDatoOficial` en Function Calling (base para búsqueda web real)

---

## [V11.0.0] — 2026-04-02 — Benchmarks & Motor EBITDA

### Benchmarks multi-industria (8 verticales)
| Vertical | Fuentes |
|----------|---------|
| CC Cobranzas | COPC, SQM, E&Y, ACDECC Colombia |
| CC Servicio | COPC, SQM, CFI Group, MetricNet |
| CC Ventas Outbound | COPC, SQM, Contact Babel |
| Soporte Técnico | HDI, MetricNet, ITIL |
| Banca/Seguros/Fintech | McKinsey, J.D. Power, Bain, FELABAN |
| Salud | HIMSS, J.D. Power Healthcare, Accenture |
| Retail/E-Commerce | NRF, Baymard Institute, ACSI |
| Telco | TM Forum, GSMA, McKinsey |

Detección automática de industria y país. P25/P50/P75 por Colombia/Latam/USA/Global.

### Motor EBITDA
- Costo empresa/agente: COP $3,000,000/mes = COP $284/min
- Nómina activa: COP $243,000,000/mes (81 agentes)
- 3 escenarios: A=eficiencia, B=crecimiento, C=EBITDA combinado

### Corrección crítica de datos
- ❌ Error: AHT aplicado a 16,129 llamadas totales → inflaba cálculos 2.3x
- ✅ Correcto: AHT aplica solo a 6,951 contactos efectivos

---

## [V10.0.0] — 2026-04-02 — Enterprise Architecture

- **Cloudflare Worker Proxy:** API key nunca en el frontend — vive en Cloudflare Secrets
- **BSC CEO Metrics:** 4 perspectivas Balanced Scorecard con datos reales CDR
- **Vicky con contexto enriquecido:** 50 transcripciones reales Crediminuto embebidas

---

## [V9.0.0] — 2026-04-01 — Producto SaaS Real

Salto definitivo de prototipo HTML (V1-V8) a stack de producción real.

**Stack:** React 18 + TypeScript + Vite + Tailwind + shadcn/ui + Recharts  
**Datos reales CDR:** 16,129 llamadas · 81 agentes · 4 campañas (30-Mar-2026)  
**Vicky Insights:** Chat IA con Function Calling, RAG, voz, Decision Log, benchmarks  
**PWA:** Instalable en iPhone y Android (ícono violeta WI)

---

## ICP y Posicionamiento

- **Quién:** CEO y C-suite (VP Ventas, VP CX, COO, CFO)
- **Industria:** Agnóstico — cualquier industria que use WeKall
- **Valor:** Autoservicio de datos en lenguaje natural — sin depender de reportes ni líderes
- **Fuentes:** CDR + Grabaciones + Chats + Documentos + Messenger Hub

---

## Metodología COPC — Muestreo Estadístico

- **Muestra mínima:** 375 llamadas/día (95% confianza, ±5% error)
- **Método:** Aleatorio sistemático — 1 de cada 43 llamadas, proporcional por campaña
- **Estado actual:** 50 transcritas (piloto) — ampliar a 375 con CDR completo

---

## Benchmark de Referencia (competidores)

| Feature | Inspirado en |
|---|---|
| Root cause + drivers cuantificados | Tellius Kaiya |
| Chat conversacional + search | ThoughtSpot Spotter |
| Razonamiento visible + fuentes | Zenlytic Zoë |
| Push proactivo + sparklines | Tableau Pulse |
| Narrative ejecutivo | McKinsey QuantumBlack / BCG Gamma |
| Decision Log | Propio (gap vs. competencia) |

