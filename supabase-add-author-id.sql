-- Add author_id column to code_posts table
ALTER TABLE code_posts 
ADD COLUMN IF NOT EXISTS author_id TEXT;

-- For existing posts without author_id, set a default value
-- (these posts won't have a delete button since no one owns them)
UPDATE code_posts 
SET author_id = 'legacy-user' 
WHERE author_id IS NULL;

-- Make author_id NOT NULL for future posts
ALTER TABLE code_posts 
ALTER COLUMN author_id SET NOT NULL;
