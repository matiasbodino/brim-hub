-- Workout logs for Adaptive Training Engine

CREATE TABLE IF NOT EXISTS workout_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  routine_name TEXT,
  focus TEXT,
  exercises JSONB NOT NULL,
  performance JSONB,
  rpe INT CHECK (rpe >= 1 AND rpe <= 10),
  total_volume NUMERIC,
  duration_min INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open" ON workout_logs FOR ALL USING (true);
