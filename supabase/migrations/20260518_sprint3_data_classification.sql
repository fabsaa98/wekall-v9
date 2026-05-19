-- ═══════════════════════════════════════════════════════════════════════════
-- Migration · 2026-05-18 · Sprint 3 · Data classification + retention
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Sprint 3 · P3-8 + P2-2.
--
-- Etiqueta cada tabla con su sensibilidad de datos y retention policy.
-- No bloquea operación; sirve para:
--   - Pasar audits SOC 2 / ISO 27001 / HIPAA preguntando "qué datos tienen y por cuánto".
--   - Implementar PII masking automático en export.
--   - Habilitar Right-to-be-Forgotten que purga las tablas correctas.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE IF NOT EXISTS public.data_classification (
  table_name text PRIMARY KEY,
  sensitivity text NOT NULL CHECK (sensitivity IN ('public','internal','confidential','restricted','pii')),
  pii_kinds text[] NOT NULL DEFAULT '{}',
  retention_days int NOT NULL DEFAULT 1825,    -- 5 años default · Habeas Data Colombia
  legal_basis text,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.data_classification (table_name, sensitivity, pii_kinds, retention_days, legal_basis, notes) VALUES
  ('app_users',                'pii',          ARRAY['email','name'],            1825, 'Habeas Data · consentimiento usuario',     'Datos del operador. Purgar al cancelar cuenta.'),
  ('transcriptions',           'pii',          ARRAY['voice','phone','cedula','transcript_text'], 1825, 'Habeas Data · ejecución contrato', 'Contienen PII del cliente final del tenant.'),
  ('transcripts',              'pii',          ARRAY['phone','cedula','transcript_text'], 1825, 'Habeas Data',                          'Tabla legacy de transcripciones.'),
  ('vicky_conversations',      'confidential', ARRAY['transcript_text'],         365,  'Interés legítimo · auditoría modelo',      'Pueden contener fragmentos de PII en queries.'),
  ('alert_log',                'internal',     ARRAY[]::text[],                   730,  'Operación',                                ''),
  ('audit_log',                'restricted',   ARRAY['ip','email'],              2555, 'SOC 2 · ISO 27001',                        'Append-only. 7 años por compliance.'),
  ('client_config',            'confidential', ARRAY[]::text[],                   1825, 'Operación contractual',                    'Config sensible del tenant.'),
  ('client_branding',          'public',       ARRAY[]::text[],                  1825, 'Marketing',                                ''),
  ('cdr_daily_metrics',        'confidential', ARRAY[]::text[],                  1825, 'Operación',                                'Métricas agregadas.'),
  ('cdr_campaign_metrics',     'confidential', ARRAY[]::text[],                  1825, 'Operación',                                ''),
  ('cdr_hourly_metrics',       'confidential', ARRAY[]::text[],                  1825, 'Operación',                                ''),
  ('agents_performance',       'confidential', ARRAY['agent_name'],              1825, 'Operación',                                'Performance por agente.'),
  ('agents',                   'pii',          ARRAY['agent_name','email'],      1825, 'Habeas Data',                              ''),
  ('campaigns',                'internal',     ARRAY[]::text[],                  1825, 'Operación',                                ''),
  ('executive_insights_jobs',  'confidential', ARRAY['file_content'],            90,   'Operación',                                'TTL corto · solo necesarios para audit.'),
  ('executive_insights',       'confidential', ARRAY[]::text[],                  1825, 'Operación',                                ''),
  ('voicebot_metrics',         'confidential', ARRAY[]::text[],                  1825, 'Operación',                                ''),
  ('customer_journeys',        'pii',          ARRAY['phone','cedula'],          1825, 'Habeas Data',                              ''),
  ('channel_costs',            'confidential', ARRAY[]::text[],                  1825, 'Operación · contable',                     ''),
  ('qa_evaluations',           'confidential', ARRAY['agent_name'],              1825, 'Operación',                                ''),
  ('csat_responses',           'pii',          ARRAY['phone','email','comments'],1825, 'Habeas Data · consentimiento',             ''),
  ('nps_responses',            'pii',          ARRAY['phone','email','comments'],1825, 'Habeas Data · consentimiento',             '')
ON CONFLICT (table_name) DO UPDATE SET
  sensitivity = EXCLUDED.sensitivity,
  pii_kinds = EXCLUDED.pii_kinds,
  retention_days = EXCLUDED.retention_days,
  legal_basis = EXCLUDED.legal_basis,
  notes = EXCLUDED.notes,
  updated_at = now();

ALTER TABLE public.data_classification ENABLE ROW LEVEL SECURITY;

-- Acceso público de lectura (es metadata operacional)
CREATE POLICY "data_classification_read" ON public.data_classification
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "data_classification_service" ON public.data_classification
  FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE INSERT, UPDATE, DELETE ON public.data_classification FROM authenticated;

COMMIT;
