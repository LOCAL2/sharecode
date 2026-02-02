-- Add reactions column to code_posts table
-- This replaces the simple likes system with emoji reactions

ALTER TABLE code_posts 
ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{
  "like": {"count": 0, "users": []},
  "love": {"count": 0, "users": []},
  "wow": {"count": 0, "users": []},
  "sad": {"count": 0, "users": []},
  "angry": {"count": 0, "users": []}
}'::jsonb;

-- Migrate existing likes to reactions (optional)
-- UPDATE code_posts 
-- SET reactions = jsonb_set(
--   reactions,
--   '{like}',
--   jsonb_build_object('count', likes, 'users', liked_by)
-- )
-- WHERE likes > 0;
