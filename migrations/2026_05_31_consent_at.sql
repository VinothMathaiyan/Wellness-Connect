-- =============================================================================
-- 2026_05_31_consent_at.sql
-- Persist the consent timestamp on profiles (compliance: Privacy Policy +
-- Medical Disclaimer acceptance).
--
-- APPLIED via Supabase apply_migration on 2026-05-31. Kept here for audit
-- history. Idempotent (safe to re-run).
--
-- DESIGN — why the app never writes consent_at:
--   The single most important property of a consent record is that the
--   ORIGINAL timestamp is never altered. Re-stamping it on a later login would
--   falsify when the user actually agreed — worse than having no record.
--   To make that physically impossible, the column is stamped exactly once by
--   a DB DEFAULT at row creation, and NO application code writes the column.
--   In this app a profiles row is only ever created immediately after the
--   consent checkbox + OTP (RoleSelectionScreen upsert / linkAuthUserToProfile),
--   so creation time IS the consent moment.
-- =============================================================================

-- 1. Nullable column. EXISTING rows stay NULL on purpose — we do NOT fabricate
--    a timestamp for users who consented before this column existed. (A plain
--    ADD COLUMN ... DEFAULT now() would have back-stamped every existing row
--    with the migration time, which is exactly the falsification we avoid.)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS consent_at timestamptz;

-- 2. Stamp consent_at automatically for all FUTURE profile inserts.
ALTER TABLE public.profiles
  ALTER COLUMN consent_at SET DEFAULT now();

COMMENT ON COLUMN public.profiles.consent_at IS
  'When the user accepted Privacy Policy + Medical Disclaimer. Set once by the column DEFAULT at profile creation; never written or overwritten by application code (overwriting would falsify the original consent record). NULL = consented before this column existed (pre-2026-05-31).';

-- ── OPTIONAL backfill (NOT applied) ──────────────────────────────────────────
-- Consent has always been a mandatory precondition of account creation, so
-- created_at is a FAITHFUL reconstruction of each existing user's consent
-- moment (it is a real recorded event time, never a fabricated "now"). If you
-- want full historical coverage instead of NULLs, run:
--
--   UPDATE public.profiles
--      SET consent_at = created_at
--    WHERE consent_at IS NULL AND created_at IS NOT NULL;
--
-- Left out of the applied migration so the existing-data decision stays with
-- you — leaving NULL is the conservative "no record" position.
