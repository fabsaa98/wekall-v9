-- ═══════════════════════════════════════════════════════════════════════════
-- Migration · 2026-05-18 · Sprint 2 · Particionado de transcriptions (DEFERRED)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ⚠️  NO EJECUTAR SIN VENTANA DE MANTENIMIENTO COORDINADA.
--
-- Sprint 2 · P2-1. Plan para particionar `transcriptions` por mes cuando se
-- supere ~10M filas. Hoy (~12k filas) es prematuro; el plan queda documentado
-- para ejecutar cuando los CDR de saludtotal / crediminuto / bold crezcan.
--
-- Razón: queries de rango por `call_date` van a empezar a degradarse > 5M filas.
-- HNSW de embeddings tampoco escala bien sobre tablas monolíticas grandes.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- RUNBOOK DE EJECUCIÓN (≈30 min de downtime mínimo)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- 0. PREFLIGHT
--    - Backup completo de Supabase (Dashboard → Database → Backups → Create now)
--    - Snapshot del schema: `pg_dump --schema-only > _backups/sprint2/schema-before-partition.sql`
--    - Snapshot de RLS policies: `SELECT * FROM pg_policies WHERE tablename='transcriptions'`
--    - Coordinar ventana con clientes activos (notificar 24h antes).
--    - Verificar que no haya jobs de ingest corriendo (`SELECT count(*) FROM executive_insights_jobs WHERE status IN ('processing','queued')`).
--
-- 1. EJECUTAR ESTA MIGRATION (CON ventana de mantenimiento activa)
--    psql "$SUPABASE_DB_URL" -f supabase/migrations/20260518_sprint2_partitioning_DEFERRED.sql
--
-- 2. VERIFICAR (queries de rango deben usar partition pruning)
--    EXPLAIN ANALYZE SELECT count(*) FROM transcriptions WHERE call_date >= '2026-04-01';
--    → buscar "Partition pruning: yes" en el plan.
--
-- 3. RECREAR ÍNDICES en cada partición (CONCURRENTLY no funciona en partitioned table)
--    Correr 20260518_sprint1_indexes.sql adaptado por partición.
--
-- 4. RELOAD app + verificar smoke tests
-- 5. Mantener `transcriptions_legacy` por 7 días por si hay que rollback.
-- ═══════════════════════════════════════════════════════════════════════════

-- DESCOMENTAR EL CÓDIGO DE ABAJO SOLO CUANDO SE VAYA A EJECUTAR EN VENTANA.

/*

BEGIN;

-- ─── 1. Renombrar tabla actual ──────────────────────────────────────────────

ALTER TABLE public.transcriptions RENAME TO transcriptions_legacy;

-- ─── 2. Crear nueva tabla particionada ──────────────────────────────────────

CREATE TABLE public.transcriptions (
  LIKE public.transcriptions_legacy INCLUDING ALL
) PARTITION BY RANGE (call_date);

-- ─── 3. Crear particiones (12 meses hacia atrás + 6 hacia adelante) ─────────

DO $$
DECLARE
  m date;
  start_date date := date_trunc('month', now() - interval '12 months')::date;
  end_date date := date_trunc('month', now() + interval '6 months')::date;
BEGIN
  m := start_date;
  WHILE m <= end_date LOOP
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS public.transcriptions_y%sm%s ' ||
      'PARTITION OF public.transcriptions ' ||
      'FOR VALUES FROM (%L) TO (%L)',
      to_char(m, 'YYYY'),
      to_char(m, 'MM'),
      m,
      (m + interval '1 month')::date
    );
    m := (m + interval '1 month')::date;
  END LOOP;

  -- Partición default para fechas fuera del rango previsto
  EXECUTE 'CREATE TABLE IF NOT EXISTS public.transcriptions_default ' ||
          'PARTITION OF public.transcriptions DEFAULT';
END $$;

-- ─── 4. Migrar datos (INSERT … SELECT) ──────────────────────────────────────
-- Esto puede tomar varios minutos según volumen. Considerar batches de 100k.

INSERT INTO public.transcriptions
SELECT * FROM public.transcriptions_legacy;

-- ─── 5. Re-aplicar RLS strict (las particiones heredan, pero verificar) ──────

ALTER TABLE public.transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcriptions FORCE ROW LEVEL SECURITY;

-- Las policies de Sprint 0 RLS strict se reaplican automaticamente vía
-- 20260518_sprint0_rls_strict.sql DO loop, pero correrlo otra vez no daña:
-- psql -f supabase/migrations/20260518_sprint0_rls_strict.sql

-- ─── 6. Cron para crear particiones nuevas ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.ensure_future_partitions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  m date;
  end_date date := date_trunc('month', now() + interval '3 months')::date;
BEGIN
  m := date_trunc('month', now())::date;
  WHILE m <= end_date LOOP
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS public.transcriptions_y%sm%s ' ||
      'PARTITION OF public.transcriptions ' ||
      'FOR VALUES FROM (%L) TO (%L)',
      to_char(m, 'YYYY'),
      to_char(m, 'MM'),
      m,
      (m + interval '1 month')::date
    );
    m := (m + interval '1 month')::date;
  END LOOP;
END;
$func$;

-- Schedule via pg_cron (descomentar):
-- SELECT cron.schedule('ensure-partitions-monthly', '0 0 1 * *', $$SELECT public.ensure_future_partitions()$$);

COMMIT;

-- ─── 7. POST-MIGRATION CLEANUP (después de 7 días estables) ─────────────────
-- DROP TABLE public.transcriptions_legacy;

*/
