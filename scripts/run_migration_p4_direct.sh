#!/bin/bash
# Execute P4 migration via Supabase REST API

SUPABASE_URL="https://iszodrpublcnsyvtgjcg.supabase.co"
SERVICE_KEY="sb_secret_cTZiXtV1sViVZB-lb1GEEw_-7HPRPqb"

# Read SQL file and execute each statement
SQL_FILE="supabase/migrations/20260512_add_channel_to_transcriptions.sql"

echo "🔧 Executing P4 Migration: Add channel support to transcriptions"
echo ""

# For Supabase, we need to use the SQL Editor or execute via psql
# Let's try with curl to postgrest if there's an RPC function

# Alternative: Use psql with proper connection string
export PGPASSWORD="Gl0r1@.W3k@ll"

psql \
  "postgresql://postgres.iszodrpublcnsyvtgjcg:${PGPASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres" \
  -f "$SQL_FILE"

echo ""
echo "✅ Migration executed. Check output above for any errors."
