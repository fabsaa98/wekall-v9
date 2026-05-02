-- Scale-H US-EI-013: Comentarios
-- Agregar columna para notas/comentarios en documentos
-- 01 de mayo de 2026

ALTER TABLE public.executive_insights
ADD COLUMN IF NOT EXISTS comments JSONB DEFAULT '{"notes": []}'::jsonb;

-- Comment
COMMENT ON COLUMN public.executive_insights.comments IS 'Comentarios y notas del usuario en formato JSON: { notes: [{ author, text, created_at }] }';

-- Ejemplo de estructura:
-- {
--   "notes": [
--     {
--       "author": "CEO",
--       "text": "Implementar esto en Q3 2026",
--       "created_at": "2026-05-01T10:00:00Z"
--     }
--   ]
-- }
