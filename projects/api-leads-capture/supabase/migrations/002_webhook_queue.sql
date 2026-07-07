-- Webhook retry queue for multi-instance Lead Capture API workers
-- Apply in Supabase SQL editor or via supabase db push

CREATE TABLE IF NOT EXISTS webhook_queue (
  id UUID PRIMARY KEY,
  lead_id UUID NOT NULL,
  lead JSONB NOT NULL,
  webhook_url TEXT NOT NULL,
  webhook_secret TEXT,
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL,
  next_retry_at TIMESTAMPTZ NOT NULL,
  last_error TEXT,
  last_status_code INT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'dead')),
  processing_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS webhook_queue_pending_retry_idx
  ON webhook_queue (next_retry_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS webhook_queue_status_idx
  ON webhook_queue (status);

CREATE UNIQUE INDEX IF NOT EXISTS webhook_queue_pending_lead_idx
  ON webhook_queue (lead_id)
  WHERE status = 'pending';

CREATE OR REPLACE FUNCTION claim_webhook_queue_items(
  p_limit INT DEFAULT 10,
  p_claim_seconds INT DEFAULT 120
)
RETURNS SETOF webhook_queue
LANGUAGE plpgsql
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_claim_until TIMESTAMPTZ := v_now + (p_claim_seconds || ' seconds')::INTERVAL;
BEGIN
  RETURN QUERY
  UPDATE webhook_queue q
  SET processing_until = v_claim_until,
      updated_at = v_now
  FROM (
    SELECT id
    FROM webhook_queue
    WHERE status = 'pending'
      AND next_retry_at <= v_now
      AND (processing_until IS NULL OR processing_until <= v_now)
    ORDER BY next_retry_at
    LIMIT GREATEST(p_limit, 1)
    FOR UPDATE SKIP LOCKED
  ) due
  WHERE q.id = due.id
  RETURNING q.*;
END;
$$;
