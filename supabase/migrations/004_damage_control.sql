-- Damage Control: spread excess calories over multiple days

CREATE TABLE IF NOT EXISTS damage_control (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  excess_kcal INT NOT NULL,
  reason TEXT,
  spread_days INT DEFAULT 4,
  daily_reduction INT NOT NULL,
  daily_extra_steps INT DEFAULT 2000,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_completed INT DEFAULT 0,
  active BOOL DEFAULT true
);

ALTER TABLE damage_control ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open" ON damage_control FOR ALL USING (true);
