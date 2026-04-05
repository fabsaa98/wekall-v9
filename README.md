# WeKall Intelligence

> **Business Intelligence for CEOs & C-Suite**  
> Plataforma multi-tenant de inteligencia operativa para contact centers — datos reales, análisis en lenguaje natural, alertas proactivas.

**Producción:** https://wekall-intelligence.pages.dev  
**Versión actual:** V19.0.0 (Multi-Tenant)  
**Stack:** React 18 + TypeScript + Vite + Supabase + Cloudflare Pages/Workers

---

## Descripción del Producto

WeKall Intelligence transforma los datos brutos del CDR (Call Detail Records) de un contact center en inteligencia ejecutiva accionable. El CEO y su C-Suite (VP Ventas, VP CX, COO) acceden en tiempo real a KPIs operativos, tendencias, alertas automáticas, análisis de grabaciones y consultas en lenguaje natural con Vicky Insights (IA sobre GPT-4o + RAG).

**Clientes actuales:** Crediminuto Colombia (`credismart`)  
**Modelo:** SaaS multi-tenant — un deployment, múltiples empresas aisladas por `client_id`

---

## Stack Completo

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Frontend framework | React | 18.3.1 |
| Lenguaje | TypeScript | 5.8.3 |
| Build tool | Vite + SWC | 5.4.19 |
| UI components | shadcn/ui + Radix UI | latest |
| Styling | Tailwind CSS | 3.4.17 |
| Charts | Recharts | 2.15.4 |
| Router | React Router DOM | 6.30.1 |
| State/cache | TanStack React Query | 5.83.0 |
| Database | Supabase (PostgreSQL + pgvector) | @supabase/supabase-js 2.101.1 |
| AI Proxy | Cloudflare Workers | — |
| AI Models | GPT-4o / GPT-4o-mini / Whisper-1 | — |
| Embeddings | text-embedding-3-small | — |
| Diarización | pyannote/speaker-diarization-3.1 | Mac Mini |
| Deploy | Cloudflare Pages | — |
| Forms | React Hook Form + Zod | 7.61.1 / 3.25.76 |
| PDF | pdfjs-dist | 3.11.174 |
| Excel | xlsx (SheetJS) | 0.18.5 |
| Testing | Vitest + Playwright | 3.2.4 / 1.57.0 |

---

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Cloudflare Pages)                   │
│              https://wekall-intelligence.pages.dev               │
│                                                                  │
│  React 18 + TypeScript + Vite                                    │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐│
│  │  ClientContext│  │  RoleContext  │  │  TanStack React Query  ││
│  │  (multi-tenant│  │ (CEO/VP/COO) │  │  (cache + fetching)    ││
│  │   por client_id│ └──────────────┘  └────────────────────────┘│
│  └──────────────┘                                                │
│                                                                  │
│  Páginas: Overview · VickyInsights · Alertas · Equipos          │
│           Configuración · DocumentAnalysis · Login               │
└────────────────┬──────────────────────┬─────────────────────────┘
                 │                      │
                 ▼                      ▼
┌───────────────────────┐  ┌────────────────────────────────────┐
│   SUPABASE (Backend)  │  │   CLOUDFLARE WORKER (AI Proxy)     │
│                       │  │   wekall-vicky-proxy               │
│  PostgreSQL + pgvector│  │   .fabsaa98.workers.dev            │
│                       │  │                                    │
│  Tablas:              │  │  POST /chat  → GPT-4o              │
│  · cdr_daily_metrics  │  │  POST /transcribe → Whisper-1      │
│  · cdr_campaign_metrics│  │  POST /diarize → Mac Mini pyannote │
│  · cdr_hourly_metrics │  │  POST /ingest → Pipeline completo  │
│  · transcriptions     │  │  POST /rag-query → pgvector RAG    │
│  · agents_performance │  │  GET  /health                      │
│  · alert_log          │  │                                    │
│  · vicky_conversations│  │  [API Key OpenAI en CF Secrets]    │
│  · client_config      │  └────────────────┬───────────────────┘
│  · client_branding    │                   │
│  · app_users          │                   ▼
└───────────────────────┘  ┌────────────────────────────────────┐
                           │   MAC MINI (Diarización local)     │
                           │   pyannote puerto 8765             │
                           │   Cloudflare Tunnel → Worker       │
                           └────────────────────────────────────┘
```

---

## Funcionalidades Implementadas

### 📊 Overview (Dashboard Ejecutivo)
- Brief ejecutivo dinámico por rol (CEO / VP Ventas / VP CX / COO)
- KPIs en tiempo real desde Supabase: total llamadas, contactos efectivos, tasa de contacto %
- Sparklines de 7 y 30 días (llamadas + tasa de contacto)
- **Anomaly Detection:** banner proactivo cuando |hoy − media 30d| > 1.5 desviaciones estándar
- BSC (Balanced Scorecard) — 4 perspectivas CEO
- Motor EBITDA: impacto en nómina, AHT, escenarios A/B/C

### 🤖 Vicky Insights (IA Conversacional)
- Chat en lenguaje natural con GPT-4o via Cloudflare Worker
- Function Calling: LLM decide el análisis, TypeScript ejecuta el cálculo
- RAG: búsqueda en 50+ transcripciones reales via pgvector (cosine similarity)
- Input de voz: Whisper-1 via Worker → texto en chat (~$0.003/consulta)
- Decision Log: registro de decisiones con timestamp
- **Tab Historial:** últimas 20 conversaciones guardadas en Supabase, colapsables
- Multi-país: benchmarks Colombia / Perú / México
- Respuestas en prosa ejecutiva (post-procesamiento anti-markdown)

### 🚨 Alertas
- Evaluación automática de umbrales desde datos CDR Supabase
- Botón "Probar alerta" — disparo manual
- Historial de las últimas 10 alertas con severidad (critical / warning / info)
- Almacenamiento en tabla `alert_log` Supabase
- Soporte para notificación futura por webhook/wacli

### 👥 Equipos
- 22 agentes reales de Crediminuto × 30 días hábiles (660 registros en Supabase)
- Cálculo de promedios y tendencias (7d vs 30d) en tiempo real
- Indicador de tendencia: ↑ mejora / ↓ empeora / → estable (umbral ±3%)
- KPIs por agente: Tasa Contacto, Tasa Promesa, AHT, CSAT, FCR, Escalaciones
- Datos 100% desde `agents_performance` en Supabase (sin mock)

### 📄 Document Analysis
- Análisis inteligente de documentos con Vicky
- Soporte: Audio (MP3/WAV/M4A), PDF (hasta 20 páginas), Excel/CSV, Word (.docx), Imágenes
- Extracción en browser → GPT-4o via Worker → respuesta ejecutiva

### ⚙️ Configuración
- **Tab "Mi Empresa":** datos del cliente desde Supabase (`client_config` + `client_branding`)
- Hotwords, integraciones, configuración de alertas
- Pestaña de usuarios y roles (lectura)

### 🔐 Autenticación (Mock — V19)
- Login page: email + código de empresa → consulta `app_users` en Supabase
- AuthGuard: default `credismart` si no hay sesión (zero breaking changes)
- Roles: CEO, VP Ventas, VP CX, COO, admin
- Sesión persistida en localStorage

---

## Variables de Entorno

### Frontend (`.env.local` / `.env.production`)

```env
# URL del Cloudflare Worker proxy (requerido para Vicky/IA)
VITE_PROXY_URL=https://wekall-vicky-proxy.fabsaa98.workers.dev
```

### Cloudflare Worker (Secrets via `wrangler secret put`)

```
OPENAI_API_KEY      → API key de OpenAI (gpt-4o, whisper-1, embeddings)
SUPABASE_URL        → https://iszodrpublcnsyvtgjcg.supabase.co
SUPABASE_ANON_KEY   → sb_publishable_eRRG-... (anon key de Supabase)
DIARIZATION_URL     → URL del Cloudflare Tunnel al Mac Mini (auto-actualiza)
```

### Scripts Python (`scripts/`)

```bash
export SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6..."  # service_role key
```

> **Nota de seguridad:** El `SUPABASE_ANON_KEY` es público (frontend). El `SUPABASE_SERVICE_KEY` (service_role) solo se usa en scripts de backend con acceso elevado — nunca en el frontend.

---

## Setup Local

### Prerequisitos

- Node.js ≥ 18 (recomendado v22)
- npm o bun
- Acceso a Supabase: https://iszodrpublcnsyvtgjcg.supabase.co

### Instalación

```bash
# Clonar el repo
git clone <repo-url>
cd wekall-v9

# Instalar dependencias
npm install
# o con bun:
bun install

# Configurar variables de entorno
cp .env.local.example .env.local
# Editar .env.local con la URL del worker
```

### Correr en desarrollo

```bash
npm run dev
# Disponible en http://localhost:8080
```

### Build y preview

```bash
npm run build
npm run preview
```

### Tests

```bash
npm run test          # Vitest (unit tests)
npm run test:watch    # Modo watch
npx playwright test   # E2E tests
```

---

## Deploy a Producción

### Cloudflare Pages (automático via GitHub)

El deploy se dispara automáticamente con cada push a `main`.

```bash
git add .
git commit -m "feat: descripción del cambio"
git push origin main
# Cloudflare Pages detecta el push y hace deploy en ~2 min
```

**Configuración en Cloudflare Pages:**
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_PROXY_URL` = `https://wekall-vicky-proxy.fabsaa98.workers.dev`

### Deploy manual

```bash
npm run build
npx wrangler pages deploy dist --project-name wekall-intelligence
```

### Deploy del Cloudflare Worker

```bash
cd /Users/celeru/.openclaw/workspace/wekall-proxy
wrangler deploy
# Para actualizar secrets:
wrangler secret put OPENAI_API_KEY
```

---

## Estructura de Carpetas `src/`

```
src/
├── App.tsx                    # Router principal + AuthGuard + Providers
├── main.tsx                   # Entry point React
├── index.css                  # Estilos globales (Tailwind base)
├── App.css                    # Estilos específicos del app
│
├── pages/                     # Vistas principales (una por ruta)
│   ├── Overview.tsx           # Dashboard ejecutivo con KPIs y anomaly detection
│   ├── VickyInsights.tsx      # Chat IA + historial de conversaciones
│   ├── Alertas.tsx            # Sistema de alertas con historial Supabase
│   ├── Equipos.tsx            # Performance de agentes (datos reales Supabase)
│   ├── Configuracion.tsx      # Settings: empresa, hotwords, integraciones
│   ├── DocumentAnalysis.tsx   # Análisis de documentos con GPT-4o Vision
│   ├── Login.tsx              # Auth mock: email + company_code → app_users
│   └── NotFound.tsx           # Fallback 404
│
├── contexts/
│   ├── ClientContext.tsx      # Estado global del cliente activo (multi-tenant)
│   └── RoleContext.tsx        # Estado del rol activo (CEO/VP/COO/admin)
│
├── hooks/                     # Custom hooks con lógica de negocio
│   ├── useCDRData.ts          # KPIs principales desde cdr_daily_metrics
│   ├── useAgentsData.ts       # Performance de agentes desde agents_performance
│   ├── useAlerts.ts           # Gestión de alertas y evaluación de umbrales
│   ├── useAuditLogs.ts        # Historial de auditoría
│   ├── useChat.ts             # Lógica del chat con Vicky (Worker + streaming)
│   ├── useDashboard.ts        # Agregaciones para el dashboard
│   ├── useHotwords.ts         # Hotwords configurables
│   ├── useIntegrations.ts     # Estado de integraciones externas
│   └── useTranscriptions.ts   # Consulta de transcripciones
│
├── lib/
│   ├── supabase.ts            # Cliente Supabase + tipos + queries helper
│   ├── api.ts                 # Cliente HTTP para el Cloudflare Worker
│   ├── utils.ts               # Utilidades generales (cn, formatters)
│   └── vickyCalculations.ts   # Motor de cálculos EBITDA/KPI (Function Calling)
│
├── data/
│   ├── mockData.ts            # Datos de referencia y funciones de contexto CDR
│   └── benchmarks.ts          # Benchmarks multi-industria (8 verticales)
│
├── components/
│   ├── AppSidebar.tsx         # Navegación lateral con info del cliente
│   ├── KPICard.tsx            # Card de KPI con sparkline y delta
│   ├── KPICardCompact.tsx     # Versión compacta del KPICard
│   ├── ChatMessageBubble.tsx  # Burbuja de mensaje en el chat
│   ├── SearchBar.tsx          # Barra de búsqueda global
│   ├── SentimentBadge.tsx     # Badge de sentimiento (positivo/neutral/negativo)
│   ├── TranscriptBubble.tsx   # Vista de fragmento de transcripción
│   └── ui/                    # Componentes shadcn/ui (Radix primitivos)
│
├── layouts/
│   └── AppLayout.tsx          # Layout principal con sidebar y topbar
│
└── types/
    └── index.ts               # Tipos TypeScript compartidos
```

---

## Supabase: Tablas y Schema

### Proyecto
- **URL:** https://iszodrpublcnsyvtgjcg.supabase.co
- **Región:** São Paulo (latencia óptima para LATAM)
- **Plan:** Free tier (funcional para el volumen actual)

### Tablas principales

| Tabla | Propósito | Registros aprox. |
|-------|-----------|-----------------|
| `cdr_daily_metrics` | KPIs diarios agregados por operación | ~822 días × clientes |
| `cdr_campaign_metrics` | KPIs diarios por campaña | ~4 campañas × días |
| `cdr_hourly_metrics` | Distribución horaria de llamadas | ~24 horas × días |
| `transcriptions` | Transcripciones + embeddings pgvector | 50+ (piloto) |
| `agents_performance` | Performance diaria por agente | 660 registros (22×30) |
| `alert_log` | Historial de alertas disparadas | creciente |
| `vicky_conversations` | Q&A guardadas con Vicky | creciente |
| `client_config` | Configuración por cliente (multi-tenant) | 1 por cliente |
| `client_branding` | Branding por cliente (logo, colores) | 1 por cliente |
| `app_users` | Usuarios por empresa con roles | N por cliente |

### Hacer migraciones

Las migraciones se ejecutan manualmente en el **Supabase SQL Editor**:

1. Abrir https://supabase.com/dashboard/project/iszodrpublcnsyvtgjcg
2. Ir a **SQL Editor** en el menú izquierdo
3. Pegar el contenido del script SQL correspondiente
4. Clic en **Run**

Scripts disponibles en `scripts/`:
- `create_agents_table.sql` — crea tablas V18 (agents_performance, alert_log, vicky_conversations)
- `migrate_multitenant.sql` — migración V19 (client_id, app_users, client_branding)

---

## Multi-Tenant: Onboarding de Nuevo Cliente

### Método rápido (recomendado)

```bash
export SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6..."

python3 scripts/onboard_client.py \
  --client-id empresa_xyz \
  --client-name "Empresa XYZ" \
  --industry "Contact Center" \
  --country "Colombia" \
  --email ceo@empresa.com \
  --name "Nombre CEO" \
  --role CEO
```

El script crea en un solo comando:
1. Registro en `client_config`
2. Registro en `client_branding`
3. Usuario inicial en `app_users`

### Cómo funciona el aislamiento

Cada tabla tiene columna `client_id TEXT`. Todas las queries del frontend incluyen `.eq('client_id', clientId)` donde `clientId` viene del `ClientContext` (persistido en localStorage).

**Estado actual:** Las RLS policies permiten lectura a `anon` sin restricción por `client_id` — el filtrado es a nivel de aplicación. La restricción real por `client_id` en RLS es parte del **Roadmap V20**.

---

## Cloudflare Worker: Rutas Disponibles

**Worker URL:** `https://wekall-vicky-proxy.fabsaa98.workers.dev`

| Ruta | Método | Descripción | Costo estimado |
|------|--------|-------------|----------------|
| `/health` | GET | Health check | Gratis |
| `/chat` o `/` | POST | Chat GPT-4o / GPT-4o-mini | ~$0.005–0.015/consulta |
| `/transcribe` | POST | Whisper-1 STT (FormData con audio) | $0.006/min (~$0.003/consulta 30s) |
| `/diarize` | POST | Diarización pyannote via Mac Mini | Gratis (local) |
| `/rag-query` | POST | RAG: embedding + pgvector + GPT-4o | ~$0.01/consulta |
| `/ingest` | POST | Pipeline: audio URL → Whisper → GPT → embed → Supabase | ~$0.02/llamada |

Ver documentación completa en [`docs/cloudflare-worker.md`](docs/cloudflare-worker.md).

---

## Roadmap (Qué Falta)

### V20 — Auth Real (Prioridad Alta)
- [ ] Migrar de mock auth a **Supabase Auth v2** (email/password)
- [ ] RLS policies reales: `client_id = auth.jwt() ->> 'client_id'`
- [ ] Refresh tokens automáticos
- [ ] Recuperación de contraseña por email

### V21 — Pipeline CDR Automático
- [ ] Script de carga CDR → Supabase (scheduled, cron diario)
- [ ] Procesamiento del CSV de WeKall → `cdr_daily_metrics`
- [ ] Validación de datos y alertas de ingestión

### V22 — Notificaciones Proactivas
- [ ] Webhook de alertas → WhatsApp via wacli
- [ ] Alertas programadas (diarias/semanales) con resumen ejecutivo
- [ ] Integración con email (Microsoft Graph API)

### V23 — Expansión Multi-Cliente
- [ ] Dashboard de administración para gestionar clientes
- [ ] Onboarding self-service
- [ ] Billing básico por cliente

### Deuda Técnica
- [ ] Tests unitarios (cobertura actual: mínima)
- [ ] RLS real por client_id en Supabase
- [ ] Error boundaries en páginas
- [ ] Loading skeletons consistentes
- [ ] Refactorizar mockData.ts (mezcla datos reales con mock)

---

## Arquitectura de Decisiones Clave

| Decisión | Por qué |
|----------|---------|
| Supabase sobre Firebase | pgvector nativo para RAG, SQL estándar, región LATAM |
| Cloudflare Worker como proxy | API key de OpenAI nunca expuesta en frontend |
| Function Calling para cálculos | LLM interpreta, TypeScript calcula — resultados deterministas |
| multi-tenant por `client_id` en app | Más simple que múltiples proyectos Supabase; un solo deploy |
| Mock auth (V19) | Cero breaking changes; auth real llega en V20 |
| Mac Mini para diarización | CF Workers tiene límite 128MB RAM; pyannote necesita 2-4GB |

---

## Datos de Conexión

```typescript
// supabase.ts
const SUPABASE_URL = 'https://iszodrpublcnsyvtgjcg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_eRRG-QSyURpWV-FstJUc4g_M-xmD6v_';
```

> Ver documentación detallada:
> - [`docs/supabase-schema.md`](docs/supabase-schema.md) — Schema completo tabla por tabla
> - [`docs/multi-tenant.md`](docs/multi-tenant.md) — Arquitectura multi-tenant
> - [`docs/cloudflare-worker.md`](docs/cloudflare-worker.md) — Worker rutas y deploy
> - [`scripts/README.md`](scripts/README.md) — Scripts de base de datos y onboarding
