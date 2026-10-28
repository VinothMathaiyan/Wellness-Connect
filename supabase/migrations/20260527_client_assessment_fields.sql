-- Migration: Add assessment questionnaire fields to client_profiles
-- These columns were applied directly to the live DB and are documented here for history.
-- All columns are optional (nullable) and additive — no existing data is altered.

-- Section D: Medical & Injuries
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS injuries               text[] DEFAULT '{}';
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS rehab_required         boolean DEFAULT false;
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS medical_certified_required boolean DEFAULT false;
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS doctor_clearance       boolean DEFAULT false;

-- Section E: Session Preferences
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS preferred_times        text[] DEFAULT '{}';
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS preferred_days         text[] DEFAULT '{}';
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS equipment_available    text[] DEFAULT '{}';
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS weekly_frequency       text;

-- Section F: Trainer Preferences
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS trainer_gender_pref    text;
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS trainer_languages      text[] DEFAULT '{}';
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS trainer_experience_pref text;
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS coaching_style_pref    text;
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS session_intensity_pref text;

-- Section G: Lifestyle & Wellness
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS sleep_quality          text;
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS stress_level           text;
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS motivation_level       text;

-- Section H: Assessor Notes
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS assessment_notes       text;
