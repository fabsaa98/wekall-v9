-- Scale-H US-EI-006: Executive Insights Persistence
-- Tabla para guardar análisis de documentos ejecutivos
-- 01 de mayo de 2026

CREATE TABLE IF NOT EXISTS public.executive_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  
  -- Metadata del documento
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'audio', 'pdf', 'excel', 'word', 'image', 'whatsapp'
  file_size_bytes INTEGER,
  
  -- Contenido extraído
  extracted_text TEXT,
  
  -- Análisis Vicky
  analysis TEXT NOT NULL,
  executive_brief TEXT,
  
  -- Metadata WhatsApp (si aplica)
  whatsapp_participants TEXT[],
  whatsapp_message_count INTEGER,
  
  -- Sources
  sources TEXT[],
  
  -- Usuario que subió
  uploaded_by TEXT, -- email del CEO/usuario
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Soft delete
  deleted_at TIMESTAMPTZ,
  
  -- Indexes
  CONSTRAINT fk_client FOREIGN KEY (client_id) REFERENCES public.clients(client_id) ON DELETE CASCADE
);

-- Indexes para performance
CREATE INDEX IF NOT EXISTS idx_executive_insights_client_id ON public.executive_insights(client_id);
CREATE INDEX IF NOT EXISTS idx_executive_insights_created_at ON public.executive_insights(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_executive_insights_deleted_at ON public.executive_insights(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_executive_insights_file_type ON public.executive_insights(file_type);

-- RLS (Row Level Security)
ALTER TABLE public.executive_insights ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read insights for their client_id
CREATE POLICY "Users can read executive insights for their client"
  ON public.executive_insights
  FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM public.user_clients WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can insert insights for their client_id
CREATE POLICY "Users can insert executive insights for their client"
  ON public.executive_insights
  FOR INSERT
  WITH CHECK (
    client_id IN (
      SELECT client_id FROM public.user_clients WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can update insights for their client_id
CREATE POLICY "Users can update executive insights for their client"
  ON public.executive_insights
  FOR UPDATE
  USING (
    client_id IN (
      SELECT client_id FROM public.user_clients WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can soft-delete insights (set deleted_at)
CREATE POLICY "Users can soft-delete executive insights for their client"
  ON public.executive_insights
  FOR UPDATE
  USING (
    client_id IN (
      SELECT client_id FROM public.user_clients WHERE user_id = auth.uid()
    )
  );

-- Trigger: updated_at auto-update
CREATE OR REPLACE FUNCTION update_executive_insights_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_executive_insights_updated_at
  BEFORE UPDATE ON public.executive_insights
  FOR EACH ROW
  EXECUTE FUNCTION update_executive_insights_updated_at();

-- Comments
COMMENT ON TABLE public.executive_insights IS 'Executive Insights: Documentos estratégicos analizados por Vicky con brief ejecutivo';
COMMENT ON COLUMN public.executive_insights.executive_brief IS 'Brief de 100 palabras generado por GPT-4o: qué documento, hallazgo clave, acción recomendada, conexión con CDR';
COMMENT ON COLUMN public.executive_insights.deleted_at IS 'Soft delete timestamp. NULL = activo, NOT NULL = eliminado';
