#!/usr/bin/env python3
"""ETL one-shot · CSV de Salud Total → Supabase
Procesa el CSV crudo y popula cdr_daily_metrics, cdr_campaign_metrics, agents_performance.

Uso:
    python etl_saludtotal.py [--dry-run]

Requiere: C:\\Users\\fabsa\\scripts\\.env.backup con SUPABASE_SERVICE_KEY
"""

import csv
import os
import re
import sys
import json
import time
import unicodedata
from collections import defaultdict
from datetime import datetime
from pathlib import Path

import httpx

# ─── Config ──────────────────────────────────────────────────────────────────
CSV_PATH = r"C:/temp/saludtotal-ingestion/saludtotal desde el 1 enero al 14 de mayo.csv"
CLIENT_ID = "saludtotal"
DRY_RUN = "--dry-run" in sys.argv

# Disposiciones que NO cuentan como contacto efectivo (Regla B)
NO_CONTACT_DISPOSITIONS = {
    "Llamada Perdida",
    "Llamada Abandonada",
    "No contesta",
    "Buzon de voz",
    "Buzon de Voz",
    "Numero Equivocado",
    "Paciente No Contesta",
    "Paciente Ilocalizado",
    "Fallido",
    "Reintento",
    "Llamada Caida",
    "Llamada Cortada",
    "Volver a llamar",
    "sin disposicion",
    "",
}

# Cargar credenciales
ENV_FILE = Path(r"C:/Users/fabsa/scripts/.env.backup")
if not ENV_FILE.exists():
    sys.exit(f"FATAL: {ENV_FILE} no existe")
for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    k, v = line.split("=", 1)
    os.environ.setdefault(k.strip(), v.strip())

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}


def slugify(s):
    """Normaliza 'Servicios Hospitalarios' → 'servicios_hospitalarios'."""
    if not s:
        return "sin_campana"
    # Remove accents
    s = "".join(c for c in unicodedata.normalize("NFD", s) if not unicodedata.combining(c))
    s = s.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "_", s)
    s = re.sub(r"_+", "_", s).strip("_")
    return s or "sin_campana"


def parse_date(s):
    """'01-01-2026 23:59' → date(2026, 1, 1)"""
    if not s or len(s) < 10:
        return None
    try:
        return datetime.strptime(s[:10], "%d-%m-%Y").date()
    except ValueError:
        return None


def parse_duration_seconds(s):
    """'00:05:03' → 303 (seconds). '' → 0"""
    if not s or s.strip() == "":
        return 0
    parts = s.split(":")
    if len(parts) != 3:
        return 0
    try:
        h, m, sec = int(parts[0]), int(parts[1]), int(parts[2])
        return h * 3600 + m * 60 + sec
    except ValueError:
        return 0


def extract_agent_id(correo, usuario):
    """'agente117@saludtotal.com.co' → '117'. Fallback: usuario."""
    if correo:
        m = re.match(r"agente(\d+)@", correo.lower())
        if m:
            return m.group(1)
    if usuario:
        m = re.match(r"Agente\s+(\d+)", usuario)
        if m:
            return m.group(1)
    return None


# ─── Acumuladores ─────────────────────────────────────────────────────────────
# daily: fecha -> stats
daily = defaultdict(lambda: {"total": 0, "efectivos": 0, "duracion_total_s": 0, "duracion_n": 0})
# campaign: (fecha, campaign_id) -> stats
campaign = defaultdict(lambda: {"total": 0, "efectivos": 0})
# agent: (fecha, agent_id) -> stats
agent = defaultdict(lambda: {
    "total": 0, "efectivos": 0, "duracion_total_s": 0, "duracion_n": 0,
    "agent_name": None, "agent_correo": None, "campaigns": defaultdict(int),
})

# ─── Procesar CSV ─────────────────────────────────────────────────────────────
print(f"Procesando {CSV_PATH} ...")
t0 = time.time()
total_rows = 0
skipped_no_date = 0

with open(CSV_PATH, encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        total_rows += 1
        fecha = parse_date(row["inicio_de_llamada"])
        if fecha is None:
            skipped_no_date += 1
            continue
        fecha_str = fecha.isoformat()
        camp_id = slugify(row["campana"])
        disp = row.get("disposicion", "").strip()
        es_efectivo = disp not in NO_CONTACT_DISPOSITIONS
        dur_s = parse_duration_seconds(row["duracion_de_la_llamada"])

        # daily
        daily[fecha_str]["total"] += 1
        if es_efectivo:
            daily[fecha_str]["efectivos"] += 1
        if dur_s > 0:
            daily[fecha_str]["duracion_total_s"] += dur_s
            daily[fecha_str]["duracion_n"] += 1

        # campaign
        key = (fecha_str, camp_id)
        campaign[key]["total"] += 1
        if es_efectivo:
            campaign[key]["efectivos"] += 1

        # agent
        agent_id = extract_agent_id(row["agente_correo"], row["usuario"])
        if agent_id is None and row["usuario"]:
            agent_id = slugify(row["usuario"])  # fallback (e.g. nombres reales)
        if agent_id:
            akey = (fecha_str, agent_id)
            a = agent[akey]
            a["total"] += 1
            if es_efectivo:
                a["efectivos"] += 1
            if dur_s > 0:
                a["duracion_total_s"] += dur_s
                a["duracion_n"] += 1
            a["agent_name"] = row["usuario"] or a["agent_name"]
            a["agent_correo"] = row["agente_correo"] or a["agent_correo"]
            a["campaigns"][camp_id] += 1

elapsed = time.time() - t0
print(f"  procesado: {total_rows:,} rows en {elapsed:.1f}s")
print(f"  filas sin fecha (skipped): {skipped_no_date}")
print(f"  daily entries:    {len(daily):>6}")
print(f"  campaign entries: {len(campaign):>6}")
print(f"  agent entries:    {len(agent):>6}")
print()

# ─── Build payloads ──────────────────────────────────────────────────────────
daily_rows = []
for fecha_str, s in sorted(daily.items()):
    aht_min = (s["duracion_total_s"] / s["duracion_n"] / 60) if s["duracion_n"] > 0 else None
    daily_rows.append({
        "client_id": CLIENT_ID,
        "fecha": fecha_str,
        "total_llamadas": s["total"],
        "contactos_efectivos": s["efectivos"],
        "tasa_contacto_pct": round(100 * s["efectivos"] / s["total"], 2) if s["total"] else 0,
        "aht_minutos": round(aht_min, 2) if aht_min else None,
    })

campaign_rows = []
for (fecha_str, camp_id), s in sorted(campaign.items()):
    campaign_rows.append({
        "client_id": CLIENT_ID,
        "fecha": fecha_str,
        "campaign_id": camp_id,
        "total_llamadas": s["total"],
        "contactos_efectivos": s["efectivos"],
        "tasa_contacto_pct": round(100 * s["efectivos"] / s["total"], 2) if s["total"] else 0,
    })

agent_rows = []
for (fecha_str, aid), a in sorted(agent.items()):
    aht_s = (a["duracion_total_s"] / a["duracion_n"]) if a["duracion_n"] > 0 else None
    top_campaign = max(a["campaigns"].items(), key=lambda x: x[1])[0] if a["campaigns"] else "sin_campana"
    agent_rows.append({
        "client_id": CLIENT_ID,
        "fecha": fecha_str,
        "agent_id": aid,
        "agent_name": a["agent_name"] or f"Agente {aid}",
        "campaign_id": top_campaign,
        "area": "Servicio Salud",
        "tasa_contacto": round(100 * a["efectivos"] / a["total"], 2) if a["total"] else 0,
        "aht_segundos": round(aht_s) if aht_s else 0,
        "llamadas_total": a["total"],
        "contactos": a["efectivos"],
    })

print(f"Payloads listos:")
print(f"  cdr_daily_metrics: {len(daily_rows):,} rows")
print(f"  cdr_campaign_metrics: {len(campaign_rows):,} rows")
print(f"  agents_performance: {len(agent_rows):,} rows")
print()

if DRY_RUN:
    print("=== DRY RUN — primeros 2 de cada ===")
    print("daily[:2]:", json.dumps(daily_rows[:2], indent=2, ensure_ascii=False))
    print()
    print("campaign[:2]:", json.dumps(campaign_rows[:2], indent=2, ensure_ascii=False))
    print()
    print("agent[:2]:", json.dumps(agent_rows[:2], indent=2, ensure_ascii=False))
    sys.exit(0)


# ─── Insert helper ───────────────────────────────────────────────────────────
def batch_insert(table, rows, batch_size=500):
    if not rows:
        print(f"  [SKIP] {table} sin rows")
        return 0
    print(f"  [{table}] inserting {len(rows):,} rows in batches of {batch_size}...")
    inserted = 0
    failed = 0
    with httpx.Client(timeout=60.0) as client:
        for i in range(0, len(rows), batch_size):
            batch = rows[i:i + batch_size]
            try:
                resp = client.post(
                    f"{SUPABASE_URL}/rest/v1/{table}",
                    headers=HEADERS,
                    json=batch,
                )
                if resp.status_code in (200, 201):
                    inserted += len(batch)
                    print(f"    batch {i//batch_size + 1}: +{len(batch)} (total {inserted:,})")
                else:
                    failed += len(batch)
                    print(f"    batch {i//batch_size + 1} FAILED: HTTP {resp.status_code}")
                    print(f"      {resp.text[:300]}")
                    if failed > 3 * batch_size:
                        print(f"    aborting after too many failures")
                        return inserted
            except Exception as e:
                failed += len(batch)
                print(f"    batch {i//batch_size + 1} EXCEPTION: {e}")
    print(f"  [{table}] done: {inserted:,} inserted, {failed} failed")
    return inserted


# ─── Pre-check ───────────────────────────────────────────────────────────────
print("=== Pre-check: ¿ya hay datos de saludtotal? ===")
skip_table = set()
with httpx.Client(timeout=15.0) as client:
    for table in ("cdr_daily_metrics", "cdr_campaign_metrics", "agents_performance"):
        resp = client.get(
            f"{SUPABASE_URL}/rest/v1/{table}",
            headers={**HEADERS, "Range": "0-0", "Range-Unit": "items", "Prefer": "count=exact"},
            params={"client_id": f"eq.{CLIENT_ID}", "select": "id"},
        )
        cr = resp.headers.get("content-range", "0-0/0")
        total = cr.split("/")[-1]
        print(f"  {table:<25}: {total} rows existentes")
        if int(total) > 0:
            print(f"    [SKIP] {table} ya tiene datos — no re-insertar")
            skip_table.add(table)
print()

# ─── Insert ──────────────────────────────────────────────────────────────────
print("=== Insertando ===")
n1 = 0 if "cdr_daily_metrics" in skip_table else batch_insert("cdr_daily_metrics", daily_rows)
n2 = 0 if "cdr_campaign_metrics" in skip_table else batch_insert("cdr_campaign_metrics", campaign_rows)
n3 = 0 if "agents_performance" in skip_table else batch_insert("agents_performance", agent_rows)

print()
print("═" * 60)
print(f"ETL COMPLETO · saludtotal")
print(f"  cdr_daily_metrics:    {n1:,} rows insertadas")
print(f"  cdr_campaign_metrics: {n2:,} rows insertadas")
print(f"  agents_performance:   {n3:,} rows insertadas")
print(f"  total:                {n1+n2+n3:,} rows")
print("═" * 60)
