-- Migration: Create trainer_recommendations table for the weighted recommendation engine.
-- Already applied to live DB — this file is for migration history only.

CREATE TABLE IF NOT EXISTS trainer_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  trainer_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  recommendation_type text CHECK (recommendation_type IN ('engine', 'manual')),
  score numeric,
  score_breakdown jsonb DEFAULT '{}',
  recommendation_reasons text[] DEFAULT '{}',
  display_order integer DEFAULT 1,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(client_id, trainer_id)
);

-- RLS policies
ALTER TABLE trainer_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can read their own recommendations"
  ON trainer_recommendations FOR SELECT
  USING (client_id = auth.uid());

CREATE POLICY "Service role can manage recommendations"
  ON trainer_recommendations FOR ALL
  USING (true);
