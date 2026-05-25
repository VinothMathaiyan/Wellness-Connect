CREATE TABLE IF NOT EXISTS callback_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  trainer_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  client_phone text NOT NULL,
  status text DEFAULT 'pending' 
    CHECK (status IN ('pending', 'contacted', 'resolved')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
