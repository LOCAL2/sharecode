-- Fix realtime to send full row data on DELETE
-- Change replica identity to FULL so DELETE events include all columns

ALTER TABLE comments REPLICA IDENTITY FULL;

-- Verify the change
SELECT relname, relreplident 
FROM pg_class 
WHERE relname = 'comments';

-- relreplident should be 'f' (FULL)
-- 'd' = DEFAULT (only primary key)
-- 'f' = FULL (all columns)
