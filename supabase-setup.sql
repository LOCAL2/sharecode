-- Supabase Complete Setup
-- Run this script ONCE in your new Supabase project's SQL Editor

-- 1. Create users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  avatar TEXT,
  is_dev BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to users" ON users FOR SELECT TO public USING (true);
CREATE POLICY "Allow users to insert their own profile" ON users FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow users to update their own profile" ON users FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);


-- 2. Create code_posts table
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
  comment_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for code_posts
ALTER TABLE code_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on code_posts" ON code_posts FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_code_posts_timestamp ON code_posts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_code_posts_author_id ON code_posts(author_id);


-- 3. Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES code_posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_avatar TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for comments
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to comments" ON comments FOR SELECT TO public USING (true);
CREATE POLICY "Allow users to insert their own comments" ON comments FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow users to update their own comments" ON comments FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow users to delete their own comments" ON comments FOR DELETE TO public USING (true);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);


-- 4. Create trigger to automatically update comment count in code_posts
CREATE OR REPLACE FUNCTION update_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE code_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE code_posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_comment_count ON comments;
CREATE TRIGGER trigger_update_comment_count
AFTER INSERT OR DELETE ON comments
FOR EACH ROW
EXECUTE FUNCTION update_comment_count();


-- 5. Enable Realtime for code_posts and comments
ALTER PUBLICATION supabase_realtime ADD TABLE code_posts, comments;
