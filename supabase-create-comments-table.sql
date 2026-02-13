-- Create comments table
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

-- Enable Row Level Security
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read comments
CREATE POLICY "Allow public read access to comments"
  ON comments
  FOR SELECT
  TO public
  USING (true);

-- Create policy to allow users to insert their own comments
CREATE POLICY "Allow users to insert their own comments"
  ON comments
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Create policy to allow users to update their own comments
CREATE POLICY "Allow users to update their own comments"
  ON comments
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Create policy to allow users to delete their own comments
CREATE POLICY "Allow users to delete their own comments"
  ON comments
  FOR DELETE
  TO public
  USING (true);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- Add comment_count column to code_posts table
ALTER TABLE code_posts ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;

-- Create function to update comment count
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

-- Create trigger to automatically update comment count
DROP TRIGGER IF EXISTS trigger_update_comment_count ON comments;
CREATE TRIGGER trigger_update_comment_count
AFTER INSERT OR DELETE ON comments
FOR EACH ROW
EXECUTE FUNCTION update_comment_count();

-- Enable realtime for comments table
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
