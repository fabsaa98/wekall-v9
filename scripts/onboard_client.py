#!/usr/bin/env python3
"""
WeKall Intelligence — Onboarding de nuevo cliente multi-tenant.

Uso:
    python3 scripts/onboard_client.py \
        --client-id empresa_xyz \
        --client-name "Empresa XYZ" \
        --industry "Cobranzas" \
        --country "Colombia" \
        --email ceo@xyz.com \
        --name "CEO Nombre" \
        --role CEO
"""

import argparse
import sys
import json
from datetime import datetime, timezone

try:
    import httpx
except ImportError:
    print("❌ Dependencia faltante. Instalar: pip install httpx")
    sys.exit(1)

# ─── Config Supabase ──────────────────────────────────────────────────────────

SUPABASE_URL = "https://iszodrpublcnsyvtgjcg.supabase.co"
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

# ─── Helpers ──────────────────────────────────────────────────────────────────

def supabase_upsert(table: str, data: dict, conflict_col: str = None) -> dict:
    """Inserta o actualiza un registro en Supabase via REST API."""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    headers = HEADERS.copy()
    if conflict_col:
        headers["Prefer"] = f"resolution=merge-duplicates,return=representation"
    
    params = {}
    if conflict_col:
        params["on_conflict"] = conflict_col

    resp = httpx.post(url, headers=headers, json=data, params=params, timeout=15)
    
    if resp.status_code not in (200, 201):
        raise Exception(f"Supabase error {resp.status_code}: {resp.text}")
    
    return resp.json()


def supabase_select(table: str, filters: dict) -> list:
    """Consulta registros en Supabase."""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    params = {k: f"eq.{v}" for k, v in filters.items()}
    params["select"] = "*"
    
    resp = httpx.get(url, headers=HEADERS, params=params, timeout=15)
    
    if resp.status_code != 200:
        raise Exception(f"Supabase error {resp.status_code}: {resp.text}")
    
    return resp.json()


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="WeKall Intelligence — Onboarding de nuevo cliente",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos:
  python3 scripts/onboard_client.py \\
      --client-id credismart \\
      --client-name "CrediSmart / Crediminuto" \\
      --industry "Cobranzas" \\
      --country "Colombia" \\
      --email fabian@wekall.co \\
      --name "Fabián Saavedra" \\
      --role admin

  python3 scripts/onboard_client.py \\
      --client-id empresa_abc \\
      --client-name "Empresa ABC" \\
      --email gerente@abc.com \\
      --name "Gerente ABC"
        """,
    )

    # Cliente
    parser.add_argument("--client-id", required=True, help="ID único del cliente (ej: empresa_xyz)")
    parser.add_argument("--client-name", required=True, help="Nombre del cliente (ej: Empresa XYZ)")
    parser.add_argument("--industry", default="Contact Center", help="Industria")
    parser.add_argument("--country", default="Colombia", help="País")
    parser.add_argument("--currency", default="COP", help="Moneda (COP, USD, MXN, PEN...)")
    parser.add_argument("--timezone", default="America/Bogota", help="Zona horaria")

    # Usuario inicial
    parser.add_argument("--email", required=True, help="Email del usuario inicial")
    parser.add_argument("--name", default=None, help="Nombre del usuario inicial")
    parser.add_argument("--role", default="CEO",
                        choices=["CEO", "VP Ventas", "VP CX", "COO", "admin"],
                        help="Rol del usuario (default: CEO)")

    # Branding (opcional)
    parser.add_argument("--tagline", default=None, help="Tagline de la empresa")
    parser.add_argument("--logo-url", default=None, help="URL del logo")
    parser.add_argument("--primary-color", default="#6334C0", help="Color primario hex")

    args = parser.parse_args()

    client_id = args.client_id.strip().lower().replace(" ", "_")
    
    print(f"\n🚀 WeKall Intelligence — Onboarding cliente: {client_id}")
    print("=" * 55)

    # ── 1. Verificar si client_id ya existe ──────────────────────────
    print(f"\n[1/4] Verificando client_id '{client_id}'...")
    existing = supabase_select("client_config", {"client_id": client_id})
    if existing:
        print(f"  ⚠️  Cliente '{client_id}' ya existe. Se actualizarán los datos.")
        action = "actualizado"
    else:
        print(f"  ✅ Nuevo cliente. Creando...")
        action = "creado"

    # ── 2. Insertar/actualizar client_config ─────────────────────────
    print(f"\n[2/4] Guardando en client_config...")
    now = datetime.now(timezone.utc).isoformat()
    
    config_data = {
        "client_id": client_id,
        "client_name": args.client_name,
        "industry": args.industry,
        "country": args.country,
        "currency": args.currency,
        "timezone": args.timezone,
        "active": True,
        "updated_at": now,
    }
    
    try:
        result = supabase_upsert("client_config", config_data, conflict_col="client_id")
        print(f"  ✅ client_config {action}: {client_id}")
    except Exception as e:
        print(f"  ❌ Error en client_config: {e}")
        sys.exit(1)

    # ── 3. Insertar/actualizar client_branding ───────────────────────
    print(f"\n[3/4] Guardando branding...")
    branding_data = {
        "client_id": client_id,
        "company_name": args.client_name,
        "primary_color": args.primary_color,
        "tagline": args.tagline or f"{args.client_name} — Contact Center Intelligence",
        "updated_at": now,
    }
    if args.logo_url:
        branding_data["logo_url"] = args.logo_url

    try:
        supabase_upsert("client_branding", branding_data, conflict_col="client_id")
        print(f"  ✅ client_branding guardado")
    except Exception as e:
        print(f"  ⚠️  client_branding error (puede ser que la tabla aún no existe): {e}")

    # ── 4. Insertar usuario inicial ──────────────────────────────────
    print(f"\n[4/4] Creando usuario inicial: {args.email}...")
    user_data = {
        "email": args.email.strip().lower(),
        "client_id": client_id,
        "role": args.role,
        "name": args.name,
        "active": True,
        "created_at": now,
    }

    try:
        supabase_upsert("app_users", user_data, conflict_col="email")
        print(f"  ✅ app_users: {args.email} ({args.role})")
    except Exception as e:
        print(f"  ❌ Error en app_users: {e}")
        sys.exit(1)

    # ── Resumen ──────────────────────────────────────────────────────
    print("\n" + "=" * 55)
    print("✅ ONBOARDING COMPLETADO")
    print("=" * 55)
    print(f"  Cliente ID  : {client_id}")
    print(f"  Nombre      : {args.client_name}")
    print(f"  País        : {args.country} ({args.currency})")
    print(f"  Usuario     : {args.email} [{args.role}]")
    print(f"\n  Login URL   : https://wekall-intelligence.pages.dev/login")
    print(f"  Código de empresa: {client_id}")
    print("\n📋 El usuario puede iniciar sesión con:")
    print(f"   Email: {args.email}")
    print(f"   Código de empresa: {client_id}")
    print()


if __name__ == "__main__":
    main()
