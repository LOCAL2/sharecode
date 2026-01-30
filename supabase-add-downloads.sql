-- Add downloads and downloaded_by columns to code_posts table
ALTER TABLE code_posts 
ADD COLUMN IF NOT EXISTS downloads INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS downloaded_by TEXT[] DEFAULT '{}';

-- Update existing posts to have default values
UPDATE code_posts 
SET downloads = 0, downloaded_by = '{}' 
WHERE downloads IS NULL OR downloaded_by IS NULL;
