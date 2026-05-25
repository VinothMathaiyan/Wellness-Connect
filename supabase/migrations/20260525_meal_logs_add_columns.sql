-- Adds AI meal-analysis columns to meal_logs.
-- meal_name: brief descriptive name of the overall meal (from Claude Vision)
-- foods_json: per-food breakdown (name, portion, calories, macros)
-- notes: free-text notes (AI estimation notes or user edits)
ALTER TABLE public.meal_logs ADD COLUMN IF NOT EXISTS meal_name text;
ALTER TABLE public.meal_logs ADD COLUMN IF NOT EXISTS foods_json jsonb;
ALTER TABLE public.meal_logs ADD COLUMN IF NOT EXISTS notes text;
