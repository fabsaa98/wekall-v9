-- Scale-H US-EI-009: Benchmark Comparator
-- Agregar columna para almacenar benchmarks extraídos del documento
-- 01 de mayo de 2026

ALTER TABLE public.executive_insights
ADD COLUMN IF NOT EXISTS benchmarks JSONB;

-- Index para búsquedas en benchmarks
CREATE INDEX IF NOT EXISTS idx_executive_insights_benchmarks
  ON public.executive_insights USING GIN (benchmarks);

-- Comment
COMMENT ON COLUMN public.executive_insights.benchmarks IS 'Benchmarks extraídos del documento en formato JSON: metric, benchmark_value, source, top_quartile, bottom_quartile, unit';

-- Ejemplo de estructura JSONB:
-- {
--   "metrics": [
--     {
--       "metric": "tasa_contacto",
--       "benchmark_value": 60,
--       "benchmark_source": "promedio industria LATAM",
--       "top_quartile": 75,
--       "bottom_quartile": 45,
--       "unit": "%",
--       "current_value": 68.5,
--       "gap_percent": 14.2,
--       "position": "above" | "below" | "inline"
--     }
--   ]
-- }
