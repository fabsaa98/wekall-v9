# CLAUDE.md — wekall-intelligence

> Reglas de coexistencia para todo agente IA (Claude Code, GlorIA AI, futuros agentes) que trabaje este repo. Quien lea este archivo lo aplica. Si una instrucción del prompt contradice algo de acá, gana este archivo.

---

## Identidad del repo

- **Producto:** WeKall Intelligence — Business Intelligence for CEOs & C-Suite
- **Owner:** Fabián Saavedra (fabsaa98)
- **Lead developer agent:** **GlorIA AI** (corre en Mac vía OpenClaw, controlada por voz desde WhatsApp)
- **Agentes colaboradores:** Claude Code (Windows · sesiones puntuales), Felipe (humano, branch `felipe/dev`)
- **Decisión técnica final:** Fabián

GlorIA es la lead. Cualquier otro agente que abra este repo es **complementario**: no impone arquitectura, no refactoriza código de GlorIA sin pedido explícito de Fabián, no toma decisiones grandes sola.

---

## Tres invariantes innegociables

1. **Aislamiento** — ningún cambio llega a producción ni a archivos compartidos sin paso explícito de Fabián.
2. **No-regresión** — el entorno de GlorIA (código, deps, secrets, DB, deploys) no cambia silenciosamente entre sesiones.
3. **Captura sin re-trabajo** — todo avance queda publicado en GitHub de forma que cualquier otro agente lo incorpore con `git fetch` + merge de PR, sin rehacer.

Si una tarea requiere violar alguna de las 3, **parar y pedir autorización a Fabián**.

---

## Reglas de Git

### Prohibido

- `git push origin main` (touch directo a main)
- `git push --force` / `--force-with-lease` a branches publicadas
- `git reset --hard` sobre branches publicadas
- `git rebase` o `git merge` desde branches ajenas (`gloria/*`, `felipe/*`, `backup/*`, `gh-pages`) hacia las propias, sin permiso
- Borrar branches remotas
- Commitear lockfiles modificados sin propósito (`bun.lock`, `bun.lockb`, `package-lock.json` divergen entre agentes y generan ruido)
- Modificar sin pedido: `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `.env.production`, `worker/wrangler.toml`, `supabase/migrations/*.sql`, `ARQUITECTURA.md`, archivos `SCALE-*.md` y `V*.md` (bitácora de GlorIA)

### Permitido

- Trabajar en branch propia con prefijo de agente:
  - `gloria/*` → trabajo de GlorIA desde Mac
  - `felipe/*` → trabajo de Felipe
  - `claude/*` → trabajo de Claude Code desde Windows
- Commit pequeño + push inmediato (no acumular trabajo local)
- PR a `main` con descripción completa (qué + por qué + cómo probarlo + qué archivos toca + qué NO toca)
- Conventional Commits obligatorios
- Label en PRs según agente: `from-claude-code`, `from-gloria`, etc.

`main` solo recibe merges vía PR aprobado por Fabián.

---

## Reglas de Infraestructura

### Prohibido

| Recurso | Acción prohibida |
|---|---|
| Cloudflare Worker `wekall-vicky-proxy` | `wrangler deploy`, `wrangler secret put/delete` |
| Cloudflare Pages `wekall-intelligence` | `wrangler pages deploy` |
| Worker secundario `wekall-jobs-worker` | mismo: deploy y secret management bloqueados |
| Supabase tablas productivas | `INSERT/UPDATE/DELETE` con `SUPABASE_SERVICE_KEY` |
| Supabase Auth | crear/borrar usuarios reales |
| Upstash Redis | pushear jobs falsos, borrar la queue |
| Scripts `onboard_client.py` · `create_auth_user.py` · `apply_fix_voicebot.py` | ejecutar contra prod |

### Permitido

| Recurso | Acción permitida |
|---|---|
| Cloudflare Worker | `wrangler dev` (local), `wrangler tail` (logs read-only) |
| Cloudflare Pages preview | OK — cada push a branch `claude/*`, `gloria/*`, etc. genera preview URL aislado |
| Supabase REST | `SELECT` con anon key + RLS (mismo nivel que el frontend) |
| Scripts de backend | leer el código para auditar |
| Dev local | `npm run dev` (o `bun dev`) |

Si una tarea requiere romper alguna prohibición → **parar y pedir autorización a Fabián**.

---

## Pre-flight (al empezar cada sesión)

```bash
git fetch --all --prune
git status
git log --oneline -10 origin/main      # ver actividad reciente del lead agent
git branch -a --sort=-committerdate | head -20
```

Si hay commits nuevos de otro agente en archivos que pensaba tocar → preguntar a Fabián antes de avanzar.

## End-of-session

```bash
git status                              # nada sin commitear
git push origin <branch>                # nada queda solo en local
gh pr status                            # PR abierto con descripción clara
```

Si quedó WIP, dejarlo como commit `wip:` pusheado y notificar a Fabián. **Nada queda solo en una máquina.**

---

## Captura inversa (otro agente toma los avances)

Para que cualquier agente al volver al repo pueda absorber el trabajo del resto sin re-trabajo:

```bash
git fetch --all --prune
gh pr list --label from-claude-code     # o el label del agente que sea
gh pr view <PR#>
gh pr merge <PR#>                       # squash o merge según prefiera el lead
```

Cada PR debe ser **autocontenido**: descripción explica qué + por qué + cómo probarlo + archivos tocados + archivos NO tocados. Cero adivinanzas.

---

## Convenciones de marca y voz

Aplican las reglas del **WeKall Brand System v1.2.0**:

- "WeKall" — una palabra, K mayúscula. Nunca "Wekall", "WEKALL".
- Productos: Business Phone · Engage 360 · Messenger Hub · Vicky AI · Notes AI · Truecaller for Business. **Celeru NO es WeKall.**
- Voz: primera persona del plural ("En WeKall…"), pronombre "Tú", cifras concretas.
- Prohibidos: "modular", "sinergias", "soluciones integrales", "valor agregado", "potenciar", "rumbo al éxito".
- Capa visual: este producto es **Capa C — Tier ejecutivo** (warm beige + WeKall deep purple). Sin sparkles, sin gradientes saturados.

Detalle completo: skill `wekall-brand-guardian`.

---

## Cuando dudes

1. Sobre arquitectura del producto → leer `ARQUITECTURA.md` (autoría GlorIA).
2. Sobre el sprint o fase actual → leer el `SCALE-*.md` o `V*.md` más reciente.
3. Sobre integración Supabase → leer `SUPABASE-SETUP-INSTRUCTIONS.md`.
4. Sobre el Worker → leer `worker/index.js` y `worker/wrangler.toml`.
5. Si no encontrás respuesta → preguntarle a Fabián antes de improvisar.

---

> Documentación viva. Editar solo con PR aprobado por Fabián. Última actualización: 2026-05-14 (initial commit · Claude Code).
