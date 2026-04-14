# WeKall Intelligence — AUDIT-ISSUES.md
> Auditoría V20 · 2026-04-13 · Issues para revisión manual

---

## Issues que requieren decisión de arquitectura o acción externa

### 🔴 CRITICAL — Seguridad

#### C-1: Credenciales hardcodeadas en supabase.ts (MITIGADO pero pendiente)
- **Archivo:** `src/lib/supabase.ts:3-4`
- **Estado:** Mitigado — ahora usa `import.meta.env.VITE_SUPABASE_URL` con fallback
- **Acción requerida:** Mover las keys al `.env.local` / Cloudflare Pages secrets y remover los fallbacks hardcodeados en la próxima release.
- **Nota:** La `SUPABASE_ANON_KEY` es una "publishable key" (prefijo `sb_publishable_`) diseñada para ser pública, pero el URL tampoco debe quedar en source.

#### C-2: Passwords de demo en Login.tsx (CORREGIDO)
- **Archivo:** `src/pages/Login.tsx:9-10`  
- **Estado:** Corregido — passwords ahora leen de `VITE_PRESET_CREDIMINUTO_PWD` y `VITE_PRESET_WEKALL_PWD`
- **Acción requerida:** Agregar los valores a `.env.local` para desarrollo y a Cloudflare Pages secrets para producción. Los presets de demo deberían usar cuentas dedicadas con acceso limitado (no cuentas de CEO).

---

### 🟠 HIGH — Multi-tenant integrity

#### H-1: `getRecentAlertLog` no filtra por client_id
- **Archivo:** `src/lib/supabase.ts:289`
- **Descripción:** La query a `alert_log` no incluye filtro `client_id`. En producción con múltiples clientes activos, los alertas de un cliente podrían aparecer en el dashboard de otro.
- **Fix sugerido:** Agregar `client_id` como parámetro obligatorio y filtrar en la query, o implementar RLS a nivel Supabase para filtrado automático.
- **Workaround actual:** El Worker proxy podría filtrar por session, pero no es suficiente para garantizar isolation.

#### H-2: `getVickyHistory` no filtra por client_id  
- **Archivo:** `src/lib/supabase.ts:327`
- **Descripción:** La query a `vicky_conversations` solo filtra por `session_id` (opcional). Sin este filtro, la historia de conversaciones no está aislada por cliente.
- **Fix sugerido:** Agregar `client_id` como parámetro obligatorio.

#### H-3: Default fallback `client_id = 'credismart'` en funciones públicas
- **Archivos:** `src/lib/supabase.ts:142,159,164,169,280,320`
- **Descripción:** Varias funciones tienen `clientId = 'credismart'` como valor por defecto. Si se invocan sin pasar `clientId` explícito, retornarán datos de Crediminuto a cualquier cliente.
- **Fix sugerido:** Remover el default y hacer el parámetro obligatorio. Actualizar todos los call sites para pasar `clientId` desde el contexto.

---

### 🟡 MEDIUM — Performance

#### M-1: Chunk `index-*.js` supera 600KB (677KB min)
- **Descripción:** El bundle principal es demasiado grande. La advertencia de Vite sugiere code-splitting con dynamic imports.
- **Fix sugerido:** Usar `React.lazy()` + `Suspense` para las páginas pesadas (Overview, VickyInsights, DocumentAnalysis). Ya hay `manualChunks` en `vite.config.ts` pero el código de la app sigue monolítico.

#### M-2: VickyInsights.tsx tiene 1,915 líneas
- **Descripción:** Componente extremadamente largo. Debería splittearse en hooks custom y sub-componentes.
- **Candidatos a extraer:** lógica de audio/recording, lógica de conversación, panel de KPIs de impacto.

#### M-3: `pdfjs-dist` usa `eval()` en el bundle
- **Descripción:** Advertencia de Vite al compilar. El paquete `pdfjs-dist/legacy/build/pdf.js` usa `eval()` lo que puede causar problemas en CSP estrictos.
- **Fix sugerido:** Usar `pdfjs-dist/build/pdf.js` (versión moderna) o el worker asíncrono oficial de PDF.js.

---

### 🔵 LOW — Deuda técnica

#### L-1: Fast-refresh warnings en UI components (shadcn/ui)
- **Archivos:** `badge.tsx`, `button.tsx`, `form.tsx`, `navigation-menu.tsx`, `sidebar.tsx`, `sonner.tsx`, `toggle.tsx`
- **Descripción:** Archivos de la librería UI de shadcn/ui exportan tanto componentes como constantes/variantes, lo que viola la regla de fast-refresh. Esto es inherente al patrón de shadcn/ui.
- **Fix sugerido:** Separar las variantes a archivos `*-variants.ts` dedicados. Bajo impacto en producción.

#### L-2: Datos de clientes reales en comentarios de código
- **Archivos:** `src/data/mockData.ts:2`, `src/pages/Equipos.tsx:87`
- **Descripción:** Referencias a "Crediminuto Colombia S.A.S" y "CrediSmart SAS" en comentarios y strings. No son credenciales pero podrían revelar relaciones comerciales en un repo público.
- **Fix sugerido:** Usar nombres genéricos en strings visibles ("Cliente Demo" o "FinCo Demo").

#### L-3: `insertAlertLog` fallback a 'credismart'
- **Archivo:** `src/lib/supabase.ts:283`
- **Descripción:** `client_id: entry.client_id ?? 'credismart'` — fallback hardcodeado en escritura a Supabase.
- **Fix sugerido:** Lanzar error si `client_id` no está presente en lugar de usar fallback.

---

## Resumen de lo corregido en esta auditoría

| # | Archivo | Severidad | Fix aplicado |
|---|---------|-----------|--------------|
| 1 | `src/lib/supabase.ts` | CRITICAL | Credenciales → env vars |
| 2 | `src/pages/Login.tsx` | CRITICAL | Passwords → env vars |
| 3 | `src/components/InfoTooltip.tsx:55` | HIGH | `no-unused-expressions` → if/else |
| 4 | `src/components/ui/command.tsx:24` | MEDIUM | `no-empty-object-type` → type alias |
| 5 | `src/components/ui/textarea.tsx:5` | MEDIUM | `no-empty-object-type` → type alias |
| 6 | `src/pages/DocumentAnalysis.tsx:51` | LOW | `no-useless-escape` → `\/` → `/` en regex |
| 7 | `src/pages/UploadRecording.tsx:41` | MEDIUM | Empty catch block documentado |
| 8 | `src/components/KPICard.tsx:86` | MEDIUM | `any` → `SparkDotProps` interface |
| 9 | `src/pages/Equipos.tsx:39` | MEDIUM | `any` → `LineDotProps` interface |
| 10 | `src/pages/Overview.tsx` (×6) | MEDIUM | `any` → `ChartDotProps` / `TrendItem` |
| 11 | `src/pages/Alertas.tsx:329` | MEDIUM | `thresholds` → `useMemo` + dep array |
| 12 | `src/pages/ChatRAG.tsx:84` | LOW | `messages.length` agregado a deps |
| 13 | `src/pages/DocumentAnalysis.tsx:374` | MEDIUM | `CDR_CONTEXT`, `clientName`, etc. → deps |
| 14 | `src/pages/VickyInsights.tsx:631` | LOW | `eslint-disable` documentado |
| 15 | `src/contexts/ClientContext.tsx:227` | LOW | Directive innecesaria removida |
| 16 | `.env.example` | HIGH | Creado con documentación de env vars |

**Build final:** ✅ 0 errores TypeScript · 0 errores ESLint · 9 warnings (todos en shadcn/ui boilerplate — no accionables)
