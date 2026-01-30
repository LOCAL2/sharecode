-- Add copies and copied_by columns to code_posts table
ALTER TABLE code_posts 
ADD COLUMN IF NOT EXISTS copies INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS copied_by TEXT[] DEFAULT '{}';

-- Update existing posts to have default values
UPDATE code_posts 
SET copies = 0, copied_by = '{}' 
WHERE copies IS NULL OR copied_by IS NULL;
