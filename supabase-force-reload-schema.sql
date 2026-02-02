-- Force reload Supabase schema cache
-- Run this in Supabase SQL Editor

-- Method 1: Notify PostgREST to reload
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- Method 2: Check if column exists
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'code_posts'
ORDER BY ordinal_position;

-- If reactions column doesn't show up, add it:
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'code_posts' 
        AND column_name = 'reactions'
    ) THEN
        ALTER TABLE code_posts 
        ADD COLUMN reactions JSONB DEFAULT '{
          "like": {"count": 0, "users": []},
          "love": {"count": 0, "users": []},
          "wow": {"count": 0, "users": []},
          "sad": {"count": 0, "users": []},
          "angry": {"count": 0, "users": []}
        }'::jsonb;
        
        RAISE NOTICE 'Reactions column added';
    ELSE
        RAISE NOTICE 'Reactions column already exists';
    END IF;
END $$;

-- Update NULL values
UPDATE code_posts 
SET reactions = '{
  "like": {"count": 0, "users": []},
  "love": {"count": 0, "users": []},
  "wow": {"count": 0, "users": []},
  "sad": {"count": 0, "users": []},
  "angry": {"count": 0, "users": []}
}'::jsonb
WHERE reactions IS NULL;

-- Final verification
SELECT 
    'Column exists: ' || CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'code_posts' 
            AND column_name = 'reactions'
        ) THEN 'YES ✓'
        ELSE 'NO ✗'
    END as status;
