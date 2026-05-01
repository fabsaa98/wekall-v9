# WeIntelligence API — Cloudflare Pages Functions

**Arquitectura:** World-class, edge-first, type-safe backend  
**Deploy:** Automatic con Cloudflare Pages  
**Latency:** <50ms globally (edge computing)

---

## 🏗️ Arquitectura

```
Frontend (React + TypeScript)
    ↓ HTTPS
API Layer (Cloudflare Pages Functions)
    ├─ /api/dashboard/*     → KPIs, metrics
    ├─ /api/transcriptions/* → Search, CRUD
    ├─ /api/agents/*        → Stats, rankings
    └─ /api/vicky/*         → Chat, insights
    ↓
Data Layer
    ├─ Supabase (PostgreSQL + Functions)
    └─ Worker Proxy (Vicky, OpenAI)
```

---

## 📁 Estructura

```
functions/
├── _middleware.ts              # Global middleware (CORS, auth, logging)
│
├── api/
│   ├── dashboard/
│   │   ├── kpis.ts            # GET /api/dashboard/kpis
│   │   └── calls-per-day.ts   # GET /api/dashboard/calls-per-day
│   │
│   ├── agents/
│   │   └── stats.ts           # GET /api/agents/stats
│   │
│   ├── transcriptions/
│   │   └── index.ts           # GET /api/transcriptions (TODO)
│   │
│   └── vicky/
│       └── chat.ts            # POST /api/vicky/chat (TODO)
│
└── README.md (this file)
```

---

## 🚀 Endpoints Implementados

### Dashboard KPIs
**GET** `/api/dashboard/kpis?client_id=credismart`

**Response:**
```json
{
  "csat": 3.8,
  "fcr": 68.5,
  "escalaciones": 4.2,
  "tasa_conversion": 45.3,
  "costo_llamada": 2500,
  "recaudo_hoy": 12500000,
  "recaudo_mtd": 350000000,
  "mom_change": 12.5,
  "yoy_change": null,
  "last_updated": "2026-04-30T19:00:00.000Z"
}
```

**Cache:** 5 minutos

---

### Calls Per Day
**GET** `/api/dashboard/calls-per-day?client_id=credismart`

**Response:**
```json
[
  { "date": "2026-04-24", "label": "Lun", "calls": 892 },
  { "date": "2026-04-25", "label": "Mar", "calls": 915 },
  ...
]
```

**Cache:** 10 minutos

---

### Agent Stats
**GET** `/api/agents/stats?client_id=credismart&limit=10&sort_by=llamadas_total`

**Query params:**
- `client_id` (default: credismart)
- `limit` (default: 10)
- `sort_by` (default: llamadas_total)

**Response:**
```json
[
  {
    "agent_name": "Caren Natalia Antolinez Rodriguez",
    "llamadas_total": 3518,
    "contactos": 1380,
    "promesas": 665,
    "tasa_contacto": 39.2,
    "tasa_promesa": 48.2,
    "csat": 3.42,
    "fcr": 72.1,
    "aht_segundos": 485
  },
  ...
]
```

**Cache:** 5 minutos

---

## 🔐 Environment Variables

Cloudflare Pages requiere estas variables en **Settings → Environment variables**:

```bash
# Production
SUPABASE_URL=https://iszodrpublcnsyvtgjcg.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Preview (optional)
SUPABASE_URL_PREVIEW=...
SUPABASE_SERVICE_KEY_PREVIEW=...
```

**IMPORTANTE:** Usar **Service Key** (no Anon Key) para bypassear RLS.

---

## 🛠️ Development Local

```bash
# Install dependencies
npm install

# Run dev server (simula Cloudflare Pages)
npx wrangler pages dev dist --port 8788

# Build frontend + functions
npm run build
```

**Nota:** Cloudflare Pages auto-detecta `/functions` y las deploya como serverless.

---

## 📊 Best Practices Implementadas

### 1. **Separation of Concerns**
- Frontend: UI/UX only
- API: Business logic, data transformation
- DB: Data persistence

### 2. **Type Safety**
- TypeScript end-to-end
- Typed request/response interfaces
- Compile-time error detection

### 3. **Performance**
- Edge computing (Cloudflare global network)
- HTTP caching headers (`Cache-Control`)
- Parallel queries (`Promise.all`)

### 4. **Security**
- Service Key NOT exposed to frontend
- CORS properly configured
- Input validation (TODO: add Zod)

### 5. **Observability**
- Request logging in middleware
- Response time headers (`X-Response-Time`)
- Error tracking (TODO: integrate Sentry)

### 6. **Scalability**
- Stateless functions
- Horizontal scaling automatic
- No cold starts (edge)

---

## 📝 TODO / Roadmap

### High Priority
- [ ] `/api/transcriptions` endpoints (search, CRUD)
- [ ] `/api/vicky/chat` proxy to Worker
- [ ] Input validation with Zod
- [ ] Rate limiting per client_id

### Medium Priority
- [ ] Authentication middleware (Supabase Auth)
- [ ] Caching layer (Cloudflare KV)
- [ ] Error tracking (Sentry integration)
- [ ] OpenAPI/Swagger docs

### Low Priority
- [ ] GraphQL endpoint (optional)
- [ ] WebSocket support (real-time)
- [ ] Multi-region failover

---

## 🔄 Deploy

**Automatic:** Cloudflare Pages auto-deploys on git push

**Manual:**
```bash
npx wrangler pages deploy dist
```

**URL:** https://weintelligence.pages.dev

---

## 📚 Referencias

- [Cloudflare Pages Functions Docs](https://developers.cloudflare.com/pages/platform/functions/)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript/introduction)
- [TypeScript Best Practices](https://typescript-eslint.io/docs/)

---

_Built with ❤️ by GlorIA — 30 Apr 2026_
# Deploy trigger para activar env vars - Thu Apr 30 15:28:22 -05 2026
