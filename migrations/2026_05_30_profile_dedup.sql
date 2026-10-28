-- =============================================================================
-- 2026_05_30_profile_dedup.sql
-- Deduplicate profiles rows sharing a phone_number, then add a UNIQUE safety net.
--
-- RUN MANUALLY in the Supabase SQL editor. Review the preview SELECT first.
-- Wrapped in a single transaction — if anything fails, nothing is committed.
--
-- KEEP STRATEGY (decided 2026-05-30): keep the auth identity the user actually
-- logs in as — the row whose auth.users.last_sign_in_at is most recent
-- (tie-break: oldest profiles.created_at). All child rows belonging to the
-- losing row(s) are MOVED (merged) onto the surviving row before the loser is
-- deleted. This deviates from a literal "keep oldest" rule because, in this DB,
-- the oldest row per duplicate phone is an unused seed account while the newer
-- row is the live dev login that carries the user's real session + data.
--
-- NOTE: This script does NOT touch auth.users (out of scope). The orphaned seed
-- auth.users rows (e.g. alex.johnson@wellnessconnect.dev) are harmless — they
-- were never signed into, and the app upserts a profile on next login anyway.
-- =============================================================================

BEGIN;

-- ── 1. Build the loser -> winner map ─────────────────────────────────────────
-- One winner per duplicate phone_number; every other row in the group is a loser.
CREATE TEMP TABLE profile_merge_map ON COMMIT DROP AS
WITH dup_phones AS (
  SELECT phone_number
  FROM profiles
  WHERE phone_number IS NOT NULL AND phone_number <> ''
  GROUP BY phone_number
  HAVING COUNT(*) > 1
),
ranked AS (
  SELECT
    p.id,
    p.phone_number,
    ROW_NUMBER() OVER (
      PARTITION BY p.phone_number
      ORDER BY au.last_sign_in_at DESC NULLS LAST, p.created_at ASC
    ) AS rn,
    FIRST_VALUE(p.id) OVER (
      PARTITION BY p.phone_number
      ORDER BY au.last_sign_in_at DESC NULLS LAST, p.created_at ASC
    ) AS winner_id
  FROM profiles p
  JOIN dup_phones d ON d.phone_number = p.phone_number
  LEFT JOIN auth.users au ON au.id = p.id
)
SELECT id AS loser_id, winner_id, phone_number
FROM ranked
WHERE rn > 1;

-- ── Preview (read-only) — confirm winners/losers before committing ───────────
-- SELECT * FROM profile_merge_map;

-- ── 2. Re-point child FK columns with NO unique constraint on the FK column ──
-- Safe to bulk-update: no uniqueness can be violated by collapsing loser->winner.
DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT * FROM (VALUES
      ('assessment_messages', 'client_id'),
      ('assessment_messages', 'from_user_id'),
      ('assessment_messages', 'to_user_id'),
      ('assessments',         'recommended_trainer_id'),
      ('callback_requests',   'client_id'),
      ('callback_requests',   'trainer_id'),
      ('escalations',         'client_id'),
      ('escalations',         'assessor_id'),
      ('meal_logs',           'user_id'),
      ('messages',            'from_user_id'),
      ('messages',            'to_user_id'),
      ('monthly_reviews',     'client_id'),
      ('monthly_reviews',     'assessor_id'),
      ('notifications',       'from_user_id'),
      ('notifications',       'to_user_id'),
      ('risk_alerts',         'client_id'),
      ('risk_alerts',         'trainer_id'),
      ('sessions',            'client_id'),
      ('sessions',            'trainer_id'),
      ('trainer_approvals',   'trainer_id'),
      ('trainer_approvals',   'assessor_id'),
      ('trainer_feedback',    'client_id'),
      ('trainer_feedback',    'trainer_id'),
      ('workout_logs',        'client_id'),
      ('workout_plans',       'client_id'),
      ('workout_plans',       'trainer_id'),
      ('workout_templates',   'trainer_id')
    ) AS t(tbl, col)
  LOOP
    EXECUTE format(
      'UPDATE public.%I AS c SET %I = m.winner_id
         FROM profile_merge_map m
        WHERE c.%I = m.loser_id',
      rec.tbl, rec.col, rec.col
    );
  END LOOP;
END $$;

-- ── 3. Re-point child FK columns that ARE part of a UNIQUE constraint ────────
-- Pattern per column: move only rows that won't collide with a row the winner
-- already owns; then delete the leftover (colliding) loser rows — the winner's
-- equivalent row is the keeper.

-- assessments — UNIQUE (client_id, assessor_id)
UPDATE public.assessments c SET client_id = m.winner_id
  FROM profile_merge_map m
 WHERE c.client_id = m.loser_id
   AND NOT EXISTS (SELECT 1 FROM public.assessments w
                    WHERE w.client_id = m.winner_id
                      AND w.assessor_id IS NOT DISTINCT FROM c.assessor_id);
DELETE FROM public.assessments c USING profile_merge_map m WHERE c.client_id = m.loser_id;

UPDATE public.assessments c SET assessor_id = m.winner_id
  FROM profile_merge_map m
 WHERE c.assessor_id = m.loser_id
   AND NOT EXISTS (SELECT 1 FROM public.assessments w
                    WHERE w.assessor_id = m.winner_id
                      AND w.client_id IS NOT DISTINCT FROM c.client_id);
DELETE FROM public.assessments c USING profile_merge_map m WHERE c.assessor_id = m.loser_id;

-- client_profiles — UNIQUE (user_id)
UPDATE public.client_profiles c SET user_id = m.winner_id
  FROM profile_merge_map m
 WHERE c.user_id = m.loser_id
   AND NOT EXISTS (SELECT 1 FROM public.client_profiles w WHERE w.user_id = m.winner_id);
DELETE FROM public.client_profiles c USING profile_merge_map m WHERE c.user_id = m.loser_id;

-- daily_metrics — UNIQUE (user_id, log_date)
UPDATE public.daily_metrics c SET user_id = m.winner_id
  FROM profile_merge_map m
 WHERE c.user_id = m.loser_id
   AND NOT EXISTS (SELECT 1 FROM public.daily_metrics w
                    WHERE w.user_id = m.winner_id AND w.log_date = c.log_date);
DELETE FROM public.daily_metrics c USING profile_merge_map m WHERE c.user_id = m.loser_id;

-- weekly_reflections — UNIQUE (user_id, week_start)
UPDATE public.weekly_reflections c SET user_id = m.winner_id
  FROM profile_merge_map m
 WHERE c.user_id = m.loser_id
   AND NOT EXISTS (SELECT 1 FROM public.weekly_reflections w
                    WHERE w.user_id = m.winner_id AND w.week_start = c.week_start);
DELETE FROM public.weekly_reflections c USING profile_merge_map m WHERE c.user_id = m.loser_id;

-- trainer_client_links — UNIQUE (trainer_id, client_id)
UPDATE public.trainer_client_links c SET client_id = m.winner_id
  FROM profile_merge_map m
 WHERE c.client_id = m.loser_id
   AND NOT EXISTS (SELECT 1 FROM public.trainer_client_links w
                    WHERE w.client_id = m.winner_id AND w.trainer_id = c.trainer_id);
DELETE FROM public.trainer_client_links c USING profile_merge_map m WHERE c.client_id = m.loser_id;

UPDATE public.trainer_client_links c SET trainer_id = m.winner_id
  FROM profile_merge_map m
 WHERE c.trainer_id = m.loser_id
   AND NOT EXISTS (SELECT 1 FROM public.trainer_client_links w
                    WHERE w.trainer_id = m.winner_id AND w.client_id = c.client_id);
DELETE FROM public.trainer_client_links c USING profile_merge_map m WHERE c.trainer_id = m.loser_id;

-- trainer_recommendations — UNIQUE (client_id, trainer_id)
UPDATE public.trainer_recommendations c SET client_id = m.winner_id
  FROM profile_merge_map m
 WHERE c.client_id = m.loser_id
   AND NOT EXISTS (SELECT 1 FROM public.trainer_recommendations w
                    WHERE w.client_id = m.winner_id AND w.trainer_id = c.trainer_id);
DELETE FROM public.trainer_recommendations c USING profile_merge_map m WHERE c.client_id = m.loser_id;

UPDATE public.trainer_recommendations c SET trainer_id = m.winner_id
  FROM profile_merge_map m
 WHERE c.trainer_id = m.loser_id
   AND NOT EXISTS (SELECT 1 FROM public.trainer_recommendations w
                    WHERE w.trainer_id = m.winner_id AND w.client_id = c.client_id);
DELETE FROM public.trainer_recommendations c USING profile_merge_map m WHERE c.trainer_id = m.loser_id;

-- assessment_trainer_recommendations — UNIQUE (assessment_id, trainer_id)
UPDATE public.assessment_trainer_recommendations c SET trainer_id = m.winner_id
  FROM profile_merge_map m
 WHERE c.trainer_id = m.loser_id
   AND NOT EXISTS (SELECT 1 FROM public.assessment_trainer_recommendations w
                    WHERE w.trainer_id = m.winner_id AND w.assessment_id = c.assessment_id);
DELETE FROM public.assessment_trainer_recommendations c USING profile_merge_map m WHERE c.trainer_id = m.loser_id;

-- assessor_profiles — PK (id) is itself the profiles FK (1:1 extension table)
UPDATE public.assessor_profiles c SET id = m.winner_id
  FROM profile_merge_map m
 WHERE c.id = m.loser_id
   AND NOT EXISTS (SELECT 1 FROM public.assessor_profiles w WHERE w.id = m.winner_id);
DELETE FROM public.assessor_profiles c USING profile_merge_map m WHERE c.id = m.loser_id;

-- ── 4. Delete the now-orphaned loser profile rows ────────────────────────────
DELETE FROM public.profiles p USING profile_merge_map m WHERE p.id = m.loser_id;

-- ── 5. Add the UNIQUE safety net on phone_number ─────────────────────────────
-- Postgres treats NULLs as distinct, so multiple NULL phone_numbers are still
-- allowed (some auth providers may not supply a phone). Empty-string '' is NOT
-- null and WOULD collide — the app is being changed to write NULL, never ''.
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_phone_number_key UNIQUE (phone_number);

-- ── 6. Verification (should return zero rows) ────────────────────────────────
-- SELECT phone_number, COUNT(*)
--   FROM profiles
--  WHERE phone_number IS NOT NULL AND phone_number <> ''
--  GROUP BY phone_number HAVING COUNT(*) > 1;

COMMIT;
