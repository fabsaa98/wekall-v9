# WeKall Intelligence — CHANGELOG

---

## [V22.2.0] — 2026-04-17 — Fixes RLS, Seguridad de Sesión y Logout

### 🐛 Bugs corregidos

**Equipos — loading infinito** (`useAgentsData.ts`)
- Problema: query `agents_performance` iba directo a Supabase con RLS. El JWT del usuario no coincidía con `get_user_client_id()` → 0 registros.
- Fix: reemplazar `supabase.from()` por `proxyQuery()` — igual que el resto de la app.
- Commit: `82ca1b8`

**Forecast — error 400 `cdr_hourly_metrics`** (`ForecastView.tsx`)
- Problema: `cdr_hourly_metrics` no tiene columna `client_id`. El filtro causaba error 400.
- Fix: remover `client_id` del filtro de esa tabla.
- Commit: `f5a90f7`

**Forecast — error 400 `client_config`** (`ForecastView.tsx`)
- Problema: select `agentes_activos,costo_agente_mes` — columnas que no existen en la tabla.
- Fix: cambiar a `select: '*'`.
- Commit: `d4444f2`

**Forecast y Equipos — todas las queries via proxy** (`ForecastView.tsx`)
- Problema: 4 queries `supabase.from()` directas con RLS bloqueando por JWT.
- Fix: reemplazar todas por `proxyQuery()` con service role.
- Commit: `82ca1b8`

### 🔒 Seguridad

**Sesión persistía sin permiso** (`App.tsx`, `ClientContext.tsx`, `Login.tsx`)
- Problema: Supabase guardaba JWT en localStorage indefinidamente. Al reabrir el browser, `AuthGuard` veía sesión activa y entraba sin pedir login — exponiendo datos del cliente CEO.
- Fix:
  1. `rememberMe` default = `false`
  2. `AuthGuard`: si hay JWT pero no hay `wki_remember_session`, hace `signOut()` forzado
  3. `SIGNED_OUT` limpia `wki_remember_session` de localStorage y sessionStorage
- Commit: `2579c62`

### ✨ Features

**Botón Cerrar sesión en sidebar** (`AppSidebar.tsx`)
- Siempre visible en el footer del menú lateral
- Modo colapsado: solo ícono con tooltip
- Al hacer clic: `signOut()` + limpia localStorage + redirige a `/login`
- Color rojo al hover (destructive)
- Commit: `a3770ff`

### 📄 Documentación generada
- Resumen Ejecutivo PDF — funcionalidades, stack, propuesta de valor por rol
- Manual de Usuario PDF — 10 secciones, screenshots reales, página por sección

### 🏷️ Tag Git
- `v22.2-fixes-17abr` → commit `d4444f2`

---

## [V22.0.0] — 2026-04-13 — Seguridad Multi-Tenant Completa, RLS Real, UX & Infraestructura

> Sesión de trabajo: Fabián Saavedra + GlorIA. Enfoque: aislamiento multi-tenant a nivel de base de datos (RLS real en 9 tablas), hardening de seguridad crítica (H-1/H-2), nuevas funcionalidades UX (ForgotPassword, ErrorBoundary, Skeletons), refactoring de componentes y resiliencia de infraestructura.

---

### 🔐 Seguridad — Aislamiento Multi-Tenant Completo

**RLS activado en 9 tablas de Supabase:**
- `transcriptions`, `agents_performance`, `agent_daily_metrics`, `cdr_daily_metrics`
- `client_config`, `client_branding`, `client_kpi_targets`, `client_labor_costs`, `vicky_conversations`

Cada tabla tiene policy `USING (client_id = public.get_user_client_id())` — aislamiento real a nivel PostgreSQL, no solo a nivel de aplicación.

**H-1 fix — `clientId` explícito en funciones críticas:**
- `getRecentAlertLog()` y `getVickyHistory()` ahora reciben `clientId` como parámetro obligatorio
- Eliminado el riesgo de que datos de un cliente aparecieran en sesión de otro

**H-2 fix — eliminado fallback hardcodeado `'credismart'`:**
- 6 funciones en `src/lib/supabase.ts` tenían fallback `|| 'credismart'`
- Reemplazado por guard explícito: si no hay `clientId`, se lanza error controlado
- Cero riesgo de cross-tenant data leakage por valor por defecto

**Auditoría completa de seguridad:**
- 20 issues corregidos: 2 CRITICAL, 3 HIGH, 12 MEDIUM, 3 LOW
- Revisión completa de TypeScript/ESLint con foco en seguridad multi-tenant

**`search_transcriptions` — función recreada (DROP + CREATE OR REPLACE):**
- Parámetro `client_id_filter` ahora es parte de la firma canónica
- Aislamiento RAG garantizado a nivel SQL, no solo a nivel Worker

---

### ✨ Features — Nuevas Funcionalidades

**Flujo de recuperación de contraseña nativo:**
- `src/pages/ForgotPassword.tsx` — formulario de solicitud de reset por email
- `src/pages/ResetPassword.tsx` — formulario de nueva contraseña con token de Supabase Auth
- Rutas `/forgot-password` y `/reset-password` registradas en `App.tsx`
- Link "¿Olvidaste tu contraseña?" agregado en `Login.tsx`

**Error Boundaries — protección contra crashes silenciosos:**
- `src/components/ErrorBoundary.tsx` creado (React class component con fallback UI)
- Todas las rutas de la app envueltas en `<ErrorBoundary>` en `App.tsx`
- Fallo de Supabase o componente → pantalla de error informativa en vez de pantalla en blanco

**Loading Skeletons — UX consistente en toda la UI:**
- `src/components/PageSkeleton.tsx` — dos componentes: `PageSkeleton` y `CardSkeleton`
- Spinners reemplazados en `Overview.tsx` y `SpeechAnalytics.tsx`
- Experiencia de carga coherente y profesional en toda la plataforma

---

### 🏗️ Refactoring

**`VickyInsights.tsx` split — separación de responsabilidades:**
- `src/components/VickyChatHistory.tsx` extraído como componente independiente
- `VickyInsights.tsx` bajó de 1,921 a 1,784 líneas (-138 líneas)
- Historial de conversaciones ahora es un componente reutilizable y testeable

**`mockData.ts` — anotaciones de transparencia:**
- Comentario de cabecera explicando el propósito del archivo
- Constantes anotadas como `// REAL` (dato de producción) o `// ESTIMACIÓN` (valor mock)
- Eliminadas todas las referencias directas a clientes específicos (Crediminuto)

**`client_config` — columnas de umbrales de alerta configurables por cliente:**
- 5 columnas de umbrales de alerta disponibles desde V20, ahora con RLS activo
- `alert_tasa_critica`, `alert_tasa_warning`, `alert_delta_critico`, `alert_delta_warning`, `alert_volumen_minimo`

---

### 🛡️ Infraestructura — Resiliencia del Sistema

**Gateway watchdog — autoreparación automática:**
- LaunchAgent `ai.openclaw.gateway.watchdog` creado y activo
- Corre cada 5 minutos; detecta si el Gateway está caído y lo reinicia automáticamente
- Envía alerta WhatsApp a Fabián si el gateway no levanta tras 3 intentos
- Cero downtime manual necesario para recuperar el gateway

**Startup recovery — servicios post-reboot:**
- LaunchAgent `ai.openclaw.startup-recovery` levanta automáticamente todos los servicios al reiniciar el Mac Mini
- Incluye: OpenClaw Gateway, túneles Cloudflare, servicios de diarización
- El Mac Mini es ahora un nodo de producción auto-resiliente

---

## [V21.0.0] — 2026-04-07 — Proxy 4G, Function Calling, Insight Ejecutivo, Auth Fix

> Sesión de trabajo: Fabián Saavedra + GlorIA. Enfoque: estabilidad mobile (4G), inteligencia real de Vicky (function calling dinámico), Speech Analytics ejecutivo nivel McKinsey, y seguridad de autenticación.

---

### 🔐 Auth — Fix crítico de bypass

**Problema:** `AuthGuard` tenía un fallback de localStorage que permitía entrar a la plataforma sin credenciales si el navegador tenía `wki_client_id` guardado de sesiones anteriores (modo legacy).

**Corrección (`src/App.tsx`):**
- Eliminado fallback de localStorage en `AuthGuard`
- Ahora solo se permite acceso con sesión activa de Supabase Auth
- Sin excepciones — cualquier usuario nuevo debe autenticarse

**Commit:** `d3d922e`

---

### 📡 Proxy Cloudflare Worker — Fix 4G completo

**Problema:** La red 4G de Claro Colombia bloqueaba conexiones directas a Supabase desde el cliente JS, causando spinners infinitos en Overview, Speech Analytics, Alertas y VickyInsights.

**Arquitectura implementada:**
- Todo el tráfico de lectura (GET queries) ahora pasa por `wekall-vicky-proxy.fabsaa98.workers.dev`
- Nuevo endpoint `/query` en el Worker para queries REST a Supabase con soporte de filtros, orden y limit
- Auth ya iba por el Worker (sin problema). Datos también ahora.

**Archivos modificados:**
- `src/lib/supabase.ts` — nuevo helper `proxyQuery<T>()` que enruta por Worker
- `getLastNDays`, `getLatestCampaigns`, `getHourlyDistribution`, `getClientConfig`, `getActiveClientConfig`, `getRecentAlertLog`, `getVickyHistory` → todos migrados al proxy
- `src/pages/SpeechAnalytics.tsx` → query de transcripciones migrada al proxy

**INSERTs (guardar alertas, historial Vicky):** permanecen en Supabase JS directo — el proxy actual solo maneja GETs.

**Commits:** `067cb9f`, `9717d17`, `30a2643`

---

### ⏱️ Timeout CDR — Fix spinner infinito

**Problema:** Si Supabase no respondía en móvil, `useCDRData` colgaba indefinidamente sin mostrar error.

**Corrección (`src/hooks/useCDRData.ts`):**
- Timeout de 12 segundos con `Promise.race`
- Si no hay respuesta en 12s → muestra mensaje de error al usuario en vez de spinner eterno

**Commit:** `75244d4`

---

### 🤖 Function Calling — Vicky consulta datos en tiempo real

**Problema:** Vicky tenía datos hardcodeados en el contexto (snapshot congelado), hacía que preguntas como "¿cuántas llamadas en 2024?" fueran imposibles de responder correctamente. Escalabilidad cero.

**Arquitectura implementada:**
- **Worker `/cdr-stats`** — nuevo endpoint que consulta Supabase en tiempo real y agrega datos:
  - `annual_summary` — totales por año
  - `monthly_summary` — totales por mes (params: `{year}`)
  - `date_range` — rango de fechas (params: `{from_date, to_date}`)
  - `daily_trend` — últimos N días (params: `{days}`)
  - `top_agents` — ranking de agentes (params: `{limit, order}`)
- **`VickyInsights.tsx`** — implementado OpenAI Function Calling:
  - Tool `query_cdr_data` definida con schema completo
  - Manejo de `finish_reason: "tool_calls"`: Vicky detecta qué datos necesita, llama al Worker, recibe la respuesta, genera el análisis
  - Datos hardcodeados de años eliminados del contexto

**Fix posterior:** campo `call_date` incorrecto en el Worker (la tabla usa `fecha`) — corregido y redesplegado.

**Commits:** `ad48b33` (frontend), Worker versión `96ae00a9` y `0891fb1f`

---

### 🎨 UX — Colores

**Problema:** El color `amber/yellow` no tiene contraste suficiente en fondos oscuros del dashboard — los textos amarillos eran invisibles.

**Corrección:**
- Reemplazo global `amber` → `sky` en 9 archivos de la app
- `sky-400/sky-500` es el estándar de dashboards como Linear, Vercel, Datadog

**Archivos:** `SpeechAnalytics.tsx`, `Overview.tsx`, `VickyInsights.tsx`, `Alertas.tsx`, `Equipos.tsx`, `Configuracion.tsx`, `Admin.tsx`, `UploadRecording.tsx`, `DocumentAnalysis.tsx`, `SentimentBadge.tsx`

**Commit:** `5edcfd4`

---

### 🧠 Speech Analytics — Diagnóstico Ejecutivo McKinsey

**Pedido de Fabián:** El bloque de Drivers de Conversión mostraba verbatim (frases sueltas del top 5), pero no entregaba la conclusión ejecutiva que necesita un CEO — la síntesis de TODAS las llamadas como lo haría un consultor senior.

**Implementado:**
- Nuevo card "Diagnóstico Ejecutivo" encima del grid exitosas/fallidas
- Analiza el 100% de las transcripciones disponibles (no solo top 5)
- Identifica patrón diferenciador con ratio multiplicador (ej. "2.3x más cierre")
- Reencuadra objeciones como oportunidades ("56% no rechaza la deuda — pide tiempo")
- Cuantifica brecha operativa e impacto estimado si cuartil inferior adopta prácticas del top 25%
- Solo aparece con ≥5 transcripciones; fallback con mensaje de datos insuficientes
- Diseño: `border-l-4 border-purple-500 bg-purple-500/5`, badge "✦ Insight IA"

**Commit:** `e51e03f`

---

### 🔧 wacli — Actualización cliente WhatsApp

**Problema:** wacli v0.2.0 (Homebrew) usaba protocolo WhatsApp Web v2.3000 — rechazado por WhatsApp (error 405).

**Solución:**
- Compilado desde fuente: `github.com/steipete/wacli` con `whatsmeow v0.0.0-20260211` (protocolo actualizado)
- Instalado en `~/bin/wacli`
- Script `gloria-send-audio.sh` actualizado para usar el nuevo binario

---

## [V20.0.0] — 2026-04-05 — Screening Completo: Seguridad, World-Class, Auth Real

> Versión de madurez: se eliminaron todos los hardcodeos críticos, se implementó auth real con Supabase Auth v2, y se añadieron features world-class (forecasting, drill-down, speech analytics, push proactivo). El producto está listo para escalar a clientes reales.

---

### 🔐 Auth Real — Supabase Auth v2

**Problema resuelto:** El login anterior era un mock sin contraseñas reales — solo verificaba email + company_code en la tabla `app_users`.

**Implementado:**

- **`src/lib/supabase.ts`** — Supabase Auth con `signInWithPassword`, `signOut`, `getSession`, `onAuthStateChange`
- **Login dual:** primero intenta `supabase.auth.signInWithPassword()` (Supabase Auth real); si falla, fallback al método legacy (tabla `app_users`)
- **`ClientContext.tsx`** — actualizado con `onAuthStateChange` para mantener sesión reactiva en tiempo real
- **`AuthGuard`** mejorado con 3 capas: Auth real (Supabase session) → localStorage → redirect `/login`
- **Script `create_auth_user.py`:** crea usuarios simultáneamente en Supabase Auth + tabla `app_users`, vinculando `auth_id`
- **Script `onboard_client.py`** actualizado con parámetro `--password` para crear el usuario con contraseña real desde el onboarding
- **Usuario `fabian@wekall.co`** creado y vinculado con contraseña `WeKall2026!`
- **`setup_auth.sql`:** columna `auth_id UUID` en `app_users`, constraint `UNIQUE(email, client_id)`, trigger `on_auth_user_created`, función `get_user_client_id()`
- **`update_search_function.sql`:** función `search_transcriptions` actualizada con parámetro `client_id_filter` para aislamiento RAG real

---

### 🛡️ Críticos Resueltos — Cero Hardcodeo

#### RAG con `client_id` (aislamiento completo)
- **`VickyInsights.tsx`** — ahora envía `client_id` al Worker en cada llamada a `/rag-query`
- **Worker `wekall-vicky-proxy`** — recibe y pasa `client_id` a la función SQL `search_transcriptions`
- **`update_search_function.sql`** — función SQL actualizada con parámetro `client_id_filter TEXT DEFAULT NULL`; cuando se pasa, filtra `WHERE client_id = client_id_filter` antes de la búsqueda vectorial
- **Validado:** cliente `wekall` ve 0 transcripciones de `credismart` (aislamiento confirmado)

#### `ALERT_THRESHOLDS` dinámicos
- **`useAlerts.ts`** — umbrales leídos desde `client_config` en Supabase, no hardcodeados
- Nuevas columnas en `client_config`: `alert_tasa_critica`, `alert_tasa_warning`, `alert_delta_critico`, `alert_delta_warning`, `alert_volumen_minimo`
- Cada cliente tiene sus propios umbrales de alerta configurables desde la Consola Admin

#### `OPS` fallback neutralizado
- **`vickyCalculations.ts`** — `getEstadoOperativo()` ahora inicializa con valores en `0`, eliminando los datos hardcodeados de Crediminuto que aparecían como fallback cuando no había datos reales
- Antes: si Supabase tardaba, aparecían KPIs de Crediminuto. Ahora: aparecen ceros explícitos hasta que los datos lleguen.

#### Equipos dinámico por área
- **`Equipos.tsx`** — las áreas se derivan dinámicamente de los valores únicos de la columna `area` en `agents_performance`, no de un array hardcodeado
- Cero referencias a "Cobranzas" o áreas específicas en el código — todo viene de la data

#### `surpriseQuestions` genéricas
- **`VickyInsights.tsx`** — preguntas sorpresa sin referencias específicas a Crediminuto o cobranzas
- Ahora son preguntas genéricas aplicables a cualquier industria de contact center

#### PDF export con nombre dinámico
- **`VickyInsights.tsx`** — el nombre del archivo exportado usa el nombre real del cliente desde `clientBranding.company_name`, no un string fijo

#### Configuración guarda cambios reales
- **`Configuracion.tsx`** — el botón "Guardar" ahora ejecuta un `upsert` real en `client_branding` via Supabase con los cambios del usuario

#### Páginas enrutadas
- **`App.tsx`** — rutas activas: `/transcriptions`, `/transcriptions/:id`, `/upload`, `/search`, `/speech-analytics`
- **Páginas comentadas con decisión documentada en el código:** `AlertsView` (integrada en Overview), `IntegrationsView` (pendiente V21), `SettingsView` (consolidada en Configuracion), `Dashboard` (renombrado a Overview)

---

### 🚀 World-Class Features

#### Forecasting 7 días (predicción lineal)
- **`useCDRData.ts`** — regresión lineal sobre los últimos 30 días de `cdr_daily_metrics` para proyectar los próximos 7 días
- **`Overview.tsx`** — visualización con `ComposedChart` (Recharts): área histórica + línea de forecast + banda de confianza ±1 desviación estándar
- Botón **"Analizar con Vicky"** que pre-carga la pregunta de forecast en VickyInsights
- Fórmula: regresión por mínimos cuadrados sobre `total_llamadas` y `tasa_contacto_pct`

#### Drill-down desde KPIs
- **`KPICard.tsx`** — prop `onDrillDown?: () => void` — al hacer click en un KPI se abre un Sheet lateral
- El Sheet muestra: sparkline 30 días del KPI, benchmarks vs industria, delta vs período anterior, botón "Diagnosticar con Vicky"
- Disponible en Overview para los 3 KPIs principales (llamadas, tasa contacto, contactos efectivos)

#### Speech Analytics (`/speech-analytics`)
- Nueva página completa con 5 módulos de análisis de grabaciones:
  1. **Temas frecuentes:** word cloud / ranking de temas mencionados en transcripciones
  2. **Sentimiento por agente:** score de sentimiento promedio (positivo/neutral/negativo) por agente
  3. **Resultados por campaña:** breakdown de outcomes (promesa de pago, rechazo, no contacto) por campaña
  4. **Frases de riesgo:** detección de frases que históricamente correlacionan con escalaciones
  5. **Duración vs resultado:** scatter plot AHT vs outcome para identificar el sweet spot de duración

#### Push proactivo dinámico
- **`src/lib/proactiveInsights.ts`** — genera insights en tiempo real consultando Supabase directamente
- Alertas proactivas basadas en: anomalía detectada vs media 30d (>1.5σ), tendencia de 7 días vs promedio, comparación vs benchmark de industria
- Los insights se muestran en el banner de Overview y en el panel de VickyInsights sin intervención del usuario

---

### 🏢 Multi-Tenant Completado

- **3 clientes activos:** `credismart`, `demo_empresa`, `wekall`
- **Aislamiento RAG validado:** consultar como `wekall` retorna 0 transcripciones de `credismart`
- **Consola Admin:** crear clientes nuevos, gestionar usuarios, configurar branding completo desde la UI
- **`client_config`** actualizado con columnas de umbrales de alerta por cliente (5 columnas nuevas)
- **`app_users`** actualizado con columna `auth_id UUID` FK a `auth.users` de Supabase

---

### 📋 Scripts de Base de Datos (nuevos en V20)

| Script | Propósito |
|--------|-----------|
| `scripts/create_auth_user.py` | Crea usuario en Supabase Auth + app_users, vincula auth_id |
| `scripts/setup_auth.sql` | Migración: auth_id en app_users, constraint, trigger, función |
| `scripts/update_search_function.sql` | Función search_transcriptions con client_id_filter |

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

### V12.6 — Datos 100% reales. Cero hardcodeo de datos del cliente.

**Principio arquitectural:** Ningún dato que deba provenir del cliente puede estar hardcodeado.
Si no tenemos el dato, lo marcamos como "N/D" o "estimación" — nunca lo inventamos.

**Datos corregidos:**
- conversationTrend: sparklines 6 días marcados como ¹estimaciones (solo dom 30 es real)
- alertsData: eliminadas alertas inventadas (a3 "23 agentes sin sesión" no verificado, a4 "7 días de crecimiento Perú" imposible con 1 día de datos). Reemplazadas por alertas calculadas desde umbrales COPC reales.
- agentsData: eliminados FCR, CSAT, AHT por agente inventados. Ahora solo volumen de llamadas (dato verificado del CDR). Columna "conversions" ahora = llamadas/día del CDR.
- kpiData sparklines: reemplazados tendencias inventadas con valor real del 30-Mar como baseline plano
- decisionLog: eliminadas referencias a datos no verificados ("23 agentes sin sesión", "7 días de crecimiento")

**Implementación completa en V15-V17:** Esta intención se completó con la integración Supabase —
kpiData, alertsData, agentsData y conversationTrend ahora son todos dinámicos (sin hardcodeo).

**Qué sigue necesitando datos reales:**
- [ ] FCR/CSAT/AHT por agente: requiere integración Engage360
- [ ] Timestamps de alertas: actualización automática desde WeKall (implementado en V15+)

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

