#!/usr/bin/env python3
"""
Execute P4 migration via Supabase Management API
Since we can't use exec_sql via postgrest, we'll verify/create columns programmatically
"""

import requests
import sys

SUPABASE_URL = "https://iszodrpublcnsyvtgjcg.supabase.co"
SERVICE_KEY = "sb_secret_cTZiXtV1sViVZB-lb1GEEw_-7HPRPqb"

headers = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

print("🔧 P4 Migration: Checking transcriptions table structure...")
print()

# Step 1: Test if we can query transcriptions
try:
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/transcriptions",
        headers=headers,
        params={"limit": 1}
    )
    
    if response.status_code == 200:
        print("✅ Successfully connected to transcriptions table")
        data = response.json()
        if data:
            print(f"   Sample record keys: {list(data[0].keys())}")
            
            # Check if channel column exists
            if 'channel' in data[0]:
                print("✅ Column 'channel' already exists")
            else:
                print("⚠️  Column 'channel' does NOT exist")
                
            if 'message_type' in data[0]:
                print("✅ Column 'message_type' already exists")
            else:
                print("⚠️  Column 'message_type' does NOT exist")
        else:
            print("   Table is empty (no records to check structure)")
    else:
        print(f"❌ Error querying table: {response.status_code}")
        print(f"   Response: {response.text}")
        
except Exception as e:
    print(f"❌ Exception: {e}")

print()
print("="*70)
print("MIGRATION SQL (Execute manually in Supabase SQL Editor):")
print("="*70)
print("""
-- Add channel and message_type columns
ALTER TABLE transcriptions 
ADD COLUMN IF NOT EXISTS channel VARCHAR(20) DEFAULT 'voz',
ADD COLUMN IF NOT EXISTS message_type VARCHAR(10) DEFAULT 'inbound';

-- Update existing records to mark as voice channel
UPDATE transcriptions SET channel='voz' WHERE channel IS NULL;

-- Create composite index for efficient channel filtering
CREATE INDEX IF NOT EXISTS idx_transcriptions_channel_client 
ON transcriptions(client_id, channel, call_date);

-- Add comment for documentation
COMMENT ON COLUMN transcriptions.channel IS 'Communication channel: voz|whatsapp|email|chat';
COMMENT ON COLUMN transcriptions.message_type IS 'Direction: inbound|outbound';
""")
print("="*70)
print()
print("📋 Instructions:")
print("1. Go to: https://supabase.com/dashboard/project/iszodrpublcnsyvtgjcg/sql/new")
print("2. Paste the SQL above")
print("3. Click 'Run'")
print()
