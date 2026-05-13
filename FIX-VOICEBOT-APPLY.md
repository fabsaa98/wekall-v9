# 🔧 FIX: get_channel_cost_comparison() — Eliminar referencia a voicebot_used

**Fecha:** 13 mayo 2026  
**Problema:** La RPC `get_channel_cost_comparison()` intenta leer la columna `voicebot_used` de `cdr_daily_metrics`, pero esa columna NO existe.  
**Impacto:** Dashboard P2 (Costo por Canal) falla al cargar.

---

## ✅ Solución Temporal (Fix Inmediato)

Modificar la función para **NO leer `voicebot_used`** y retornar **volúmenes en 0** hasta que agreguemos la columna.

**Archivo de migración:** `supabase/migrations/20260513_fix_channel_costs_voicebot.sql`

---

## 🚀 Aplicar Fix (2 opciones)

### **Opción 1: SQL Editor de Supabase (Recomendada)**

1. Ir a: https://supabase.com/dashboard/project/iszodrpublcnsyvtgjcg/sql/new
2. Copiar el contenido de `supabase/migrations/20260513_fix_channel_costs_voicebot.sql`
3. Pegar en el editor
4. Hacer clic en **RUN** (▶️)
5. Verificar que diga: "Success. No rows returned"

**Tiempo:** 30 segundos

---

### **Opción 2: psql desde terminal**

```bash
# Conectar a Supabase DB
psql "postgresql://postgres.iszodrpublcnsyvtgjcg:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

# Ejecutar migración
\i supabase/migrations/20260513_fix_channel_costs_voicebot.sql

# Verificar
SELECT proname FROM pg_proc WHERE proname = 'get_channel_cost_comparison';
```

**Nota:** Necesitas el password de la base de datos (lo encuentras en: Supabase Dashboard → Settings → Database → Connection string)

---

## ✅ Verificación Post-Fix

Ejecutar en SQL Editor:

```sql
-- Test: Debe retornar costos + volúmenes en 0
SELECT public.get_channel_cost_comparison('crediminuto');
```

**Resultado esperado:**
```json
{
  "costo_humano": 1363,
  "costo_vicky": 85,
  "ahorro_pct": 93.77,
  "volumen_vicky": 0,
  "volumen_humano": 0,
  "canales": [...]
}
```

---

## 📋 Solución a Largo Plazo (Próximo Sprint)

**Agregar columna `voicebot_used` a `cdr_daily_metrics`:**

```sql
-- Migración futura
ALTER TABLE public.cdr_daily_metrics 
ADD COLUMN voicebot_used BOOLEAN DEFAULT false;

-- Index para queries rápidas
CREATE INDEX idx_cdr_voicebot ON cdr_daily_metrics(client_id, voicebot_used, fecha);

-- Descomentar el SELECT original en get_channel_cost_comparison()
```

**Origen de datos:** Determinar cómo poblar `voicebot_used` (logs de Vicky, CDR tags, etc.)

---

## 🎯 Impacto

- ✅ Dashboard P2 funcionará inmediatamente
- ✅ Costos y ahorro porcentual se mostrarán correctamente
- ⚠️ Volúmenes en 0 hasta que agreguemos la columna (no afecta el valor de la demo)
- 🚀 Cliente puede ver ROI de Vicky vs humano SIN esperar migración de datos

---

**Estado:** ⏳ Pendiente de aplicar  
**Owner:** Fabián  
**Tiempo estimado:** 2 minutos
