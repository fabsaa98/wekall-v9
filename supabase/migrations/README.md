# Supabase Migrations - WeIntelligence

## Executive Insights Table

**Archivo:** `executive_insights.sql`  
**Fecha:** 01 de mayo de 2026  
**User Story:** US-EI-006 (Scale-H)

### Aplicar migración

**Opción 1: Supabase Dashboard (SQL Editor)**

1. Ir a: https://supabase.com/dashboard/project/iszodrpublcnsyvtgjcg/sql/new
2. Copiar contenido de `executive_insights.sql`
3. Ejecutar query
4. Verificar tabla creada: `public.executive_insights`

**Opción 2: Supabase CLI (local)**

```bash
# Desde raíz del proyecto
supabase db push
```

### Verificar tabla creada

```sql
-- Ver estructura de tabla
\d public.executive_insights

-- Verificar RLS policies
SELECT * FROM pg_policies WHERE tablename = 'executive_insights';

-- Verificar indexes
SELECT * FROM pg_indexes WHERE tablename = 'executive_insights';
```

### Schema Overview

```
executive_insights (tabla principal)
├─ id (UUID, PK)
├─ client_id (TEXT, FK → clients.client_id)
├─ file_name (TEXT)
├─ file_type (TEXT: audio|pdf|excel|word|image|whatsapp)
├─ file_size_bytes (INTEGER)
├─ extracted_text (TEXT)
├─ analysis (TEXT) ← Análisis completo de Vicky
├─ executive_brief (TEXT) ← Brief de 100 palabras
├─ whatsapp_participants (TEXT[])
├─ whatsapp_message_count (INTEGER)
├─ sources (TEXT[])
├─ uploaded_by (TEXT)
├─ created_at (TIMESTAMPTZ)
├─ updated_at (TIMESTAMPTZ)
└─ deleted_at (TIMESTAMPTZ) ← Soft delete
```

### Indexes

- `idx_executive_insights_client_id` → Performance queries por cliente
- `idx_executive_insights_created_at` → Ordenamiento cronológico DESC
- `idx_executive_insights_deleted_at` → Filtrado de no-eliminados
- `idx_executive_insights_file_type` → Filtros por tipo de documento

### RLS Policies

1. **SELECT:** Usuarios pueden leer insights de sus clientes
2. **INSERT:** Usuarios pueden crear insights para sus clientes
3. **UPDATE:** Usuarios pueden actualizar insights de sus clientes
4. **Soft-delete:** UPDATE con `deleted_at = NOW()`

### Trigger

**`trigger_executive_insights_updated_at`**
- Actualiza `updated_at` automáticamente en cada UPDATE

---

## Rollback

```sql
-- CUIDADO: Esto elimina la tabla y todos los datos
DROP TABLE IF EXISTS public.executive_insights CASCADE;
```

---

**Siguiente migración:** TBD (Epic 2 avanzado)
