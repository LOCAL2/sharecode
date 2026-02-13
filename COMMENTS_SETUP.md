# Comments System Setup Guide

## Status: ✅ Code Implementation Complete

The realtime comment system is fully implemented in the code. You just need to set up the database.

## Setup Steps

### 1. Run the SQL Script

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Open the file `supabase-create-comments-table.sql` in this project
5. Copy ALL the SQL code from that file
6. Paste it into the Supabase SQL Editor
7. Click **Run** (or press Ctrl+Enter)

You should see: `Success. No rows returned`

### 2. Verify Realtime is Enabled

The SQL script automatically enables realtime for the `comments` table. To verify:

1. In Supabase Dashboard, go to **Database** → **Replication**
2. Find the `comments` table in the list
3. It should be **ON** (green toggle)
4. Also verify `code_posts` table is enabled

If it's not enabled, run this in SQL Editor:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
```

### 3. Test the Realtime Comments

1. Open your app in two browser windows/tabs
2. Open a post and click the **Comment** button in both windows
3. Type a comment in one window and click **Post**
4. The comment should appear **instantly** in the other window
5. The comment count should also update in real-time

### 4. Verify in Browser Console

Open Browser Console (F12) and you should see:
- `✅ User profile synced to database` (when app loads)
- Subscription logs when you open comments section

## What's Already Implemented

✅ **Realtime subscription** - Comments update live when section is open
✅ **Comment count trigger** - Database automatically updates count
✅ **Optimistic updates** - UI updates immediately before database confirms
✅ **Delete functionality** - Users can delete their own comments, Dev can delete any
✅ **Avatar display** - Shows user avatars in comments
✅ **Timestamp formatting** - Shows relative time (e.g., "2m ago")
✅ **Empty state** - Shows message when no comments exist

## How It Works

### When Comment Section is Opened:
```typescript
useEffect(() => {
  if (!showComments) return

  // Load initial comments
  loadComments(showComments)

  // Subscribe to realtime changes for this post's comments
  const channel = supabase
    .channel(`comments_${showComments}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'comments',
      filter: `post_id=eq.${showComments}`
    }, () => {
      // Reload comments when any change occurs
      loadComments(showComments)
    })
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [showComments])
```

### Database Trigger:
The SQL script creates a trigger that automatically updates `comment_count` in the `code_posts` table whenever a comment is added or deleted. The main posts subscription picks up these changes.

## Troubleshooting

### Comments not updating in real-time?

1. **Check if realtime is enabled:**
   ```sql
   -- Run in Supabase SQL Editor
   SELECT * FROM pg_publication_tables 
   WHERE pubname = 'supabase_realtime' 
   AND tablename = 'comments';
   ```
   Should return 1 row

2. **Re-enable realtime:**
   ```sql
   ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS comments;
   ALTER PUBLICATION supabase_realtime ADD TABLE comments;
   ```

3. **Check Browser Console** for subscription status

### Comment count not updating?

1. **Verify trigger exists:**
   ```sql
   SELECT * FROM pg_trigger 
   WHERE tgname = 'trigger_update_comment_count';
   ```

2. **Re-run the trigger creation** from `supabase-create-comments-table.sql`

### Can't delete comments?

- You can only delete your own comments
- Dev (with PIN 2548) can delete any comment
- Check that `user_id` matches in the database

## Features

- **Real-time updates** - See new comments instantly
- **User avatars** - Display profile pictures
- **Relative timestamps** - "Just now", "2m ago", "1h ago"
- **Delete permissions** - Own comments + Dev override
- **Empty state** - Friendly message when no comments
- **Optimistic UI** - Instant feedback before database confirms
- **Auto-scroll** - Comments section expands smoothly
- **Comment count** - Shows total comments on button

## Next Steps (Optional Enhancements)

If you want to add more features:

- [ ] Edit comments
- [ ] Reply to comments (nested)
- [ ] Like/react to comments
- [ ] Mention users (@username)
- [ ] Rich text formatting
- [ ] Image attachments
- [ ] Comment sorting (newest/oldest)
- [ ] Load more pagination
- [ ] Real-time typing indicators

---

**Note:** The code is production-ready. Just run the SQL script and enable realtime!
