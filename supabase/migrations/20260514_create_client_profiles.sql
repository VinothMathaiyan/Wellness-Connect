-- Migration: Create client_profiles table
-- Executed: 2026-05-14
-- Purpose: HealthProfileScreen collects dob, gender, height, weight, conditions
--          which had no DB storage. Blocked on client_profiles table existing.

CREATE TABLE IF NOT EXISTS client_profiles (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid REFERENCES profiles(id) ON DELETE CASCADE,
  dob                 date,
  gender              text,
  height_cm           numeric,
  weight_kg           numeric,
  medical_conditions  text[],
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);
