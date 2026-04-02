-- Run this in Supabase SQL Editor
-- Tables for AI Insights Engine

CREATE TABLE IF NOT EXISTS user_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  insight_type TEXT NOT NULL,
  insight_key TEXT NOT NULL,
  insight_value JSONB NOT NULL,
  confidence NUMERIC DEFAULT 0.5,
  evidence_count INT DEFAULT 0,
  first_seen TIMESTAMPTZ DEFAULT now(),
  last_updated TIMESTAMPTZ DEFAULT now(),
  active BOOL DEFAULT true,
  UNIQUE(user_id, insight_type, insight_key)
);

CREATE TABLE IF NOT EXISTS user_model (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  model_version INT NOT NULL DEFAULT 1,
  model_content TEXT NOT NULL,
  token_count INT,
  generated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_model ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open" ON user_insights FOR ALL USING (true);
CREATE POLICY "open" ON user_model FOR ALL USING (true);
