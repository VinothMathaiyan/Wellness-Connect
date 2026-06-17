-- Allow a client to create a risk alert for their own check-in.
--
-- Existing RLS on risk_alerts only permitted:
--   * trainers to manage alerts where auth.uid() = trainer_id  (ALL)
--   * clients to read / mark-read their own alerts             (SELECT / UPDATE)
--   * assessors to read all alerts                             (SELECT)
-- There was NO INSERT policy for clients, so when a low-readiness / high-pain
-- check-in ran upsertRiskAlertForCheckin (in the client's auth context), the
-- INSERT was rejected by RLS ("new row violates row-level security policy")
-- and the error was swallowed by the helper's best-effort try/catch — the
-- check-in saved but no risk_alerts row was ever created.
--
-- This policy lets a client insert ONLY a row for themselves
-- (auth.uid() = client_id). trainer_id is set by the service to the client's
-- active trainer (or NULL when none); the trainer's own "Trainers manage
-- alerts" policy still governs their access.

CREATE POLICY "Clients create their own alerts"
  ON public.risk_alerts
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = client_id);

-- Second blocker (same swallowed-by-try/catch class): the alert_type CHECK
-- constraint predated the 'low_readiness' / 'high_pain' types introduced in
-- the check-in alert helper, so even a permitted INSERT failed
-- ("violates check constraint risk_alerts_alert_type_check"). Widen the
-- allowed set to include the two new types.
ALTER TABLE public.risk_alerts
  DROP CONSTRAINT IF EXISTS risk_alerts_alert_type_check;

ALTER TABLE public.risk_alerts
  ADD CONSTRAINT risk_alerts_alert_type_check
  CHECK (alert_type = ANY (ARRAY[
    'mood_drop'::text,
    'sleep_drop'::text,
    'missed_workout'::text,
    'hydration'::text,
    'general'::text,
    'low_readiness'::text,
    'high_pain'::text
  ]));
