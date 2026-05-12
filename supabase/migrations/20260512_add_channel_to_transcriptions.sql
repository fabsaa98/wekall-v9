-- Migration: Add multi-channel support to transcriptions
-- Date: 2026-05-12
-- Purpose: Enable Speech Analytics for WhatsApp, Email, Chat (not just voice)

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
