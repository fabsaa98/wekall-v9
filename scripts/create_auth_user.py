#!/usr/bin/env python3
"""
WeKall Intelligence — Crear usuario en Supabase Auth y enlazar con app_users.

Uso:
    python3 scripts/create_auth_user.py \
        --email ceo@empresa.co \
        --password TempPass123! \
        --client-id empresa_xyz \
        --name "CEO Nombre" \
        --role CEO

Notas:
  - Un email puede estar en múltiples clientes (multi-tenant).
    Auth es por email; la asociación a cliente es por app_users.
  - Si el usuario ya existe en Supabase Auth, solo actualiza app_users.
  - Usa el Service Key (rol admin) para crear usuarios sin confirmación de email.
"""

import argparse
import sys
import requests
import json

import os
SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://iszodrpublcnsyvtgjcg.supabase.co')
SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY', '')

ADMIN_HEADERS = {
    'apikey': SERVICE_KEY,
    'Authorization': f'Bearer {SERVICE_KEY}',
    'Content-Type': 'application/json',
}

REST_HEADERS = {
    'apikey': SERVICE_KEY,
    'Authorization': f'Bearer {SERVICE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
}


def create_or_get_auth_user(email: str, password: str, client_id: str, role: str) -> dict | None:
    """
    Crea el usuario en Supabase Auth via Admin API.
    Si ya existe (409 conflict), obtiene el usuario existente.
    Retorna el auth user dict o None si hay error.
    """
    resp = requests.post(
        f'{SUPABASE_URL}/auth/v1/admin/users',
        headers=ADMIN_HEADERS,
        json={
            'email': email,
            'password': password,
            'email_confirm': True,  # confirmar automáticamente — no requiere email de verificación
            'user_metadata': {'client_id': client_id, 'role': role},
        },
        timeout=15,
    )

    if resp.status_code in (200, 201):
        auth_user = resp.json()
        print(f'✅ Auth user creado: {auth_user["id"]}')
        return auth_user

    # Si ya existe (422 con mensaje de email ya registrado)
    if resp.status_code == 422:
        err = resp.json()
        msg = err.get('msg', '') or err.get('message', '') or str(err)
        if 'already been registered' in msg or 'already exists' in msg or 'already registered' in msg:
            print(f'⚠️  El email {email} ya existe en Supabase Auth. Actualizando app_users...')
            # Buscar el usuario existente por email via Admin API
            list_resp = requests.get(
                f'{SUPABASE_URL}/auth/v1/admin/users',
                headers=ADMIN_HEADERS,
                params={'page': 1, 'per_page': 200},
                timeout=15,
            )
            if list_resp.status_code == 200:
                users = list_resp.json().get('users', [])
                for u in users:
                    if u.get('email') == email:
                        print(f'✅ Auth user encontrado: {u["id"]}')
                        # Actualizar contraseña si se especificó
                        update_resp = requests.put(
                            f'{SUPABASE_URL}/auth/v1/admin/users/{u["id"]}',
                            headers=ADMIN_HEADERS,
                            json={'password': password},
                            timeout=15,
                        )
                        if update_resp.status_code == 200:
                            print(f'✅ Contraseña actualizada')
                        return u
            print(f'❌ No se pudo encontrar el usuario existente')
            return None

    print(f'❌ Error creando auth user ({resp.status_code}): {resp.text}')
    return None


def upsert_app_user(email: str, client_id: str, role: str, name: str | None, auth_id: str) -> bool:
    """
    Upsert del registro en app_users, actualizando auth_id.
    Si ya existe el registro email+client_id, solo actualiza auth_id.
    Si no existe, crea uno nuevo.

    NOTA: Si la columna auth_id no existe aún (migración SQL pendiente),
    crea/verifica el registro sin auth_id y avisa. El login funciona igual
    porque getAppUser() busca por email, no por auth_id.
    Para agregar auth_id: ejecutar scripts/setup_auth.sql en el Dashboard de Supabase.
    """
    # Verificar si ya existe
    check_resp = requests.get(
        f'{SUPABASE_URL}/rest/v1/app_users',
        headers=REST_HEADERS,
        params={'email': f'eq.{email}', 'client_id': f'eq.{client_id}', 'select': '*'},
        timeout=15,
    )

    if check_resp.status_code != 200:
        print(f'❌ Error consultando app_users: {check_resp.text}')
        return False

    existing = check_resp.json()

    if existing:
        record_id = existing[0]['id']
        # Intentar actualizar auth_id; si falla (columna no existe), solo avisar
        update_resp = requests.patch(
            f'{SUPABASE_URL}/rest/v1/app_users',
            headers=REST_HEADERS,
            params={'id': f'eq.{record_id}'},
            json={'auth_id': auth_id},
            timeout=15,
        )
        if update_resp.status_code in (200, 204):
            print(f'✅ app_users actualizado con auth_id (email={email}, client_id={client_id})')
            return True
        else:
            err = update_resp.json() if update_resp.text else {}
            if 'auth_id' in str(err) and 'column' in str(err).lower():
                print(f'⚠️  app_users existe pero columna auth_id no encontrada.')
                print(f'   → Ejecutar scripts/setup_auth.sql en Supabase Dashboard para agregar la columna.')
                print(f'   → El login con contraseña funciona igual (busca por email).')
                return True  # Parcialmente exitoso — auth user creado, columna pendiente
            print(f'❌ Error actualizando app_users: {update_resp.text}')
            return False
    else:
        # Crear nuevo registro — intentar con auth_id primero, luego sin él
        insert_data = {
            'email': email,
            'client_id': client_id,
            'role': role,
            'name': name or email,
            'active': True,
            'auth_id': auth_id,
        }
        insert_resp = requests.post(
            f'{SUPABASE_URL}/rest/v1/app_users',
            headers=REST_HEADERS,
            json=insert_data,
            timeout=15,
        )
        if insert_resp.status_code in (200, 201):
            print(f'✅ app_users creado (email={email}, client_id={client_id})')
            return True

        # Si falla por auth_id, reintentar sin esa columna
        err = insert_resp.json() if insert_resp.text else {}
        if 'auth_id' in str(err) and 'column' in str(err).lower():
            del insert_data['auth_id']
            retry_resp = requests.post(
                f'{SUPABASE_URL}/rest/v1/app_users',
                headers=REST_HEADERS,
                json=insert_data,
                timeout=15,
            )
            if retry_resp.status_code in (200, 201):
                print(f'✅ app_users creado sin auth_id (ejecutar setup_auth.sql para habilitar enlace).')
                return True
            print(f'❌ Error creando app_users: {retry_resp.text}')
            return False

        print(f'❌ Error creando app_users: {insert_resp.text}')
        return False


def create_auth_user(email: str, password: str, client_id: str, name: str | None = None, role: str = 'CEO') -> bool:
    """
    Flujo completo:
    1. Crear/obtener usuario en Supabase Auth
    2. Upsert en app_users con auth_id
    """
    email = email.strip().lower()
    client_id = client_id.strip().lower()

    print(f'\n👤 Procesando: {email} → {client_id} [{role}]')

    # 1. Auth user
    auth_user = create_or_get_auth_user(email, password, client_id, role)
    if not auth_user:
        return False

    # 2. app_users
    success = upsert_app_user(email, client_id, role, name, auth_user['id'])
    return success


if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description='WeKall Intelligence — Crear usuario en Supabase Auth',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos:
  python3 scripts/create_auth_user.py \\
      --email ceo@empresa.co \\
      --password TempPass123! \\
      --client-id empresa_xyz \\
      --name "CEO Nombre" \\
      --role CEO

  python3 scripts/create_auth_user.py \\
      --email fabian@wekall.co \\
      --password WeKall2026! \\
      --client-id wekall \\
      --name "Fabián Saavedra" \\
      --role admin
        """,
    )
    parser.add_argument('--email', required=True, help='Email del usuario')
    parser.add_argument('--password', required=True, help='Contraseña inicial')
    parser.add_argument('--client-id', required=True, help='ID del cliente (ej: empresa_xyz)')
    parser.add_argument('--name', default=None, help='Nombre del usuario')
    parser.add_argument('--role', default='CEO',
                        choices=['CEO', 'VP Ventas', 'VP CX', 'COO', 'admin'],
                        help='Rol del usuario (default: CEO)')

    args = parser.parse_args()
    ok = create_auth_user(args.email, args.password, args.client_id, args.name, args.role)
    sys.exit(0 if ok else 1)
