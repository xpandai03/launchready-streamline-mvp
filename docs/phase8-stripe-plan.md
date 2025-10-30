# Phase 8: Stripe Subscription Billing - Execution Plan

**Last Updated:** 2025-10-28
**Status:** Ready for Implementation
**Total Estimated Time:** 12-15 hours

---

## Executive Summary

This plan breaks down the Phase 8 Stripe implementation into **6 execution phases**, each atomic and testable. The phases are ordered to minimize risk and enable incremental verification.

**Key Context:**
- ✅ Live Stripe keys already configured on Render
- ✅ Database schema has `subscriptionStatus`, `stripeCustomerId`, `subscriptionEndsAt`
- ✅ Late.dev integration fully functional (no changes needed)
- ✅ Supabase Auth and RLS policies active
- ✅ Webhook endpoint URL configured: `https://launchready-streamline-mvp.onrender.com/api/stripe/webhook`

**Execution Strategy:**
1. Backend infrastructure first (enables testing with Stripe CLI)
2. Frontend billing pages (enables user checkout flow)
3. Settings integration (enables subscription management)
4. End-to-end testing and production validation

---

## Phase 1: Backend Infrastructure & Stripe Service

**Goal:** Establish Stripe SDK integration, database migration, and core service layer

**Duration:** 2.5 hours

### Key Files to Create

1. **`server/services/stripe.ts`** (new)
   - Stripe SDK initialization
   - `createCheckoutSession()`
   - `createCustomer()`
   - `getActiveSubscriptions()`
   - `createPortalSession()`
   - `verifyWebhookSignature()`

2. **`db/migrations/0004_stripe_events.sql`** (new)
   - Create `stripe_events` table for webhook idempotency
   - Create index on `event_id`

3. **`package.json`** (modify)
   - Add `stripe` dependency

### Implementation Steps

#### Step 1.1: Install Stripe Package
```bash
cd /Users/raunekpratap/Desktop/Streamline-replit-copy
npm install stripe
```

#### Step 1.2: Create Database Migration
File: `db/migrations/0004_stripe_events.sql`
```sql
-- Idempotency table for Stripe webhook events
CREATE TABLE IF NOT EXISTS stripe_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMP NOT NULL DEFAULT now(),
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stripe_events_event_id ON stripe_events(event_id);

COMMENT ON TABLE stripe_events IS 'Tracks processed Stripe webhook events for idempotency';
COMMENT ON COLUMN stripe_events.event_id IS 'Stripe event ID (evt_...)';
```

#### Step 1.3: Run Migration
```bash
# Apply migration to Supabase
psql $DATABASE_URL -f db/migrations/0004_stripe_events.sql
```

#### Step 1.4: Update Drizzle Schema
File: `shared/schema.ts` (add after users table)
```typescript
export const stripeEvents = pgTable("stripe_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: text("event_id").notNull().unique(),
  eventType: text("event_type").notNull(),
  processedAt: timestamp("processed_at").notNull().default(sql`now()`),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});
```

#### Step 1.5: Create Stripe Service
File: `server/services/stripe.ts`
- Copy complete implementation from `phase8-stripe-implementation.md` Section 3, Step 1
- Initialize Stripe SDK with `process.env.STRIPE_SECRET_KEY`
- Implement all methods with comprehensive error handling and logging

### Verification

**Test 1: Service Initialization**
```bash
# Check server logs for Stripe initialization
grep "Stripe" logs/server.log
# Should NOT show "STRIPE_SECRET_KEY not configured" warning
```

**Test 2: Database Migration**
```bash
# Verify table exists
psql $DATABASE_URL -c "SELECT * FROM stripe_events LIMIT 1;"
# Should return 0 rows (empty table)
```

**Test 3: Type Safety**
```bash
npm run build
# Should compile without errors
```

**Success Criteria:**
- ✅ `stripe` package installed
- ✅ `stripe_events` table exists in Supabase
- ✅ `server/services/stripe.ts` compiles without errors
- ✅ No "STRIPE_SECRET_KEY not configured" warnings in logs

---

## Phase 2: Checkout & Webhook Endpoints

**Goal:** Implement backend API endpoints for checkout session creation and webhook handling

**Duration:** 3 hours

### Key Files to Modify

1. **`server/routes.ts`**
   - Add POST `/api/stripe/create-checkout-session`
   - Add POST `/api/stripe/webhook` (raw body handler)
   - Add POST `/api/stripe/create-portal-session`
   - Add webhook event handlers:
     - `handleCheckoutCompleted()`
     - `handleSubscriptionUpdated()`
     - `handleSubscriptionDeleted()`
     - `handlePaymentFailed()`

2. **`server/storage.ts`** (verify updateUser exists)
   - Already implemented in Phase 7 (Bug #5 fix)

### Implementation Steps

#### Step 2.1: Add Checkout Session Endpoint
File: `server/routes.ts` (add before webhook endpoint)
```typescript
// POST /api/stripe/create-checkout-session
app.post('/api/stripe/create-checkout-session', async (req, res) => {
  // Copy implementation from phase8-stripe-implementation.md Section 3, Step 2
});
```

**Key Logic:**
- Verify user authenticated (`req.userId`)
- Check if user already has Pro subscription
- Auto-detect frontend URL from `req.headers.origin`
- Create Stripe Checkout Session
- Return session URL

#### Step 2.2: Add Webhook Endpoint (BEFORE express.json() middleware)
File: `server/routes.ts` (add EARLY in file, before JSON parsing)

**CRITICAL:** Webhook needs raw body for signature verification

```typescript
// POST /api/stripe/webhook
// MUST be before express.json() middleware
app.post('/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    // Copy implementation from phase8-stripe-implementation.md Section 3, Step 3
  }
);
```

#### Step 2.3: Add Webhook Event Handlers
File: `server/routes.ts` (add helper functions)
```typescript
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) { ... }
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) { ... }
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) { ... }
async function handlePaymentFailed(invoice: Stripe.Invoice) { ... }
```

#### Step 2.4: Add Customer Portal Endpoint
File: `server/routes.ts`
```typescript
// POST /api/stripe/create-portal-session
app.post('/api/stripe/create-portal-session', async (req, res) => {
  // Copy implementation from phase8-stripe-implementation.md Section 3, Step 4
});
```

#### Step 2.5: Import Required Types
File: `server/routes.ts` (add at top)
```typescript
import { stripeService } from './services/stripe';
import { stripeEvents } from '@db/schema';
import Stripe from 'stripe';
```

### Verification

**Test 1: Checkout Session Creation (Manual API Call)**
```bash
# Get auth token from browser localStorage or Supabase session
TOKEN="your-jwt-token"

curl -X POST http://localhost:5000/api/stripe/create-checkout-session \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Expected: 200 OK with { success: true, sessionId: "cs_...", url: "https://checkout.stripe.com/..." }
```

**Test 2: Webhook Signature Verification**
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:5000/api/stripe/webhook

# In another terminal, trigger test event
stripe trigger checkout.session.completed

# Check server logs for:
# [Stripe Webhook] Received event: { eventId: 'evt_...', eventType: 'checkout.session.completed' }
# [Stripe Webhook] Checkout completed: { userId: '...', customerId: 'cus_...' }
# [Stripe Webhook] User upgraded to Pro: ...
# [Stripe Webhook] Event processed successfully: evt_...
```

**Test 3: Idempotency (Duplicate Event)**
```bash
# Send same event twice
stripe trigger checkout.session.completed

# Second webhook should return:
# [Stripe Webhook] Event already processed: evt_...
# { received: true, status: 'already_processed' }
```

**Test 4: Portal Session Creation**
```bash
curl -X POST http://localhost:5000/api/stripe/create-portal-session \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Expected: 200 OK with { success: true, url: "https://billing.stripe.com/..." }
# OR 400 if user has no Stripe customer ID yet
```

**Success Criteria:**
- ✅ Checkout session endpoint returns valid Stripe URL
- ✅ Webhook endpoint verifies signature correctly
- ✅ Test webhook updates user subscriptionStatus to "pro"
- ✅ Duplicate webhooks return "already_processed"
- ✅ Portal session endpoint returns valid URL for existing customers

---

## Phase 3: Usage Limits Bypass for Pro Users

**Goal:** Modify usage limit logic to grant unlimited access to Pro subscribers

**Duration:** 1 hour

### Key Files to Modify

1. **`server/services/usageLimits.ts`**
   - Modify `canProcessVideo()` to check subscriptionStatus
   - Modify `canCreatePost()` to check subscriptionStatus

### Implementation Steps

#### Step 3.1: Import Storage
File: `server/services/usageLimits.ts` (add at top)
```typescript
import type { IStorage } from '../storage';

// Inject storage dependency (if not already available)
let storage: IStorage;

export function setUsageLimitsStorage(storageInstance: IStorage) {
  storage = storageInstance;
}
```

#### Step 3.2: Modify canProcessVideo()
File: `server/services/usageLimits.ts`
```typescript
export async function canProcessVideo(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
  limit?: number;
  current?: number;
}> {
  // Get user to check subscription status
  const user = await storage.getUser(userId);

  if (!user) {
    return { allowed: false, reason: 'User not found' };
  }

  // Pro users have unlimited video processing
  if (user.subscriptionStatus === 'pro') {
    console.log('[Usage Limits] Pro user - unlimited video processing:', userId);
    return { allowed: true };
  }

  // Existing free tier logic...
  // Copy from phase8-stripe-implementation.md Section 3, Step 5
}
```

#### Step 3.3: Modify canCreatePost()
File: `server/services/usageLimits.ts`
```typescript
export async function canCreatePost(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
  limit?: number;
  current?: number;
}> {
  // Get user to check subscription status
  const user = await storage.getUser(userId);

  if (!user) {
    return { allowed: false, reason: 'User not found' };
  }

  // Pro users have unlimited posting
  if (user.subscriptionStatus === 'pro') {
    console.log('[Usage Limits] Pro user - unlimited posting:', userId);
    return { allowed: true };
  }

  // Existing free tier logic...
  // Copy from phase8-stripe-implementation.md Section 3, Step 5
}
```

### Verification

**Test 1: Free User Limits (Unchanged)**
```bash
# As free user (subscriptionStatus = 'free')
# Process 3 videos
# Expected: All succeed

# Try 4th video
# Expected: Error "Free tier limit reached... Upgrade to Pro for unlimited processing."
```

**Test 2: Pro User Unlimited Access**
```bash
# Manually upgrade test user to Pro
psql $DATABASE_URL -c "UPDATE users SET subscription_status = 'pro' WHERE email = 'test@example.com';"

# As Pro user
# Process 10 videos
# Expected: All succeed

# Check logs
# Expected: "[Usage Limits] Pro user - unlimited video processing: <userId>"
```

**Test 3: Error Messages Include Upgrade Prompt**
```bash
# As free user, hit limit
# Expected error message: "Free tier limit reached. You've processed 3 videos this month. Upgrade to Pro for unlimited processing."
```

**Success Criteria:**
- ✅ Free users still limited to 3 videos/3 posts per month
- ✅ Pro users can process unlimited videos and posts
- ✅ Error messages encourage upgrade
- ✅ Logs show when Pro bypass is triggered

---

## Phase 4: Frontend Billing Pages

**Goal:** Create user-facing pages for pricing, checkout success/cancel, and upgrade flow

**Duration:** 3 hours

### Key Files to Create

1. **`client/src/pages/PricingPage.tsx`** (new)
2. **`client/src/pages/billing/SuccessPage.tsx`** (new)
3. **`client/src/pages/billing/CancelPage.tsx`** (new)
4. **`client/src/App.tsx`** (modify - add routes)
5. **`client/.env`** (modify - add Stripe publishable key)

### Implementation Steps

#### Step 4.1: Add Stripe Publishable Key to Frontend
File: `client/.env`
```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_... # or pk_test_... for development
```

#### Step 4.2: Create Pricing Page
File: `client/src/pages/PricingPage.tsx`
- Copy complete implementation from `phase8-stripe-implementation.md` Section 4, Step 1
- Features:
  - Free tier card (3 videos, 3 posts)
  - Pro tier card ($29/month, unlimited)
  - "Upgrade to Pro" button calls `/api/stripe/create-checkout-session`
  - FAQ section

**Key Logic:**
- If not logged in, redirect to `/login`
- On upgrade click, fetch checkout session
- Redirect to `data.url` (Stripe Checkout)

#### Step 4.3: Create Success Page
File: `client/src/pages/billing/SuccessPage.tsx`
- Copy complete implementation from `phase8-stripe-implementation.md` Section 4, Step 2
- Features:
  - Success checkmark icon
  - "Payment Successful!" message
  - List of Pro benefits
  - Auto-redirect to home after 5 seconds
  - Manual "Go to Home" and "View Billing" buttons

#### Step 4.4: Create Cancel Page
File: `client/src/pages/billing/CancelPage.tsx`
- Copy complete implementation from `phase8-stripe-implementation.md` Section 4, Step 3
- Features:
  - Cancel icon
  - "Payment Cancelled" message
  - "Try Again" button → `/pricing`
  - "Go to Home" button

#### Step 4.5: Add Routes
File: `client/src/App.tsx`
```typescript
import PricingPage from './pages/PricingPage';
import BillingSuccessPage from './pages/billing/SuccessPage';
import BillingCancelPage from './pages/billing/CancelPage';

// In routes section:
<Route path="/pricing" component={PricingPage} />
<Route path="/billing/success" component={BillingSuccessPage} />
<Route path="/billing/cancel" component={BillingCancelPage} />
```

#### Step 4.6: Add Pricing Link to Navigation
File: `client/src/components/Navigation.tsx` or similar
```typescript
<Link href="/pricing">Pricing</Link>
```

### Verification

**Test 1: Pricing Page Loads**
```bash
# Navigate to http://localhost:5000/pricing
# Expected: See Free and Pro tier cards, FAQ section
# Check console for errors (should be none)
```

**Test 2: Checkout Flow (Test Mode)**
```bash
# Click "Upgrade to Pro" on pricing page
# Expected: Redirected to Stripe Checkout page
# Fill test card: 4242 4242 4242 4242
# Expected: Redirected to /billing/success
# Check database: subscription_status should be 'pro'
```

**Test 3: Cancel Flow**
```bash
# Click "Upgrade to Pro"
# On Stripe Checkout, click back button or close tab
# Navigate to /billing/cancel manually
# Expected: See cancel message, "Try Again" button works
```

**Test 4: Unauthenticated Access**
```bash
# Log out
# Navigate to /pricing
# Click "Upgrade to Pro"
# Expected: Redirected to /login
```

**Success Criteria:**
- ✅ Pricing page displays correctly
- ✅ Checkout session created successfully
- ✅ Stripe Checkout page loads
- ✅ Test payment redirects to success page
- ✅ Cancel flow works as expected
- ✅ Unauthenticated users redirected to login

---

## Phase 5: Settings & Customer Portal Integration

**Goal:** Enable subscription management in settings and add upgrade prompts when limits are hit

**Duration:** 2.5 hours

### Key Files to Create/Modify

1. **`client/src/pages/settings/BillingSettingsPage.tsx`** (new)
2. **`client/src/components/LimitReachedDialog.tsx`** (new)
3. **`client/src/App.tsx`** (modify - add billing settings route)
4. **`client/src/pages/VideoToShortsPage.tsx`** (modify - add limit dialog)
5. **`client/src/pages/settings/SocialAccountsPage.tsx`** (modify - add limit dialog for posting)

### Implementation Steps

#### Step 5.1: Create Billing Settings Page
File: `client/src/pages/settings/BillingSettingsPage.tsx`
- Copy complete implementation from `phase8-stripe-implementation.md` Section 4, Step 4
- Features:
  - Display current plan (Free or Pro)
  - Show subscription renewal date for Pro users
  - "Upgrade to Pro" button for Free users
  - "Manage Subscription" button for Pro users (opens Stripe Portal)

**Key Logic:**
- Get user from `useAuth()`
- Check `user.subscriptionStatus === 'pro'`
- "Manage Subscription" calls `/api/stripe/create-portal-session`
- Redirect to portal URL

#### Step 5.2: Create Limit Reached Dialog
File: `client/src/components/LimitReachedDialog.tsx`
- Copy complete implementation from `phase8-stripe-implementation.md` Section 4, Step 5
- Features:
  - AlertDialog component
  - Shows current/limit usage
  - Lists Pro benefits
  - "Upgrade to Pro" button → `/pricing`
  - "Maybe Later" button

#### Step 5.3: Add Billing Settings Route
File: `client/src/App.tsx`
```typescript
import BillingSettingsPage from './pages/settings/BillingSettingsPage';

<Route path="/settings/billing" component={BillingSettingsPage} />
```

#### Step 5.4: Add Billing Link to Settings Navigation
File: Settings navigation component
```typescript
<Link href="/settings/billing">Billing</Link>
```

#### Step 5.5: Integrate Limit Dialog into Video Processing
File: `client/src/pages/VideoToShortsPage.tsx`
```typescript
import { LimitReachedDialog } from '@/components/LimitReachedDialog';

const [showLimitDialog, setShowLimitDialog] = useState(false);
const [limitInfo, setLimitInfo] = useState({ current: 0, limit: 0 });

// In video processing handler:
const response = await fetch('/api/video/process', { ... });

if (!response.ok) {
  const error = await response.json();

  if (error.error?.includes('limit reached')) {
    // Parse limit info from error message or fetch separately
    setLimitInfo({ current: 3, limit: 3 });
    setShowLimitDialog(true);
    return;
  }
}

// In render:
<LimitReachedDialog
  open={showLimitDialog}
  onOpenChange={setShowLimitDialog}
  limitType="video"
  current={limitInfo.current}
  limit={limitInfo.limit}
/>
```

#### Step 5.6: Integrate Limit Dialog into Social Posting
File: `client/src/pages/settings/SocialAccountsPage.tsx` or posting page
```typescript
// Similar integration as Step 5.5, but limitType="post"
```

### Verification

**Test 1: Billing Settings - Free User**
```bash
# Navigate to /settings/billing as free user
# Expected: See "Free" plan, "Upgrade to Pro" button
# Click "Upgrade to Pro"
# Expected: Redirected to /pricing
```

**Test 2: Billing Settings - Pro User**
```bash
# Navigate to /settings/billing as Pro user
# Expected: See "Pro" plan, renewal date, "Manage Subscription" button
# Click "Manage Subscription"
# Expected: Redirected to Stripe Customer Portal
```

**Test 3: Stripe Customer Portal**
```bash
# As Pro user, open Customer Portal
# Expected: Can view subscription, invoices, update payment method, cancel subscription
# Click "Cancel Subscription"
# Expected: Webhook fires, user downgraded to 'free' in database
```

**Test 4: Limit Dialog - Video Processing**
```bash
# As free user, process 3 videos
# Try 4th video
# Expected: LimitReachedDialog appears
# Shows "You've reached your free tier limit of 3 videos per month"
# Click "Upgrade to Pro"
# Expected: Redirected to /pricing
```

**Test 5: Limit Dialog - Social Posting**
```bash
# As free user, create 3 posts
# Try 4th post
# Expected: LimitReachedDialog appears with posting message
```

**Success Criteria:**
- ✅ Billing settings page shows correct plan
- ✅ Pro users can open Customer Portal
- ✅ Portal allows subscription management
- ✅ Cancellation webhook downgrades user
- ✅ Limit dialogs appear when limits reached
- ✅ Upgrade prompts redirect to pricing page

---

## Phase 6: End-to-End Testing & Production Deployment

**Goal:** Comprehensive testing of all flows and production webhook validation

**Duration:** 3 hours

### Testing Checklist

#### Test 6.1: Complete Checkout Flow (Production Test Card)
**Scenario:** New user signs up and upgrades to Pro

1. Create new account via `/register`
2. Navigate to `/pricing`
3. Click "Upgrade to Pro"
4. Complete checkout with test card `4242 4242 4242 4242`
5. Verify redirect to `/billing/success`
6. Check database: `subscription_status = 'pro'`
7. Check Stripe Dashboard: Payment appears
8. Process 10 videos → all succeed (unlimited)

**Expected Duration:** 5 minutes
**Pass Criteria:** All steps complete without errors

---

#### Test 6.2: Webhook Event Processing
**Scenario:** Test all webhook event types

**Setup:**
```bash
# Use Stripe CLI to trigger events
stripe listen --forward-to https://launchready-streamline-mvp.onrender.com/api/stripe/webhook
```

**Test Events:**

1. **checkout.session.completed**
   ```bash
   stripe trigger checkout.session.completed
   ```
   - Check logs: User upgraded to Pro
   - Check database: `subscription_status = 'pro'`, `stripe_customer_id` set

2. **customer.subscription.updated**
   ```bash
   stripe trigger customer.subscription.updated
   ```
   - Check logs: Subscription updated
   - Check database: `subscription_ends_at` updated

3. **customer.subscription.deleted**
   ```bash
   stripe trigger customer.subscription.deleted
   ```
   - Check logs: User downgraded
   - Check database: `subscription_status = 'free'`

4. **invoice.payment_failed**
   ```bash
   stripe trigger invoice.payment_failed
   ```
   - Check logs: User marked as `past_due`

**Pass Criteria:** All events processed correctly, database updated, no errors in logs

---

#### Test 6.3: Idempotency & Security
**Scenario:** Prevent duplicate processing and unauthorized webhooks

1. **Duplicate Event Test**
   - Trigger same event twice via Stripe CLI
   - Expected: Second event returns `already_processed`
   - Database: User NOT upgraded twice

2. **Invalid Signature Test**
   ```bash
   curl -X POST https://launchready-streamline-mvp.onrender.com/api/stripe/webhook \
     -H "Content-Type: application/json" \
     -d '{"type": "checkout.session.completed"}'
   ```
   - Expected: 400 error "Missing stripe-signature header"

3. **Wrong Signature Test**
   ```bash
   curl -X POST https://launchready-streamline-mvp.onrender.com/api/stripe/webhook \
     -H "Stripe-Signature: fake-signature" \
     -d '{"type": "checkout.session.completed"}'
   ```
   - Expected: 400 error "Webhook signature verification failed"

**Pass Criteria:** All security checks pass, no unauthorized access

---

#### Test 6.4: Subscription Management
**Scenario:** Pro user manages subscription via Customer Portal

1. Upgrade to Pro via `/pricing`
2. Navigate to `/settings/billing`
3. Click "Manage Subscription"
4. In Stripe Portal:
   - View invoices → check past payments
   - Update payment method → change card
   - Cancel subscription → confirm cancellation
5. Verify webhook fires: `customer.subscription.deleted`
6. Check database: `subscription_status = 'free'`
7. Verify access: Usage limits re-applied

**Pass Criteria:** All portal actions work, webhooks fire correctly, limits restored

---

#### Test 6.5: Edge Cases & Error Handling

1. **Checkout Session for Already-Pro User**
   - As Pro user, visit `/pricing`
   - Click "Upgrade to Pro"
   - Expected: 400 error "You already have an active Pro subscription"

2. **Portal Without Stripe Customer**
   - As free user (no `stripe_customer_id`), visit `/settings/billing`
   - Click "Manage Subscription" (if visible)
   - Expected: 400 error "No Stripe customer found"

3. **Canceled Checkout (User Closes Tab)**
   - Start checkout, close tab before payment
   - Expected: No database changes, no webhook fired

4. **Payment Declined**
   - Use test card `4000 0000 0000 0002` (decline)
   - Expected: Stripe shows error, no webhook, user remains free

5. **Webhook with Missing User ID**
   - Manually trigger event without `client_reference_id`
   - Expected: Log error "Missing client_reference_id", skip processing, return 200

**Pass Criteria:** All errors handled gracefully, no server crashes

---

#### Test 6.6: Production Environment Validation

**Pre-Deployment Checklist:**
```bash
# Verify all environment variables set on Render
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_... (production webhook secret)
STRIPE_PRICE_ID_PRO=price_... (production price ID)

# Frontend
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

**Production Webhook Setup:**
1. Stripe Dashboard → Developers → Webhooks
2. Verify endpoint URL: `https://launchready-streamline-mvp.onrender.com/api/stripe/webhook`
3. Verify events enabled:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy signing secret to Render env vars

**Production Test:**
1. Make real test payment ($29) via production Stripe Checkout
2. Monitor Render logs for webhook processing
3. Verify database updated
4. Cancel subscription via portal
5. Verify downgrade webhook processed

**Pass Criteria:** Production webhooks working, no errors in logs

---

### Deployment Steps

#### Step 6.1: Deploy Backend
```bash
git add .
git commit -m "Implement Phase 8: Stripe subscription billing

- Add Stripe service with checkout, portal, webhook handling
- Create stripe_events table for idempotency
- Modify usage limits to bypass for Pro users
- Add /api/stripe/create-checkout-session endpoint
- Add /api/stripe/webhook endpoint with event handlers
- Add /api/stripe/create-portal-session endpoint

Testing:
- All webhook events processed correctly
- Idempotency prevents duplicate processing
- Pro users have unlimited access
- Signature verification prevents unauthorized access"

git push origin main
```

#### Step 6.2: Verify Render Build
```bash
# Check Render dashboard for successful build
# Monitor deploy logs for errors
# Wait for "Your service is live 🎉"
```

#### Step 6.3: Run Smoke Tests on Production
```bash
# Test 1: Create checkout session
curl -X POST https://launchready-streamline-mvp.onrender.com/api/stripe/create-checkout-session \
  -H "Authorization: Bearer $PROD_TOKEN" \
  -H "Content-Type: application/json"

# Expected: 200 OK with Stripe Checkout URL

# Test 2: Trigger production webhook (Stripe CLI)
stripe trigger checkout.session.completed --stripe-account acct_...

# Check Render logs for successful processing
```

#### Step 6.4: Monitor Production
**Monitor for 24-48 hours:**
- Render logs for webhook errors
- Stripe Dashboard for successful payments
- Database for correct subscription_status updates
- User reports for any issues

**Metrics to Track:**
- Conversion rate (checkout sessions → payments)
- Failed webhooks (should be 0%)
- Payment failures
- User feedback

---

### Success Criteria (Phase 6)

- ✅ All 6 test scenarios pass
- ✅ Production webhooks processing correctly
- ✅ No errors in Render logs
- ✅ Test payment completes successfully
- ✅ Subscription management works in portal
- ✅ Usage limits correctly applied/bypassed
- ✅ Idempotency prevents duplicates
- ✅ Security: Invalid signatures rejected

---

## Rollback Plan (If Critical Issues Found)

### Quick Disable (Feature Flag)

**Step 1: Disable Frontend Checkout**
```bash
# Render: Set environment variable
VITE_STRIPE_ENABLED=false
```

**Step 2: Disable Webhook Processing**
```bash
# Render: Set environment variable
STRIPE_WEBHOOKS_ENABLED=false
```

**Step 3: Disable Stripe Dashboard Webhook**
- Go to Stripe Dashboard → Developers → Webhooks
- Click production webhook
- Click "Disable endpoint"

### Database Rollback
```sql
-- If needed, downgrade incorrectly upgraded users
UPDATE users
SET subscription_status = 'free', subscription_ends_at = NULL
WHERE subscription_status = 'pro'
  AND stripe_customer_id IS NULL;
```

### Re-enable After Fix
1. Fix code issue
2. Deploy fix
3. Re-enable `VITE_STRIPE_ENABLED=true`
4. Re-enable `STRIPE_WEBHOOKS_ENABLED=true`
5. Re-enable Stripe webhook endpoint
6. Monitor closely

---

## Summary

**Total Phases:** 6
**Total Duration:** 12-15 hours
**Critical Path:** Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6

**Key Dependencies:**
- Phase 2 requires Phase 1 (Stripe service)
- Phase 3 requires Phase 2 (webhooks update subscriptionStatus)
- Phase 4 requires Phase 2 (checkout endpoint)
- Phase 5 requires Phase 4 (billing pages)
- Phase 6 requires all previous phases

**Recommended Execution:**
1. Execute Phases 1-3 together (backend complete)
2. Execute Phases 4-5 together (frontend complete)
3. Execute Phase 6 (testing & deployment)

**Next Step:**
Request implementation of specific phase(s). Example:
```
"Please implement Phase 1: Backend Infrastructure & Stripe Service"
```

Or execute multiple phases:
```
"Please implement Phases 1-3 (complete backend)"
```
