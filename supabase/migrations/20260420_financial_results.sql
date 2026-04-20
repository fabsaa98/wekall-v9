-- Migration: Create financial_results table for WeKall Intelligence
-- Run this in Supabase SQL Editor or via CLI

CREATE TABLE IF NOT EXISTS public.financial_results (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id text REFERENCES public.client_config(client_id),
  fecha date NOT NULL,
  campana text,
  promesas_pago integer DEFAULT 0,
  monto_prometido_cop bigint DEFAULT 0,
  monto_recaudado_cop bigint DEFAULT 0,
  tasa_cumplimiento_pct numeric DEFAULT 60.0,
  ticket_promedio_cop integer DEFAULT 160000,
  fuente text DEFAULT 'estimado' CHECK (fuente IN ('estimado', 'manual', 'webhook')),
  notas text,
  created_at timestamptz DEFAULT now()
);

-- Index for fast lookups by client + period
CREATE INDEX IF NOT EXISTS idx_financial_results_client_fecha 
  ON public.financial_results(client_id, fecha);

-- RLS: allow service role full access, anon read only for own client
ALTER TABLE public.financial_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_full_access" ON public.financial_results
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "anon_read_own_client" ON public.financial_results
  FOR SELECT TO anon USING (true);
