#!/usr/bin/env python3
"""
WeKall Intelligence — Seed de datos de agentes en Supabase
=============================================================
Genera 30 días de KPIs sintéticos realistas para los 22 agentes reales
de la campaña "Cobranzas Crediminuto Colombia" e inserta en Supabase.

PREREQUISITOS:
  pip install supabase python-dotenv

USO:
  python3 seed_agents.py

NOTA SOBRE RLS:
  Si Supabase devuelve error 401/403, la tabla tiene RLS sin policy de INSERT
  para anon. Solución:
  1. Ve al SQL Editor en Supabase dashboard
  2. Ejecuta:
     CREATE POLICY "anon_insert_agents_performance"
       ON public.agents_performance FOR INSERT TO anon
       WITH CHECK (true);
  3. Corre el script nuevamente
  4. Elimina la policy si quieres restringir escritura después.
"""

import random
import math
from datetime import date, timedelta

# ─── Supabase credentials ─────────────────────────────────────────────────────
SUPABASE_URL = "https://iszodrpublcnsyvtgjcg.supabase.co"
SUPABASE_ANON_KEY = "sb_publishable_eRRG-QSyURpWV-FstJUc4g_M-xmD6v_"

# ─── Agentes reales (de transcriptions en Supabase) ──────────────────────────
AGENTS = [
    {"agent_id": "10982", "agent_name": "NELCY JOSEFINA CONTASTI GONZALEZ"},
    {"agent_id": "11155", "agent_name": "ANA MARIA LOPEZ ROJAS"},
    {"agent_id": "5515",  "agent_name": "Joel Jose"},
    {"agent_id": "5531",  "agent_name": "Angel Cuberos"},
    {"agent_id": "10611", "agent_name": "Caren Natalia Antolinez Rodriguez"},
    {"agent_id": "9132",  "agent_name": "Imaru Escorche"},
    {"agent_id": "8189",  "agent_name": "Jose Gregorio Rodriguez Marquina"},
    {"agent_id": "9798",  "agent_name": "Clara Acevedo"},
    {"agent_id": "10049", "agent_name": "Carleinnys Andreina Garcia Rodriguez"},
    {"agent_id": "11641", "agent_name": "Jennifer Padilla"},
    {"agent_id": "10916", "agent_name": "JESICA YESENIA VELASQUEZ QUEVEDO"},
    {"agent_id": "8949",  "agent_name": "Winderly Espinoza"},
    {"agent_id": "7112",  "agent_name": "Manuel Rojas"},
    {"agent_id": "9201",  "agent_name": "Wilson Alfredo Moran Rojas"},
    {"agent_id": "11121", "agent_name": "ANGELY ZULEIMA CHIRINOS UZCATEGUI"},
    {"agent_id": "5526",  "agent_name": "Carmen Barcelo"},
    {"agent_id": "12575", "agent_name": "Loidys Vasquez"},
    {"agent_id": "9723",  "agent_name": "Luis Romero"},
    {"agent_id": "5732",  "agent_name": "Santiago Cano"},
    {"agent_id": "8193",  "agent_name": "Ana Mendoza Gamarra"},
    {"agent_id": "10046", "agent_name": "Jhoseanny Cianaly Rodriguez Guevara"},
    {"agent_id": "12577", "agent_name": "Alix Garcia"},
]

# ─── Perfiles de rendimiento por agente (deterministas + ruido diario) ────────
# Definir un "perfil base" diferente para cada agente para simular varianza real
# Rango de KPIs cobranzas:
#   tasa_contacto: 35-55%
#   tasa_promesa:  30-50%
#   aht_segundos:  360-600s
#   csat:          3.2-4.5
#   fcr:           60-80%
#   escalaciones:  3-12%

random.seed(42)  # seed fija para reproducibilidad

def build_agent_profile(agent_id: str) -> dict:
    """Genera un perfil base estable para cada agente (determinista)."""
    rng = random.Random(int(agent_id) * 7 + 13)
    return {
        "base_tasa_contacto": rng.uniform(35, 55),
        "base_tasa_promesa":  rng.uniform(30, 50),
        "base_aht":           rng.randint(360, 600),
        "base_csat":          round(rng.uniform(3.2, 4.5), 1),
        "base_fcr":           rng.uniform(60, 80),
        "base_escalaciones":  rng.uniform(3, 12),
        "base_llamadas":      rng.randint(80, 160),
    }


def jitter(value: float, pct: float = 0.08) -> float:
    """Añade ±pct ruido gaussiano al valor base."""
    noise = random.gauss(0, value * pct)
    return value + noise


def build_day_record(agent: dict, profile: dict, fecha: date) -> dict:
    """Construye un registro diario con variación realista."""
    # Variación adicional por día de semana (lunes y viernes son peores)
    dow = fecha.weekday()  # 0=lunes, 4=viernes
    dow_factor = 1.0 if dow in (1, 2, 3) else 0.93  # -7% lunes/viernes

    tc = max(20, min(70, jitter(profile["base_tasa_contacto"] * dow_factor)))
    tp = max(15, min(60, jitter(profile["base_tasa_promesa"])))
    aht = max(240, min(720, int(jitter(profile["base_aht"]))))
    csat = round(max(1.0, min(5.0, jitter(profile["base_csat"], pct=0.04))), 1)
    fcr = max(45, min(95, jitter(profile["base_fcr"] * dow_factor)))
    esc = max(1, min(20, jitter(profile["base_escalaciones"])))
    llamadas = max(40, int(jitter(profile["base_llamadas"] * dow_factor)))
    contactos = int(llamadas * tc / 100)
    promesas = int(contactos * tp / 100)

    return {
        "fecha": str(fecha),
        "agent_id": agent["agent_id"],
        "agent_name": agent["agent_name"],
        "campaign_id": "cobranzas_crediminuto_co",
        "area": "Cobranzas",
        "tasa_contacto": round(tc, 2),
        "tasa_promesa": round(tp, 2),
        "aht_segundos": aht,
        "csat": csat,
        "fcr": round(fcr, 2),
        "escalaciones": round(esc, 2),
        "llamadas_total": llamadas,
        "contactos": contactos,
        "promesas": promesas,
    }


def generate_records(days: int = 30) -> list:
    """Genera todos los registros para 22 agentes × 30 días hábiles."""
    today = date.today()
    records = []

    # Contar hacia atrás los últimos N días hábiles
    business_days = []
    d = today - timedelta(days=1)
    while len(business_days) < days:
        if d.weekday() < 5:  # lunes-viernes
            business_days.append(d)
        d -= timedelta(days=1)
    business_days.reverse()

    for agent in AGENTS:
        profile = build_agent_profile(agent["agent_id"])
        for fecha in business_days:
            records.append(build_day_record(agent, profile, fecha))

    return records


def insert_records(records: list):
    """Inserta los registros en Supabase en batches de 500."""
    try:
        from supabase import create_client, Client
    except ImportError:
        print("ERROR: librería 'supabase' no instalada.")
        print("       Ejecuta: pip install supabase")
        return

    print(f"Conectando a Supabase: {SUPABASE_URL}")
    client: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

    batch_size = 500
    total = len(records)
    inserted = 0
    errors = 0

    for i in range(0, total, batch_size):
        batch = records[i:i + batch_size]
        try:
            result = client.table("agents_performance").upsert(
                batch,
                on_conflict="fecha,agent_id"
            ).execute()
            inserted += len(batch)
            print(f"  ✅ Batch {i // batch_size + 1}: {len(batch)} registros insertados "
                  f"({inserted}/{total})")
        except Exception as e:
            errors += len(batch)
            print(f"  ❌ Batch {i // batch_size + 1} FALLÓ: {e}")
            print(f"     HINT: Si es error 403/RLS, leer las instrucciones al inicio del script.")

    print(f"\nResultado: {inserted} insertados, {errors} errores de {total} registros totales.")


if __name__ == "__main__":
    print("WeKall Intelligence — Seed de agentes")
    print(f"Generando datos para {len(AGENTS)} agentes × 30 días hábiles...\n")

    records = generate_records(days=30)
    print(f"Total registros generados: {len(records)}")
    print(f"Rango de fechas: {records[0]['fecha']} → {records[-1]['fecha']}\n")

    # Mostrar muestra
    print("Muestra (primeros 2 registros):")
    for r in records[:2]:
        print(f"  {r['fecha']} | {r['agent_name']} | "
              f"TC={r['tasa_contacto']}% TP={r['tasa_promesa']}% "
              f"AHT={r['aht_segundos']}s CSAT={r['csat']} FCR={r['fcr']}% Esc={r['escalaciones']}%")

    print("\nIniciando inserción en Supabase...")
    insert_records(records)
