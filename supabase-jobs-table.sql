-- Tabla para Executive Insights Job Queue
-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS executive_insights_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT,  -- Supabase Storage URL (opcional si se guarda en binary)
  file_size_bytes INTEGER,
  status TEXT NOT NULL DEFAULT 'queued',  -- queued, processing, completed, failed
  progress INTEGER DEFAULT 0,  -- 0-100
  message TEXT,  -- Mensaje de estado para el usuario
  result JSONB,  -- { analysis, executiveBrief, benchmarks, sources }
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  processing_time_ms INTEGER  -- Tiempo total de procesamiento
);

-- Índices para queries rápidas
CREATE INDEX IF NOT EXISTS idx_jobs_client_id ON executive_insights_jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON executive_insights_jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON executive_insights_jobs(created_at DESC);

-- Trigger para actualizar updated_at automáticamente
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

-- Row Level Security (RLS) - ajustar según tu política de auth
ALTER TABLE executive_insights_jobs ENABLE ROW LEVEL SECURITY;

-- Política ejemplo: usuarios autenticados pueden ver sus propios jobs
CREATE POLICY "Users can view own jobs"
  ON executive_insights_jobs
  FOR SELECT
  USING (auth.uid()::text = client_id OR client_id IN (
    SELECT client_id FROM client_branding WHERE true  -- Todos los clientes configurados
  ));

-- Política: API service role puede insertar/actualizar
CREATE POLICY "Service role full access"
  ON executive_insights_jobs
  FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE executive_insights_jobs IS 'Job queue para análisis de documentos con Vicky (Executive Insights)';
