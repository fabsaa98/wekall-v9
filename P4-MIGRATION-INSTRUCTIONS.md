# P4 Migration: Add Multi-Channel Support to Transcriptions

## Status: ⚠️ REQUIRES MANUAL EXECUTION

The migration SQL has been created but must be executed manually via Supabase Dashboard due to authentication constraints.

## Migration File
`supabase/migrations/20260512_add_channel_to_transcriptions.sql`

## Instructions

1. Go to Supabase SQL Editor:
   https://supabase.com/dashboard/project/iszodrpublcnsyvtgjcg/sql/new

2. Paste and execute the following SQL:

```sql
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
```

3. Verify execution:
```bash
cd /Users/celeru/.openclaw/workspace/WeIntelligence
python3 scripts/migrate_p4_via_api.py
```

Expected output:
- ✅ Column 'channel' already exists
- ✅ Column 'message_type' already exists

## What This Enables

- **Multi-channel support**: Voice, WhatsApp, Email, Chat
- **Message direction tracking**: Inbound/Outbound
- **Efficient filtering**: Composite index for client + channel + date queries

## Next Steps

After executing this migration, the frontend components (P4 Frontend tasks) can be implemented.
