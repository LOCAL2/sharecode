# Supabase Setup Guide

## 1. Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in project details:
   - Name: CodeShare
   - Database Password: (create a strong password)
   - Region: (choose closest to you)
5. Wait for project to be created

## 2. Create Database Table

1. Go to SQL Editor in your Supabase dashboard
2. Click "New Query"
3. Copy and paste this SQL command:

```sql
-- Create code_posts table
CREATE TABLE IF NOT EXISTS code_posts (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  language TEXT NOT NULL,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  likes INTEGER DEFAULT 0,
  liked_by TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE code_posts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow all operations on code_posts" ON code_posts;

-- Create policies to allow all operations (for demo purposes)
CREATE POLICY "Allow all operations on code_posts" 
ON code_posts 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_code_posts_timestamp ON code_posts(timestamp DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE code_posts;
```

4. Click "Run" or press Ctrl+Enter

## 3. Verify Realtime is Enabled

1. Go to Database > Replication in your Supabase dashboard
2. You should see `code_posts` table listed
3. Make sure the toggle is ON (green)

## 4. Get API Keys

1. Go to Settings > API in your Supabase dashboard
2. Copy:
   - Project URL (looks like: https://xxxxx.supabase.co)
   - anon/public key (long string starting with "eyJ...")

## 5. Configure Environment Variables

1. Create a `.env` file in the project root (same folder as package.json):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

2. Replace with your actual values from step 4

## 6. Restart the Application

```bash
# Stop the dev server (Ctrl+C)
# Then restart:
npm run dev
```

## 7. Test Realtime

1. Open the app in two different browser windows/tabs
2. Create a post in one window
3. You should see it appear in the other window immediately
4. Open Browser Console (F12) to see realtime logs

## Troubleshooting

### Realtime not working?

Check Browser Console (F12) for:
- `Subscription status: SUBSCRIBED` ✅ Good
- `Subscription status: CHANNEL_ERROR` ❌ Problem

If you see errors:

1. **Check if realtime is enabled:**
   ```sql
   -- Run this in SQL Editor
   SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
   ```
   You should see `code_posts` in the results

2. **Re-enable realtime:**
   ```sql
   ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS code_posts;
   ALTER PUBLICATION supabase_realtime ADD TABLE code_posts;
   ```

3. **Check RLS policies:**
   ```sql
   -- View current policies
   SELECT * FROM pg_policies WHERE tablename = 'code_posts';
   ```

### Posts not appearing?

1. Check if `.env` file exists and has correct values
2. Restart dev server after creating `.env`
3. Check Browser Console for errors
4. Verify table exists in Supabase dashboard

## Notes

- The current setup allows anyone to read/write/delete posts (good for demo)
- For production, you should implement proper authentication and authorization
- Supabase free tier includes:
  - 500MB database space
  - 1GB file storage
  - 2GB bandwidth per month
  - Realtime connections

## Security Considerations for Production

If you want to make this production-ready:

1. Implement user authentication
2. Update RLS policies to restrict delete operations to post owners
3. Add rate limiting
4. Validate data on the server side
5. Add moderation features
