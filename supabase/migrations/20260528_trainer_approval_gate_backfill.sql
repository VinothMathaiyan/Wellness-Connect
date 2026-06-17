-- Migration: Trainer Approval Gate — backfill + approved_trainers view
-- Date: 2026-05-28
--
-- Wires the trainer approval gate (mirrors the client assessment gate).
-- This migration is the data/lookup half of the rollout:
--   (a) Backfill: existing active trainers without an approval row are
--       auto-approved so the gate does not lock out current trainers.
--   (b) approved_trainers view: a single source of truth for "this trainer
--       is approved AND active", used by client-facing discovery surfaces.

-- (a) Auto-approve existing trainers that have no approval row yet.
INSERT INTO trainer_approvals (trainer_id, status, reviewed_at, review_notes)
SELECT p.id, 'approved', NOW(), 'Auto-approved during gate rollout (backfill)'
FROM profiles p
LEFT JOIN trainer_approvals ta ON ta.trainer_id = p.id
WHERE p.role = 'trainer' AND ta.id IS NULL;

-- (b) approved_trainers: trainers who are both approved and active.
CREATE OR REPLACE VIEW approved_trainers AS
SELECT p.*
FROM profiles p
JOIN trainer_approvals ta ON ta.trainer_id = p.id
WHERE p.role = 'trainer'
  AND p.is_active = true
  AND ta.status = 'approved';
