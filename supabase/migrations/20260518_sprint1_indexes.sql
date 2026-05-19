-- ═══════════════════════════════════════════════════════════════════════════
-- Migration · 2026-05-18 · Sprint 1 · Índices de performance
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Sprint 1 · P1-1 y P1-2.
--
-- ANTES:
--  - search_transcriptions() hace cosine similarity sin índice → O(n) en cada query.
--  - Filtros por client_id, agent_name, call_date, email sin índice → seq scan.
--
-- DESPUÉS:
--  - HNSW en transcriptions.embedding → búsqueda semántica sublineal.
--  - B-tree composite (client_id, call_date DESC) → timeline queries instantáneas.
--  - B-tree en columnas frecuentes de filtrado.
--
-- Estos CREATE INDEX usan CONCURRENTLY donde aplica para no bloquear escrituras.
-- Por ser CONCURRENTLY, no puede correr dentro de transacción → corra
-- cada bloque manualmente en el SQL editor (Supabase Dashboard).
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. pgvector HNSW en embeddings ──────────────────────────────────────────
-- Requiere extension `vector` activa (Supabase la trae por default).

CREATE EXTENSION IF NOT EXISTS vector;

-- HNSW es ~10x más rápido que ivfflat para queries online y no requiere
-- re-entrenar cuando crecen los datos. m=16/ef_construction=64 son los
-- defaults recomendados por pgvector para text-embedding-3-small (1536 dims).
CREATE INDEX CONCURRENTLY IF NOT EXISTS transcriptions_embedding_hnsw_idx
  ON public.transcriptions
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Para queries que combinan ANN + filtro por tenant, necesitamos pre-filtrar.
-- pgvector 0.5+ soporta pre-filter via partial indexes:
-- (descomentar cuando se confirme volumen por tenant > 100k)
-- CREATE INDEX CONCURRENTLY transcriptions_embedding_saludtotal
--   ON public.transcriptions USING hnsw (embedding vector_cosine_ops)
--   WHERE client_id = 'saludtotal';

-- ─── 2. B-tree composite (client_id, call_date DESC) ─────────────────────────
-- Sirve para "dame las últimas N llamadas del tenant X" — patrón dominante.

CREATE INDEX CONCURRENTLY IF NOT EXISTS transcriptions_client_date_idx
  ON public.transcriptions (client_id, call_date DESC NULLS LAST);

CREATE INDEX CONCURRENTLY IF NOT EXISTS transcriptions_client_created_idx
  ON public.transcriptions (client_id, created_at DESC);

-- ─── 3. Filtros frecuentes ───────────────────────────────────────────────────

CREATE INDEX CONCURRENTLY IF NOT EXISTS transcriptions_agent_idx
  ON public.transcriptions (client_id, agent_name)
  WHERE agent_name IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS transcriptions_campaign_idx
  ON public.transcriptions (client_id, campaign)
  WHERE campaign IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS transcriptions_filename_idx
  ON public.transcriptions (filename)
  WHERE filename IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS app_users_email_active_idx
  ON public.app_users (email)
  WHERE active = true;

-- ─── 4. Foreign-key columns (recomendación de Supabase Lint) ────────────────

CREATE INDEX CONCURRENTLY IF NOT EXISTS qa_evaluations_transcription_idx
  ON public.qa_evaluations (transcription_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS executive_insights_jobs_client_idx
  ON public.executive_insights_jobs (client_id, status, created_at DESC);

-- ─── 5. Texto / búsqueda full-text (opcional, useful para Vicky) ────────────

-- GIN sobre to_tsvector(transcript) — Spanish.
-- Comentado: descomentar cuando se valide volumen + relevancia.
-- CREATE INDEX CONCURRENTLY transcriptions_fts_idx
--   ON public.transcriptions USING GIN (to_tsvector('spanish', transcript));

-- ─── 6. Log de aplicación ────────────────────────────────────────────────────
-- (no usar transacción acá porque CONCURRENTLY no lo permite)

INSERT INTO public.rls_migration_log (migration_name, notes)
VALUES ('20260518_sprint1_indexes', 'Índices HNSW + B-tree para multi-tenant y semantic search')
ON CONFLICT DO NOTHING;
