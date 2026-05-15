-- Migration: Add goals, focus_areas, sessions_per_week to workout_templates
-- Executed: 2026-05-14
-- Purpose: ProgramBuilderScreen collects these fields; previously UI-only with no DB columns

ALTER TABLE workout_templates
  ADD COLUMN IF NOT EXISTS goals               text[],
  ADD COLUMN IF NOT EXISTS focus_areas         text[],
  ADD COLUMN IF NOT EXISTS sessions_per_week   integer;
