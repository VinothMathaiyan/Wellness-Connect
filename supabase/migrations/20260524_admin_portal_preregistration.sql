-- Migration: Admin Portal — Assessment Team pre-registration
-- Date: 2026-05-24
--
-- Design note (differs from the original spec, intentionally):
--   profiles.id is FOREIGN KEY (id) REFERENCES auth.users(id), so a profiles
--   row CANNOT exist before the user has authenticated via OTP. Pre-registering
--   an assessor by inserting a profiles row with a random UUID would violate
--   that FK. Pre-registrations therefore live in their own table
--   (preregistered_assessors) and are linked to a real profile on first login.
--
--   Phone lookups reuse the existing profiles.phone_number column rather than
--   adding a second phone column.

-- 1. Activation flag on profiles (lets a signed-in assessor be deactivated)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- 2. Lookup index on phone_number.
--    NOTE: a UNIQUE index is not possible — existing rows already contain
--    duplicate phone_number values — so this is a plain index for lookup speed.
CREATE INDEX IF NOT EXISTS profiles_phone_number_idx
  ON profiles(phone_number) WHERE phone_number IS NOT NULL;

-- 3. Pre-registration table (no auth FK on the row itself — it exists before
--    the user signs in; linked_user_id is stamped on first OTP sign-in).
CREATE TABLE IF NOT EXISTS preregistered_assessors (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name      text NOT NULL,
  phone          text NOT NULL UNIQUE,            -- E.164, e.g. +919876543210
  role           text NOT NULL DEFAULT 'assessor',
  is_active      boolean NOT NULL DEFAULT true,
  linked_user_id uuid REFERENCES auth.users(id),  -- set on first OTP sign-in
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- RLS: the Admin Portal is a hardcoded-credential MVP gate that talks to
-- Supabase as the anon role, so it needs open access to this table. Lock this
-- down once admin login moves to real Supabase Auth (see FEATURE_STATUS gaps).
ALTER TABLE preregistered_assessors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "preregistered_assessors open access (MVP)" ON preregistered_assessors;
CREATE POLICY "preregistered_assessors open access (MVP)"
  ON preregistered_assessors FOR ALL
  TO public
  USING (true) WITH CHECK (true);

-- 4. Admin accounts table (created per spec). Admin login is currently a
--    hardcoded MVP gate inside AdminDashboardScreen and does NOT read this yet;
--    the table is here for the future move to real admin auth.
CREATE TABLE IF NOT EXISTS admin_users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  full_name     text NOT NULL,
  created_at    timestamptz DEFAULT now()
);
