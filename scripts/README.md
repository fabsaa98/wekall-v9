# WeKall Intelligence — Scripts

Scripts de base de datos y automatización para WeKall Intelligence.

---

## Índice

| Script | Tipo | Propósito |
|--------|------|-----------|
| `create_agents_table.sql` | SQL | Crea tablas V18 en Supabase |
| `migrate_multitenant.sql` | SQL | Migración V19 a arquitectura multi-tenant |
| `seed_agents.py` | Python | Genera e inserta 660 registros de agentes en Supabase |
| `onboard_client.py` | Python | CLI para onboardear un nuevo cliente en 1 comando |

---

## `create_agents_table.sql`

**Qué hace:** Crea las tres tablas que se introdujeron en V18:

1. **`agents_performance`** — Performance diaria por agente (tasa contacto, promesa, AHT, CSAT, FCR, escalaciones, volúmenes). Incluye índices, RLS y comentario de tabla.

2. **`alert_log`** — Historial de alertas disparadas por el sistema con severidad (critical/warning/info), valores real vs umbral, timestamp y flag de notificación.

3. **`vicky_conversations`** — Q&A con Vicky Insights: pregunta, respuesta, confianza, fuentes citadas, follow-ups sugeridos, tokens usados, latencia.

**Cuándo ejecutar:** En un proyecto Supabase nuevo, o al actualizar a V18 desde V17 o anterior. Si las tablas ya existen, el script usa `CREATE TABLE IF NOT EXISTS` — es idempotente.

**Cómo ejecutar:**
1. Abrir https://supabase.com/dashboard/project/iszodrpublcnsyvtgjcg
2. Ir a **SQL Editor** → **New query**
3. Pegar el contenido completo del archivo
4. Clic en **Run**

**Verificación:** El script incluye al final un `SELECT` que lista las tablas creadas con su tamaño en disco.

---

## `migrate_multitenant.sql`

**Qué hace:** Migración completa de arquitectura single-tenant a multi-tenant (V19). Incluye:

1. **Agrega `client_id`** a tablas existentes (`cdr_daily_metrics`, `transcriptions`, `agents_performance`) con `DEFAULT 'credismart'`
2. **Actualiza registros existentes** con `client_id = 'credismart'` (retrocompatibilidad)
3. **Crea índices** individuales y compuestos por `client_id` para performance de queries
4. **Crea tabla `app_users`** con roles y FK a `client_config`
5. **Inserta usuario inicial** `fabian@wekall.co` con rol `admin`
6. **Habilita RLS** y crea policies permisivas para anon key (MVP — auth real en V20)
7. **Crea tabla `client_branding`** con branding por cliente
8. **Inserta datos iniciales** para el cliente `credismart`

**Prerrequisitos:**
- La tabla `client_config` debe existir antes de ejecutar (tiene FK references)
- Si `client_config` no existe, crearla primero:
  ```sql
  CREATE TABLE IF NOT EXISTS public.client_config (
    client_id   text PRIMARY KEY,
    client_name text NOT NULL,
    industry    text,
    country     text DEFAULT 'Colombia',
    currency    text DEFAULT 'COP',
    timezone    text DEFAULT 'America/Bogota',
    active      boolean DEFAULT true,
    costo_agente_mes  numeric,
    agentes_activos   integer,
    nomina_total_mes  numeric,
    trm_cop           numeric,
    notas             text,
    created_at  timestamptz DEFAULT now(),
    updated_at  timestamptz DEFAULT now()
  );
  INSERT INTO public.client_config (client_id, client_name, country)
  VALUES ('credismart', 'CrediSmart / Crediminuto', 'Colombia')
  ON CONFLICT (client_id) DO NOTHING;
  ```

**Cuándo ejecutar:** Una sola vez al actualizar de V18 a V19. El script es mayormente idempotente (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`), pero **no ejecutar dos veces** el bloque de `DROP POLICY` + `CREATE POLICY` en producción sin revisar el impacto.

**Cómo ejecutar:** Mismo proceso que `create_agents_table.sql` — SQL Editor en Supabase Dashboard.

**Verificación incluida al final del script:**
```sql
SELECT table_name, column_name FROM information_schema.columns
  WHERE table_name IN ('cdr_daily_metrics','transcriptions','agents_performance')
  AND column_name = 'client_id';
```

---

## `seed_agents.py`

**Qué hace:** Genera 660 registros sintéticos realistas (22 agentes × 30 días hábiles) y los inserta en la tabla `agents_performance` de Supabase.

Los datos son **deterministas con ruido gaussiano** — cada agente tiene un "perfil base" estable (rango de KPIs propio) con variación diaria de ±8% y factor de día de la semana (lunes/viernes −7%).

**Prerequisitos:**
```bash
pip install supabase python-dotenv
```

**Variables de entorno requeridas:**
El script usa el `SUPABASE_ANON_KEY` hardcodeado (suficiente si hay policy de INSERT para anon). Si hay RLS restrictiva, usar service key:
```bash
# No requiere variable de entorno — usa anon key directamente
# Si hay error 403/RLS, ejecutar en SQL Editor antes de correr el script:
# CREATE POLICY "anon_insert_agents_performance"
#   ON public.agents_performance FOR INSERT TO anon WITH CHECK (true);
```

**Uso:**
```bash
cd /Users/celeru/.openclaw/workspace/wekall-v9
python3 scripts/seed_agents.py
```

**Output esperado:**
```
WeKall Intelligence — Seed de agentes
Generando datos para 22 agentes × 30 días hábiles...

Total registros generados: 660
Rango de fechas: 2026-02-21 → 2026-04-04

Muestra (primeros 2 registros):
  2026-02-21 | NELCY JOSEFINA CONTASTI GONZALEZ | TC=47.3% TP=38.1% AHT=487s CSAT=3.9 FCR=71.2% Esc=6.8%
  2026-02-21 | ANA MARIA LOPEZ ROJAS | TC=42.1% TP=41.5% AHT=523s CSAT=4.1 FCR=68.9% Esc=5.2%

Iniciando inserción en Supabase...
  ✅ Batch 1: 500 registros insertados (500/660)
  ✅ Batch 2: 160 registros insertados (660/660)

Resultado: 660 insertados, 0 errores de 660 registros totales.
```

**Nota:** El script usa `upsert` con `on_conflict="fecha,agent_id"` — es seguro re-ejecutarlo sin duplicar datos.

---

## `onboard_client.py`

**Qué hace:** CLI para onboardear un nuevo cliente en WeKall Intelligence en un solo comando. Crea:
1. Registro en `client_config` (configuración operativa)
2. Registro en `client_branding` (personalización visual)
3. Usuario inicial en `app_users` (email + rol)

**Prerequisitos:**
```bash
pip install httpx
export SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6..."  # service_role key
```

**Uso básico:**
```bash
python3 scripts/onboard_client.py \
  --client-id empresa_xyz \
  --client-name "Empresa XYZ" \
  --email ceo@empresa.com \
  --name "Nombre CEO"
```

**Todos los parámetros:**
```
--client-id       REQUERIDO  ID único del cliente (lowercase, sin espacios)
--client-name     REQUERIDO  Nombre visible del cliente
--industry        OPCIONAL   Default: "Contact Center"
--country         OPCIONAL   Default: "Colombia"
--currency        OPCIONAL   Default: "COP"
--timezone        OPCIONAL   Default: "America/Bogota"
--email           REQUERIDO  Email del usuario inicial
--name            OPCIONAL   Nombre completo del usuario inicial
--role            OPCIONAL   CEO | VP Ventas | VP CX | COO | admin (default: CEO)
--tagline         OPCIONAL   Tagline de la empresa
--logo-url        OPCIONAL   URL del logo
--primary-color   OPCIONAL   Color primario hex (default: #6334C0)
```

**Ejemplos:**

```bash
# Cliente colombiano de cobranzas
python3 scripts/onboard_client.py \
  --client-id credismart \
  --client-name "CrediSmart / Crediminuto" \
  --industry "Cobranzas" \
  --country "Colombia" \
  --email fabian@wekall.co \
  --name "Fabián Saavedra" \
  --role admin

# Cliente peruano con branding personalizado
python3 scripts/onboard_client.py \
  --client-id empresa_peru \
  --client-name "Empresa Perú S.A." \
  --industry "Servicio al Cliente" \
  --country "Peru" \
  --currency "PEN" \
  --email gerente@empresa.pe \
  --name "Gerente General" \
  --role CEO \
  --primary-color "#1A73E8" \
  --tagline "Excelencia en servicio"
```

**Output esperado:**
```
🚀 WeKall Intelligence — Onboarding cliente: empresa_xyz
=======================================================

[1/4] Verificando client_id 'empresa_xyz'...
  ✅ Nuevo cliente. Creando...

[2/4] Guardando en client_config...
  ✅ client_config creado: empresa_xyz

[3/4] Guardando branding...
  ✅ client_branding guardado

[4/4] Creando usuario inicial: ceo@empresa.com...
  ✅ app_users: ceo@empresa.com (CEO)

=======================================================
✅ ONBOARDING COMPLETADO
=======================================================
  Cliente ID  : empresa_xyz
  Nombre      : Empresa XYZ
  País        : Colombia (COP)
  Usuario     : ceo@empresa.com [CEO]

  Login URL   : https://wekall-intelligence.pages.dev/login
  Código de empresa: empresa_xyz

📋 El usuario puede iniciar sesión con:
   Email: ceo@empresa.com
   Código de empresa: empresa_xyz
```

**Nota:** Si el cliente ya existe, el script actualiza los datos sin error (upsert por `client_id`).

---

## Flujo completo para un nuevo cliente

```bash
# 1. Onboardear el cliente
export SUPABASE_SERVICE_KEY="..."
python3 scripts/onboard_client.py \
  --client-id nuevo_cliente \
  --client-name "Nuevo Cliente" \
  --email ceo@nuevo.com

# 2. Cargar datos CDR (manualmente por ahora, V21 lo automatiza)
#    → Importar CSV en cdr_daily_metrics con client_id = 'nuevo_cliente'

# 3. (Opcional) Cargar datos de agentes
python3 scripts/seed_agents.py  # modificar AGENTS y CAMPAIGN en el script

# 4. El cliente puede hacer login en:
#    https://wekall-intelligence.pages.dev/login
#    Email: ceo@nuevo.com / Código: nuevo_cliente
```
