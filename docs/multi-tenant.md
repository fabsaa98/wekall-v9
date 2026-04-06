# WeKall Intelligence — Arquitectura Multi-Tenant

**Versión:** V20.0.0  
**Fecha de implementación:** 2026-04-05  
**Estado:** Multi-tenant completo con Auth real — 3 clientes activos, aislamiento RAG validado

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

### 3 capas de aislamiento (V20)

| Capa | Implementación | Estado |
|------|---------------|--------|
| **Capa 1 — Aplicación** | `.eq('client_id', clientId)` en todas las queries Supabase | ✅ Implementado |
| **Capa 2 — RAG con client_id_filter** | Worker pasa `client_id` a `search_transcriptions` — cada cliente solo ve sus transcripciones | ✅ Implementado y validado |
| **Capa 3 — Auth con get_user_client_id()** | Función SQL lista para RLS real usando `auth.uid()` → `app_users.auth_id` → `client_id` | ✅ Función implementada / ⏳ RLS policies pendientes de activación |

**Validación de aislamiento RAG (V20):**
- Cliente `wekall` consultando `/rag-query` → retorna **0 transcripciones** de `credismart`
- Aislamiento confirmado con `client_id_filter` en `search_transcriptions`

> **Estado actual:** Las capas 1 y 2 garantizan aislamiento funcional real. La capa 3 (RLS en base de datos) está preparada con `get_user_client_id()` pero las policies restrictivas aún están comentadas — se activan cuando todos los usuarios migren a Supabase Auth con `auth_id` en `app_users`.

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

Los datos del CDR (historial de llamadas) deben cargarse manualmente hasta que V21 implemente el pipeline automático:

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

### Estado actual (V20 — Auth Real implementado)

**Riesgos resueltos en V20:**

1. ✅ **Auth real con Supabase Auth v2:** `signInWithPassword` con contraseñas reales hasheadas por Supabase. Fallback legacy disponible para migración gradual.

2. ✅ **RAG aislado por `client_id_filter`:** El Worker filtra transcripciones por `client_id` antes de la búsqueda vectorial.

3. ⏳ **RLS en base de datos:** La función `get_user_client_id()` está implementada y lista. Las policies restrictivas están comentadas — se activarán cuando todos los usuarios tengan `auth_id` en `app_users`.

4. **Anon key expuesta:** El `SUPABASE_ANON_KEY` es público (en el bundle de la app). Esto es normal y esperado para el anon key — no es un bug.

**Mitigaciones actuales:**
- El `SUPABASE_SERVICE_KEY` nunca está en el frontend
- La API key de OpenAI está solo en Cloudflare Secrets
- RAG aislado por `client_id_filter` — validado en producción
- 3 clientes activos con datos aislados correctamente

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

### Roadmap — RLS Real en Base de Datos (próximo paso)

Con `get_user_client_id()` ya implementada, activar RLS real requiere solo:

```sql
-- Activar en cada tabla de negocio
CREATE POLICY "Tenant isolation on cdr"
  ON public.cdr_daily_metrics
  FOR ALL
  USING (client_id = public.get_user_client_id());

CREATE POLICY "Tenant isolation on transcriptions"
  ON public.transcriptions
  FOR ALL
  USING (client_id = public.get_user_client_id());

-- Ídem para agents_performance, alert_log, vicky_conversations
```

**Prerequisito:** Todos los usuarios activos deben tener `auth_id` en `app_users`. Verificar con:
```sql
SELECT email, client_id, auth_id IS NOT NULL AS has_auth
FROM public.app_users WHERE active = true;
```

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
