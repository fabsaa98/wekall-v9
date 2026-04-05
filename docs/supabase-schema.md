# WeKall Intelligence — Arquitectura Supabase

**Proyecto:** iszodrpublcnsyvtgjcg  
**URL:** https://iszodrpublcnsyvtgjcg.supabase.co  
**Región:** São Paulo (sa-east-1) — latencia óptima para LATAM  
**Plan:** Free tier  
**Extensiones activas:** `pgvector` (embeddings semánticos para RAG)

---

## Conexión

### Cuándo usar Anon Key vs Service Key

| Escenario | Key a usar | Por qué |
|-----------|-----------|---------|
| Frontend (React) | **Anon Key** | Clave pública, se puede exponer en el bundle |
| Scripts de seed y onboarding | **Service Key** | Bypasea RLS — acceso total a la base de datos |
| Cloudflare Worker | **Anon Key** | Opera bajo las RLS policies configuradas |
| Administración directa / migraciones | **Service Key** | Necesita escribir en tablas con RLS restrictiva |

```typescript
// Frontend (src/lib/supabase.ts)
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://iszodrpublcnsyvtgjcg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_eRRG-QSyURpWV-FstJUc4g_M-xmD6v_';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

```python
# Scripts Python (usar service_role key para bypass RLS)
import os
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")
headers = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
}
```

---

## Tablas

### `client_config`
**Propósito:** Configuración maestra de cada cliente (empresa). Es la tabla pivot del multi-tenant — todas las demás tablas referencian `client_id` de aquí.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `client_id` | `text` PK | Identificador único del cliente (ej: `credismart`) |
| `client_name` | `text` NOT NULL | Nombre visible (ej: `CrediSmart / Crediminuto`) |
| `industry` | `text` | Industria (ej: `Cobranzas`, `Contact Center`) |
| `country` | `text` | País (ej: `Colombia`, `Peru`) |
| `currency` | `text` | Moneda ISO (ej: `COP`, `PEN`, `MXN`) |
| `timezone` | `text` | Zona horaria (ej: `America/Bogota`) |
| `active` | `boolean` | Si el cliente está activo |
| `costo_agente_mes` | `numeric` | Costo empresa/agente/mes en moneda local |
| `agentes_activos` | `integer` | Headcount actual de agentes |
| `nomina_total_mes` | `numeric` | Nómina total = costo × agentes |
| `trm_cop` | `numeric` | TRM si la moneda no es COP |
| `notas` | `text` | Notas libres del cliente |
| `created_at` | `timestamptz` | Fecha de creación |
| `updated_at` | `timestamptz` | Última actualización |

**RLS:** Lectura pública para `anon` y `authenticated`.

---

### `client_branding`
**Propósito:** Personalización visual por cliente — colores, logo, tagline mostrados en la UI.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `client_id` | `text` PK FK→`client_config` | ID del cliente |
| `logo_url` | `text` | URL del logo (CDN o Supabase Storage) |
| `primary_color` | `text` | Color primario hex (ej: `#6334C0`) |
| `company_name` | `text` | Nombre mostrado en UI (puede diferir de `client_name`) |
| `tagline` | `text` | Tagline corto mostrado en sidebar |
| `updated_at` | `timestamptz` | Última actualización del branding |

**RLS:** Lectura pública para `anon` y `authenticated`.

**Dato inicial:**
```sql
INSERT INTO public.client_branding (client_id, company_name, tagline)
VALUES ('credismart', 'CrediSmart / Crediminuto', 'Cobranzas Crediminuto Colombia');
```

---

### `app_users`
**Propósito:** Usuarios de la plataforma por empresa. Usada para el login mock (V19) — un usuario pertenece a un solo cliente.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | `uuid` PK | UUID autogenerado |
| `email` | `text` UNIQUE | Email del usuario (clave de login) |
| `client_id` | `text` NOT NULL FK→`client_config` | A qué empresa pertenece |
| `role` | `text` | Rol: `CEO`, `VP Ventas`, `VP CX`, `COO`, `admin` |
| `name` | `text` | Nombre completo |
| `active` | `boolean` | Si el usuario está activo |
| `created_at` | `timestamptz` | Fecha de alta |
| `last_login` | `timestamptz` | Último inicio de sesión (actualizado en cada login) |

**Constraint:** `CHECK (role IN ('CEO', 'VP Ventas', 'VP CX', 'COO', 'admin'))`

**Índices:**
- `idx_app_users_client_id` — queries por empresa
- `idx_app_users_email` — lookup rápido en login

**RLS:** Lectura pública para `anon` y `authenticated`. (Auth real en V20 restringirá esto.)

**Cómo hace login el frontend:**
```typescript
const { data } = await supabase
  .from('app_users')
  .select('id, email, client_id, role, name, active')
  .eq('email', email)
  .eq('client_id', companyCode)
  .eq('active', true)
  .maybeSingle();
```

---

### `cdr_daily_metrics`
**Propósito:** KPIs diarios agregados de la operación completa. Es la fuente principal del Overview y los cálculos de Vicky.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | `bigserial` PK | — |
| `fecha` | `date` NOT NULL | Fecha del día operativo |
| `client_id` | `text` | ID del cliente (multi-tenant, DEFAULT `credismart`) |
| `total_llamadas` | `integer` | Total de intentos de llamada del día |
| `contactos_efectivos` | `integer` | Llamadas donde hubo contacto real con el cliente |
| `tasa_contacto_pct` | `numeric(5,2)` | `contactos / total * 100` |
| — | — | (otras columnas de AHT, duraciones, campañas, etc.) |

**Índices:**
- `idx_cdr_daily_metrics_client_id` — filtro por cliente
- `idx_cdr_daily_metrics_client_fecha` — queries principales `(client_id, fecha DESC)`

**Query típica del frontend:**
```typescript
const { data } = await supabase
  .from('cdr_daily_metrics')
  .select('fecha, total_llamadas, contactos_efectivos, tasa_contacto_pct')
  .eq('client_id', clientId)
  .gte('total_llamadas', 5000)  // solo días hábiles
  .order('fecha', { ascending: false })
  .limit(30);
```

---

### `cdr_campaign_metrics`
**Propósito:** KPIs diarios desglosados por campaña. Alimenta el breakdown por campaña en Overview.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `fecha` | `date` | Fecha |
| `campaign_id` | `text` | Identificador de campaña |
| `total_llamadas` | `integer` | Llamadas en esa campaña ese día |
| `contactos_efectivos` | `integer` | Contactos efectivos |
| `tasa_contacto_pct` | `numeric` | Tasa de contacto % |

---

### `cdr_hourly_metrics`
**Propósito:** Distribución horaria de llamadas. Alimenta el gráfico de calor horario.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `fecha` | `date` | Fecha |
| `hora` | `integer` | Hora del día (0–23) |
| `total_llamadas` | `integer` | Llamadas en esa hora |

---

### `agents_performance`
**Propósito:** Performance diaria por agente — base del módulo Equipos.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | `bigserial` PK | — |
| `fecha` | `date` NOT NULL | Día operativo |
| `agent_id` | `text` NOT NULL | ID del agente en WeKall (ej: `10982`) |
| `agent_name` | `text` NOT NULL | Nombre completo del agente |
| `campaign_id` | `text` | Campaña (ej: `cobranzas_crediminuto_co`) |
| `area` | `text` | Área operativa (ej: `Cobranzas`) |
| `client_id` | `text` | ID del cliente (multi-tenant) |
| `tasa_contacto` | `numeric(5,2)` | % llamadas con contacto efectivo |
| `tasa_promesa` | `numeric(5,2)` | % contactos que generan promesa de pago |
| `aht_segundos` | `integer` | Average Handle Time en segundos |
| `csat` | `numeric(3,1)` | Satisfacción del cliente (1.0–5.0) |
| `fcr` | `numeric(5,2)` | First Call Resolution % |
| `escalaciones` | `numeric(5,2)` | % de llamadas escaladas |
| `llamadas_total` | `integer` | Total de llamadas del agente ese día |
| `contactos` | `integer` | Contactos efectivos |
| `promesas` | `integer` | Promesas de pago generadas |
| `created_at` | `timestamptz` | — |

**Constraint UNIQUE:** `(fecha, agent_id)` — un registro por agente por día.

**Índices:**
- `idx_agents_performance_fecha` — ordenar por fecha
- `idx_agents_performance_agent_id` — filtrar por agente
- `idx_agents_performance_agent_fecha` — queries de tendencias por agente
- `idx_agents_performance_client_id` — filtro multi-tenant
- `idx_agents_performance_client_fecha` — queries principales `(client_id, fecha DESC)`

**RLS:** Lectura para `anon` y `authenticated`. Escritura para `anon` habilitada durante el seed (puede restringirse después).

---

### `alert_log`
**Propósito:** Historial persistente de alertas disparadas por el sistema de monitoreo.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | `bigserial` PK | — |
| `fired_at` | `timestamptz` | Cuando se disparó la alerta |
| `severity` | `text` | `critical`, `warning`, `info` |
| `metric` | `text` | Nombre de la métrica (ej: `tasa_contacto_pct`) |
| `title` | `text` | Título legible de la alerta |
| `description` | `text` | Descripción detallada |
| `threshold` | `numeric` | Valor umbral configurado |
| `actual_value` | `numeric` | Valor real en el momento del disparo |
| `source` | `text` | Tabla/origen de los datos (DEFAULT `cdr_daily_metrics`) |
| `client_id` | `text` | ID del cliente |
| `notified` | `boolean` | Si ya se notificó al usuario (email/WhatsApp) |
| `notified_at` | `timestamptz` | Cuándo se notificó |
| `metadata` | `jsonb` | Datos adicionales en JSON libre |

**Índices:**
- `idx_alert_log_fired_at` — historial más reciente primero
- `idx_alert_log_severity` — filtrar por severity con orden temporal

**RLS:** Lectura y escritura para `anon` (el frontend inserta alertas directamente).

---

### `vicky_conversations`
**Propósito:** Historial de todas las conversaciones con Vicky Insights — base del tab "Historial".

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | `bigserial` PK | — |
| `session_id` | `text` NOT NULL | UUID de sesión del navegador |
| `created_at` | `timestamptz` | Timestamp de la conversación |
| `client_id` | `text` | ID del cliente |
| `question` | `text` NOT NULL | Pregunta del usuario |
| `answer` | `text` NOT NULL | Respuesta de Vicky |
| `confidence` | `text` | `Alta`, `Media`, `Baja` |
| `sources` | `text[]` | Array de fuentes citadas |
| `follow_ups` | `text[]` | Sugerencias de follow-up generadas |
| `model_used` | `text` | Modelo LLM usado (DEFAULT `gpt-4o`) |
| `tokens_used` | `integer` | Tokens consumidos |
| `latency_ms` | `integer` | Latencia de respuesta en ms |

**Índices:**
- `idx_vicky_conversations_session` — historial por sesión
- `idx_vicky_conversations_created_at` — historial global reciente primero

**RLS:** Lectura y escritura para `anon`.

---

### `transcriptions`
**Propósito:** Transcripciones de llamadas con embeddings vectoriales para RAG (Retrieval-Augmented Generation).

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | `bigserial` PK | — |
| `agent_id` | `text` | ID del agente que realizó la llamada |
| `agent_name` | `text` | Nombre del agente |
| `campaign_id` | `text` | Campaña a la que pertenece la llamada |
| `call_date` | `date` | Fecha de la llamada |
| `call_type` | `text` | Tipo de llamada (inbound/outbound) |
| `transcript` | `text` | Transcripción completa en texto |
| `summary` | `text` | Resumen ejecutivo generado por GPT-4o-mini |
| `embedding` | `vector(1536)` | Embedding semántico (text-embedding-3-small) |
| `client_id` | `text` | ID del cliente |
| `created_at` | `timestamptz` | — |

**Función especial — `search_transcriptions`:**
```sql
-- Búsqueda semántica por cosine similarity (pgvector)
SELECT * FROM search_transcriptions(
  query_embedding => '[...]'::vector,
  match_count     => 5,
  match_threshold => 0.7
);
```
Esta función es la base del RAG: el Worker embeds la pregunta del usuario, busca las transcripciones más similares y las incluye como contexto para GPT-4o.

---

## Relaciones entre Tablas

```
client_config (client_id)
    ├── client_branding (client_id FK)
    ├── app_users (client_id FK)
    ├── cdr_daily_metrics (client_id)
    ├── cdr_campaign_metrics (client_id — sin FK explícita)
    ├── agents_performance (client_id)
    ├── alert_log (client_id)
    ├── vicky_conversations (client_id)
    └── transcriptions (client_id)
```

> **Nota:** Las tablas CDR y de negocio usan `client_id` como columna de datos pero sin FK declarada — esto es intencional para evitar errores de constraint al cargar datos masivos de CDR. La integridad se mantiene a nivel de aplicación.

---

## RLS Policies (Estado V19 — MVP)

**Estado actual:** Todas las tablas tienen RLS habilitado con policies **permisivas** para `anon` y `authenticated`. El aislamiento por `client_id` es a nivel de aplicación (las queries siempre incluyen `.eq('client_id', clientId)`).

**Razón:** Para el MVP con un solo cliente activo, las policies restrictivas agregarían complejidad sin beneficio práctico. En V20, cuando haya múltiples clientes reales, se migra a auth con JWT claims.

### Policies activas

```sql
-- Lectura global (MVP)
POLICY "Allow anon read" ON <tabla>
  FOR SELECT TO anon, authenticated USING (true);

-- Escritura para tablas que el frontend inserta
POLICY "Allow anon insert alert_log"
  ON public.alert_log FOR INSERT TO anon, authenticated WITH CHECK (true);

POLICY "Allow anon insert vicky_conversations"
  ON public.vicky_conversations FOR INSERT TO anon, authenticated WITH CHECK (true);
```

### Plan V20 — RLS real con Supabase Auth

```sql
-- Cuando haya auth real con JWT claims que incluyan client_id:
CREATE POLICY "Tenant isolation"
  ON public.cdr_daily_metrics
  FOR ALL
  USING (client_id = auth.jwt() ->> 'client_id');
```

---

## Índices Clave y Por Qué Existen

| Índice | Tabla | Columnas | Razón |
|--------|-------|----------|-------|
| `idx_cdr_daily_metrics_client_fecha` | `cdr_daily_metrics` | `(client_id, fecha DESC)` | Query más frecuente del dashboard |
| `idx_agents_performance_client_fecha` | `agents_performance` | `(client_id, fecha DESC)` | Carga de datos del módulo Equipos |
| `idx_agents_performance_agent_fecha` | `agents_performance` | `(agent_id, fecha DESC)` | Tendencias por agente |
| `idx_alert_log_fired_at` | `alert_log` | `fired_at DESC` | Historial reciente (ORDER BY) |
| `idx_app_users_email` | `app_users` | `email` | Lookup O(1) en login |
| `idx_vicky_conversations_session` | `vicky_conversations` | `(session_id, created_at DESC)` | Historial por sesión de usuario |
