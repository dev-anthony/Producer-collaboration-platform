ALTER TABLE projects ADD COLUMN IF NOT EXISTS last_pushed_by TEXT;

-- Run this once in the Supabase SQL editor to enable Phase 7 notifications.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'projects'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE projects;
  END IF;
END $$;
