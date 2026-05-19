# RUNBOOK · Sprint 0 — Cerrar hallazgos P0 de la auditoría 2026-05-18

**Branch:** `claude/audit-sprint-0`
**Owner ejecución:** Fabián + GlorIA (Mac)
**Tiempo estimado:** 4–6 horas activas (esperando build/deploys cuenta aparte)
**Riesgo:** alto si se ejecuta sin orden. Seguir la secuencia tal como está.

Este documento describe los pasos **manuales** que tiene que hacer un humano para que los cambios de código de Sprint 0 entren en efecto. El código ya está en la branch; lo que falta es configuración + deploys + verificación.

---

## Resumen de cambios de código (ya en la branch)

| Archivo | Cambio | Cierra |
|---|---|---|
| `functions/lib/cors.ts` | CORS allowlist por env (`ALLOWED_ORIGINS`) | P0-4 |
| `functions/lib/auth.ts` | `requireAuth()` que verifica JWT HS256 + valida custom claim `client_id` | P0-5, P0-7 |
| `functions/lib/supabase-admin.ts` | Factory que lee `SUPABASE_SERVICE_KEY` del env binding | P0-3 |
| `functions/lib/rate-limit.ts` | Sliding window con Upstash Redis (fail-open si no hay env) | P0-6 |
| `functions/lib/security-headers.ts` | CSP + HSTS + X-Frame-Options + Permissions-Policy | P1-9 |
| `functions/lib/logger.ts` | Logs estructurados JSON (request_id, client_id, latency_ms) | P2-4 |
| `functions/lib/http.ts` | Helpers de respuesta + `withRetry` para Sprint 1 | – |
| `functions/_middleware.ts` | Aplica CORS allowlist + security headers + rate-limit global + logs | P0-4, P0-6, P1-9 |
| `functions/api/jobs/create.ts` | SERVICE_KEY desde env + `requireAuth` + rate-limit 20/min | P0-3, P0-5, P0-6 |
| `functions/api/jobs/[jobId].ts` | SERVICE_KEY desde env + `requireAuth` + filtro client_id | P0-3, P0-5 |
| `src/lib/supabase.ts` | Throw si faltan VITE_SUPABASE_URL/ANON_KEY (sin fallback) | P1-7 |
| `.github/workflows/deploy.yml` | **Eliminada** `VITE_OPENAI_KEY` + entornos staging/production | P0-3-bis, P1-11 |
| `supabase/migrations/20260518_sprint0_rls_strict.sql` | RLS strict basado en custom claim del JWT | P0-1 |
| `supabase/migrations/20260518_sprint0_auth_hook.sql` | Function `custom_access_token` para Auth Hook | P0-7 |
| `supabase/migrations/20260518_sprint0_rls_strict_ROLLBACK.sql` | Plan de emergencia | – |
| `supabase/migrations/20260518_sprint1_indexes.sql` | HNSW + B-tree (Sprint 1, se puede aplicar después) | P1-1, P1-2 |
| `supabase/migrations/20260518_sprint1_rbac.sql` | Tabla `app_roles` + helper `user_has_permission` (Sprint 1) | P1-8 |

---

## Secuencia de ejecución (NO saltar pasos)

### Paso 0 · Preflight (10 min)

```bash
# 1. Backups de Supabase (siempre antes de migrations en prod)
#    Dashboard Supabase → Database → Backups → "Create backup now"
#    Apuntar el nombre: backup-pre-sprint0-2026-05-18

# 2. Avisar a GlorIA en Slack/WhatsApp:
#    "Voy a ejecutar Sprint 0 (RLS strict + Auth Hook) en Supabase prod
#     entre las HH:MM y HH:MM. No tocar app_users ni transcriptions en este tramo."

# 3. Snapshot del estado actual de policies (para diff post-deploy):
psql "$SUPABASE_DB_URL" -c "
  SELECT schemaname, tablename, policyname, roles, cmd, qual
  FROM pg_policies WHERE schemaname='public'
  ORDER BY tablename, policyname;
" > _backups/sprint0/policies-before-2026-05-18.txt
```

### Paso 1 · Bootstrap de secrets en Cloudflare Pages (15 min)

Cloudflare Dashboard → Pages → `wekall-intelligence` → Settings → Environment variables.

Hay que crear en **Production** Y **Preview** los siguientes secrets (no como variables públicas):

| Nombre | Valor | Justificación |
|---|---|---|
| `SUPABASE_URL` | `https://iszodrpublcnsyvtgjcg.supabase.co` | El URL real del proyecto activo |
| `SUPABASE_SERVICE_KEY` | (rotar primero — ver Paso 2) | Antes hardcoded |
| `SUPABASE_JWT_SECRET` | Dashboard Supabase → Settings → API → JWT Secret | Para validar JWTs en `requireAuth` |
| `ALLOWED_ORIGINS` | `https://intel.wekall.co,https://wekall-intelligence.pages.dev` | CORS allowlist |
| `UPSTASH_REDIS_REST_URL` | (ya debería existir) | Rate limit |
| `UPSTASH_REDIS_REST_TOKEN` | (ya debería existir) | Rate limit |
| `WORKER_URL` | `https://wekall-vicky-proxy.fabsaa98.workers.dev` | Para CSP del Worker |

Variables públicas (no secrets) que vienen del build:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_PROXY_URL`

**Eliminar:**
- `VITE_OPENAI_KEY` — ya removida del workflow; si está como secret de GitHub Actions, eliminar también de `Settings → Secrets and variables → Actions`.

### Paso 2 · Rotar SERVICE_KEY de Supabase (10 min)

```text
Dashboard Supabase → Settings → API → "Reset service_role secret"
```

1. Anotar la nueva key.
2. Actualizar `SUPABASE_SERVICE_KEY` en Cloudflare Pages (Paso 1) con la nueva.
3. Actualizar también el Worker `wekall-vicky-proxy` (Wrangler secret):
   ```bash
   cd workers/wekall-vicky-proxy
   wrangler secret put SUPABASE_SERVICE_KEY
   # pegar la nueva key
   ```
4. Si hay scripts locales (`C:/Users/fabsa/scripts/.env.backup`), actualizar la entrada `SUPABASE_SERVICE_KEY`.

**Verificación:**
```bash
# Intentar usar la key VIEJA → debe fallar:
curl -sS "$SUPABASE_URL/rest/v1/app_users?select=email&limit=1" \
  -H "apikey: <KEY_VIEJA>" \
  -H "Authorization: Bearer <KEY_VIEJA>"
# Esperado: error de auth
```

### Paso 3 · Aplicar Auth Hook (10 min)

```bash
# 3.1. Aplicar la migration SQL
psql "$SUPABASE_DB_URL" -f supabase/migrations/20260518_sprint0_auth_hook.sql

# 3.2. Activar el hook en el Dashboard:
# Authentication → Hooks → "Customize Access Token (Beta)" →
#   Hook type: Postgres function
#   Function: public.custom_access_token
#   Enabled: ON
#   Save
```

**Verificación inline:**
```sql
-- En SQL editor de Supabase:
SELECT public.custom_access_token(
  jsonb_build_object('claims', jsonb_build_object('email', 'fabian@wekall.co'))
);
-- Esperado: event con claims.client_id poblado (ej. 'wekall').
```

**Verificación end-to-end:**
1. Hacer logout en la app.
2. Login con un usuario de saludtotal (`ceo@saludtotal.com.co`).
3. En DevTools → Application → Cookies → Local Storage, copiar el JWT.
4. Pegarlo en https://jwt.io → confirmar que el payload incluye `"client_id": "saludtotal"` y `"role_app": "ceo"`.

### Paso 4 · Aplicar RLS strict (15 min)

```bash
# Sí o sí en este orden (sin el Auth Hook activo, los usuarios reales pierden acceso).
psql "$SUPABASE_DB_URL" -f supabase/migrations/20260518_sprint0_rls_strict.sql
```

**Verificación del cierre del leak (P0-1):**
```bash
# La query que ANTES retornaba ~12000 filas cross-tenant:
curl -sS \
  "$SUPABASE_URL/rest/v1/transcriptions?select=client_id,agent_name&limit=5" \
  -H "apikey: $ANON_KEY"

# Esperado AHORA: [] (array vacío) — anon ya no tiene SELECT en transcriptions.
```

**Verificación de que la app real sigue funcionando:**
- Login con usuario saludtotal → ver dashboard → debe cargar SOLO datos de saludtotal.
- Login con usuario wekall (admin) → ver dashboard → puede ver cualquier tenant (`is_wekall_admin()` bypass).

**Si algo se rompe:**
```bash
psql "$SUPABASE_DB_URL" -f supabase/migrations/20260518_sprint0_rls_strict_ROLLBACK.sql
# Avisar a Fabián + GlorIA inmediato. Fix forward antes de 24h.
```

### Paso 5 · Deploy de Pages Functions (10 min)

```bash
# Merge a staging primero
git checkout staging  # o crear si no existe: git checkout -b staging origin/main
git merge --no-ff claude/audit-sprint-0
git push origin staging
# → GitHub Actions despliega a Cloudflare Pages preview (branch=staging).

# Validar preview:
#   https://staging.wekall-intelligence.pages.dev
#   - Login funciona
#   - Dashboard carga datos del tenant
#   - DevTools → Network → ver que /api/jobs/* devuelve 401 sin auth y 200 con auth
#   - Header Access-Control-Allow-Origin = origen real (no `*`)
#   - Header Content-Security-Policy presente

# Si OK → merge a main para producción:
git checkout main
git merge --no-ff staging
git push origin main
# → GitHub Actions deploys to wekall-intelligence.pages.dev (production)
```

### Paso 6 · Rotar JWT viejo del Worker (5 min)

```bash
cd workers/wekall-vicky-proxy

# Si el Worker tenía SUPABASE_SERVICE_KEY hardcoded internamente:
wrangler secret put SUPABASE_SERVICE_KEY  # pegar la nueva key del Paso 2

# Re-deploy:
wrangler deploy
```

### Paso 7 · Purgar git history del JWT legacy (30 min, OPCIONAL)

El JWT hardcoded apuntaba a `iszodrpublcnsyvtgjsg` que no resuelve, pero el commit history público sigue mostrándolo.

**Solo hacer si:**
- Confirmaste con Fabián.
- Ningún colaborador externo está trabajando sobre commits viejos.

```bash
# Backup primero
git clone --mirror https://github.com/fabsaa98/wekall-intelligence.git wekall-intelligence-mirror-backup

# Purgar
pip install git-filter-repo
cd wekall-intelligence
git filter-repo --replace-text <(echo 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlzem9kcnB1YmxjbnN5dnRnanNnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzY1NzYyOSwiZXhwIjoyMDU5MjMzNjI5fQ.Oi5GRYSc0krtjJAn0XsN1wY9Gr-N8p3HL0rEJMO8L8o==>REMOVED_LEGACY_KEY')

# Force-push (requiere deshabilitar branch protection temporalmente)
git push origin --force --all
```

**Esto NO lo puede hacer Claude Code desde acá** (`git push --force` está bloqueado por settings.json). Lo hace Fabián a mano.

### Paso 8 · Verificación final (15 min)

Correr el checklist completo:

```bash
# 1. ANON key no lee transcriptions
curl -sS "$SUPABASE_URL/rest/v1/transcriptions?limit=1" -H "apikey: $ANON_KEY"
# Esperado: [] o 401

# 2. ANON key no lee app_users
curl -sS "$SUPABASE_URL/rest/v1/app_users?limit=1" -H "apikey: $ANON_KEY"
# Esperado: [] o 401

# 3. JWT sin client_id es rechazado por requireAuth
curl -sS https://intel.wekall.co/api/jobs/create \
  -H "Authorization: Bearer <JWT_VIEJO_SIN_CLAIM>" \
  -X POST -d '{"fileName":"test.pdf","fileContent":"abc"}'
# Esperado: 403 "JWT missing client_id custom claim"

# 4. JWT válido funciona
curl -sS https://intel.wekall.co/api/jobs/create \
  -H "Authorization: Bearer <JWT_NUEVO_CON_CLAIM>" \
  -H "Content-Type: application/json" \
  -X POST -d '{"fileName":"test.pdf","fileContent":"YWJj"}'
# Esperado: 202 con jobId

# 5. CORS allowlist activa
curl -sSI https://intel.wekall.co/api/jobs/create -H "Origin: https://malicious.com"
# Esperado: Access-Control-Allow-Origin = primer entry del allowlist, NO el origen pedido

# 6. Headers de seguridad presentes
curl -sSI https://intel.wekall.co/api/dashboard/kpis
# Esperado: Content-Security-Policy, Strict-Transport-Security, X-Frame-Options
```

---

## Rollback de emergencia

Si la app queda fuera de servicio:

1. **DB:** `psql ... -f supabase/migrations/20260518_sprint0_rls_strict_ROLLBACK.sql`
2. **Pages Functions:** `wrangler pages deployment rollback` o revert del commit en `main`.
3. **Avisar a stakeholders:** Fabián + GlorIA + cualquier cliente activo (saludtotal, crediminuto, bold).
4. **Incidente:** abrir en `_backups/incidents/` con timeline + root cause.

---

## Lo que NO está en Sprint 0 (queda como TODO)

- **Aplicar `requireAuth` a las otras 12 Pages Functions** (`agents/stats`, `cdr/*`, `client/*`, `dashboard/*`, `transcriptions/*`, `vicky/chat`). Hoy siguen leyendo `client_id` del query param. **Compensación:** RLS strict bloquea desde la DB; el endpoint puede tener un bug y el cliente recibe `[]` igual. Pero para defensa en profundidad, hay que cerrar.
- **Modularizar Worker `wekall-vicky-proxy`** (1336 LOC en un archivo). P1-3.
- **Validar JWT en el Worker mismo** — actualmente la mayoría de endpoints del Worker usan SERVICE_KEY sin verificar quién pide. P1.
- **MFA, Audit log, Costos por tenant** — Sprint 2-3.

Detalle completo en `SCALE-AUDIT-ROADMAP.md`.

---

## Después de Sprint 0

- Documentar en `_backups/incidents/none-sprint-0.md` que el deploy fue exitoso.
- Cerrar issues GitHub asociados a P0-1, P0-3, P0-4, P0-5, P0-6, P0-7, P0-3-bis.
- Comunicar a stakeholders (clientes activos): "Reforzamos las RLS de Supabase. Si ves algún error de acceso, escribir a Fabián."
- Programar pen-test interno (interno = un compañero intenta romper el aislamiento con ANON key + un JWT modificado). Cumple gate de SOC 2.

---

**Autor:** Claude Code · Sprint 0 audit · 2026-05-18
**Coordinación:** GlorIA mantiene el lead del repo; este Sprint se ejecuta con su acompañamiento.
