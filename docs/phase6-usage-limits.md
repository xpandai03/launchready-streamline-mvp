# Phase 6: Usage Limits & Tracking - Implementation Guide

**Date:** October 28, 2025
**Status:** ✅ Complete - Ready for testing
**Commit:** bda045f

---

## Overview

Implemented free tier usage tracking with monthly limits:
- **3 videos per month**
- **3 social posts per month**

Pro users (subscription_status = 'pro') bypass all limits.

---

## Files Changed

### **New Files**

1. **server/services/usageLimits.ts** (181 lines)
   - `FREE_VIDEO_LIMIT = 3`
   - `FREE_POST_LIMIT = 3`
   - `checkVideoLimit(userId)` - Returns true if user can create video
   - `checkPostLimit(userId)` - Returns true if user can create post
   - `incrementVideoUsage(userId)` - Increments video counter for current month
   - `incrementPostUsage(userId)` - Increments post counter for current month
   - `getCurrentUsage(userId)` - Returns usage stats for current month

2. **migrations/006_create_user_usage.sql** (30 lines)
   - Creates `user_usage` table
   - Composite PK on `(user_id, month)`
   - Indexes on `user_id` and `month`

### **Modified Files**

3. **shared/schema.ts**
   - Added `userUsage` table definition
   - Added `UserUsage` and `InsertUserUsage` types

4. **server/routes.ts**
   - `POST /api/videos` - Check limit before creating task, increment after
   - `POST /api/social/post` - Check limit before posting, increment after
   - `GET /api/usage` - New endpoint returning current usage stats

---

## Database Migration

### **Step 1: Run Migration on Supabase**

You have two options:

#### **Option A: Supabase Dashboard (Recommended)**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `streamline`
3. Navigate to **SQL Editor**
4. Click "New query"
5. Copy the contents of `migrations/006_create_user_usage.sql`
6. Paste into the editor
7. Click "Run" (or press Cmd/Ctrl + Enter)
8. Verify success: Check for "Success. No rows returned" message

#### **Option B: Supabase CLI (If linked)**

```bash
cd /Users/raunekpratap/Desktop/Streamline-replit-copy
supabase db push
```

### **Step 2: Verify Migration**

Run this query in Supabase SQL Editor:

```sql
-- Check table exists
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_usage'
ORDER BY ordinal_position;
```

**Expected Output:**
```
user_id          | uuid
month            | text
videos_created   | integer
posts_created    | integer
created_at       | timestamp without time zone
updated_at       | timestamp without time zone
```

Also check indexes:

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'user_usage';
```

**Expected Output:**
- `user_usage_pkey` (PRIMARY KEY)
- `idx_user_usage_user_id`
- `idx_user_usage_month`

---

## Testing Plan

### **Prerequisites**

1. ✅ Migration run successfully on Supabase
2. ✅ Render deployment complete (check dashboard)
3. ✅ User authenticated and has auth token

### **Test 1: Video Limit Enforcement**

**Goal:** Verify free users are limited to 3 videos per month

```bash
export AUTH_TOKEN="your-jwt-token"
export BASE_URL="https://launchready-streamline-mvp.onrender.com"

# Test 1: Create first video (should succeed)
curl -X POST $BASE_URL/api/videos \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sourceVideoUrl": "https://youtube.com/watch?v=test1", "autoExport": false}'

# Expected: 200 OK, taskId returned

# Test 2: Create second video (should succeed)
curl -X POST $BASE_URL/api/videos \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sourceVideoUrl": "https://youtube.com/watch?v=test2", "autoExport": false}'

# Expected: 200 OK

# Test 3: Create third video (should succeed)
curl -X POST $BASE_URL/api/videos \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sourceVideoUrl": "https://youtube.com/watch?v=test3", "autoExport": false}'

# Expected: 200 OK

# Test 4: Create fourth video (should FAIL with 403)
curl -X POST $BASE_URL/api/videos \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sourceVideoUrl": "https://youtube.com/watch?v=test4", "autoExport": false}'

# Expected: 403 Forbidden
# {
#   "error": "Monthly video limit reached",
#   "message": "Free plan allows 3 videos per month. Upgrade to Pro for unlimited videos.",
#   "limit": 3
# }
```

### **Test 2: Post Limit Enforcement**

**Goal:** Verify free users are limited to 3 social posts per month

```bash
# Prerequisite: Have 3 ready exports (projectIds)

# Test 1: Post first video (should succeed)
curl -X POST $BASE_URL/api/social/post \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"projectId": "project_123", "platform": "instagram", "caption": "Test 1"}'

# Expected: 200 OK

# Test 2: Post second video (should succeed)
curl -X POST $BASE_URL/api/social/post \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"projectId": "project_456", "platform": "instagram", "caption": "Test 2"}'

# Expected: 200 OK

# Test 3: Post third video (should succeed)
curl -X POST $BASE_URL/api/social/post \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"projectId": "project_789", "platform": "instagram", "caption": "Test 3"}'

# Expected: 200 OK

# Test 4: Post fourth video (should FAIL with 403)
curl -X POST $BASE_URL/api/social/post \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"projectId": "project_101", "platform": "instagram", "caption": "Test 4"}'

# Expected: 403 Forbidden
# {
#   "error": "Monthly post limit reached",
#   "message": "Free plan allows 3 social posts per month. Upgrade to Pro for unlimited posting.",
#   "limit": 3
# }
```

### **Test 3: Usage API Endpoint**

**Goal:** Verify usage tracking is accurate

```bash
# Get current usage
curl -X GET $BASE_URL/api/usage \
  -H "Authorization: Bearer $AUTH_TOKEN"

# Expected Response:
# {
#   "month": "2025-10",
#   "videosCreated": 3,
#   "postsCreated": 3,
#   "videoLimit": 3,
#   "postLimit": 3,
#   "videoRemaining": 0,
#   "postRemaining": 0
# }
```

### **Test 4: Pro User Bypass**

**Goal:** Verify pro users bypass all limits

```sql
-- In Supabase SQL Editor, upgrade your test user to Pro
UPDATE users
SET subscription_status = 'pro'
WHERE email = 'your-test-email@example.com';
```

Then repeat Test 1 and Test 2 - should all succeed regardless of limits.

**Check Render logs:**
```
[Usage Limits] Pro user - bypassing video limit
```

### **Test 5: Month Rollover**

**Goal:** Verify limits reset each month

```sql
-- Manually set usage to a past month
INSERT INTO user_usage (user_id, month, videos_created, posts_created)
VALUES ('your-user-uuid', '2025-09', 5, 5)
ON CONFLICT (user_id, month)
DO UPDATE SET videos_created = 5, posts_created = 5;
```

Now create videos/posts in current month (2025-10) - should work fine as it's a new month.

---

## Verification Checklist

After deployment and testing:

- [ ] Migration completed successfully in Supabase
- [ ] `user_usage` table exists with correct schema
- [ ] Indexes created (check pg_indexes)
- [ ] Render deployment successful
- [ ] GET /api/usage returns correct data structure
- [ ] Video creation fails at 4th attempt (free users)
- [ ] Social post fails at 4th attempt (free users)
- [ ] Error messages are clear and actionable
- [ ] Pro users can bypass limits
- [ ] Usage increments correctly
- [ ] Month-based tracking works (separate counts per month)
- [ ] Logs show usage tracking in action

---

## Database Queries

### **Check Current Usage for All Users**

```sql
SELECT
  u.email,
  u.subscription_status,
  uu.month,
  uu.videos_created,
  uu.posts_created
FROM users u
LEFT JOIN user_usage uu ON u.id = uu.user_id
WHERE uu.month = TO_CHAR(NOW(), 'YYYY-MM')
ORDER BY uu.videos_created DESC, uu.posts_created DESC;
```

### **Find Users at Limit**

```sql
-- Users who hit video limit
SELECT u.email, uu.videos_created
FROM users u
JOIN user_usage uu ON u.id = uu.user_id
WHERE uu.month = TO_CHAR(NOW(), 'YYYY-MM')
  AND uu.videos_created >= 3
  AND u.subscription_status != 'pro';

-- Users who hit post limit
SELECT u.email, uu.posts_created
FROM users u
JOIN user_usage uu ON u.id = uu.user_id
WHERE uu.month = TO_CHAR(NOW(), 'YYYY-MM')
  AND uu.posts_created >= 3
  AND u.subscription_status != 'pro';
```

### **Reset Usage for Testing**

```sql
-- Delete all usage records (TESTING ONLY!)
DELETE FROM user_usage WHERE user_id = 'your-test-user-uuid';

-- Or reset specific month
DELETE FROM user_usage
WHERE user_id = 'your-test-user-uuid'
  AND month = '2025-10';
```

---

## Troubleshooting

### **Issue: "relation user_usage does not exist"**

**Cause:** Migration not run yet
**Fix:** Run migration in Supabase SQL Editor (see Step 1 above)

### **Issue: Limits not enforced**

**Cause:** User might be marked as 'pro'
**Fix:** Check user's subscription_status:

```sql
SELECT email, subscription_status FROM users WHERE email = 'test@example.com';
```

### **Issue: Usage not incrementing**

**Check logs in Render:**
```
Search for: [Usage Limits] Incrementing
```

Should see:
```
[Usage Limits] Incrementing video usage: { userId: '...', month: '2025-10' }
[Usage Limits] Video usage incremented successfully
```

If not appearing, check database constraints.

### **Issue: Wrong month counts**

**Check current month format:**
```sql
SELECT TO_CHAR(NOW(), 'YYYY-MM');
```

Should return format like `2025-10`

---

## Next Steps

1. **Run migration on Supabase** (see Step 1)
2. **Wait for Render deployment** to complete (~3-5 min)
3. **Test limits** using curl commands above
4. **Verify in database** that usage records are created
5. **Check Render logs** for usage tracking messages

**Phase 6 Complete!** ✅

Ready for:
- Phase 7: Frontend usage display and upgrade prompts
- Phase 8: Stripe integration for Pro subscriptions
