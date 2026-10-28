-- Migration: Trainer Approval Gate — approve/reject RPCs (SECURITY DEFINER)
-- Date: 2026-05-28
--
-- Why RPCs: both approve and reject need to be checked authorization gates
-- rather than open table writes.
--
-- approve_trainer must update BOTH trainer_approvals (status, assessor_id,
-- reviewed_at) AND profiles (is_active=true). The assessor's RLS context can
-- update trainer_approvals (RLS currently disabled on that table) but not
-- another user's row in profiles — the "Users can update own profile" policy
-- restricts UPDATE to auth.uid() = id. Without the RPC, the JS
-- approveTrainer's second UPDATE silently affects 0 rows, leaving the
-- approval row status='approved' but profiles.is_active=false — the trainer
-- would then be invisible to the approved_trainers view used by discovery.
--
-- reject_trainer only writes trainer_approvals, but trainer_approvals has
-- RLS DISABLED today (flagged by the Supabase advisor). The moment that
-- is locked down pre-production, any JS UPDATE from a non-owner session
-- will silently affect 0 rows — the same bug that bit approve. The RPC
-- pattern fixes that proactively and centralizes the "only assessors may
-- write to approval rows" authorization in one place.
--
-- SECURITY DEFINER runs each function with the owner's privileges so writes
-- bypass the calling assessor's RLS. Each function explicitly verifies the
-- caller is an assessor via auth.uid() before doing anything. All writes in
-- a function run inside its implicit transaction, so each call is atomic.

CREATE OR REPLACE FUNCTION approve_trainer(p_trainer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assessor_id uuid;
  v_caller_role text;
BEGIN
  v_assessor_id := auth.uid();
  IF v_assessor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role INTO v_caller_role FROM profiles WHERE id = v_assessor_id;
  IF v_caller_role <> 'assessor' THEN
    RAISE EXCEPTION 'Only assessors can approve trainers';
  END IF;

  UPDATE trainer_approvals
     SET status      = 'approved',
         assessor_id = v_assessor_id,
         reviewed_at = NOW()
   WHERE trainer_id  = p_trainer_id;

  UPDATE profiles
     SET is_active = true
   WHERE id   = p_trainer_id
     AND role = 'trainer';
END;
$$;

REVOKE ALL  ON FUNCTION approve_trainer(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION approve_trainer(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION reject_trainer(p_trainer_id uuid, p_review_notes text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assessor_id uuid;
  v_caller_role text;
BEGIN
  v_assessor_id := auth.uid();
  IF v_assessor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role INTO v_caller_role FROM profiles WHERE id = v_assessor_id;
  IF v_caller_role <> 'assessor' THEN
    RAISE EXCEPTION 'Only assessors can reject trainers';
  END IF;

  -- Profile.is_active is intentionally NOT touched (D4): the trainer stays
  -- gated and can resubmit via the onboarding flow.
  UPDATE trainer_approvals
     SET status       = 'rejected',
         assessor_id  = v_assessor_id,
         review_notes = p_review_notes,
         reviewed_at  = NOW()
   WHERE trainer_id   = p_trainer_id;
END;
$$;

REVOKE ALL  ON FUNCTION reject_trainer(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reject_trainer(uuid, text) TO authenticated;
