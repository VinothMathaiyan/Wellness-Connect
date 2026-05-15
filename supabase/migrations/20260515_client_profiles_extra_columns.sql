-- Migration: Add unique constraint + extra columns to client_profiles
-- Executed: 2026-05-15
-- Purpose: (1) user_id must be UNIQUE so upsert onConflict works correctly.
--          (2) Add activity_level, fitness_level, goals columns collected by HealthProfileScreen.

-- Step 1: Add unique constraint on user_id (required for upsert to work)
ALTER TABLE client_profiles
  ADD CONSTRAINT client_profiles_user_id_key UNIQUE (user_id);

-- Step 2: Add missing columns
ALTER TABLE client_profiles
  ADD COLUMN IF NOT EXISTS activity_level  integer,
  ADD COLUMN IF NOT EXISTS fitness_level   text,
  ADD COLUMN IF NOT EXISTS goals           text[];
