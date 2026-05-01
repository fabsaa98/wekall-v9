# MIGRACIÓN A API BACKEND — Estado

## ✅ COMPLETADO

### ClientContext.tsx
- ✅ Usa `/api/client/config` en vez de Supabase directo
- ✅ Branding mapeado desde client_config

### useCDRDataAPI.ts
- ✅ Ya existe y usa `/api/cdr/daily-aggregated`
- ✅ Overview.tsx lo usa

### api.ts
- ✅ getClientConfig
- ✅ getClientCampaigns
- ✅ getDashboardKPIs
- ✅ getCallsPerDay
- ✅ getAgentStats
- ✅ getTranscriptions
- ✅ sendMessage (Vicky)

---

## ⏳ PENDIENTE DE MIGRAR

### VickyChatHistory.tsx
**Usa:** Supabase directo para conversaciones  
**Migrar a:** `/api/vicky/conversations` (crear endpoint)

### useTranscriptions.ts
**Usa:** Supabase directo  
**Migrar a:** Ya usa `api.getTranscriptions` ✅ (verificar)

### Alertas.tsx
**Usa:** Supabase directo para alertas  
**Migrar a:** `/api/alerts` (crear endpoints)

### Equipos.tsx
**Usa:** Supabase directo para agents  
**Migrar a:** `/api/agents` o usar `/api/agents/stats`

### FunnelCobranza.tsx
**Usa:** Props de Overview (OK, no consulta directo)

### Configuracion.tsx
**Usa:** Supabase directo para settings  
**Migrar a:** `/api/settings` (crear endpoints)

---

## 📋 PRIORIDADES

**CRÍTICO (hacer HOY):**
1. ✅ ClientContext.tsx
2. VickyChatHistory.tsx (si se usa Vicky)

**IMPORTANTE (hacer mañana):**
3. Alertas.tsx
4. Equipos.tsx
5. Configuracion.tsx

**BAJO (puede esperar):**
6. Admin.tsx (admin tasks)
7. Helper libraries (proactiveInsights, vickyCalculations)

---

## 🚫 NO MIGRAR (Auth legítimo)

- Login.tsx
- Logout.tsx
- ForgotPassword.tsx
- ResetPassword.tsx
- App.tsx (auth check)
