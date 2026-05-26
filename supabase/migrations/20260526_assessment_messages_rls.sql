ALTER TABLE assessment_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'assessment_messages' AND policyname = 'Users can insert their own messages'
    ) THEN
        CREATE POLICY "Users can insert their own messages" ON assessment_messages
        FOR INSERT WITH CHECK (auth.uid() = from_user_id);
    END IF;
END
$$;
