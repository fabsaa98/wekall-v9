-- Migration: Customer Journeys
-- Date: 2026-05-12
-- Purpose: Track customer journey across all channels (voz, whatsapp, email, chat)

-- Create customer_journeys table
CREATE TABLE IF NOT EXISTS customer_journeys (
  id SERIAL PRIMARY KEY,
  client_id VARCHAR(50) NOT NULL,
  customer_id VARCHAR(100) NOT NULL,
  journey_id VARCHAR(100) UNIQUE NOT NULL,
  touchpoints JSONB NOT NULL DEFAULT '[]'::jsonb,
  inicio TIMESTAMP,
  fin TIMESTAMP,
  resultado VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_customer_journeys_client ON customer_journeys(client_id);
CREATE INDEX IF NOT EXISTS idx_customer_journeys_customer ON customer_journeys(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_journeys_journey_id ON customer_journeys(journey_id);
CREATE INDEX IF NOT EXISTS idx_customer_journeys_client_customer ON customer_journeys(client_id, customer_id);

-- Add comments for documentation
COMMENT ON TABLE customer_journeys IS 'Timeline of customer interactions across all channels';
COMMENT ON COLUMN customer_journeys.touchpoints IS 'Array of touchpoint objects: [{id, channel, timestamp, agent_name, summary, resultado}]';
COMMENT ON COLUMN customer_journeys.resultado IS 'Final outcome: exitoso|fallido|pendiente|abandonado';

-- Create RPC function to get customer journey
CREATE OR REPLACE FUNCTION get_customer_journey(
  p_customer_id VARCHAR,
  p_client_id VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  journey_id VARCHAR,
  customer_id VARCHAR,
  touchpoints JSONB,
  inicio TIMESTAMP,
  fin TIMESTAMP,
  resultado VARCHAR,
  created_at TIMESTAMP
) AS $$
BEGIN
  -- If journey exists in customer_journeys table, return it
  IF EXISTS (
    SELECT 1 FROM customer_journeys cj
    WHERE cj.customer_id = p_customer_id
    AND (p_client_id IS NULL OR cj.client_id = p_client_id)
  ) THEN
    RETURN QUERY
    SELECT 
      cj.journey_id,
      cj.customer_id,
      cj.touchpoints,
      cj.inicio,
      cj.fin,
      cj.resultado,
      cj.created_at
    FROM customer_journeys cj
    WHERE cj.customer_id = p_customer_id
    AND (p_client_id IS NULL OR cj.client_id = p_client_id)
    ORDER BY cj.created_at DESC
    LIMIT 1;
  ELSE
    -- Build journey from transcriptions (fallback)
    RETURN QUERY
    WITH journey_data AS (
      SELECT 
        p_customer_id as customer_id,
        'journey_' || p_customer_id || '_' || EXTRACT(EPOCH FROM NOW())::TEXT as journey_id,
        jsonb_agg(
          jsonb_build_object(
            'id', 'tp_' || t.id,
            'channel', COALESCE(t.channel, 'voz'),
            'timestamp', t.call_date,
            'agent_name', t.agent_name,
            'summary', t.summary,
            'resultado', CASE
              WHEN LOWER(t.summary) LIKE '%exitoso%' OR LOWER(t.summary) LIKE '%éxito%' THEN 'exitoso'
              WHEN LOWER(t.summary) LIKE '%fallido%' OR LOWER(t.summary) LIKE '%rechaz%' THEN 'fallido'
              ELSE 'pendiente'
            END
          ) ORDER BY t.call_date
        ) as touchpoints,
        MIN(t.call_date) as inicio,
        MAX(t.call_date) as fin,
        CASE 
          WHEN COUNT(*) FILTER (WHERE LOWER(t.summary) LIKE '%exitoso%' OR LOWER(t.summary) LIKE '%éxito%') > 0 THEN 'exitoso'
          WHEN COUNT(*) FILTER (WHERE LOWER(t.summary) LIKE '%fallido%' OR LOWER(t.summary) LIKE '%rechaz%') > 0 THEN 'fallido'
          ELSE 'pendiente'
        END as resultado,
        NOW() as created_at
      FROM transcriptions t
      WHERE t.client_phone LIKE '%' || p_customer_id || '%'
        OR t.summary LIKE '%' || p_customer_id || '%'
        AND (p_client_id IS NULL OR t.client_id = p_client_id)
      GROUP BY p_customer_id
    )
    SELECT 
      jd.journey_id::VARCHAR,
      jd.customer_id::VARCHAR,
      jd.touchpoints,
      jd.inicio,
      jd.fin,
      jd.resultado::VARCHAR,
      jd.created_at
    FROM journey_data jd;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION get_customer_journey IS 'Get customer journey from customer_journeys table or build from transcriptions';
