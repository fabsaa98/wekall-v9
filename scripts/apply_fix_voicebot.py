#!/usr/bin/env python3
"""
Apply fix: get_channel_cost_comparison() — eliminar referencia a voicebot_used
13 mayo 2026
"""
import os
import sys
from pathlib import Path

# Agregar parent dir al path para imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from supabase import create_client, Client

def main():
    # Credenciales desde .env.local
    SUPABASE_URL = "https://iszodrpublcnsyvtgjcg.supabase.co"
    SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlzem9kcnB1YmxjbnN5dnRnanNnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzY1NzYyOSwiZXhwIjoyMDU5MjMzNjI5fQ.Oi5GRYSc0krtjJAn0XsN1wY9Gr-N8p3HL0rEJMO8L8o"
    
    print("🔧 Aplicando fix: get_channel_cost_comparison()")
    print("📝 Problema: cdr_daily_metrics NO tiene columna voicebot_used")
    print("✅ Solución: volúmenes en 0 hasta que se agregue la columna\n")
    
    # Leer migración
    migration_path = Path(__file__).parent.parent / "supabase/migrations/20260513_fix_channel_costs_voicebot.sql"
    
    if not migration_path.exists():
        print(f"❌ Error: No se encuentra {migration_path}")
        sys.exit(1)
    
    sql_content = migration_path.read_text()
    
    print(f"📂 Ejecutando migración: {migration_path.name}")
    
    # Conectar a Supabase
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    try:
        # Ejecutar SQL usando RPC (postgres permite ejecutar SQL via función)
        # Como Supabase no expone exec_sql directamente, usamos psycopg2
        import psycopg2
        
        # Construir connection string
        conn_string = f"postgresql://postgres.iszodrpublcnsyvtgjcg:{os.getenv('SUPABASE_DB_PASSWORD', 'PASSWORD_NEEDED')}@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
        
        print("❌ MÉTODO NO DISPONIBLE: Necesitas ejecutar el SQL manualmente en Supabase SQL Editor")
        print("\n📋 INSTRUCCIONES:")
        print("1. Ir a: https://supabase.com/dashboard/project/iszodrpublcnsyvtgjcg/sql/new")
        print(f"2. Copiar el contenido de: {migration_path}")
        print("3. Ejecutar (RUN)")
        print("\nO alternativamente, usar psql con el password de la DB")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
