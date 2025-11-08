# UGC Ad Studio - Testing Guide (Phases 1-5)

**Date**: November 7, 2025
**Phases Completed**: 1 (Backend Stabilization), 2 (Database Schema), 3 (Preset Templates), 4 (Frontend Redesign), 5 (Chain Orchestration)

---

## Prerequisites

### 1. Environment Variables Check

Before testing, verify all required API keys are configured:

```bash
# Check environment variables
cat .env | grep -E "KIE_API_KEY|OPENAI_API_KEY|DATABASE_URL|SUPABASE"
```

**Required Variables**:
- ✅ `KIE_API_KEY` - For NanoBanana, Veo3 video generation
- ✅ `OPENAI_API_KEY` - For Vision API (Mode A chain)
- ✅ `DATABASE_URL` - PostgreSQL connection (NeonDB)
- ✅ `SUPABASE_URL` - Authentication
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Authentication

**If any are missing**, add them to `.env`:
```bash
KIE_API_KEY=your_kie_key_here
OPENAI_API_KEY=sk-your_openai_key_here
```

---

## Step 1: Build & Start Server

### 1.1 Clean Build
```bash
# Clean previous build
rm -rf dist/

# Build frontend + backend
npm run build
```

**Expected Output**:
```
✓ built in 2-3s
dist/index.js  191.3kb
```

**❌ If build fails**:
- Check for TypeScript errors in console
- Verify all imports are correct
- Run `npm install` if dependencies are missing

### 1.2 Start Development Server
```bash
npm run dev
```

**Expected Output**:
```
Server running on port 5000
Database connected
```

**Access the app**:
- Frontend: http://localhost:5000
- Backend API: http://localhost:5000/api

### 1.3 Verify Authentication
1. Navigate to http://localhost:5000
2. Sign in with Supabase account
3. Verify you're redirected to dashboard

**❌ If authentication fails**:
- Check Supabase console for user account
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Check browser console for errors

---

## Step 2: Test Phase 3 - Preset Templates

### 2.1 Run Preset Template Tests
```bash
npx tsx scripts/test-ugc-prompts.ts
```

**Expected Output**:
```
🧪 Testing UGC Prompt Templates
================================================================================

✅ TEST 1: String Sanitization
✓ Newlines removed, quotes escaped, spaces collapsed

✅ TEST 2: Variable Injection
✓ All variables replaced correctly

✅ TEST 3: Mode A - NanoBanana Image Prompt
✓ Image prompt generated for NanoBanana

✅ TEST 4: Mode A - Veo3 Video Prompt (Chained)
✓ Video prompt generated with image analysis

✅ TEST 5: Mode B - Veo3 Direct Video
✓ Direct Veo3 video prompt generated

✅ TEST 6: Mode C - Sora 2 Video
✓ Sora 2 video prompt generated

✅ TEST 7: Edge Cases
✓ Handles empty strings without errors
✓ Special characters sanitized correctly

🎉 All Tests Passed!
```

**❌ If tests fail**:
- Check `server/prompts/ugc-presets.ts` for syntax errors
- Verify `formatICPForPrompt` and `formatSceneForPrompt` functions exist
- Review error messages for specific failures

---

## Step 3: Test Phase 4 - Simplified Form UI

### 3.1 Navigate to UGC Ad Studio
1. Go to http://localhost:5000
2. Click **"UGC Ad Studio"** in navigation
3. Verify you see the redesigned form

**Expected UI Elements**:
- ✅ **Product Brief** header
- ✅ **5 form fields**:
  1. Product Image (URL input, optional)
  2. Product Name (text input, required)
  3. Key Features (textarea, required)
  4. Who's Your Customer? (dropdown, 8 personas)
  5. Where's the Ad Filmed? (dropdown, 10 scenes)
- ✅ **Quality Mode** selector (3 cards):
  - Mode A: Premium Quality (RECOMMENDED badge)
  - Mode B: Fast (FASTER badge)
  - Mode C: Budget (CHEAPER badge)
- ✅ **Generate UGC Ad Video** button

**❌ Old UI elements should NOT be visible**:
- ❌ Manual prompt textarea
- ❌ "Ad Format" selector (Image/Video buttons)
- ❌ Technical model/provider dropdowns

### 3.2 Test Form Validation
1. Click **"Generate UGC Ad Video"** without filling anything
   - **Expected**: Toast error "Product name required"

2. Enter product name only: "Test Product"
   - Click generate
   - **Expected**: Toast error "Product features required"

3. Enter features: "Test"
   - **Expected**: Red text "Minimum 10 characters required"

4. Enter valid features: "Amazing quality product with great features"
   - Click generate
   - **Expected**: Form submits successfully

### 3.3 Test Dropdown Options

**Customer Persona Dropdown**:
- Click dropdown, verify 8 options:
  1. Fitness Enthusiast (20s-30s)
  2. Busy Professional (25-40)
  3. Health-Conscious Parent (30s-40s)
  4. Wellness Influencer (20s-30s)
  5. College Student (18-25)
  6. Beauty & Skincare Lover (20s-40s)
  7. Tech-Savvy Millennial (25-35)
  8. Outdoor Adventurer (20s-40s)

**Video Setting Dropdown**:
- Click dropdown, verify 10 options with emojis:
  1. 🏋️ Modern Gym
  2. 🍳 Kitchen Counter
  3. 💼 Office Desk
  4. 🌳 Outdoor Park
  5. 🛋️ Cozy Living Room
  6. 🪞 Bathroom Mirror
  7. ☕ Coffee Shop
  8. 🛏️ Bedroom (Morning)
  9. 🚗 Car Interior
  10. 🧘 Yoga Studio

---

## Step 4: Test Mode B - Veo3 Direct Generation

**Mode B** = Fast, direct video generation (no chaining)

### 4.1 Fill Out Form
1. **Product Image**: (leave empty or paste: https://example.com/product.jpg)
2. **Product Name**: `ProFit Protein Powder`
3. **Key Features**: `30g protein per serving, chocolate flavor, keto-friendly, zero sugar`
4. **Customer**: `Fitness Enthusiast (20s-30s)`
5. **Setting**: `Modern Gym`
6. **Mode**: Click **"Mode B: Fast"** card

### 4.2 Submit & Monitor
1. Click **"Generate UGC Ad Video"**
2. **Expected**:
   - Success toast: "UGC Ad generation started! ~1-2 min"
   - Form clears
   - New card appears in gallery below with "Creating Ad..." status

### 4.3 Check Browser Console
Open DevTools (F12) → Console tab

**Expected logs**:
```
[AI UGC Preset] Request from user: <userId>
[AI UGC Preset] Generating prompt with variables: {product, features, icp, scene}
[AI UGC Preset] Generated prompt (first 100 chars): Create an 8-second selfie-style UGC...
[AI UGC Preset] Starting veo3-only direct generation
[Media Generation] Starting background processing
```

### 4.4 Watch Gallery Card
- **Status Badge**: "Creating Ad..." (spinning loader)
- **Type Badge**: 🎥 (video)
- **Estimated time**: Usually 1-2 minutes

### 4.5 Check Server Logs
In terminal where `npm run dev` is running:

**Expected logs**:
```
[KIE Service] Generating video: veo3
[Veo3 Polling] Attempt 1/60 (30s elapsed)
[Veo3 Polling] Attempt 2/60 (60s elapsed)
...
[Veo3 ✅] Video saved successfully: <assetId>
```

### 4.6 Verify Completion
- **Status Badge** changes to: "Ready to Review" (green checkmark)
- **Preview**: Video player appears in card
- **Click hint**: "Click to view, post, or download"

### 4.7 Click Card to Open Modal
1. Click the completed video card
2. **Expected Modal**:
   - 🎬 UGC Ad Video header
   - Video player with controls
   - "Original Prompt" section (shows generated prompt)
   - Action buttons:
     - Post to Instagram
     - Download

---

## Step 5: Test Mode C - Sora 2 Generation

**Mode C** = Budget option (Sora 2 video)

### 5.1 Fill Out Form
Same as Mode B, but select **"Mode C: Budget"** card

### 5.2 Submit & Monitor
**Expected behavior**: Same as Mode B, but:
- Provider: `sora2` (not `kie-veo3`)
- May be faster/cheaper depending on API

**⚠️ Note**: Sora 2 provider may not be fully implemented in KIE service yet. Check logs for:
```
[KIE Service] Unknown provider: sora2
```

**If Sora 2 fails**:
- This is expected (provider needs KIE API endpoint)
- Asset will show error status
- Test retry functionality (Step 7)

---

## Step 6: Test Mode A - NanoBanana + Veo3 Chain

**Mode A** = Premium quality, chained workflow (longest, best quality)

### 6.1 Fill Out Form
1. **Product Image**: `https://example.com/protein-powder.jpg`
2. **Product Name**: `ProFit Protein Powder`
3. **Key Features**: `30g protein per serving, chocolate flavor, keto-friendly, zero sugar, smooth texture, mixes easily`
4. **Customer**: `Fitness Enthusiast (20s-30s)`
5. **Setting**: `Modern Gym`
6. **Mode**: Click **"Mode A: Premium Quality"** (RECOMMENDED)

### 6.2 Submit & Monitor Chain Workflow
1. Click **"Generate UGC Ad Video"**
2. **Expected toast**: "UGC Ad generation started! ~2-3 min"

### 6.3 Check Browser Console
**Expected logs**:
```
[AI UGC Preset] Starting Mode A chain workflow
```

### 6.4 Monitor Chain Steps in Server Logs

**Step 1: Generating NanoBanana Image** (~15-30s)
```
[UGC Chain] Step 1: Starting NanoBanana image generation
[KIE Service] Generating image: flux-kontext
[UGC Chain] Step 1 complete: NanoBanana task task_123 started
[Chain Workflow] Starting chain polling for asset
[Chain Workflow] Poll 1: Step=generating_image, Elapsed=30s
```

**Step 2: Image Complete** (~30s)
```
[UGC Chain] Step 2: Checking NanoBanana image status
[UGC Chain] Step 2 complete: NanoBanana image ready at https://...
```

**Step 3: Analyzing Image with Vision** (~3-5s)
```
[UGC Chain] Step 3: Analyzing image with OpenAI Vision
[OpenAI Vision] Analyzing image: https://...
[OpenAI Vision] Image analyzed successfully: analysisLength=450
[UGC Chain] Image analysis complete: The image shows a young woman in her late 20s...
[UGC Chain] Video prompt generated (1200 chars)
[UGC Chain] Step 3 complete: Image analyzed, moving to Step 4
```

**Step 4: Generating Veo3 Video** (~90-120s)
```
[UGC Chain] Step 4: Starting Veo3 video generation
[KIE Service] Generating video: veo3
[UGC Chain] Step 4 complete: Veo3 task task_456 started
[Chain Workflow] Poll 5: Step=generating_video, Elapsed=150s
```

**Step 5: Video Complete**
```
[UGC Chain] Step 5: Checking Veo3 video status
[UGC Chain] Step 5 complete: Veo3 video ready at https://...
[UGC Chain] 🎉 Chain workflow complete for asset <assetId>!
[Chain Workflow] ✅ Video ready, chain complete!
```

### 6.5 Check Database Chain Metadata

**Option A**: Check in database GUI (if you have one)
```sql
SELECT id, status, generation_mode, chain_metadata
FROM media_assets
WHERE generation_mode = 'nanobana+veo3'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected `chain_metadata`**:
```json
{
  "step": "completed",
  "nanoImageUrl": "https://kie.ai/...",
  "nanoTaskId": "task_123",
  "imageAnalysis": "The image shows a young woman in her late 20s wearing athletic wear...",
  "videoPrompt": "Create an 8-second selfie-style UGC video based on this reference image...",
  "videoTaskId": "task_456",
  "timestamps": {
    "imageStarted": "2025-11-07T10:00:00Z",
    "imageCompleted": "2025-11-07T10:00:15Z",
    "analysisCompleted": "2025-11-07T10:00:18Z",
    "videoStarted": "2025-11-07T10:00:20Z",
    "videoCompleted": "2025-11-07T10:02:30Z"
  }
}
```

**Option B**: Check asset in API
```bash
# Get latest asset
curl http://localhost:5000/api/ai/media \
  -H "Authorization: Bearer <your_token>"
```

### 6.6 Verify Final Video
- Gallery card shows video player
- Video URL stored in `resultUrl`
- `status = 'ready'`
- Modal shows video with all action buttons

---

## Step 7: Test Retry Functionality

### 7.1 Trigger a Failure (Manual)

**Option A**: Use invalid API key temporarily
```bash
# In .env, temporarily break KIE_API_KEY
KIE_API_KEY=invalid_key_test
```

**Option B**: Kill server mid-generation
- Start a Mode B generation
- Stop server with `Ctrl+C` after task submitted
- Restart server
- Asset will be stuck in "processing" status

### 7.2 Check Failed Asset in Gallery
- **Status Badge**: "Generation Failed" (red X)
- **Error message** visible in error state UI
- **Retry hint**: "Click to retry (3 attempts remaining)"

### 7.3 Click Failed Card
Modal should NOT open (retry is handled from card click)

**🚨 Current Limitation**: Retry button not yet implemented in Modal
- This is Phase 6 work (UI Polish)
- For now, retry would need API call:

```bash
curl -X POST http://localhost:5000/api/ai/media/retry/<assetId> \
  -H "Authorization: Bearer <token>"
```

### 7.4 Test Retry Limit
1. Retry same asset 3 times
2. On 4th attempt:
   - **Expected**: Error "Maximum retry attempts reached"
   - Card shows: "Max retry attempts reached"

---

## Step 8: End-to-End Workflow Test

### 8.1 Complete User Journey
1. **Login** to app
2. **Navigate** to UGC Ad Studio
3. **Fill form** with real product:
   - Product: "Organic Green Tea"
   - Features: "Antioxidant-rich, organic certified, smooth taste, 100mg caffeine"
   - Customer: "Health-Conscious Parent (30s-40s)"
   - Setting: "Kitchen Counter"
   - Mode: "Mode B: Fast"
4. **Submit** and wait for completion
5. **Click** completed video card
6. **Download** video from modal
7. **Post** to Instagram (if Late.dev configured)

### 8.2 Check Usage Limits
After generating 10 videos:
```bash
# Check usage
curl http://localhost:5000/api/usage \
  -H "Authorization: Bearer <token>"
```

**Expected response**:
```json
{
  "videosCreated": 0,
  "postsCreated": 0,
  "mediaGenerationsCreated": 10,
  "limits": {
    "videos": 5,
    "posts": 10,
    "mediaGenerations": 10
  },
  "subscriptionStatus": "free"
}
```

On 11th generation attempt:
- **Expected**: Error "Monthly media generation limit reached"
- **Expected**: Limit dialog appears

---

## Step 9: Database Verification

### 9.1 Check Media Assets Table
```sql
SELECT
  id,
  user_id,
  provider,
  type,
  status,
  generation_mode,
  prompt,
  result_url,
  created_at,
  completed_at
FROM media_assets
ORDER BY created_at DESC
LIMIT 5;
```

**Expected for Mode A**:
- `generation_mode = 'nanobana+veo3'`
- `provider = 'kie-veo3'` (final provider after chain)
- `type = 'video'` (final type after chain)
- `chain_metadata` populated with all steps

**Expected for Mode B**:
- `generation_mode = 'veo3-only'`
- `provider = 'kie-veo3'`
- `type = 'video'`
- `chain_metadata = null`

### 9.2 Check User Usage Table
```sql
SELECT
  user_id,
  month,
  videos_created,
  posts_created,
  media_generations_created
FROM user_usage
WHERE month = '2025-11'
ORDER BY updated_at DESC;
```

**Expected**: `media_generations_created` increments with each generation

---

## Common Issues & Solutions

### Issue 1: Build Fails
**Error**: `No matching export for "formatICPForPrompt"`
**Solution**: We already fixed this - ensure you pulled latest code:
```bash
git pull origin main
npm run build
```

### Issue 2: Chain Workflow Never Completes
**Symptoms**: Asset stuck in "generating_image" step forever
**Debug**:
1. Check server logs for KIE API errors
2. Verify `KIE_API_KEY` is valid
3. Check chain_metadata in database:
```sql
SELECT chain_metadata FROM media_assets WHERE id = '<assetId>';
```
4. Look for `error` field in chain_metadata

**Solution**: Chain has 60-minute timeout, will auto-fail if stuck

### Issue 3: Vision API Fails
**Error**: `OpenAI Vision API Error (401): Invalid API key`
**Solution**:
1. Check `OPENAI_API_KEY` in `.env`
2. Verify key has access to gpt-4o model
3. Check OpenAI account has sufficient credits

### Issue 4: Video Shows in Gallery but URL Missing
**Symptoms**: "Video Ready - URL Missing" yellow warning
**Debug**:
1. Check browser console for asset object
2. Look for `resultUrl` or `result_url` field
3. Check `resultUrls` array

**Solution**:
- This was fixed in Phase 4.6.7
- Run backfill script if old assets affected:
```bash
npx tsx scripts/backfill-ugc-preview-urls.ts
```

### Issue 5: Gallery Not Auto-Refreshing
**Expected**: Gallery polls every 10s when processing assets exist
**Debug**: Open browser console, look for:
```
[AIStudio] Polling active - processing assets found
```

**Solution**:
- Refresh page manually
- Check `refetchInterval` in `useQuery` hook
- Verify at least one asset has `status: 'processing'`

---

## Success Criteria

### Phase 3 ✅
- [ ] All 7 preset template tests pass
- [ ] Variable injection works correctly
- [ ] String sanitization prevents JSON errors

### Phase 4 ✅
- [ ] Form shows 5 simplified fields (no manual prompts)
- [ ] 8 customer personas in dropdown
- [ ] 10 video settings in dropdown
- [ ] 3 generation mode cards render correctly
- [ ] Form validation works (product name, features length)
- [ ] `/api/ai/generate-ugc-preset` endpoint responds

### Phase 5 ✅
- [ ] Mode B generates video successfully (~1-2 min)
- [ ] Mode A executes full chain workflow (~2-3 min):
  - [ ] NanoBanana image generates
  - [ ] OpenAI Vision analyzes image
  - [ ] Veo3 video generates with image reference
  - [ ] `chain_metadata` updates at each step
- [ ] Chain errors are handled gracefully
- [ ] Database stores `generation_mode` correctly

### Overall System ✅
- [ ] Build succeeds without errors
- [ ] Server starts without crashes
- [ ] Authentication works
- [ ] Gallery displays assets correctly
- [ ] Modal opens and shows video/image
- [ ] Usage limits are enforced
- [ ] Retry system works (max 3 attempts)

---

## Next Steps After Testing

1. **Report Issues**: Document any failures in this file
2. **Phase 6**: UI Polish (status badges, chain progress indicators)
3. **Phase 7**: Production testing & deployment
4. **Performance**: Monitor API costs (OpenAI Vision, KIE)
5. **Monitoring**: Set up error tracking (Sentry, LogRocket)

---

**Testing Date**: _____________
**Tested By**: _____________
**Results**: _____________
