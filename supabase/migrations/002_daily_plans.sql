-- Daily Game Plan tables + user_profile weight goal columns

CREATE TABLE IF NOT EXISTS daily_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  plan_version INT DEFAULT 1,
  adjusted_targets JSONB NOT NULL,
  meal_suggestions JSONB,
  consumed_so_far JSONB DEFAULT '{"calories":0,"protein":0,"carbs":0,"fat":0,"meals_logged":0}',
  remaining_budget JSONB,
  week_progress JSONB,
  morning_brief TEXT,
  midday_adjust TEXT,
  evening_wrap TEXT,
  generated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE daily_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open" ON daily_plans FOR ALL USING (true);

ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS weight_goal NUMERIC;
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS weight_goal_date DATE;
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS weekly_weight_target NUMERIC DEFAULT -0.4;
