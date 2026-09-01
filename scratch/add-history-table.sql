-- Run this script in the Supabase SQL Editor

-- 1. Add edited_at to code_posts
ALTER TABLE code_posts ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE;

-- 2. Create post_edits table
CREATE TABLE IF NOT EXISTS post_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id TEXT NOT NULL REFERENCES code_posts(id) ON DELETE CASCADE,
  old_code TEXT NOT NULL,
  new_code TEXT NOT NULL,
  old_title TEXT NOT NULL,
  new_title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for post_edits
ALTER TABLE post_edits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to post_edits" ON post_edits FOR SELECT TO public USING (true);
CREATE POLICY "Allow users to insert their own post_edits" ON post_edits FOR INSERT TO public WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_post_edits_post_id ON post_edits(post_id);
CREATE INDEX IF NOT EXISTS idx_post_edits_created_at ON post_edits(created_at DESC);

-- 3. Create a trigger to automatically record edits
CREATE OR REPLACE FUNCTION record_post_edit()
RETURNS TRIGGER AS $$
BEGIN
  -- Only record if code or title actually changed
  IF OLD.code IS DISTINCT FROM NEW.code OR OLD.title IS DISTINCT FROM NEW.title THEN
    -- Insert the history record
    INSERT INTO post_edits (post_id, old_code, new_code, old_title, new_title)
    VALUES (NEW.id, OLD.code, NEW.code, OLD.title, NEW.title);
    
    -- Update the edited_at timestamp
    NEW.edited_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_record_post_edit ON code_posts;
CREATE TRIGGER trigger_record_post_edit
BEFORE UPDATE ON code_posts
FOR EACH ROW
EXECUTE FUNCTION record_post_edit();

-- 4. Enable REPLICA IDENTITY FULL for realtime UPDATE payloads
-- This ensures that the 'old' record is included in the postgres_changes event payload
ALTER TABLE code_posts REPLICA IDENTITY FULL;

-- 5. Add post_edits to realtime publication (optional, if we want realtime updates on history)
ALTER PUBLICATION supabase_realtime ADD TABLE post_edits;
