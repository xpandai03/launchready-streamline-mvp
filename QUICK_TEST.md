# Quick Testing Reference

## Start Testing (5 minutes)

### 1. Start Server
```bash
npm run dev
```
Expected: Server starts on http://localhost:5000

### 2. Test Presets (30 seconds)
```bash
npx tsx scripts/test-ugc-prompts.ts
```
Expected: "🎉 All Tests Passed!"

### 3. Access App
1. Open http://localhost:5000
2. Sign in
3. Click "UGC Ad Studio"
4. Verify form has:
   - 5 fields (Product Image, Name, Features, Customer, Setting)
   - 3 mode cards (Mode A/B/C)

### 4. Quick Generation Test (Mode B - Fastest)
Fill form:
- **Product Name**: Test Product
- **Features**: Amazing quality with great features and benefits
- **Customer**: Fitness Enthusiast (20s-30s)
- **Setting**: Modern Gym
- **Mode**: Mode B: Fast

Click "Generate UGC Ad Video"

Expected:
- Toast: "UGC Ad generation started! ~1-2 min"
- Gallery shows "Creating Ad..." card
- Server logs show polling
- Video ready in ~1-2 minutes

---

## What Each Mode Does

| Mode | How It Works | Time | Cost | Use When |
|------|-------------|------|------|----------|
| **Mode A** (Premium) | Image → Analysis → Video | ~2-3 min | $$$ | Best quality, visual consistency matters |
| **Mode B** (Fast) | Direct video generation | ~1-2 min | $$ | Need speed, good quality acceptable |
| **Mode C** (Budget) | Sora 2 video | ~1-2 min | $ | Testing, lower budget (may not work yet) |

---

## Quick Troubleshooting

### Build Fails
```bash
rm -rf dist/ node_modules/
npm install
npm run build
```

### Server Won't Start
Check .env has:
- `DATABASE_URL`
- `KIE_API_KEY`
- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Generation Fails
1. Check server logs for error
2. Verify API keys are valid
3. Try Mode B (simplest workflow)

### Video Not Showing
1. Open browser console
2. Check for `resultUrl` in asset object
3. Verify `status === 'ready'`

---

## Server Log Cheat Sheet

### Mode B Logs (Good)
```
[AI UGC Preset] Starting veo3-only direct generation
[Media Generation] Starting background processing
[Veo3 Polling] Attempt 1/60
[Veo3 ✅] Video saved successfully
```

### Mode A Logs (Good)
```
[UGC Chain] Step 1: Starting NanoBanana image generation
[UGC Chain] Step 2 complete: NanoBanana image ready
[UGC Chain] Step 3: Analyzing image with OpenAI Vision
[OpenAI Vision] Image analyzed successfully
[UGC Chain] Step 4: Starting Veo3 video generation
[UGC Chain] 🎉 Chain workflow complete
```

### Error Logs (Bad)
```
❌ TIMEOUT after X minutes
KIE API Error: Invalid API key
OpenAI Vision API Error (401)
```

---

## Full Documentation

- **Detailed Guide**: `TESTING_GUIDE_PHASE_1-5.md`
- **Summary**: `TESTING_SUMMARY.md`
- **This File**: Quick reference only
