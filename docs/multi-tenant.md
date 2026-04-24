# WeKall Intelligence — Arquitectura Multi-Tenant

**Versión:** V22.0.0  
**Fecha de última actualización:** 2026-04-13  
**Estado:** Aislamiento multi-tenant completo a 3 capas — RLS activo en 9 tablas, policies `get_user_client_id()` en producción

---

## Cómo Funciona el Aislamiento de Datos

### Principio

Todos los datos de negocio tienen una columna `client_id TEXT` que identifica a qué empresa pertenecen. El frontend siempre filtra por el `client_id` del usuario activo.

```
Tablas con client_id:
  ├── cdr_daily_metrics      → .eq('client_id', clientId)
  ├── transcriptions         → .eq('client_id', clientId)
  ├── agents_performance     → .eq('client_id', clientId)
  ├── alert_log              → client_id en cada INSERT
  ├── vicky_conversations    → client_id en cada INSERT
  ├── client_config          → .eq('client_id', clientId)
  └── client_branding        → .eq('client_id', clientId)
```

### Flujo de sesión

```
1. Usuario abre https://wekall-intelligence.pages.dev
2. App.tsx lee localStorage('wki_client_id')
   └── Si no existe: guarda 'credismart' como default (retrocompatibilidad)
3. ClientContext inicializa con ese client_id
4. Todas las queries Supabase incluyen .eq('client_id', clientId)
5. Si el usuario hace login: setClientId(data.client_id) → persiste nuevo valor
```

### 3 capas de aislamiento — COMPLETAS desde V22

| Capa | Implementación | Estado |
|------|---------------|--------|
| **Capa 1 — Aplicación** | `.eq('client_id', clientId)` en todas las queries + `clientId` obligatorio en funciones críticas (H-1) + guard explícito sin fallback (H-2) | ✅ Activo |
| **Capa 2 — RAG con client_id_filter** | Worker pasa `client_id` a `search_transcriptions` — cada cliente solo ve sus transcripciones | ✅ Activo y validado |
| **Capa 3 — RLS en base de datos** | Policies `USING (client_id = get_user_client_id())` en 9 tablas — PostgreSQL rechaza cualquier acceso cross-tenant | ✅ ACTIVO desde V22 |

**Validación de aislamiento RAG (V20/V22):**
- Cliente `wekall` consultando `/rag-query` → retorna **0 transcripciones** de `credismart`
- Aislamiento confirmado con `client_id_filter` + RLS activo en `transcriptions`

> **Estado V22:** Las 3 capas están activas y en producción. Un bug en el frontend no puede exponer datos de otro cliente — la base de datos es la última línea de defensa.

---

## Cómo Agregar un Cliente Nuevo

### Método 1: Script automático (recomendado — V20 con auth real)

```bash
# Prerequisito: service key con acceso completo
export SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6..."

# V20: incluir --password para crear usuario con Supabase Auth real
python3 scripts/onboard_client.py \
  --client-id empresa_xyz \
  --client-name "Empresa XYZ" \
  --industry "Contact Center" \
  --country "Colombia" \
  --email ceo@empresa.com \
  --name "CEO Nombre" \
  --role CEO \
  --password "ContraseñaSegura123!"
```

El script ejecuta 5 pasos en V20:
1. Verifica si el `client_id` ya existe
2. Crea/actualiza `client_config`
3. Crea/actualiza `client_branding`
4. Crea el usuario en **Supabase Auth** (con contraseña real)
5. Crea/actualiza el usuario en `app_users` con el `auth_id` vinculado

### Método 2: SQL manual en Supabase Dashboard

```sql
-- Paso 1: Crear la configuración del cliente
INSERT INTO public.client_config (
  client_id, client_name, industry, country, currency, timezone, active
) VALUES (
  'empresa_xyz',
  'Empresa XYZ',
  'Contact Center',
  'Colombia',
  'COP',
  'America/Bogota',
  true
);

-- Paso 2: Crear el branding
INSERT INTO public.client_branding (
  client_id, company_name, tagline, primary_color
) VALUES (
  'empresa_xyz',
  'Empresa XYZ',
  'Contact Center Intelligence',
  '#6334C0'
);

-- Paso 3: Crear el primer usuario
INSERT INTO public.app_users (
  email, client_id, role, name, active
) VALUES (
  'ceo@empresa.com',
  'empresa_xyz',
  'CEO',
  'Nombre CEO',
  true
);
```

### Paso adicional: Cargar datos CDR

Los datos del CDR (historial de llamadas) deben cargarse manualmente hasta que V23 implemente el pipeline automático:

```sql
-- Insertar datos CDR para el nuevo cliente
INSERT INTO public.cdr_daily_metrics 
  (fecha, client_id, total_llamadas, contactos_efectivos, tasa_contacto_pct)
VALUES
  ('2026-04-01', 'empresa_xyz', 8500, 3230, 38.0),
  ('2026-04-02', 'empresa_xyz', 9200, 3680, 40.0);
  -- ... más registros
```

---

## Cómo Agregar un Usuario a un Cliente Existente

### Opción 1: Script onboard_client.py

```bash
# Agregar VP de Ventas a cliente existente
python3 scripts/onboard_client.py \
  --client-id empresa_xyz \
  --client-name "Empresa XYZ" \
  --email vpventas@empresa.com \
  --name "VP de Ventas" \
  --role "VP Ventas"

# El script detecta que empresa_xyz ya existe y solo actualiza/agrega
```

### Opción 2: SQL directo

```sql
INSERT INTO public.app_users (email, client_id, role, name, active)
VALUES ('vpventas@empresa.com', 'empresa_xyz', 'VP Ventas', 'Nombre VP', true)
ON CONFLICT (email) DO UPDATE SET
  role = EXCLUDED.role,
  name = EXCLUDED.name,
  active = EXCLUDED.active;
```

### Roles disponibles

| Rol | Descripción | Vista de Overview |
|-----|-------------|-------------------|
| `CEO` | Acceso total, brief ejecutivo estratégico | "Buenos días, CEO." |
| `VP Ventas` | Foco en volumen y conversión | "Buenos días, VP de Ventas." |
| `VP CX` | Foco en contactos efectivos y calidad | "Buenos días, VP de CX." |
| `COO` | Foco en eficiencia operativa | "Buenos días, COO." |
| `admin` | Acceso administrativo completo | Igual que CEO |

---

## Consideraciones de Seguridad

### Estado actual (V22 — Aislamiento Completo)

**Todos los riesgos resueltos:**

1. ✅ **Auth real con Supabase Auth v2:** `signInWithPassword`. AuthGuard valida JWT Supabase — sin fallback de localStorage (fix V21).

2. ✅ **RAG aislado por `client_id_filter`:** Worker filtra transcripciones por `client_id`. Función recreada en V22 como firma canónica.

3. ✅ **RLS activo en 9 tablas (V22):** Policies `USING (client_id = get_user_client_id())` en producción. PostgreSQL rechaza queries cross-tenant.

4. ✅ **H-1: `clientId` obligatorio (V22):** `getRecentAlertLog()` y `getVickyHistory()` requieren parámetro explícito.

5. ✅ **H-2: sin fallback hardcodeado (V22):** Eliminado `|| 'credismart'` en 6 funciones — guard explícito.

6. **Anon key en bundle:** Normal para `SUPABASE_ANON_KEY`. El RLS protege los datos incluso si alguien usa la anon key directamente.

**Mitigaciones activas:**
- `SUPABASE_SERVICE_KEY` nunca en el frontend
- API key de OpenAI solo en Cloudflare Secrets
- RLS bloquea acceso cross-tenant a nivel PostgreSQL
- RAG aislado con `client_id_filter` + RLS en `transcriptions`

### Flujo de Auth Real (V20)

```
1. Usuario ingresa email + password en /login
2. Frontend llama supabase.auth.signInWithPassword({ email, password })
3. Supabase Auth verifica credenciales y retorna session + JWT
4. ClientContext detecta onAuthStateChange → actualiza sesión
5. AuthGuard consulta app_users por auth_id → obtiene client_id y role
6. ClientContext inicializa con client_id del usuario autenticado
7. Todas las queries incluyen .eq('client_id', clientId) automáticamente
8. Worker RAG recibe client_id en cada /rag-query → filtra transcripciones
```

### RLS en Producción (activo desde V22 — 2026-04-13)

```sql
-- Policy aplicada en las 9 tablas de datos de negocio:
CREATE POLICY "tenant_isolation"
  ON public.<tabla>
  FOR ALL
  TO authenticated
  USING (client_id = public.get_user_client_id());

-- Tablas con RLS activo:
-- cdr_daily_metrics, transcriptions, agents_performance, agent_daily_metrics,
-- client_config, client_branding, client_kpi_targets, client_labor_costs,
-- vicky_conversations
```

### Tablas con RLS y sin RLS

| Tabla | RLS | Razón |
|-------|-----|-------|
| `cdr_daily_metrics` | 🔐 ACTIVO | Datos operativos críticos por cliente |
| `transcriptions` | 🔐 ACTIVO | Grabaciones confidenciales por cliente |
| `agents_performance` | 🔐 ACTIVO | Performance de agentes por cliente |
| `agent_daily_metrics` | 🔐 ACTIVO | Métricas diarias por cliente |
| `client_config` | 🔐 ACTIVO | Config privada de cada cliente |
| `client_branding` | 🔐 ACTIVO | Branding privado de cada cliente |
| `client_kpi_targets` | 🔐 ACTIVO | Metas KPI privadas por cliente |
| `client_labor_costs` | 🔐 ACTIVO | Costos laborales confidenciales |
| `vicky_conversations` | 🔐 ACTIVO | Historial de IA privado por cliente |
| `alert_log` | ⚠️ Permisiva | El frontend inserta alertas antes de tener sesión garantizada |
| `app_users` | ⚠️ Permisiva | `get_user_client_id()` lee esta tabla para resolver el JWT — no puede restringirse con ella misma |
| `cdr_campaign_metrics` | ⚠️ Sin RLS | Aggregados, sin PII, de bajo riesgo |
| `cdr_hourly_metrics` | ⚠️ Sin RLS | Igual que campaign_metrics |

---

## Multi-Tenant en el Frontend

### ClientContext

```typescript
// src/contexts/ClientContext.tsx

// El provider lee localStorage al iniciar
const [clientId, setClientIdState] = useState<string>(() => {
  return localStorage.getItem('wki_client_id') || 'credismart';
});

// Al hacer login o cambiar cliente:
const setClientId = (id: string) => {
  localStorage.setItem('wki_client_id', id);
  setClientIdState(id);
};
```

### Uso en hooks

```typescript
// Patrón estándar en todos los hooks de datos:
const { clientId } = useClient();

const { data } = await supabase
  .from('cdr_daily_metrics')
  .select('*')
  .eq('client_id', clientId)  // ← siempre presente
  .order('fecha', { ascending: false })
  .limit(30);
```

### AppSidebar con branding dinámico

```typescript
const { clientConfig, clientBranding } = useClient();

// Muestra nombre y logo del cliente activo
const companyName = clientBranding?.company_name || clientConfig?.client_name || 'WeKall';
const primaryColor = clientBranding?.primary_color || '#6334C0';
```

---

## Clientes Actuales en Producción

| client_id | Nombre | País | Estado | Auth |
|-----------|--------|------|--------|------|
| `credismart` | CrediSmart / Crediminuto | Colombia | ✅ Activo | ✅ Auth real |
| `demo_empresa` | Demo Empresa | Colombia | ✅ Activo | ✅ Auth real |
| `wekall` | WeKall | Colombia | ✅ Activo | ✅ Auth real |

**Usuario activo de WeKall:**
- Email: `fabian@wekall.co`
- Contraseña: `WeKall2026!`
- Rol: `admin`
- URL: https://wekall-intelligence.pages.dev/login

Para agregar un nuevo cliente, seguir el proceso de onboarding documentado arriba.
