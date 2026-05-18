# SCALE Audit Roadmap

**Origen:** auditoría completa de arquitectura 2026-05-18 (`_backups/onboardings/auditoria-arquitectura-2026-05-18.md`).
**Estado actual:** Sprint 0 + parte de Sprint 1 ya en branch `claude/audit-sprint-0`.
**Trabajo pendiente:** Sprints 1 (resto), 2, 3, 4.

Este documento es el plan ejecutable de seguimiento al informe de auditoría. Cuando se cierra cada ítem, marcarlo aquí + commit + tag del PR.

---

## Leyenda

- 🟢 **Done en branch sprint-0** — código mergeado o listo para merge
- 🟡 **In flight** — branch abierta, no mergeada
- 🔵 **Listo para comenzar** — sin dependencias
- ⚪ **Bloqueado** — espera otro ítem

---

## Sprint 0 · STOP-SHIP (esta semana)

| # | Hallazgo | Estado | Owner | Archivos |
|---|---|---|---|---|
| P0-1 | RLS abierto para `anon` | 🟢 | Fabián aplicar SQL | `supabase/migrations/20260518_sprint0_rls_strict.sql` |
| P0-3 | Service-role JWT hardcoded | 🟢 | Fabián rotar + apply | `functions/api/jobs/*`, `functions/lib/supabase-admin.ts` |
| P0-3-bis | `VITE_OPENAI_KEY` en workflow | 🟢 | – | `.github/workflows/deploy.yml` |
| P0-4 | CORS `Allow-Origin: *` | 🟢 | – | `functions/lib/cors.ts`, `functions/_middleware.ts` |
| P0-5 | Sin validación JWT en Pages Functions | 🟢 | – | `functions/lib/auth.ts` + `handler.ts` aplicado a las 14 PF (jobs + agents + cdr + client + dashboard + transcriptions + vicky) |
| P0-6 | Sin rate limiting | 🟢 | Fabián config Upstash | `functions/lib/rate-limit.ts` |
| P0-7 | Sin custom claim `client_id` en JWT | 🟢 | Fabián activar Auth Hook | `supabase/migrations/20260518_sprint0_auth_hook.sql` |

**Pasos manuales:** ver `docs/RUNBOOK-SPRINT-0.md`.

---

## Sprint 1 · Hardening crítico (2 semanas)

| # | Hallazgo | Estado | Notas |
|---|---|---|---|
| P1-1 | Sin índice pgvector en `transcriptions.embedding` | 🟢 SQL listo | `supabase/migrations/20260518_sprint1_indexes.sql` — aplicar con `CONCURRENTLY` desde SQL editor |
| P1-2 | Sin índices B-tree en columnas de filtrado | 🟢 SQL listo | misma migración |
| P1-3 | Worker `wekall-vicky-proxy` 1336 LOC | 🔵 | Modularizar a `workers/wekall-vicky-proxy/src/{handlers,lib}/` con `itty-router` o `hono`. Tests con `miniflare`. |
| P1-4 | Sin retry / circuit breaker | 🟢 | `withRetry` + `CircuitBreaker` en `functions/lib/http.ts`. Propagar al Worker queda en P1-3. |
| P1-5 | TypeScript `strict: false` | 🟡 | `tsconfig.strict.json` opt-in para carpetas migradas. **Orden propuesto:** `functions/lib` ✓ → `src/lib` → `src/services` → `src/hooks` → `src/components` → `src/pages`. Cada migración: PR aparte, fix de ~5-10 errores, no más. |
| P1-6 | Sin lazy loading rutas | 🟢 | `src/App.tsx` ya con `lazy()` + `Suspense` para las 24 rutas no críticas |
| P1-7 | ANON key fallback hardcoded | 🟢 | `src/lib/supabase.ts` ahora throws si falta env |
| P1-8 | RBAC implícito | 🟢 SQL listo | `supabase/migrations/20260518_sprint1_rbac.sql`. Aplicar + crear hook `usePermissions()` en frontend. |
| P1-9 | Sin CSP | 🟢 | `functions/lib/security-headers.ts` aplicado en `_middleware` |
| P1-10 | OpenAI lock-in (sin abstracción provider) | 🟢 parcial | Contratos en `functions/lib/providers.ts`. Implementaciones concretas van en el Worker durante P1-3. |
| P1-11 | CI/CD sin staging | 🟢 | workflow ya con `staging` + `production` + approval |
| P1-12 | Logs no estructurados | 🟢 parcial | Pages Functions con `logger.ts`. Worker pendiente. |

**Dependencias:** P1-1, P1-2, P1-8 dependen de Sprint 0 RLS (no aplicar antes).

---

## Sprint 2 · Calidad + observabilidad (2 semanas)

| # | Hallazgo | Estado | Notas |
|---|---|---|---|
| P2-1 | Sin particionado de `transcriptions` | 🔵 | `PARTITION BY RANGE (call_date)` mensual. Ventana de downtime 30min. |
| P2-2 | Sin retention policy | 🔵 | ADR + job semanal. Effort 1.5d. |
| P2-3 | Sin Zod en endpoints | 🟢 | `functions/lib/schemas.ts` con parsers puros (sin dependencia extra). |
| P2-4 | Logs no estructurados (Worker) | 🟢 parcial | Pages Functions OK; Worker queda para P1-3. |
| P2-5 | Cero ARIA / a11y | 🔵 | Effort 4d. Empezar por nav, modales, tablas. |
| P2-6 | Estado global disperso | 🔵 | ADR + refactor. Effort 3d. |
| P2-7 | Manejo de errores inconsistente | 🟢 | `useApiCall()` + `ApiStateView` en `src/`. ErrorBoundary global mantiene. |
| P2-8 | Sin MFA | 🔵 | TOTP opt-in. Effort 2d. |
| P2-9 | Sin secrets scanning en CI | 🟢 parcial | `check-env.mjs` valida no haya `VITE_OPENAI_KEY`. Falta `gitleaks` pre-commit. |
| P2-10 | Sin audit log | 🟢 | `audit_log` table + `audit.ts` helper + `record_audit()` RPC. RTBF ya usa. |
| P2-11 | Sin costos por tenant | 🔵 | Tabla `usage_log` + dashboard. Effort 2d. |
| P2-12 | Sin IaC Supabase | 🔵 | `supabase config.toml`. Effort 2d. |
| P2-13 | Sin `.env.example` exhaustivo | 🟢 | `.env.example` + `npm run check-env`. |
| P2-14 | Sin APM / tracing | 🔵 | Sentry + OpenTelemetry. Effort 2d. |
| P2-15 | Imágenes sin optimizar | 🔵 | Cloudflare Images. Effort 1d. |

---

## Sprint 3 · Compliance + scale (2 semanas)

| # | Hallazgo | Estado | Notas |
|---|---|---|---|
| P3-2 | Sin verificación HMAC en webhooks | 🟢 | `functions/lib/webhook-verify.ts` con Twilio + Meta + genérico. |
| P3-3 | Wrangler config sin TS | 🔵 | Trabajo en repo del Worker. Effort 0.5d. |
| P3-4 | Sin alertas | 🔵 | Cron `/health` → Slack. Effort 0.5d. |
| P3-5 | Sin CDN cache assets dinámicos | 🔵 | Cache API CF. Effort 1d. |
| P3-6 | Sin PII masking | 🟢 | `functions/lib/pii.ts` con detectPii + maskPii + safeForLog. |
| P3-7 | Sin DPA template | 🔵 | Legal task. Effort 2d. |
| P3-8 | Sin clasificación de datos | 🟢 | Tabla `data_classification` con 22 tablas etiquetadas. |
| P3-9 | Sin Right-to-be-Forgotten | 🟢 | `POST /api/gdpr/forget` con audit log + soft delete + purge en 30 días. |

---

## Sprint 4 · Optimización + DX (2 semanas)

- Tests smoke + integration top-5 flujos (3 días)
- Modularizar Worker (cierra P1-3 si no se hizo antes) (3 días)
- Abstracción providers (cierra P1-10) (2 días)
- Migración TS strict de `src/components` y `src/pages` (5 días en total a lo largo del sprint)

---

## Criterio de "done" de toda la auditoría

Cuando se cierran TODOS los items P0-P3 y se vuelven a correr las verificaciones del informe original con resultados:

| Métrica | Hoy | Target final |
|---|---|---|
| Hallazgos P0 abiertos | 7 | 0 |
| Tenants cross-leak via ANON | Sí | No |
| Lighthouse a11y | <30 | >90 |
| Bundle inicial JS | >1.5MB | <300KB |
| Tests coverage | ~5% | >40% |
| SOC 2 Type II readiness | 0% | 70% |
| Time-to-detect incidente | manual | <5min |

---

## Cómo registrar avances

1. Marcar el ítem aquí (🟢 / fecha de close).
2. Commit con prefix conventional `feat(sprint-N)`, `fix(P0-X)`, `chore(sprint-N)`.
3. Update `_backups/onboardings/auditoria-arquitectura-2026-05-18.md` solo si cambia el alcance del plan (no por progreso).
4. Tag de release al cerrar cada Sprint: `audit-sprint-0-done`, `audit-sprint-1-done`, etc.

---

**Última actualización:** 2026-05-18 (Claude Code · branch `claude/audit-sprint-0`)
