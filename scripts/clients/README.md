# scripts/clients · ETL por cliente

Scripts one-shot para onboarding y carga de datos de clientes nuevos en WeKall Intelligence.

> **Nota:** estos scripts requieren `SUPABASE_SERVICE_KEY` en un archivo `.env.backup` fuera del repo (`~/scripts/.env.backup` o similar). **NO commitear `.env.backup`.**

---

## `etl_saludtotal.py`

ETL one-shot del CSV crudo de Salud Total a las 3 tablas operacionales:
- `cdr_daily_metrics`
- `cdr_campaign_metrics`
- `agents_performance`

### Uso

```bash
# Dry-run (calcula y muestra muestra, NO inserta)
python etl_saludtotal.py --dry-run

# Run real
python etl_saludtotal.py
```

### Comportamiento

- Lee el CSV desde `C:/temp/saludtotal-ingestion/...csv` (ubicación hard-coded; ajustar antes de correr).
- **Pre-check**: si la tabla ya tiene rows de saludtotal, las SKIPea (no duplica).
- Aplica regla de "contacto efectivo" por disposición (excluye 'Llamada Perdida', 'Abandonada', 'No contesta', etc. — ver `NO_CONTACT_DISPOSITIONS`).
- INSERT en batches de 500 con httpx.
- Reporta progreso y errores por batch.

### Mapeo CSV → Supabase

| Columna CSV | Tabla destino · campo |
|---|---|
| `inicio_de_llamada[:10]` | `fecha` (DD-MM-YYYY → ISO) |
| `campana` (slugified) | `campaign_id` |
| `agente_correo` regex `agente(\d+)@` | `agent_id` |
| `usuario` | `agent_name` |
| `duracion_de_la_llamada` (HH:MM:SS) | `aht_segundos` / `aht_minutos` |
| `disposicion` ∉ NO_CONTACT_LIST | contacto efectivo |

---

## `process_saludtotal_recordings.py`

Procesa MP3 de Salud Total (descargados de Drive) → INSERT en `transcriptions`.

Pipeline por archivo:
1. POST `/transcribe` al Worker `wekall-vicky-proxy` con audio binary → texto (Whisper-1)
2. POST `/chat` con prompt resumen → summary (GPT-4o-mini)
3. INSERT directo en Supabase con `SERVICE_KEY` (embedding=NULL)

### Por qué INSERT directo y no `/ingest`

El endpoint `/ingest` del Worker hace todo el pipeline incluido el INSERT, **pero usa `SUPABASE_ANON_KEY`** y la tabla `transcriptions` tiene RLS habilitada que bloquea INSERT desde anon. Bug a corregir en el Worker. Mientras tanto: workaround via service key directo.

### Skip existing

Antes de procesar, el script consulta `transcriptions` por filenames ya cargados con `client_id=saludtotal` y los saltea. **Es seguro re-correrlo:** no duplica.

### Costos OpenAI estimados

Por grabación (audio ~30-60s):
- Whisper-1: ~$0.003
- GPT-4o-mini summary: ~$0.001
- Embedding (text-embedding-3-small): $0 (no se calcula en este script — embedding NULL)
- **Total: ~$0.004 por grabación**

36 grabaciones → ~$0.15 USD.

---

## Patrón general para próximos clientes

Estos scripts son una **plantilla**. Para un cliente nuevo:

1. Cambiar constantes al inicio (`CLIENT_ID`, `CAMPAIGN`, `CSV_PATH`, `MP3_DIR`).
2. Verificar regla de "contacto efectivo" si el negocio del cliente cambia (cobranzas vs servicio vs ventas).
3. Verificar mapeo agente: el formato del email (`agente117@cliente.com.co`) puede variar.
4. Correr `--dry-run` primero, validar muestra, después correr en serio.

---

> **Generado por Claude Code en sesión inicial de SaludTotal onboarding (2026-05-15).**
> No reemplaza el flujo automatizado V23 del roadmap (Pipeline CDR Automático).
