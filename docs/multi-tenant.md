# WeKall Intelligence — Arquitectura Multi-Tenant

**Versión:** V19.0.0  
**Fecha de implementación:** 2026-04-05  
**Estado:** MVP funcional — auth real en Roadmap V20

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

### Capas de aislamiento (V19)

| Capa | Implementación | Estado |
|------|---------------|--------|
| **Aplicación** | `.eq('client_id', clientId)` en todas las queries | ✅ Implementado |
| **Base de datos (RLS)** | Policies por `client_id` usando JWT claims | ❌ Pendiente V20 |
| **Auth** | Supabase Auth v2 con tokens JWT | ❌ Pendiente V20 |

> **Implicación actual:** Un usuario que conozca el `client_id` de otra empresa podría cambiar su localStorage y ver datos de ese cliente. Aceptable para MVP con un solo cliente real. Debe resolverse antes de escalar a múltiples clientes en producción.

---

## Cómo Agregar un Cliente Nuevo

### Método 1: Script automático (recomendado)

```bash
# Prerequisito: service key con acceso completo
export SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6..."

python3 scripts/onboard_client.py \
  --client-id empresa_xyz \
  --client-name "Empresa XYZ" \
  --industry "Contact Center" \
  --country "Colombia" \
  --email ceo@empresa.com \
  --name "CEO Nombre" \
  --role CEO
```

El script ejecuta 4 pasos:
1. Verifica si el `client_id` ya existe
2. Crea/actualiza `client_config`
3. Crea/actualiza `client_branding`
4. Crea el usuario inicial en `app_users`

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

### Estado actual (V19 — MVP)

**Riesgos conocidos y aceptados para MVP:**

1. **Auth mock sin contraseña real:** El login solo verifica email + company_code en `app_users`. No hay hash de contraseña ni tokens seguros.

2. **RLS permisiva:** Las policies actuales permiten leer TODOS los datos sin restricción por `client_id`. El aislamiento es solo a nivel de aplicación.

3. **client_id en localStorage:** Un usuario técnico podría modificar `localStorage.setItem('wki_client_id', 'otro_cliente')` para ver datos de otro cliente.

4. **Anon key expuesta:** El `SUPABASE_ANON_KEY` es público (en el bundle de la app). Esto es normal y esperado para el anon key — no es un bug.

**Mitigaciones actuales:**
- El `SUPABASE_SERVICE_KEY` nunca está en el frontend
- La API key de OpenAI está solo en Cloudflare Secrets
- El único cliente activo real es Crediminuto — bajo riesgo de cross-tenant hasta V20

### Roadmap V20 — Auth Real con Supabase Auth v2

**Objetivo:** Eliminar los 4 riesgos anteriores con auth estándar.

**Plan de implementación:**

#### 1. Migrar usuarios a Supabase Auth

```bash
# Para cada usuario en app_users:
# Crear usuario en Supabase Auth con email + password temporal
# Enviar email de bienvenida con reset de contraseña
```

#### 2. Agregar custom claims al JWT

```sql
-- Función que agrega client_id y role al JWT de Supabase Auth
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  claims jsonb;
  user_client_id text;
  user_role text;
BEGIN
  SELECT client_id, role INTO user_client_id, user_role
  FROM public.app_users
  WHERE email = event->>'email';

  claims := event->'claims';
  claims := jsonb_set(claims, '{client_id}', to_jsonb(user_client_id));
  claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;
```

#### 3. Actualizar RLS policies

```sql
-- En lugar de USING (true), usar:
CREATE POLICY "Tenant isolation on cdr"
  ON public.cdr_daily_metrics
  FOR ALL
  USING (client_id = (auth.jwt() ->> 'client_id'));
```

#### 4. Actualizar el frontend

```typescript
// Reemplazar el mock login con:
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});
// El client_id vendrá en el JWT claims
const clientId = data.session?.user?.user_metadata?.client_id;
```

**Tiempo estimado de implementación:** 1 día de trabajo.

**Breaking changes:** Ninguno para el cliente `credismart` si se migran los usuarios correctamente.

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

| client_id | Nombre | País | Estado |
|-----------|--------|------|--------|
| `credismart` | CrediSmart / Crediminuto | Colombia | ✅ Activo |

Para agregar un nuevo cliente, seguir el proceso de onboarding documentado arriba.
