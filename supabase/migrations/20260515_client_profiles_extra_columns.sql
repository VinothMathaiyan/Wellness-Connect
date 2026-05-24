-- Migration: Add extra columns to client_profiles
-- Executed: 2026-05-15
-- Purpose: Add activity_level, fitness_level, goals columns collected by HealthProfileScreen.
-- Note: UNIQUE constraint on user_id (client_profiles_user_id_key) was already applied separately.

ALTER TABLE client_profiles
  ADD COLUMN IF NOT EXISTS activity_level  integer,
  ADD COLUMN IF NOT EXISTS fitness_level   text,
  ADD COLUMN IF NOT EXISTS goals           text[];
