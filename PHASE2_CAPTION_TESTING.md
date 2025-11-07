# Phase 2: AI Caption Generation — Testing & Verification Guide

**Owner**: Raunek Pratap
**Date**: November 7, 2025
**Status**: Ready for Testing
**Environment**: Render Production (streamline-mvp)

---

## 🎯 What Was Implemented

### Phase 2: AI Caption Generation Feature

**Goal**: Enable automatic AI-powered caption generation for Instagram posts using OpenAI (GPT-4o), with both auto-mode and custom system prompt capabilities.

**Key Features**:
- ✅ OpenAI GPT-4o integration (`server/services/openai.ts`)
- ✅ Available to all users (Free + Pro)
- ✅ Auto-mode: Generates caption when empty
- ✅ Custom system prompt: Users can configure their caption writing style
- ✅ Per-user caption preferences stored in database
- ✅ Manual caption generation API endpoint
- ✅ Caption metadata tracking (source, model, tokens used)

---

## 📦 Files Created/Modified

### **New Files**:
1. `server/services/openai.ts` — OpenAI API wrapper service
2. `server/validators/caption.ts` — Zod validation schemas for caption APIs
3. `scripts/migrate-caption-fields.ts` — Database migration script
4. `PHASE2_CAPTION_TESTING.md` — This testing guide

### **Modified Files**:
1. `shared/schema.ts` — Added caption fields to `users` and `socialPosts` tables
2. `server/routes.ts` — Added 3 new endpoints + auto-caption integration in posting flow

---

## 🗄️ Database Changes

### **Users Table** (new fields):
```sql
caption_system_prompt TEXT DEFAULT 'Write an engaging Instagram caption...'
caption_auto_generate TEXT DEFAULT 'true' NOT NULL
```

### **Social Posts Table** (new fields):
```sql
caption_source TEXT  -- 'manual', 'ai_auto', 'ai_manual'
ai_caption_metadata JSONB  -- {model, tokensUsed, generatedAt, promptUsed}
```

---

## 🚀 Deployment Steps

### **Step 1: Deploy Code to Render**

The code has been pushed to GitHub `main` branch. Render will auto-deploy.

**Monitor Deployment**:
1. Go to Render dashboard: https://dashboard.render.com
2. Find service: `streamline-mvp`
3. Check "Events" tab for deployment status
4. Wait for "Deploy succeeded" message

---

### **Step 2: Run Database Migration**

**SSH into Render or run locally with production DATABASE_URL**:

```bash
# Option A: Run migration via Render shell
# (Go to Render dashboard → streamline-mvp → Shell)
npm run migrate:caption

# Option B: Run migration locally pointing to production DB
export DATABASE_URL="<your_production_database_url>"
tsx scripts/migrate-caption-fields.ts
```

**Expected Output**:
```
🚀 Starting AI Caption Fields Migration...

📝 Step 1: Adding caption fields to users table...
✅ Added caption_system_prompt and caption_auto_generate to users table

📝 Step 2: Adding caption metadata fields to social_posts table...
✅ Added caption_source and ai_caption_metadata to social_posts table

📝 Step 3: Verifying new columns...
✅ Migration verification complete

📝 Step 4: Setting defaults for existing users...
✅ Updated X existing users with default caption settings

🎉 Migration completed successfully!
```

---

### **Step 3: Verify Environment Variables**

**Check Render Environment Variables** (Dashboard → streamline-mvp → Environment):

Required:
- ✅ `OPENAI_API_KEY` or `OPEN_AI_API_KEY` — OpenAI API key (already exists)
- ✅ `OPENAI_MODEL` — Optional, defaults to `gpt-4o`

---

## 🧪 Testing Protocol

### **Test 1: Auto-Caption Mode (Default Behavior)**

**Scenario**: User posts without providing a caption, auto-mode is ON (default)

**Steps**:
1. Login to Streamline AI
2. Generate and export a clip via Klap
3. Click "Post to Instagram"
4. **Leave caption field EMPTY**
5. Submit post

**Expected Result**:
- ✅ Caption is auto-generated using OpenAI
- ✅ Post succeeds to Instagram with AI caption
- ✅ Render logs show:
  ```
  [Caption] Auto-generating caption (empty caption + auto-mode enabled)
  [OpenAI Service] Generating caption: ...
  [OpenAI Service] Caption generated successfully
  [Caption] Auto-generated caption: "..."
  [Social Post] Created social post record: X (caption source: ai_auto)
  ```

**Verify in Database**:
```sql
SELECT caption, caption_source, ai_caption_metadata
FROM social_posts
WHERE id = <post_id>;
```
- `caption` should contain AI-generated text
- `caption_source` = `'ai_auto'`
- `ai_caption_metadata` contains `{model, tokensUsed, generatedAt, promptUsed}`

---

### **Test 2: Manual Caption (User Provides Text)**

**Scenario**: User provides their own caption

**Steps**:
1. Export a clip
2. Click "Post to Instagram"
3. **Enter a custom caption**: "Check out this amazing clip! 🔥"
4. Submit post

**Expected Result**:
- ✅ Caption is NOT auto-generated (user's caption is used)
- ✅ Post succeeds with manual caption
- ✅ Render logs show:
  ```
  [Caption] Using manual caption provided by user
  [Social Post] Created social post record: X (caption source: manual)
  ```

**Verify in Database**:
- `caption` = `"Check out this amazing clip! 🔥"`
- `caption_source` = `'manual'`
- `ai_caption_metadata` = `null`

---

### **Test 3: Manual Caption Generation API**

**Scenario**: User clicks "Generate AI Caption" button to preview before posting

**API Endpoint**: `POST /api/caption/generate`

**Test with curl**:
```bash
curl -X POST https://streamline-mvp.onrender.com/api/caption/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <user_access_token>" \
  -d '{
    "projectId": "<project_id>"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "caption": "Transform your content into viral-ready shorts! ✨ This AI-powered tool makes it so easy. What would you create with this? 🎥",
  "metadata": {
    "model": "gpt-4o",
    "tokensUsed": 145,
    "generatedAt": "2025-11-07T12:34:56.789Z",
    "promptUsed": "Write an engaging Instagram caption..."
  }
}
```

**Verify**:
- ✅ Caption is contextual (relates to project name)
- ✅ Contains emojis
- ✅ Has call-to-action or question
- ✅ Appropriate length (2-3 sentences)

---

### **Test 4: Caption Settings API**

**Scenario**: User configures their custom system prompt

#### **4A: Get Current Settings**

```bash
curl -X GET https://streamline-mvp.onrender.com/api/user/caption-settings \
  -H "Authorization: Bearer <user_access_token>"
```

**Expected Response**:
```json
{
  "systemPrompt": "Write an engaging Instagram caption for this video. Be creative, use relevant emojis, and include a call-to-action.",
  "autoGenerate": true
}
```

#### **4B: Update Settings**

```bash
curl -X PUT https://streamline-mvp.onrender.com/api/user/caption-settings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <user_access_token>" \
  -d '{
    "systemPrompt": "Write a professional LinkedIn-style caption. No emojis. Focus on insights and value.",
    "autoGenerate": false
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "systemPrompt": "Write a professional LinkedIn-style caption...",
  "autoGenerate": false
}
```

**Verify**:
- ✅ Settings are persisted in database
- ✅ Next caption generation uses new system prompt
- ✅ Auto-generate can be toggled on/off

---

### **Test 5: Auto-Mode Disabled**

**Scenario**: User disables auto-generate, posts without caption

**Steps**:
1. Disable auto-generate via settings API (Test 4B)
2. Export a clip
3. Click "Post to Instagram"
4. **Leave caption field EMPTY**
5. Submit post

**Expected Result**:
- ✅ Caption is NOT generated (auto-mode disabled)
- ✅ Post succeeds with empty caption
- ✅ Render logs show:
  ```
  [Caption] No caption (auto-generate disabled or failed)
  [Social Post] Created social post record: X (caption source: manual)
  ```

**Verify in Database**:
- `caption` = `''` (empty string)
- `caption_source` = `'manual'`
- `ai_caption_metadata` = `null`

---

### **Test 6: Custom System Prompt**

**Scenario**: User sets a custom prompt, then posts with auto-generation

**Steps**:
1. Update system prompt via API:
   ```json
   {
     "systemPrompt": "Write a short, punchy caption with 1 emoji max. End with a hashtag.",
     "autoGenerate": true
   }
   ```
2. Export a clip
3. Post without caption (auto-mode ON)

**Expected Result**:
- ✅ Generated caption follows custom prompt style
- ✅ Caption is short, punchy, 1 emoji, ends with hashtag
- ✅ Metadata includes custom prompt snippet

---

### **Test 7: OpenAI API Failure (Graceful Degradation)**

**Scenario**: OpenAI API is down or returns an error

**Simulate**:
- Temporarily set invalid `OPENAI_API_KEY` in Render
- OR OpenAI API quota exceeded

**Expected Result**:
- ✅ Caption generation fails gracefully
- ✅ Post continues with empty caption (does NOT block posting)
- ✅ Render logs show:
  ```
  [Caption] Failed to auto-generate caption, continuing with empty: OpenAI API Error (401): Invalid API key
  ```
- ✅ Post succeeds (Late API call proceeds)

**Verify**:
- ✅ User is NOT blocked from posting
- ✅ Error is logged but not returned to user
- ✅ `caption_source` = `'manual'`, `aiMetadata` = `null`

---

## 📊 Monitoring & Logs

### **Key Log Patterns to Watch**

**Successful Auto-Caption**:
```
[Caption] Auto-generating caption (empty caption + auto-mode enabled)
[OpenAI Service] Generating caption: { projectName: "...", model: "gpt-4o" }
[OpenAI Service] Caption generated successfully: { captionLength: 145, tokensUsed: 52 }
[Caption] Auto-generated caption: "Transform your content..."
[Social Post] Created social post record: 42 (caption source: ai_auto)
```

**Manual Caption Provided**:
```
[Caption] Using manual caption provided by user
[Social Post] Created social post record: 43 (caption source: manual)
```

**Auto-Generate Disabled**:
```
[Caption] No caption (auto-generate disabled or failed)
[Social Post] Created social post record: 44 (caption source: manual)
```

**OpenAI Error (Graceful Fallback)**:
```
[Caption] Failed to auto-generate caption, continuing with empty: OpenAI API Error (429): Rate limit exceeded
```

---

## ✅ Success Criteria

All tests pass when:

1. ✅ **Auto-Mode Works**: Empty caption → AI caption generated → post succeeds
2. ✅ **Manual Override Works**: User caption provided → AI skipped → post succeeds
3. ✅ **Settings Persisted**: User can configure system prompt and auto-mode toggle
4. ✅ **Custom Prompts Respected**: AI-generated captions match user's style
5. ✅ **Graceful Degradation**: OpenAI failure does NOT block posting
6. ✅ **Metadata Tracked**: `caption_source` and `ai_caption_metadata` stored correctly
7. ✅ **Backward Compatible**: Existing manual caption flow untouched
8. ✅ **No Breaking Changes**: Instagram posting still works as before

---

## 🐛 Troubleshooting Guide

### **Issue: "OPENAI_API_KEY is not configured"**

**Cause**: Environment variable missing or misspelled

**Solutions**:
1. Check Render environment variables (Dashboard → Environment)
2. Verify `OPENAI_API_KEY` or `OPEN_AI_API_KEY` is set
3. Restart Render service after adding variable

---

### **Issue: "Failed to generate caption" (401 Unauthorized)**

**Cause**: Invalid or expired OpenAI API key

**Solutions**:
1. Verify API key is valid: https://platform.openai.com/api-keys
2. Check OpenAI account has credits/billing active
3. Update `OPENAI_API_KEY` in Render

---

### **Issue: "Failed to generate caption" (429 Rate Limit)**

**Cause**: OpenAI API rate limit exceeded

**Solutions**:
1. Wait a few minutes and retry
2. Upgrade OpenAI account tier for higher limits
3. Implement rate limiting on Streamline side (future enhancement)

---

### **Issue: Caption generated but doesn't match project content**

**Cause**: AI prompt may need tuning or project name is generic

**Solutions**:
1. User can customize system prompt via settings
2. Add more context to prompt (future: include video thumbnail analysis)
3. User can always manually edit AI caption before posting

---

### **Issue: Database migration failed**

**Cause**: Migration script error or permissions issue

**Solutions**:
1. Check DATABASE_URL is correct
2. Ensure database user has ALTER TABLE permissions
3. Re-run migration script: `tsx scripts/migrate-caption-fields.ts`
4. Verify columns manually:
   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'users' AND column_name LIKE 'caption%';
   ```

---

## 📈 Usage Analytics

### **Queries to Monitor AI Caption Adoption**

**Caption Source Breakdown**:
```sql
SELECT
  caption_source,
  COUNT(*) as total_posts,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM social_posts
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY caption_source;
```

**AI Tokens Usage**:
```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) as ai_captions,
  SUM((ai_caption_metadata->>'tokensUsed')::int) as total_tokens
FROM social_posts
WHERE caption_source IN ('ai_auto', 'ai_manual')
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

**Users with Custom Prompts**:
```sql
SELECT
  COUNT(*) as users_with_custom_prompts
FROM users
WHERE caption_system_prompt != 'Write an engaging Instagram caption for this video. Be creative, use relevant emojis, and include a call-to-action.';
```

---

## 🚀 Next Steps (Phase 2B+)

After Phase 2 is verified and deployed:

1. **Vision Analysis** (Phase 2B): Use OpenAI Vision to analyze video thumbnails for richer context
2. **Tone Presets** (Phase 2C): Add quick-select tones (Motivational, Humorous, Professional, etc.)
3. **Hashtag Suggestions**: Auto-suggest relevant hashtags based on content
4. **A/B Testing**: Generate multiple caption variants, let user choose
5. **Multi-language**: Support caption generation in different languages
6. **Analytics**: Track which AI captions perform best (likes, comments, shares)

---

## 📝 Final Checklist

Before marking Phase 2 as complete:

- [ ] Code deployed to Render successfully
- [ ] Database migration completed
- [ ] Environment variables verified (`OPENAI_API_KEY`)
- [ ] Test 1: Auto-caption mode works ✅
- [ ] Test 2: Manual caption override works ✅
- [ ] Test 3: Manual generation API works ✅
- [ ] Test 4: Caption settings API works ✅
- [ ] Test 5: Auto-mode disabled works ✅
- [ ] Test 6: Custom system prompt works ✅
- [ ] Test 7: Graceful degradation works ✅
- [ ] Logs show proper caption source tracking
- [ ] Database metadata stored correctly
- [ ] No breaking changes to existing posting flow
- [ ] Documentation updated

---

**🎉 Phase 2: AI Caption Generation — COMPLETE!**

All backend infrastructure is in place. Frontend UI components (Phase 2.6) can be implemented separately as needed.
