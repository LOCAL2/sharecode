-- Complete Supabase Setup with Reactions
-- Run this in Supabase SQL Editor

-- Create code_posts table
CREATE TABLE IF NOT EXISTS code_posts (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  language TEXT NOT NULL,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  author_id TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  likes INTEGER DEFAULT 0,
  liked_by TEXT[] DEFAULT '{}',
  copies INTEGER DEFAULT 0,
  copied_by TEXT[] DEFAULT '{}',
  downloads INTEGER DEFAULT 0,
  downloaded_by TEXT[] DEFAULT '{}',
  reactions JSONB DEFAULT '{
    "like": {"count": 0, "users": []},
    "love": {"count": 0, "users": []},
    "wow": {"count": 0, "users": []},
    "sad": {"count": 0, "users": []},
    "angry": {"count": 0, "users": []}
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE code_posts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow all operations on code_posts" ON code_posts;

-- Create policies to allow all operations (for demo purposes)
CREATE POLICY "Allow all operations on code_posts" 
ON code_posts 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_code_posts_timestamp ON code_posts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_code_posts_author_id ON code_posts(author_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE code_posts;

-- Verify setup
SELECT 'Setup complete! Table created with reactions support.' as status;
