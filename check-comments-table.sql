-- Check if comments table exists
SELECT * FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'comments';

-- Check comments table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'comments'
ORDER BY ordinal_position;

-- Check if there are any comments
SELECT COUNT(*) as total_comments FROM comments;

-- Check realtime publication
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

-- Check RLS policies
SELECT * FROM pg_policies 
WHERE tablename = 'comments';
