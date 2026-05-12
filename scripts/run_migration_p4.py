#!/usr/bin/env python3
"""
Execute P4 migration: Add channel support to transcriptions
"""

import os
from supabase import create_client, Client

# Supabase config
SUPABASE_URL = "https://iszodrpublcnsyvtgjcg.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlzem9kcnB1YmxjbnN5dnRnanNnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzY1NzYyOSwiZXhwIjoyMDU5MjMzNjI5fQ.Oi5GRYSc0krtjJAn0XsN1wY9Gr-N8p3HL0rEJMO8L8o"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Read migration SQL
with open('supabase/migrations/20260512_add_channel_to_transcriptions.sql', 'r') as f:
    migration_sql = f.read()

# Execute migration using RPC
try:
    # Split by semicolon and execute each statement
    statements = [s.strip() for s in migration_sql.split(';') if s.strip() and not s.strip().startswith('--')]
    
    for stmt in statements:
        if stmt:
            print(f"Executing: {stmt[:80]}...")
            result = supabase.rpc('exec_sql', {'query': stmt}).execute()
            print(f"✅ Success")
    
    print("\n✅ Migration P4 completed successfully!")
    
except Exception as e:
    print(f"❌ Error executing migration: {e}")
    # Try alternative approach - direct SQL via postgrest
    print("\nTrying alternative approach...")
    
    # Check if columns exist first
    try:
        result = supabase.table('transcriptions').select('channel').limit(1).execute()
        print("✅ Column 'channel' already exists")
    except:
        print("⚠️ Column 'channel' needs to be added manually via Supabase dashboard")
        print("\nSQL to execute in Supabase SQL Editor:")
        print("="*60)
        print(migration_sql)
        print("="*60)
