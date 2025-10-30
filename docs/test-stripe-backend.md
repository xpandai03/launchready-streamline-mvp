# Stripe Backend Testing Guide

**Date:** 2025-10-28
**Phases Completed:** 1-3 (Backend Infrastructure)

## Prerequisites
- Server running (npm run dev)
- Database migration applied
- Stripe package installed

---

## Test 1: Verify Database Table

**Purpose:** Confirm stripe_events table exists

```bash
# Check if table exists
source .env && psql "$DATABASE_URL" -c "\d stripe_events"
```

**Expected Output:**
```
                    Table "public.stripe_events"
    Column     |            Type             | Nullable |      Default
---------------+-----------------------------+----------+--------------------
 id            | uuid                        | not null | gen_random_uuid()
 event_id      | text                        | not null |
 event_type    | text                        | not null |
 processed_at  | timestamp without time zone | not null | now()
 created_at    | timestamp without time zone | not null | now()
```

✅ **Pass:** Table structure matches above
❌ **Fail:** Table doesn't exist → Re-run migration

---

## Test 2: Verify Stripe Service Initialization

**Purpose:** Check if Stripe service loads without errors

```bash
# Check server logs for Stripe warnings
npm run dev 2>&1 | grep -i stripe
```

**Expected Output (if Stripe keys NOT configured):**
```
[Stripe] Warning: STRIPE_SECRET_KEY not configured
[Stripe] Warning: STRIPE_PRICE_ID_PRO not configured
```

**Expected Output (if Stripe keys ARE configured):**
```
(No warnings - Stripe initialized successfully)
```

✅ **Pass:** Either warning OR no output (both are valid)
❌ **Fail:** Server crashes or import errors

---

## Test 3: Test Checkout Endpoint (Without Auth)

**Purpose:** Verify endpoint exists and auth middleware works

```bash
# Try to create checkout session without authentication
curl -X POST http://localhost:5000/api/stripe/create-checkout-session \
  -H "Content-Type: application/json"
```

**Expected Output:**
```json
{
  "error": "No authorization header"
}
```

✅ **Pass:** Returns 401 Unauthorized
❌ **Fail:** 404 Not Found or server error

---

## Test 4: Test Webhook Endpoint (Missing Signature)

**Purpose:** Verify webhook signature verification

```bash
# Try webhook without signature
curl -X POST http://localhost:5000/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -d '{"type":"test"}'
```

**Expected Output:**
```json
{
  "error": "Missing stripe-signature header"
}
```

✅ **Pass:** Returns 400 Bad Request with signature error
❌ **Fail:** Different error or 200 OK

---

## Test 5: Test Portal Endpoint (Without Auth)

**Purpose:** Verify portal endpoint exists

```bash
# Try to create portal session without authentication
curl -X POST http://localhost:5000/api/stripe/create-portal-session \
  -H "Content-Type: application/json"
```

**Expected Output:**
```json
{
  "error": "No authorization header"
}
```

✅ **Pass:** Returns 401 Unauthorized
❌ **Fail:** 404 Not Found or server error

---

## Test 6: Verify Build Success

**Purpose:** Ensure TypeScript compiles without errors

```bash
npm run build
```

**Expected Output:**
```
✓ built in X.XXs
⚡ Done in XXms
```

✅ **Pass:** Build completes successfully
❌ **Fail:** TypeScript errors or build failures

---

## Test 7: Check Server Routes

**Purpose:** Verify all 3 Stripe endpoints are registered

```bash
# Server must be running
# Check logs for route registration or test each endpoint
curl -I http://localhost:5000/api/stripe/create-checkout-session 2>&1 | head -1
curl -I http://localhost:5000/api/stripe/webhook 2>&1 | head -1
curl -I http://localhost:5000/api/stripe/create-portal-session 2>&1 | head -1
```

**Expected Output (for each):**
```
HTTP/1.1 401 Unauthorized    # (checkout and portal - need auth)
HTTP/1.1 400 Bad Request     # (webhook - needs signature)
```

✅ **Pass:** All 3 return expected status codes
❌ **Fail:** Any return 404 Not Found

---

## Summary Checklist

Run through all tests and check off:

- [ ] Test 1: stripe_events table exists ✅
- [ ] Test 2: Stripe service loads (with or without warnings) ✅
- [ ] Test 3: Checkout endpoint returns 401 ✅
- [ ] Test 4: Webhook endpoint validates signature ✅
- [ ] Test 5: Portal endpoint returns 401 ✅
- [ ] Test 6: Build completes successfully ✅
- [ ] Test 7: All endpoints respond correctly ✅

**All tests passing?** ✅ Backend is working correctly!

**Some tests failing?** ❌ Review error messages and check:
- Database migration ran successfully
- Server restarted after code changes
- No TypeScript compilation errors
- .env file has DATABASE_URL set

---

## Optional: Test with Stripe CLI (If Keys Configured)

If you have Stripe keys set up, you can test webhooks:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:5000/api/stripe/webhook

# In another terminal, trigger test event
stripe trigger checkout.session.completed
```

**Expected in server logs:**
```
[Stripe Webhook] Received event: { eventId: 'evt_...', eventType: 'checkout.session.completed' }
[Stripe Webhook] Checkout completed: ...
[Stripe Webhook] User upgraded to Pro: ...
```

---

## Troubleshooting

**Issue:** Table doesn't exist
**Fix:** Run migration: `source .env && psql "$DATABASE_URL" -f db/migrations/0004_stripe_events.sql`

**Issue:** Endpoint returns 404
**Fix:** Restart server: `npm run dev`

**Issue:** Build fails
**Fix:** Check for TypeScript errors in terminal output

**Issue:** Server won't start
**Fix:** Check for port conflicts, verify DATABASE_URL in .env
