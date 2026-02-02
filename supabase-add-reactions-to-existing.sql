-- Add reactions column to existing code_posts table
-- Run this in Supabase SQL Editor

-- Add reactions column if it doesn't exist
ALTER TABLE code_posts 
ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{
  "like": {"count": 0, "users": []},
  "love": {"count": 0, "users": []},
  "wow": {"count": 0, "users": []},
  "sad": {"count": 0, "users": []},
  "angry": {"count": 0, "users": []}
}'::jsonb;

-- Update existing rows to have reactions if they don't
UPDATE code_posts 
SET reactions = '{
  "like": {"count": 0, "users": []},
  "love": {"count": 0, "users": []},
  "wow": {"count": 0, "users": []},
  "sad": {"count": 0, "users": []},
  "angry": {"count": 0, "users": []}
}'::jsonb
WHERE reactions IS NULL;

-- Reload schema cache (this forces Supabase to recognize the new column)
NOTIFY pgrst, 'reload schema';

-- Verify the column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'code_posts' 
AND column_name = 'reactions';

SELECT 'Reactions column added successfully!' as status;
