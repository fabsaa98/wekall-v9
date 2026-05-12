#!/bin/bash
# Script para ejecutar migraciones P2 + P5 en Supabase
# 12 mayo 2026

set -e

SUPABASE_URL="https://iszodrpublcnsyvtgjcg.supabase.co"
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlzem9kcnB1YmxjbnN5dnRnanNnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzY1NzYyOSwiZXhwIjoyMDU5MjMzNjI5fQ.Oi5GRYSc0krtjJAn0XsN1wY9Gr-N8p3HL0rEJMO8L8o"

echo "🚀 Ejecutando migraciones P2 + P5..."

# P2: Channel Costs
echo ""
echo "📊 Migración P2: channel_costs..."
SQL_P2=$(cat supabase/migrations/20260512_channel_costs.sql)

curl -X POST "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$SQL_P2" | jq -Rs .)}" \
  2>/dev/null || {
    echo "⚠️  Usando método alternativo..."
    # Método directo usando psql via API
    psql "${SUPABASE_URL}/db" -c "$SQL_P2" 2>/dev/null || {
      echo "❌ Error ejecutando P2 via psql. Ejecutando via supabase CLI..."
      npx supabase db push --db-url "postgresql://postgres.iszodrpublcnsyvtgjcg:${SERVICE_KEY}@aws-0-us-east-1.pooler.supabase.com:6543/postgres" --file supabase/migrations/20260512_channel_costs.sql 2>/dev/null || {
        echo "⚠️  Ejecutar manualmente en Supabase SQL Editor:"
        echo "supabase/migrations/20260512_channel_costs.sql"
      }
    }
  }

# P5: Forecast Revenue
echo ""
echo "📈 Migración P5: forecast_revenue..."
SQL_P5=$(cat supabase/migrations/20260512_forecast_revenue.sql)

curl -X POST "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$SQL_P5" | jq -Rs .)}" \
  2>/dev/null || {
    echo "⚠️  Usando método alternativo..."
    psql "${SUPABASE_URL}/db" -c "$SQL_P5" 2>/dev/null || {
      echo "❌ Error ejecutando P5 via psql. Ejecutando via supabase CLI..."
      npx supabase db push --db-url "postgresql://postgres.iszodrpublcnsyvtgjcg:${SERVICE_KEY}@aws-0-us-east-1.pooler.supabase.com:6543/postgres" --file supabase/migrations/20260512_forecast_revenue.sql 2>/dev/null || {
        echo "⚠️  Ejecutar manualmente en Supabase SQL Editor:"
        echo "supabase/migrations/20260512_forecast_revenue.sql"
      }
    }
  }

echo ""
echo "✅ Migraciones completadas (o requieren ejecución manual)"
echo "📝 Archivos:"
echo "   - supabase/migrations/20260512_channel_costs.sql"
echo "   - supabase/migrations/20260512_forecast_revenue.sql"
echo ""
echo "👉 Si falló, copiar el contenido de los archivos SQL y ejecutar en:"
echo "   https://supabase.com/dashboard/project/iszodrpublcnsyvtgjcg/sql/new"
