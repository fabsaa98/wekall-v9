# ADR 0001 · Frontera de responsabilidades del estado en frontend

**Estado:** Aceptado · 2026-05-18
**Sprint:** 2 · P2-6
**Autor:** Claude Code (audit) + Fabián
**Aplica a:** `src/` de wekall-intelligence

## Contexto

La auditoría 2026-05-18 (`_backups/onboardings/auditoria-arquitectura-2026-05-18.md`) marcó como hallazgo P2-6 que el estado global del frontend está disperso:

- `TanStack Query` para fetch / cache de server data
- `Zustand` para UI state (no claro qué)
- `React Context` para auth + role + client activo
- Props drilling 4 niveles en algunas vistas
- `localStorage` con strings sin tipar (`wki_client_id`, `vicky_session`, etc.)
- Algunos hooks tienen su propio cache que duplica el de TanStack Query

Esto genera bugs sutiles: una mutación actualiza un store y no el otro, el JWT se refresca pero el contexto del cliente activo queda stale, etc. Es una de las razones de la página Financial que crasheó.

## Decisión

Definir **4 zonas claras** de estado y un wrapper para localStorage:

### 1. Server state → TanStack Query (única fuente)

Todo lo que viene de la API (`/api/dashboard/*`, `/api/transcriptions/*`, etc.) vive en TanStack Query. **Sin excepciones**:

- `useApiCall()` se ofrece como atajo procedural pero internamente delega a `fetch` + estado local. Para casos donde TanStack Query agrega complejidad innecesaria (mutations one-off, polling muy custom).
- Para data sharing entre componentes → TanStack Query (`useQuery`).

**Reglas:**
- `staleTime` por defecto 60_000 ms (1 min).
- `retry: 1` y `refetchOnWindowFocus: false` salvo data crítica.
- Invalidar cache tras mutaciones con `queryClient.invalidateQueries(['key'])`.

### 2. UI state global → Zustand

Estado que **no es server data** y debe ser global:
- Tema (light/dark) + accent color
- Sidebar abierto/cerrado
- Toasts queue
- Filtros persistentes de la sesión (no de la URL)

**Reglas:**
- Un store por dominio (`useThemeStore`, `useSidebarStore`, `useFiltersStore`).
- No mezclar UI state con server state en el mismo store.

### 3. Auth + tenant context → React Context

- `RoleContext` — rol del usuario activo
- `ClientContext` — tenant activo (cuando hay multi-tenant switch)
- `AuthContext` — sesión Supabase (envuelve `supabase.auth.getSession()`)

**Reglas:**
- Los Context Providers viven al tope del árbol (`App.tsx`).
- Cada Context expone un hook (`useRole()`, `useClient()`, `useAuth()`).
- No leen ni escriben en `localStorage` directamente — usan el wrapper de la zona 4.

### 4. Persistencia browser → `storage<T>()` wrapper tipado

Hoy:
```ts
localStorage.setItem('wki_client_id', JSON.stringify({ id: 'saludtotal' }));
const raw = localStorage.getItem('wki_client_id');
const parsed = JSON.parse(raw || '{}'); // sin tipo, sin guard
```

Después:
```ts
const clientStorage = storage<{ id: string }>('wki_client_id');
clientStorage.set({ id: 'saludtotal' });
const c = clientStorage.get(); // tipo: { id: string } | null
```

**API:**
```ts
function storage<T>(key: string, opts?: { session?: boolean }): {
  get(): T | null;
  set(value: T): void;
  remove(): void;
};
```

- `opts.session = true` → usa `sessionStorage` en lugar de `localStorage`.
- Falla silencioso si quota exceeded (logea a observability).
- Validación opcional con schema (ver `schemas.ts`).

## Migración

1. **Sprint 2 (esta entrega):** ADR + helper `storage<T>()`.
2. **Sprint 3 (siguiente):**
   - Auditar todos los `localStorage.*` directos y migrar al wrapper.
   - Auditar Zustand stores y mover los que en realidad son server state a TanStack Query.
3. **Sprint 4:** Linter rule custom (eslint-plugin-no-direct-storage) para evitar regresiones.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| **Redux Toolkit** | Demasiada ceremonia para un proyecto de este tamaño. TanStack + Zustand + Context cubren todo con menos código. |
| **Jotai / Recoil** | Reemplazar Zustand con Jotai sería simétrico. Pero Zustand ya está adoptado, switching tiene costo. |
| **Solo React Context** | Performance — Context re-renderiza todo el árbol. TanStack Query y Zustand tienen selectors. |
| **Server state en Context** | Falla en cache invalidation y revalidation. TanStack Query es estándar de la industria. |

## Consecuencias

- **+** Cada pieza de estado tiene un único lugar canónico.
- **+** Los bugs de "stale data tras mutation" se reducen porque siempre se invalida la cache correcta.
- **+** El onboarding de devs nuevos baja de 2 días a 4 horas (saben dónde buscar cada estado).
- **−** Migración tiene fricción: hay ~30 usos directos de `localStorage` y ~5 stores Zustand que hay que revisar.
- **−** El equipo tiene que aprender la convención. ADR + linter ayudan.

## Métricas de éxito

- Después de Sprint 3: `git grep "localStorage\." src/` < 5 (solo el wrapper).
- Después de Sprint 4: cobertura de tests para los stores Zustand > 70%.
- Reducción de bugs "data stale" reportados a través del backlog.

## Referencias

- Auditoría 2026-05-18 (`_backups/onboardings/auditoria-arquitectura-2026-05-18.md`) hallazgo P2-6.
- Hook `useApiCall` (`src/hooks/useApiCall.ts`) — interim solution antes de migración completa a TanStack Query.
- `src/contexts/RoleContext.tsx`, `src/contexts/ClientContext.tsx` — implementaciones actuales.
