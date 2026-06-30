-- Run this in Supabase SQL Editor

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT DEFAULT 'male',
  weight_kg NUMERIC(5,2) NOT NULL,
  height_cm NUMERIC(5,1) NOT NULL,
  goal TEXT NOT NULL DEFAULT 'maintain',
  activity_level TEXT NOT NULL DEFAULT 'moderate',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Food logs table
CREATE TABLE IF NOT EXISTS food_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type TEXT NOT NULL DEFAULT 'breakfast',
  food_name TEXT NOT NULL,
  quantity_g NUMERIC(8,2) NOT NULL DEFAULT 100,
  calories NUMERIC(8,2) DEFAULT 0,
  protein_g NUMERIC(8,2) DEFAULT 0,
  carbs_g NUMERIC(8,2) DEFAULT 0,
  fat_g NUMERIC(8,2) DEFAULT 0,
  saturated_fat_g NUMERIC(8,2) DEFAULT 0,
  fiber_g NUMERIC(8,2) DEFAULT 0,
  sugar_g NUMERIC(8,2) DEFAULT 0,
  vitamin_a NUMERIC(8,2) DEFAULT 0,
  vitamin_c NUMERIC(8,2) DEFAULT 0,
  vitamin_d NUMERIC(8,2) DEFAULT 0,
  vitamin_e NUMERIC(8,2) DEFAULT 0,
  calcium_mg NUMERIC(8,2) DEFAULT 0,
  iron_mg NUMERIC(8,2) DEFAULT 0,
  potassium_mg NUMERIC(8,2) DEFAULT 0,
  sodium_mg NUMERIC(8,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Weight logs table
CREATE TABLE IF NOT EXISTS weight_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kg NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Policies for food_logs
CREATE POLICY "Users can view own food logs" ON food_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own food logs" ON food_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own food logs" ON food_logs FOR DELETE USING (auth.uid() = user_id);

-- Policies for weight_logs
CREATE POLICY "Users can view own weight logs" ON weight_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own weight logs" ON weight_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own weight logs" ON weight_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can upsert own weight logs" ON weight_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
