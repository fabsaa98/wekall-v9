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
        --role CEO \
        --password "TempPass123!"
"""

import argparse
import sys
import os
import json
from datetime import datetime, timezone

try:
    import httpx
except ImportError:
    print("❌ Dependencia faltante. Instalar: pip install httpx")
    sys.exit(1)

# ─── Config Supabase ──────────────────────────────────────────────────────────

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://iszodrpublcnsyvtgjcg.supabase.co")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

if not SERVICE_KEY:
    print("❌ SUPABASE_SERVICE_KEY no configurada.")
    print("   Exportar: export SUPABASE_SERVICE_KEY='sb_secret_...'")
    sys.exit(1)

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

ADMIN_HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
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


def create_auth_user(email: str, password: str, client_id: str, role: str) -> str | None:
    """
    Crea o actualiza usuario en Supabase Auth via Admin API.
    Retorna el auth user ID si es exitoso, None si falla.

    Si no se proporciona password, omite la creación en Auth
    y retorna None (fallback a modo legacy solo con app_users).
    """
    if not password:
        return None

    # Intentar crear
    resp = httpx.post(
        f"{SUPABASE_URL}/auth/v1/admin/users",
        headers=ADMIN_HEADERS,
        json={
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {"client_id": client_id, "role": role},
        },
        timeout=15,
    )

    if resp.status_code in (200, 201):
        auth_user = resp.json()
        print(f"  ✅ Auth user creado en Supabase Auth: {auth_user['id']}")
        return auth_user["id"]

    # Si ya existe, buscarlo y actualizar contraseña
    err_text = resp.text
    if resp.status_code == 422:
        err = resp.json()
        msg = err.get("msg", "") or err.get("message", "") or str(err)
        if "already" in msg.lower():
            print(f"  ⚠️  {email} ya existe en Supabase Auth. Buscando...")
            list_resp = httpx.get(
                f"{SUPABASE_URL}/auth/v1/admin/users",
                headers=ADMIN_HEADERS,
                params={"page": 1, "per_page": 200},
                timeout=15,
            )
            if list_resp.status_code == 200:
                users = list_resp.json().get("users", [])
                for u in users:
                    if u.get("email") == email:
                        # Actualizar contraseña
                        httpx.put(
                            f"{SUPABASE_URL}/auth/v1/admin/users/{u['id']}",
                            headers=ADMIN_HEADERS,
                            json={"password": password},
                            timeout=15,
                        )
                        print(f"  ✅ Auth user encontrado y contraseña actualizada: {u['id']}")
                        return u["id"]

    print(f"  ⚠️  No se pudo crear en Supabase Auth ({resp.status_code}): {err_text[:200]}")
    print(f"  → El usuario puede acceder con código de empresa (modo legacy).")
    return None


def upsert_app_user_with_auth(email: str, client_id: str, role: str, name: str | None,
                               auth_id: str | None, now: str) -> bool:
    """
    Upsert de app_users con soporte para auth_id opcional.
    Si auth_id se provee y la columna existe, la incluye.
    Si la columna no existe aún, inserta sin ella.
    """
    user_data: dict = {
        "email": email,
        "client_id": client_id,
        "role": role,
        "name": name,
        "active": True,
        "created_at": now,
    }
    if auth_id:
        user_data["auth_id"] = auth_id

    try:
        supabase_upsert("app_users", user_data, conflict_col="email,client_id")
        print(f"  ✅ app_users: {email} ({role}) en cliente {client_id}")
        return True
    except Exception as e:
        err_str = str(e)
        # Si falla por auth_id (columna no existe), reintentar sin ella
        if "auth_id" in err_str and "column" in err_str.lower():
            print(f"  ⚠️  Columna auth_id no encontrada — insertando sin ella.")
            print(f"  → Ejecutar scripts/setup_auth.sql en Supabase Dashboard para habilitarla.")
            user_data_no_auth = {k: v for k, v in user_data.items() if k != "auth_id"}
            try:
                # Intentar con conflict en email solo (constraint actual)
                supabase_upsert("app_users", user_data_no_auth, conflict_col="email")
                print(f"  ✅ app_users: {email} ({role}) — sin auth_id por ahora")
                return True
            except Exception as e2:
                print(f"  ❌ Error en app_users: {e2}")
                return False
        # Si falla por constraint de email (multi-tenant no migrado aún)
        if "duplicate key" in err_str and "email" in err_str:
            print(f"  ⚠️  Registro para {email} ya existe.")
            print(f"  → Para multi-tenant (mismo email en varios clientes): ejecutar setup_auth.sql")
            print(f"  → Eso cambia la constraint a UNIQUE(email, client_id).")
            return True  # No es error fatal — el usuario principal existe
        print(f"  ❌ Error en app_users: {e}")
        return False


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
      --role admin \\
      --password "TempPass123!"

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
    parser.add_argument("--password", default=None,
                        help="Contraseña para Supabase Auth (recomendado). Si no se provee, "
                             "el usuario solo puede acceder con código de empresa (modo legacy).")

    # Branding (opcional)
    parser.add_argument("--tagline", default=None, help="Tagline de la empresa")
    parser.add_argument("--logo-url", default=None, help="URL del logo")
    parser.add_argument("--primary-color", default="#6334C0", help="Color primario hex")

    args = parser.parse_args()

    client_id = args.client_id.strip().lower().replace(" ", "_")
    email = args.email.strip().lower()
    
    print(f"\n🚀 WeKall Intelligence — Onboarding cliente: {client_id}")
    print("=" * 55)

    # ── 1. Verificar si client_id ya existe ──────────────────────────
    print(f"\n[1/5] Verificando client_id '{client_id}'...")
    existing = supabase_select("client_config", {"client_id": client_id})
    if existing:
        print(f"  ⚠️  Cliente '{client_id}' ya existe. Se actualizarán los datos.")
        action = "actualizado"
    else:
        print(f"  ✅ Nuevo cliente. Creando...")
        action = "creado"

    # ── 2. Insertar/actualizar client_config ─────────────────────────
    print(f"\n[2/5] Guardando en client_config...")
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
    print(f"\n[3/5] Guardando branding...")
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

    # ── 4. Crear usuario en Supabase Auth (si se provee contraseña) ──
    print(f"\n[4/5] Configurando autenticación para: {email}...")
    auth_id = None
    if args.password:
        auth_id = create_auth_user(email, args.password, client_id, args.role)
        if not auth_id:
            print(f"  ⚠️  Auth user no creado — continuando con modo legacy.")
    else:
        print(f"  ⚠️  Sin --password: usuario solo puede acceder con código de empresa.")
        print(f"      Recomendado: agregar --password para autenticación segura.")

    # ── 5. Insertar usuario en app_users ────────────────────────────
    print(f"\n[5/5] Creando usuario en app_users: {email}...")
    ok = upsert_app_user_with_auth(email, client_id, args.role, args.name, auth_id, now)
    if not ok:
        print(f"  ❌ Error crítico en app_users")
        sys.exit(1)

    # ── Resumen ──────────────────────────────────────────────────────
    print("\n" + "=" * 55)
    print("✅ ONBOARDING COMPLETADO")
    print("=" * 55)
    print(f"  Cliente ID  : {client_id}")
    print(f"  Nombre      : {args.client_name}")
    print(f"  País        : {args.country} ({args.currency})")
    print(f"  Usuario     : {email} [{args.role}]")
    print(f"  Supabase Auth: {'✅ Configurado' if auth_id else '⚠️  Solo modo legacy'}")
    print(f"\n  Login URL   : https://wekall-intelligence.pages.dev/login")

    if auth_id:
        print(f"\n📋 El usuario puede iniciar sesión con:")
        print(f"   Email: {email}")
        print(f"   Contraseña: (la provista)")
    else:
        print(f"\n📋 El usuario puede iniciar sesión con (modo legacy):")
        print(f"   Email: {email}")
        print(f"   Código de empresa: {client_id}")
    print()


if __name__ == "__main__":
    main()
