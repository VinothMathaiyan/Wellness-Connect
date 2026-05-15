-- Migration: Add pain_score, mobility_score, sleep_quality_score to daily_metrics
-- Executed: 2026-05-14
-- Purpose: DailyCheckInScreen collects these fields; previously had no matching DB columns

ALTER TABLE daily_metrics
  ADD COLUMN IF NOT EXISTS pain_score integer,
  ADD COLUMN IF NOT EXISTS mobility_score integer,
  ADD COLUMN IF NOT EXISTS sleep_quality_score integer;
