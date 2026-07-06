-- Lead Capture API: shared leads table for multi-instance deploys
-- Apply in Supabase SQL editor or via supabase db push

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  message TEXT,
  source TEXT NOT NULL CHECK (source IN ('landing', 'referral', 'ads', 'other')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  email_normalized TEXT GENERATED ALWAYS AS (lower(trim(email))) STORED
);

CREATE UNIQUE INDEX IF NOT EXISTS leads_email_normalized_idx
  ON leads (email_normalized);

CREATE INDEX IF NOT EXISTS leads_created_at_idx
  ON leads (created_at DESC);

CREATE INDEX IF NOT EXISTS leads_source_idx
  ON leads (source);
