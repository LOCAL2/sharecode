-- Step 1: Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'code_posts'
);

-- Step 2: Check current realtime publications
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- Step 3: Remove table from realtime (if exists)
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS code_posts;

-- Step 4: Add table to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE code_posts;

-- Step 5: Verify it's added
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'code_posts';

-- Step 6: Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'code_posts';

-- If no policies exist, create them:
DROP POLICY IF EXISTS "Allow all operations on code_posts" ON code_posts;

CREATE POLICY "Allow all operations on code_posts" 
ON code_posts 
FOR ALL 
USING (true) 
WITH CHECK (true);
