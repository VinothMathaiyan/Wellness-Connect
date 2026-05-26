ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS completed_at timestamptz,
ADD COLUMN IF NOT EXISTS completed_by text CHECK (completed_by IN ('client', 'trainer')),
ADD COLUMN IF NOT EXISTS completion_notes text;
