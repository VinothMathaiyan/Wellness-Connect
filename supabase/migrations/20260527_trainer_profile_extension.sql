-- Trainer profile extension for the recommendation engine.
-- These columns capture the closed-ended onboarding answers the matching
-- engine needs to score trainers against client training preferences.
--
-- NOTE: already applied to the live database — this file exists to preserve
-- migration history. All statements are idempotent (IF NOT EXISTS).

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS languages text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS coaching_styles text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS session_intensity text DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS max_clients integer DEFAULT 20,
ADD COLUMN IF NOT EXISTS focus_areas text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS session_types text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS rehab_certified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS medical_certified boolean DEFAULT false;
