-- Enable realtime for comments table
ALTER PUBLICATION supabase_realtime ADD TABLE comments;

-- Verify it's added
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'comments';
