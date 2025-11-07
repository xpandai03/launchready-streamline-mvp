# Render Cron Job Setup Guide

## Phase 3: Scheduled Posting System

This guide explains how to configure the Render Cron Job that monitors scheduled Instagram posts.

---

## Overview

The cron job (`scripts/cron-check-scheduled-posts.ts`) runs every 5 minutes to:

1. Query the database for scheduled posts with `status = 'scheduled'` or `'posting'`
2. Check Late.dev API for the current status of each post
3. Update the database when posts are published or fail
4. Log all operations for debugging

---

## Render Dashboard Configuration

### Step 1: Create a New Cron Job

1. Go to your Render Dashboard: https://dashboard.render.com
2. Navigate to your project (Streamline AI)
3. Click **"New +"** → **"Cron Job"**

### Step 2: Configure Cron Job Settings

**Basic Settings:**
- **Name:** `streamline-scheduled-posts-monitor`
- **Region:** Same as your web service (e.g., `Oregon (US West)`)
- **Branch:** `main` (or your production branch)

**Build & Start Settings:**
- **Build Command:** `npm install`
- **Start Command:** `npx tsx scripts/cron-check-scheduled-posts.ts`

**Schedule:**
- **Cron Expression:** `*/5 * * * *`
  - Translation: "Every 5 minutes"
  - This is the recommended interval for responsive scheduled posting

**Environment Variables:**
- Inherit all environment variables from your web service:
  - `DATABASE_URL` (Neon PostgreSQL connection string)
  - `LATE_API_KEY` (Late.dev API key)
  - All other existing env vars

### Step 3: Deploy

1. Click **"Create Cron Job"**
2. Render will build and schedule the job
3. First run will happen within 5 minutes

---

## Monitoring & Logs

### View Cron Job Logs

1. Go to Render Dashboard → Your Cron Job
2. Click **"Logs"** tab
3. You'll see output like:

```
🕐 [Cron] Starting scheduled posts check...
[Cron] Current time (UTC): 2025-11-07T10:00:00.000Z
[Cron] Found 2 scheduled posts to check

[Cron] Checking post 42 (Late ID: late_abc123)...
  - Scheduled for: 2025-11-07T10:00:00.000Z
  - Current status: scheduled
  - Late.dev status: published
  - Platform URL: https://www.instagram.com/p/xyz123/
  ✅ Post is published!
✅ Updated post 42 to status: published

📊 [Cron] Check complete:
  - Published: 1
  - Failed: 0
  - Unchanged: 1
  - Total checked: 2

✅ [Cron] Job completed successfully
```

### Expected Behavior

- **Every 5 minutes:** Cron runs and checks scheduled posts
- **No posts scheduled:** Log shows "No scheduled posts to check"
- **Posts published:** Status updates to `'published'`, `platform_post_url` set
- **Posts failed:** Status updates to `'failed'`, `error_message` set
- **Posts still processing:** No change, will check again next cycle

---

## Cron Schedule Syntax

If you want to adjust the frequency:

| Expression | Meaning |
|------------|---------|
| `*/5 * * * *` | Every 5 minutes (recommended) |
| `*/10 * * * *` | Every 10 minutes |
| `0 * * * *` | Every hour (at minute 0) |
| `0 */2 * * *` | Every 2 hours |
| `0 0 * * *` | Once per day (midnight UTC) |

**Recommended:** Keep `*/5 * * * *` for responsive scheduled posting.

---

## Troubleshooting

### Cron Job Not Running

1. **Check Render Dashboard:** Ensure cron job status is "Running"
2. **Check Logs:** Look for error messages
3. **Verify Environment Variables:** Ensure `DATABASE_URL` and `LATE_API_KEY` are set

### Posts Not Updating

1. **Check Late.dev API:** Ensure API key is valid
2. **Check Database:** Verify `social_posts` table has `is_scheduled = 'true'` and `late_post_id` set
3. **Check Logs:** Look for "Could not fetch status" warnings

### Database Connection Issues

- **Error:** `DATABASE_URL environment variable is not set`
- **Solution:** Add `DATABASE_URL` to Render cron job environment variables

### Late.dev API Issues

- **Error:** `LATE_API_KEY environment variable is not set`
- **Solution:** Add `LATE_API_KEY` to Render cron job environment variables

---

## Testing Locally

Before deploying to Render, test the cron script locally:

```bash
# Ensure environment variables are set
export DATABASE_URL="your_neon_db_url"
export LATE_API_KEY="your_late_api_key"

# Run the script
npx tsx scripts/cron-check-scheduled-posts.ts
```

Expected output:
```
🕐 [Cron] Starting scheduled posts check...
[Cron] Current time (UTC): 2025-11-07T10:15:00.000Z
[Cron] ℹ️  No scheduled posts to check
✅ [Cron] Job completed successfully
```

---

## Integration with Late.dev

The cron job uses Late.dev's `GET /posts/:postId` API endpoint to check post status:

**Request:**
```
GET https://getlate.dev/api/v1/posts/{latePostId}
Authorization: Bearer {LATE_API_KEY}
```

**Response:**
```json
{
  "post": {
    "_id": "late_abc123",
    "status": "published",
    "platforms": [
      {
        "platform": "instagram",
        "accountId": "6900d2cd8bbca9c10cbfff74",
        "status": "published",
        "platformPostUrl": "https://www.instagram.com/p/xyz123/"
      }
    ]
  }
}
```

---

## Database Schema

The cron job queries and updates the `social_posts` table:

**Query:**
```sql
SELECT id, late_post_id, scheduled_for, status, project_id, user_id
FROM social_posts
WHERE is_scheduled = 'true'
  AND status IN ('scheduled', 'posting')
  AND late_post_id IS NOT NULL
ORDER BY scheduled_for ASC
LIMIT 50
```

**Update:**
```sql
UPDATE social_posts
SET
  status = 'published',
  platform_post_url = 'https://www.instagram.com/p/xyz123/',
  published_at = NOW(),
  late_response = '{...}'
WHERE id = 42
```

---

## Performance Considerations

- **Query Limit:** Cron checks max 50 posts per run (sufficient for most use cases)
- **API Rate Limits:** Late.dev has rate limits; 50 posts every 5 minutes = ~600 requests/hour
- **Database Impact:** Minimal (indexed query, single update per published post)

---

## Security

- **Environment Variables:** Never commit `DATABASE_URL` or `LATE_API_KEY` to Git
- **Render Secrets:** Store sensitive values as Render environment variables
- **Database Access:** Cron job only needs `SELECT` and `UPDATE` on `social_posts` table

---

## Next Steps

After deploying the cron job:

1. ✅ Test by scheduling a post via the frontend (Phase 3.5)
2. ✅ Monitor logs to ensure cron runs every 5 minutes
3. ✅ Verify posts update from `'scheduled'` → `'published'`
4. ✅ Check Instagram to confirm posts appear at scheduled time

---

## Support

If you encounter issues:

1. Check Render cron job logs
2. Check your web service logs for API errors
3. Verify Late.dev API status: https://status.getlate.dev
4. Review `social_posts` table in database for incorrect data
