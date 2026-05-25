-- Allow a client to create their own pending trainer connection request.
--
-- Existing RLS only let trainers manage links (auth.uid() = trainer_id), so a
-- client-initiated request (requestTrainerLink) was blocked by RLS and the row
-- was never inserted. This policy lets a client insert ONLY a row for
-- themselves and ONLY in the 'pending' state — they cannot self-promote to
-- 'active'; the trainer still controls accept/decline via their own policy.

CREATE POLICY "Clients can request a trainer link"
  ON public.trainer_client_links
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = client_id AND status = 'pending');
