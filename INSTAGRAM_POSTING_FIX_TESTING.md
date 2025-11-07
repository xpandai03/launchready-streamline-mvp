# Instagram Posting Fix - Testing & Verification Guide

## 🎯 What Was Fixed

### Changes Implemented (Nov 6, 2025)

**Phase 1 & 3: Enhanced Diagnostic Logging + Robust JSON Parsing**
- File: `server/services/late.ts`
- Added detailed request metadata logging before Late API call
- Added response header and status logging
- **Critical Fix**: Changed from `response.json()` to `response.text()` first
- Added safe JSON parsing with proper error messages
- Handle empty response bodies explicitly
- Show actual response content when JSON parsing fails

**Phase 2: Request Validation**
- File: `server/routes.ts`
- Validate video URL is HTTPS before posting
- Validate Instagram account ID exists
- Added validation checkpoints with clear error messages

**Testing Tool**
- File: `scripts/test-late-api.sh`
- Manual curl-based Late API testing script
- Isolates app issues from Late API issues

---

## 🧪 Testing Protocol

### Step 1: Deploy to Render

**Automatic Deployment**:
Render will automatically deploy when changes are pushed to the `main` branch on GitHub.

**Monitor Deployment**:
1. Go to Render dashboard: https://dashboard.render.com
2. Find service: `streamline-mvp`
3. Check "Events" tab for deployment status
4. Wait for "Deploy succeeded" message

**Expected Console Output** (on startup):
```
[Server] Starting Streamline AI server...
[Late Service] Warning: LATE_API_KEY is not configured in environment
```

If Late API key warning appears, check Render environment variables has `LATE_API_KEY` set.

---

### Step 2: Test with Miguel's Account

**Pre-requisites:**
1. Miguel has a Pro account
2. Miguel can generate shorts successfully (Klap API working)
3. Miguel has at least one exported clip ready

**Test Procedure:**
1. **Login as Miguel**
   - Use Miguel's credentials to login to Streamline

2. **Generate and Export a Short** (if needed)
   - Upload a video
   - Let Klap process it
   - Click "Export" on a generated clip
   - Wait for export status = "ready"

3. **Attempt Instagram Post**
   - Navigate to the exported clip
   - Click "Post to Instagram"
   - Enter a caption (or leave blank)
   - Submit

4. **Monitor Console Logs**

   Watch Render logs (Dashboard → streamline-mvp → Logs) for these new debug logs:

   **Success Case:**
   ```
   [Social Post] Using export URL: https://...
   [Validation] ✓ Video URL format valid (HTTPS)
   [Validation] Full URL: https://klap-video-url...
   [Social Post] Using Late profile: <profileId>, account: <accountId>
   [Late Service] Posting to Instagram: { videoUrl: ..., caption: ... }
   [Late Debug] Request: { url: 'https://getlate.dev/api/v1/posts', videoUrl: '...', ... }
   [Late Debug] Response: { status: 200, contentType: 'application/json', ... }
   [Late Debug] Raw body: {"post":{"_id":"...","status":"published",...}}
   [Late Service] Post successful: { postId: '...', status: 'published', ... }
   [Social Post] ✓ Posted successfully to Instagram
   ```

   **Failure Case (with actionable error):**
   ```
   [Social Post] Using export URL: https://...
   [Validation] ✓ Video URL format valid (HTTPS)
   [Late Debug] Request: { url: '...', videoUrl: '...', ... }
   [Late Debug] Response: { status: 401, contentType: 'application/json', ... }
   [Late Debug] Raw body: {"error":"Invalid API key"}
   [Late Service] API Error: { status: 401, error: {...} }
   [Social Post] Late API Error (401): Invalid API key
   ```

   **Empty Response Case (old bug):**
   ```
   [Late Debug] Response: { status: 500, contentType: 'text/html', ... }
   [Late Debug] Raw body:
   [Late Service] Empty response body received
   [Social Post] Late API returned empty response (HTTP 500)
   ```

---

### Step 3: Verify in Database

Check the `social_posts` table for the post record:

```sql
SELECT
  id,
  status,
  error_message,
  late_post_id,
  platform_post_url,
  created_at,
  published_at
FROM social_posts
WHERE user_id = '<MIGUEL_USER_ID>'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Results:**

**Success:**
- `status` = `'published'`
- `error_message` = `null`
- `late_post_id` = Late.dev post ID (e.g., `"6727abc123..."`)
- `platform_post_url` = Instagram URL (e.g., `"https://www.instagram.com/reel/..."`)
- `published_at` = timestamp

**Failure with Clear Error:**
- `status` = `'failed'`
- `error_message` = Descriptive error (NOT "Unexpected end of JSON input")
- `late_post_id` = `null`
- `platform_post_url` = `null`

---

### Step 4: Verify on Instagram

If `status` = `'published'`:

1. Open the `platform_post_url` in a browser
2. Confirm the video appears on Instagram
3. Check caption matches what was submitted
4. Verify video plays correctly

---

## 🧰 Manual API Testing (Optional)

If posting still fails through the app, test Late API directly:

### Setup Environment Variables

```bash
# Get Late API key from Render environment variables
export LATE_API_KEY="your_late_api_key_here"

# Get Miguel's Late profile ID from database
export PROFILE_ID="miguel_late_profile_id"

# Use the actual Klap video URL from the export
export VIDEO_URL="https://klap-export-url.com/video.mp4"

# Instagram account ID (from .env or hardcoded)
export INSTAGRAM_ACCOUNT_ID="6900d2cd8bbca9c10cbfff74"
```

### Run Test Script

```bash
bash scripts/test-late-api.sh
```

### Interpret Results

**✅ HTTP 200/201**: Late API works externally
- Issue is in app's request construction
- Compare `[Late Debug] Request` logs with curl payload
- Check for differences in headers, body structure, or encoding

**❌ HTTP 401/403**: Authentication error
- Late API key invalid or expired
- Check Render environment variables (Dashboard → streamline-mvp → Environment)
- Verify `LATE_API_KEY` matches Late.dev dashboard

**❌ HTTP 400**: Bad request
- Request body malformed
- Missing required fields (accountId, videoUrl, profileId)
- Video URL might be expired or inaccessible

**❌ HTTP 500**: Late API server error
- Not your app's fault
- Wait and retry later
- Contact Late.dev support if persistent

---

## ✅ Success Criteria

### All Phases Complete When:

1. **No more "Unexpected end of JSON input" errors**
   - Error messages are now descriptive and actionable

2. **Console logs show complete request/response cycle**
   - See request payload, response headers, raw body

3. **One of two outcomes:**
   - ✅ Post succeeds → visible on Instagram
   - ✅ Post fails with clear error explaining why

4. **Database accurately reflects post status**
   - `status` matches actual outcome
   - `error_message` is helpful for debugging

---

## 🔧 Troubleshooting Guide

### Issue: "Late API returned empty response (HTTP 500)"

**Likely Causes:**
- Late API server error (temporary)
- Video URL expired or inaccessible
- Account not properly connected

**Solutions:**
1. Check if video URL is accessible (open in browser)
2. Retry after a few minutes
3. Re-export the clip to get fresh URL
4. Run `scripts/test-late-api.sh` to isolate issue

---

### Issue: "Late API returned invalid JSON (HTTP 401)"

**Likely Causes:**
- Late API key invalid/expired
- Response is HTML error page

**Solutions:**
1. Check `[Late Debug] Raw body:` log for actual response
2. Verify `LATE_API_KEY` in Render environment variables
3. Test with `scripts/test-late-api.sh`
4. Check Late.dev dashboard for API key status

---

### Issue: "Invalid video URL - Video URL must be HTTPS"

**Likely Causes:**
- Export failed or returned HTTP URL
- `srcUrl` is null or malformed

**Solutions:**
1. Check export status in database (`exports` table)
2. Re-trigger export for the clip
3. Verify Klap API export response contains valid `srcUrl`
4. Check `[Social Post] Using export URL:` log

---

### Issue: "Instagram account ID required"

**Likely Causes:**
- User's `lateAccountId` is null
- Default `INSTAGRAM_ACCOUNT_ID` env var missing

**Solutions:**
1. Check `.env` has `INSTAGRAM_ACCOUNT_ID=6900d2cd8bbca9c10cbfff74`
2. Verify user table has `late_account_id` populated
3. User may need to connect Instagram via Late.dev OAuth flow

---

## 📊 Expected Log Output Examples

### Complete Success Flow

```
[Social Post] POST /api/social/post
[Social Post] Posting to instagram for project: proj_abc123
[Social Post] Using export URL: https://klap.app/exports/xyz...
[Validation] ✓ Video URL format valid (HTTPS)
[Validation] Full URL: https://klap.app/exports/xyz.mp4
[Social Post] Using Late profile: profile_123, account: 6900d2cd8bbca9c10cbfff74
[Social Post] Created social post record: 42
[Late Service] Posting to Instagram: {
  videoUrl: 'https://klap.app/exports/xyz.mp4...',
  caption: 'Check out this awesome short! #AI',
  contentType: 'reel',
  profileId: 'profile_123',
  accountId: '6900d2cd8bbca9c10cbfff74'
}
[Late Debug] Request: {
  url: 'https://getlate.dev/api/v1/posts',
  videoUrl: 'https://klap.app/exports/xyz.mp4',
  caption: 'Check out this awesome short! #AI',
  profileId: 'profile_123',
  accountId: '6900d2cd8bbca9c10cbfff74',
  bodySize: 342,
  timestamp: '2025-11-06T14:30:22.123Z'
}
[Late Debug] Response: {
  status: 200,
  statusText: 'OK',
  headers: {
    'content-type': 'application/json',
    'content-length': '512',
    ...
  },
  contentType: 'application/json'
}
[Late Debug] Raw body: {"post":{"_id":"post_789","status":"published","platforms":[{"platform":"instagram","accountId":"6900d2cd8bbca9c10cbfff74","platformPostUrl":"https://www.instagram.com/reel/Xyz123/","status":"published"}],...}}
[Late Service] Post successful: {
  postId: 'post_789',
  status: 'published',
  platformUrl: 'https://www.instagram.com/reel/Xyz123/'
}
[Social Post] ✓ Posted successfully to Instagram
```

---

## 🚀 Next Steps After Fix Confirmed

Once Miguel successfully posts to Instagram:

1. **Mark as resolved** in issue tracker
2. **Monitor for similar errors** from other Pro users
3. **Consider adding**:
   - Request timeout handling (30s limit)
   - Retry logic for transient Late API errors
   - Video URL accessibility check before posting
4. **Proceed to Phase 2 features** (AI generation, scheduling, etc.)

---

## 📝 Notes

- All changes preserve existing functionality
- No breaking changes to API contracts
- Logging can be reduced after issue is resolved (remove `[Late Debug]` lines)
- Consider adding these debug logs to other API integrations (Klap, Stripe)

---

**Owner**: Raunek Pratap
**Date**: November 6, 2025
**Status**: Ready for Testing
**Test Environment**: Render Production (streamline-mvp)
