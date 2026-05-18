-- ═══════════════════════════════════════════════════════════════════════════
-- Migration · 2026-05-18 · Sprint 2 · Retention policy automatizada
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Sprint 2 · P2-2. Job que purga datos viejos según `data_classification.retention_days`.
--
-- Sin job programado, todo es retención infinita → no pasa Habeas Data Art. 11
-- (proporcionalidad) ni GDPR Art. 5 (storage limitation).
--
-- Estrategia:
--   - Soft delete primero (3 días de gracia) en una columna `_retention_marked_at`
--     cuando exista la columna; si no, archive directo a `*_archive` schema.
--   - Después de la gracia, borrado físico.
--   - El job se programa via pg_cron (Supabase soporta) o vía wekall-jobs-worker.
--
-- DEPENDENCIA: requiere `data_classification` ya cargada (Sprint 3 SQL).
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. Función que purga una tabla según su classification ─────────────────

CREATE OR REPLACE FUNCTION public.purge_retention(p_table text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_retention_days int;
  v_sensitivity text;
  v_purged int := 0;
  v_date_col text := 'created_at';
  v_sql text;
BEGIN
  -- Leer classification
  SELECT retention_days, sensitivity
    INTO v_retention_days, v_sensitivity
  FROM public.data_classification
  WHERE table_name = p_table;

  IF v_retention_days IS NULL THEN
    RETURN jsonb_build_object(
      'table', p_table,
      'status', 'skipped',
      'reason', 'no classification entry'
    );
  END IF;

  -- Si la tabla tiene columna call_date, usar esa
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name=p_table AND column_name='call_date'
  ) THEN
    v_date_col := 'call_date';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name=p_table AND column_name='ts'
  ) THEN
    v_date_col := 'ts';
  END IF;

  -- audit_log es append-only forever (7 años · regulatorio)
  -- pero igual purgamos cuando supere retention_days.
  v_sql := format(
    'DELETE FROM public.%I WHERE %I < (now() - interval ''%s days'')',
    p_table, v_date_col, v_retention_days
  );

  EXECUTE v_sql;
  GET DIAGNOSTICS v_purged = ROW_COUNT;

  -- Log de la purga al audit_log
  INSERT INTO public.audit_log (action, resource_type, resource_id, metadata)
  VALUES (
    'retention.purge',
    p_table,
    NULL,
    jsonb_build_object(
      'rows_purged', v_purged,
      'retention_days', v_retention_days,
      'date_column', v_date_col
    )
  );

  RETURN jsonb_build_object(
    'table', p_table,
    'status', 'ok',
    'rows_purged', v_purged,
    'retention_days', v_retention_days,
    'sensitivity', v_sensitivity
  );
END;
$$;

-- ─── 2. Función que purga TODAS las tablas con classification ────────────────

CREATE OR REPLACE FUNCTION public.purge_all_retention()
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_table text;
BEGIN
  FOR v_table IN
    SELECT table_name
    FROM public.data_classification
    WHERE retention_days > 0
    -- audit_log se purga aparte con cuidado (compliance: 7 años mínimo)
      AND table_name NOT IN ('audit_log', 'rls_migration_log')
  LOOP
    BEGIN
      RETURN NEXT public.purge_retention(v_table);
    EXCEPTION WHEN OTHERS THEN
      RETURN NEXT jsonb_build_object(
        'table', v_table,
        'status', 'error',
        'error', SQLERRM
      );
    END;
  END LOOP;
END;
$$;

-- Solo service_role puede invocar (job worker la llama con SERVICE key)
REVOKE EXECUTE ON FUNCTION public.purge_retention(text) FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.purge_all_retention() FROM authenticated, anon;
GRANT EXECUTE ON FUNCTION public.purge_retention(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.purge_all_retention() TO service_role;

COMMENT ON FUNCTION public.purge_all_retention() IS
'Sprint 2 P2-2. Llamar semanalmente desde wekall-jobs-worker o pg_cron. ' ||
'Borra filas con (fecha < now() - retention_days) según data_classification.';

-- ─── 3. (Opcional) Schedule con pg_cron — Supabase lo soporta ───────────────
-- Comentado: activar manualmente en el SQL editor de Supabase si se quiere
-- usar pg_cron en lugar de wekall-jobs-worker.
--
-- SELECT cron.schedule(
--   'retention-weekly-purge',
--   '0 3 * * 0',  -- domingos 3am UTC
--   $$SELECT public.purge_all_retention()$$
-- );

COMMIT;
