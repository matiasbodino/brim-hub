-- ============================================
-- BRIM HUB — DATABASE SCHEMA
-- ============================================

CREATE TABLE user_profile (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  display_name TEXT NOT NULL DEFAULT 'Mati',
  daily_calorie_target INT NOT NULL DEFAULT 2100,
  daily_protein_target INT NOT NULL DEFAULT 150,
  daily_carbs_target INT NOT NULL DEFAULT 210,
  daily_fat_target INT NOT NULL DEFAULT 70,
  daily_water_target NUMERIC(3,1) NOT NULL DEFAULT 2.5,
  daily_steps_target INT NOT NULL DEFAULT 10000,
  weekly_bjj_target INT NOT NULL DEFAULT 2,
  weekly_gym_target INT NOT NULL DEFAULT 2,
  target_weight NUMERIC(5,1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE weight_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  date DATE NOT NULL,
  weight NUMERIC(5,1) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE TABLE food_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  meal_type TEXT NOT NULL CHECK (meal_type IN ('desayuno', 'almuerzo', 'merienda', 'cena', 'snack')),
  description TEXT NOT NULL,
  calories INT NOT NULL,
  protein NUMERIC(5,1) NOT NULL DEFAULT 0,
  carbs NUMERIC(5,1) NOT NULL DEFAULT 0,
  fat NUMERIC(5,1) NOT NULL DEFAULT 0,
  confirmed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  habit_type TEXT NOT NULL CHECK (habit_type IN ('water', 'steps', 'bjj', 'gym')),
  value NUMERIC(10,1) NOT NULL,
  target NUMERIC(10,1) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date, habit_type)
);

CREATE TABLE streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  habit_type TEXT NOT NULL,
  current_streak INT NOT NULL DEFAULT 0,
  best_streak INT NOT NULL DEFAULT 0,
  last_completed DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, habit_type)
);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE gym_routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  focus TEXT NOT NULL,
  exercises JSONB NOT NULL,
  duration_min INT NOT NULL DEFAULT 30,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_routines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_data" ON user_profile FOR ALL USING (id = auth.uid());
CREATE POLICY "user_own_data" ON weight_logs FOR ALL USING (user_id = auth.uid());
CREATE POLICY "user_own_data" ON food_logs FOR ALL USING (user_id = auth.uid());
CREATE POLICY "user_own_data" ON habit_logs FOR ALL USING (user_id = auth.uid());
CREATE POLICY "user_own_data" ON streaks FOR ALL USING (user_id = auth.uid());
CREATE POLICY "user_own_data" ON chat_messages FOR ALL USING (user_id = auth.uid());
CREATE POLICY "user_own_data" ON gym_routines FOR ALL USING (user_id = auth.uid());

-- Indexes
CREATE INDEX idx_food_logs_user_date ON food_logs(user_id, logged_at);
CREATE INDEX idx_habit_logs_user_date ON habit_logs(user_id, date);
CREATE INDEX idx_weight_logs_user_date ON weight_logs(user_id, date);
CREATE INDEX idx_chat_messages_user_date ON chat_messages(user_id, created_at);
