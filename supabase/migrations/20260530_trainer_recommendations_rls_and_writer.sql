-- trainer_recommendations had RLS enabled but ZERO policies, so every
-- INSERT/DELETE/SELECT was denied. That silently blocked the recommendation
-- engine's writes (0 rows ever persisted across all clients) and would also
-- block the client's Discover-tab reads. Fix both sides.

-- 1. Let a client read their own recommendations (Discover tab).
DROP POLICY IF EXISTS "Clients read own trainer recommendations" ON public.trainer_recommendations;
CREATE POLICY "Clients read own trainer recommendations"
  ON public.trainer_recommendations
  FOR SELECT
  USING (client_id = auth.uid());

-- 2. Assessor-only SECURITY DEFINER writer. The engine scores in JS (in the
--    assessor's session during clearance / backfill) then hands the rows here.
--    Bypasses RLS for the write, mirroring approve_trainer/reject_trainer.
--    Older engine rows are deactivated (is_active=false) rather than deleted so
--    history is preserved.
CREATE OR REPLACE FUNCTION public.save_trainer_recommendations(
  p_client_id uuid,
  p_recs jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid;
  v_role   text;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role INTO v_role FROM profiles WHERE id = v_caller;
  IF v_role <> 'assessor' THEN
    RAISE EXCEPTION 'Only assessors can generate trainer recommendations';
  END IF;

  -- Soft-deactivate the previous engine recommendations for this client.
  UPDATE trainer_recommendations
     SET is_active  = false,
         updated_at = NOW()
   WHERE client_id          = p_client_id
     AND recommendation_type = 'engine'
     AND is_active           = true;

  -- Insert the freshly scored active set.
  INSERT INTO trainer_recommendations
    (client_id, trainer_id, recommendation_type, score, score_breakdown,
     recommendation_reasons, display_order, is_active)
  SELECT
    p_client_id,
    (rec->>'trainer_id')::uuid,
    'engine',
    (rec->>'score')::numeric,
    COALESCE(rec->'score_breakdown', '{}'::jsonb),
    COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(rec->'recommendation_reasons')),
      '{}'::text[]
    ),
    COALESCE((rec->>'display_order')::int, 1),
    true
  FROM jsonb_array_elements(p_recs) AS rec;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.save_trainer_recommendations(uuid, jsonb) TO authenticated;
