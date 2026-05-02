# Supabase Setup Instructions - Executive Insights Jobs Table

## 📋 PASO A PASO (5 minutos)

### 1. Abrir Supabase SQL Editor

🔗 **URL Directa:**  
https://supabase.com/dashboard/project/iszodrpublcnsyvtgjcg/sql/new

O navega manualmente:
1. Ve a https://supabase.com/dashboard
2. Selecciona proyecto: `wekall-intelligence` (ID: iszodrpublcnsyvtgjcg)
3. En el menú izquierdo: **SQL Editor**
4. Haz clic en **"New query"**

---

### 2. Copiar SQL

Abre el archivo: **`supabase-jobs-table.sql`**

O copia directamente de aquí:

```sql
CREATE TABLE IF NOT EXISTS executive_insights_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT,
  file_size_bytes INTEGER,
  status TEXT NOT NULL DEFAULT 'queued',
  progress INTEGER DEFAULT 0,
  message TEXT,
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  processing_time_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_jobs_client_id ON executive_insights_jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON executive_insights_jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON executive_insights_jobs(created_at DESC);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON executive_insights_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE executive_insights_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own jobs"
  ON executive_insights_jobs
  FOR SELECT
  USING (auth.uid()::text = client_id OR client_id IN (
    SELECT client_id FROM client_branding WHERE true
  ));

CREATE POLICY "Service role full access"
  ON executive_insights_jobs
  FOR ALL
  USING (auth.role() = 'service_role');
```

---

### 3. Pegar y Ejecutar

1. **Pega** el SQL en el editor
2. Haz clic en **"Run"** (botón verde abajo a la derecha)
3. **Espera** ~2-5 segundos
4. **Verifica** que aparezca: ✅ **"Success. No rows returned"**

---

### 4. Verificar Tabla Creada

1. En el menú izquierdo: **Table Editor**
2. Busca tabla: `executive_insights_jobs`
3. Deberías ver la estructura con todas las columnas:
   - id
   - client_id
   - file_name
   - status
   - progress
   - result
   - etc.

---

## ✅ Confirmación

Una vez ejecutado, la tabla está lista para recibir jobs.

**Siguiente paso:** Configurar credenciales Upstash Redis.
