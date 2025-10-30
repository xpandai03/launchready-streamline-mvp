# Phase 8: Stripe Subscription Billing Implementation

## Table of Contents
1. [Overview & Goals](#overview--goals)
2. [Dependencies](#dependencies)
3. [Backend Implementation Plan](#backend-implementation-plan)
4. [Frontend Implementation Plan](#frontend-implementation-plan)
5. [Webhook & Testing Strategy](#webhook--testing-strategy)
6. [Environment Variable Setup](#environment-variable-setup)
7. [Timeline & Estimates](#timeline--estimates)
8. [Rollback Strategy](#rollback-strategy)

---

## Overview & Goals

### What This Phase Solves

Phase 8 introduces **Stripe-powered subscription billing** to monetize the Streamline platform. Currently, all users are limited to 3 videos/month and 3 posts/month regardless of their needs. This phase enables:

- **Revenue generation** through subscription payments
- **Tiered pricing model** (Free, Pro)
- **Self-service subscription management** (upgrade, cancel, renewal)
- **Usage limit differentiation** between free and paid users

### Business Model

**Free Tier:**
- 3 videos processed per month
- 3 social media posts per month
- Access to all platforms (Instagram, TikTok, YouTube)
- No credit card required

**Pro Tier ($29/month):**
- **Unlimited** video processing
- **Unlimited** social media posting
- Priority processing (future enhancement)
- Early access to new features (future enhancement)

### Technical Architecture

```
User Journey:
1. User clicks "Upgrade to Pro" on Pricing page or Settings
2. Backend creates Stripe Checkout Session with success/cancel URLs
3. User redirected to Stripe-hosted payment page
4. User completes payment with credit card
5. Stripe redirects back to /billing/success
6. Stripe webhook fires → backend updates user.subscriptionStatus to "pro"
7. User now bypasses usage limits (unlimited processing/posting)

Subscription Management:
- Stripe auto-renews monthly subscriptions
- Webhooks update database on renewal, cancellation, or payment failure
- Users can cancel anytime via Stripe Customer Portal
- Canceled subscriptions remain active until end of billing period
```

### Integration Points

This phase builds on existing infrastructure:

- **Auth System (Phase 1-3):** Uses req.userId from auth middleware
- **Usage Limits (Phase 5):** Modifies `canProcessVideo()` and `canCreatePost()` to check subscriptionStatus
- **Database Schema:** Uses existing `users.stripeCustomerId`, `users.subscriptionStatus`, `users.subscriptionEndsAt`
- **Late.dev Integration (Phase 7):** No changes needed, works with both free and pro users

---

## Dependencies

### External Services

**Stripe Account Setup:**
1. Create Stripe account at https://stripe.com
2. Complete business verification (required for live payments)
3. Enable "Customer Portal" in Stripe Dashboard → Settings → Billing
4. Create Product "Streamline Pro" with Price $29/month recurring

**Stripe API Keys:**
- **Publishable Key** (`pk_test_...` or `pk_live_...`) - safe to expose in frontend
- **Secret Key** (`sk_test_...` or `sk_live_...`) - server-side only
- **Webhook Secret** (`whsec_...`) - for signature verification

**Stripe CLI (Development):**
```bash
# Install Stripe CLI for local webhook testing
brew install stripe/stripe-cli/stripe

# Login to your Stripe account
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:5000/api/stripe/webhook
```

### npm Packages

**Backend:**
```json
{
  "stripe": "^14.0.0"
}
```

**Frontend:**
```json
{
  "@stripe/stripe-js": "^2.4.0"
}
```

Install:
```bash
npm install stripe
cd client && npm install @stripe/stripe-js
```

### Environment Variables

**Server (.env):**
```bash
STRIPE_SECRET_KEY=sk_test_... # or sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_PRO=price_... # From Stripe Dashboard
```

**Client (.env):**
```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_... # or pk_live_...
```

### Database Schema

**Current state (already exists):**
```typescript
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  stripeCustomerId: text("stripe_customer_id"), // ✅ Already exists
  subscriptionStatus: text("subscription_status").default("free"), // ✅ Already exists
  subscriptionEndsAt: timestamp("subscription_ends_at"), // ✅ Already exists
  // ... other fields
});
```

**New table for idempotency:**
```sql
CREATE TABLE stripe_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE, -- Stripe event ID (evt_...)
  event_type TEXT NOT NULL, -- e.g., "checkout.session.completed"
  processed_at TIMESTAMP NOT NULL DEFAULT now(),
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_stripe_events_event_id ON stripe_events(event_id);
```

Migration file: `db/migrations/0004_stripe_events.sql`

---

## Backend Implementation Plan

### Step 1: Create Stripe Service

**File:** `server/services/stripe.ts`

This service wraps the Stripe SDK and provides typed methods for our use cases.

```typescript
/**
 * Stripe Service
 *
 * Handles all Stripe API interactions for subscription billing
 */

import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_PRICE_ID_PRO = process.env.STRIPE_PRICE_ID_PRO;

if (!STRIPE_SECRET_KEY) {
  console.warn('[Stripe] Warning: STRIPE_SECRET_KEY not configured');
}

if (!STRIPE_PRICE_ID_PRO) {
  console.warn('[Stripe] Warning: STRIPE_PRICE_ID_PRO not configured');
}

// Initialize Stripe SDK
const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
  : null;

export interface CreateCheckoutSessionParams {
  userId: string;
  userEmail: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
}

export const stripeService = {
  /**
   * Create a Stripe Checkout Session for Pro subscription
   *
   * @param params - User ID, email, and redirect URLs
   * @returns Checkout session ID and URL
   */
  async createCheckoutSession(
    params: CreateCheckoutSessionParams
  ): Promise<CheckoutSessionResponse> {
    if (!stripe || !STRIPE_PRICE_ID_PRO) {
      throw new Error('Stripe is not configured');
    }

    console.log('[Stripe] Creating checkout session:', {
      userId: params.userId,
      email: params.userEmail,
    });

    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: STRIPE_PRICE_ID_PRO,
            quantity: 1,
          },
        ],
        customer_email: params.userEmail,
        client_reference_id: params.userId, // Link session to our user
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        allow_promotion_codes: true, // Enable promo codes
        billing_address_collection: 'required',
        subscription_data: {
          metadata: {
            userId: params.userId,
          },
        },
      });

      console.log('[Stripe] Checkout session created:', {
        sessionId: session.id,
        url: session.url,
      });

      return {
        sessionId: session.id,
        url: session.url!,
      };
    } catch (error: any) {
      console.error('[Stripe] Error creating checkout session:', error);
      throw new Error(`Stripe error: ${error.message}`);
    }
  },

  /**
   * Create or retrieve a Stripe Customer for a user
   *
   * @param email - User's email
   * @param userId - User's ID (stored in metadata)
   * @returns Stripe Customer ID
   */
  async createCustomer(email: string, userId: string): Promise<string> {
    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    console.log('[Stripe] Creating customer:', { email, userId });

    try {
      const customer = await stripe.customers.create({
        email,
        metadata: {
          userId,
        },
      });

      console.log('[Stripe] Customer created:', {
        customerId: customer.id,
        email: customer.email,
      });

      return customer.id;
    } catch (error: any) {
      console.error('[Stripe] Error creating customer:', error);
      throw new Error(`Stripe error: ${error.message}`);
    }
  },

  /**
   * Get customer's active subscriptions
   *
   * @param customerId - Stripe Customer ID
   * @returns List of active subscriptions
   */
  async getActiveSubscriptions(customerId: string): Promise<Stripe.Subscription[]> {
    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    try {
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 10,
      });

      return subscriptions.data;
    } catch (error: any) {
      console.error('[Stripe] Error fetching subscriptions:', error);
      throw new Error(`Stripe error: ${error.message}`);
    }
  },

  /**
   * Create a Stripe Customer Portal session
   *
   * Allows users to manage their subscription, update payment method, view invoices
   *
   * @param customerId - Stripe Customer ID
   * @param returnUrl - URL to return to after portal session
   * @returns Portal session URL
   */
  async createPortalSession(customerId: string, returnUrl: string): Promise<string> {
    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    console.log('[Stripe] Creating portal session:', { customerId });

    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });

      console.log('[Stripe] Portal session created:', {
        url: session.url,
      });

      return session.url;
    } catch (error: any) {
      console.error('[Stripe] Error creating portal session:', error);
      throw new Error(`Stripe error: ${error.message}`);
    }
  },

  /**
   * Verify Stripe webhook signature
   *
   * @param payload - Raw request body
   * @param signature - Stripe-Signature header
   * @returns Parsed Stripe event
   */
  verifyWebhookSignature(payload: string | Buffer, signature: string): Stripe.Event {
    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET not configured');
    }

    try {
      return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error: any) {
      console.error('[Stripe] Webhook signature verification failed:', error);
      throw new Error(`Webhook signature verification failed: ${error.message}`);
    }
  },
};
```

**Key Design Decisions:**
- All Stripe calls wrapped in try-catch with detailed logging
- Uses `client_reference_id` and `metadata.userId` to link Stripe entities to our users
- Customer Portal enables self-service subscription management
- Webhook signature verification prevents malicious requests

---

### Step 2: Create Checkout Endpoint

**File:** `server/routes.ts` (add new endpoint)

```typescript
// POST /api/stripe/create-checkout-session
app.post('/api/stripe/create-checkout-session', async (req, res) => {
  try {
    const userId = req.userId; // From auth middleware
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    console.log('[Stripe Checkout] Creating session for user:', userId);

    // Get user from database
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user already has Pro subscription
    if (user.subscriptionStatus === 'pro') {
      console.log('[Stripe Checkout] User already has Pro subscription:', userId);
      return res.status(400).json({
        error: 'You already have an active Pro subscription',
      });
    }

    // Detect frontend URL for success/cancel redirects
    const origin = req.headers.origin || req.headers.referer?.split('/').slice(0, 3).join('/');
    const frontendUrl = process.env.FRONTEND_URL || origin || 'http://localhost:5000';

    const successUrl = `${frontendUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${frontendUrl}/billing/cancel`;

    // Create Stripe Checkout Session
    const { sessionId, url } = await stripeService.createCheckoutSession({
      userId,
      userEmail: user.email,
      successUrl,
      cancelUrl,
    });

    console.log('[Stripe Checkout] Session created:', {
      userId,
      sessionId,
      redirectUrl: url.substring(0, 50) + '...',
    });

    res.json({
      success: true,
      sessionId,
      url,
    });
  } catch (error: any) {
    console.error('[Stripe Checkout] Error:', error);
    res.status(500).json({
      error: error.message || 'Failed to create checkout session',
    });
  }
});
```

**Flow:**
1. Auth middleware ensures user is logged in
2. Check if user already has Pro (prevent duplicate subscriptions)
3. Auto-detect frontend URL for success/cancel redirects
4. Create Stripe Checkout Session with Pro price
5. Return session URL to frontend

---

### Step 3: Create Webhook Endpoint

**File:** `server/routes.ts` (add new endpoint)

**CRITICAL:** Webhook endpoint must use **raw body** (not JSON-parsed) for signature verification.

```typescript
// POST /api/stripe/webhook
// IMPORTANT: This endpoint needs raw body for signature verification
// Configure this BEFORE express.json() middleware
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['stripe-signature'];

  if (!signature) {
    console.error('[Stripe Webhook] Missing stripe-signature header');
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  try {
    // Verify webhook signature
    const event = stripeService.verifyWebhookSignature(req.body, signature);

    console.log('[Stripe Webhook] Received event:', {
      eventId: event.id,
      eventType: event.type,
      created: new Date(event.created * 1000).toISOString(),
    });

    // Check idempotency - have we already processed this event?
    const existingEvent = await db
      .select()
      .from(stripeEvents)
      .where(eq(stripeEvents.eventId, event.id))
      .limit(1);

    if (existingEvent.length > 0) {
      console.log('[Stripe Webhook] Event already processed:', event.id);
      return res.json({ received: true, status: 'already_processed' });
    }

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log('[Stripe Webhook] Unhandled event type:', event.type);
    }

    // Mark event as processed (idempotency)
    await db.insert(stripeEvents).values({
      eventId: event.id,
      eventType: event.type,
      processedAt: new Date(),
    });

    console.log('[Stripe Webhook] Event processed successfully:', event.id);
    res.json({ received: true });
  } catch (error: any) {
    console.error('[Stripe Webhook] Error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Handle successful checkout - upgrade user to Pro
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id;

  if (!userId) {
    console.error('[Stripe Webhook] Missing client_reference_id in checkout session');
    return;
  }

  console.log('[Stripe Webhook] Checkout completed:', {
    userId,
    customerId: session.customer,
    subscriptionId: session.subscription,
  });

  // Update user with Stripe Customer ID and Pro status
  await storage.updateUser(userId, {
    stripeCustomerId: session.customer as string,
    subscriptionStatus: 'pro',
    subscriptionEndsAt: null, // Active subscription, no end date yet
  });

  console.log('[Stripe Webhook] User upgraded to Pro:', userId);
}

/**
 * Handle subscription updated (renewal, plan change, etc.)
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId;

  if (!userId) {
    console.error('[Stripe Webhook] Missing userId in subscription metadata');
    return;
  }

  console.log('[Stripe Webhook] Subscription updated:', {
    userId,
    subscriptionId: subscription.id,
    status: subscription.status,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
  });

  // Update subscription status and end date
  const subscriptionStatus = subscription.status === 'active' ? 'pro' : 'free';
  const subscriptionEndsAt = new Date(subscription.current_period_end * 1000);

  await storage.updateUser(userId, {
    subscriptionStatus,
    subscriptionEndsAt,
  });

  console.log('[Stripe Webhook] User subscription updated:', {
    userId,
    status: subscriptionStatus,
    endsAt: subscriptionEndsAt.toISOString(),
  });
}

/**
 * Handle subscription deleted (cancellation)
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId;

  if (!userId) {
    console.error('[Stripe Webhook] Missing userId in subscription metadata');
    return;
  }

  console.log('[Stripe Webhook] Subscription deleted:', {
    userId,
    subscriptionId: subscription.id,
  });

  // Downgrade user to free tier
  await storage.updateUser(userId, {
    subscriptionStatus: 'free',
    subscriptionEndsAt: null,
  });

  console.log('[Stripe Webhook] User downgraded to free:', userId);
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  console.log('[Stripe Webhook] Payment failed:', {
    customerId,
    invoiceId: invoice.id,
    amountDue: invoice.amount_due,
  });

  // Find user by Stripe Customer ID
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.stripeCustomerId, customerId))
    .limit(1);

  if (!user) {
    console.error('[Stripe Webhook] User not found for customer:', customerId);
    return;
  }

  // Mark subscription as past_due (Stripe will retry payment)
  await storage.updateUser(user.id, {
    subscriptionStatus: 'past_due',
  });

  console.log('[Stripe Webhook] User marked as past_due:', user.id);

  // TODO: Send email notification about failed payment
}
```

**Idempotency Strategy:**
- Stripe may send the same webhook multiple times
- We store processed event IDs in `stripe_events` table
- Before processing, check if event already exists
- Prevents duplicate user upgrades/downgrades

**Event Types:**
- `checkout.session.completed` - User completed payment, upgrade to Pro
- `customer.subscription.updated` - Subscription renewed or status changed
- `customer.subscription.deleted` - User canceled subscription
- `invoice.payment_failed` - Payment failed, mark as past_due

---

### Step 4: Create Customer Portal Endpoint

**File:** `server/routes.ts` (add new endpoint)

```typescript
// POST /api/stripe/create-portal-session
app.post('/api/stripe/create-portal-session', async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.stripeCustomerId) {
      return res.status(400).json({
        error: 'No Stripe customer found. Please subscribe first.',
      });
    }

    // Detect frontend URL for return URL
    const origin = req.headers.origin || req.headers.referer?.split('/').slice(0, 3).join('/');
    const frontendUrl = process.env.FRONTEND_URL || origin || 'http://localhost:5000';
    const returnUrl = `${frontendUrl}/settings/billing`;

    const portalUrl = await stripeService.createPortalSession(
      user.stripeCustomerId,
      returnUrl
    );

    console.log('[Stripe Portal] Session created for user:', userId);

    res.json({
      success: true,
      url: portalUrl,
    });
  } catch (error: any) {
    console.error('[Stripe Portal] Error:', error);
    res.status(500).json({
      error: error.message || 'Failed to create portal session',
    });
  }
});
```

**Customer Portal Features:**
- Cancel subscription
- Update payment method
- View payment history and invoices
- Download receipts

---

### Step 5: Modify Usage Limits Logic

**File:** `server/services/usageLimits.ts` (modify existing functions)

Currently, usage limits apply to all users equally. We need to bypass limits for Pro users.

```typescript
/**
 * Check if user can process a video
 *
 * Pro users have unlimited processing
 */
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

  // Free users: enforce 3 videos/month limit
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const videoCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        eq(tasks.type, 'video-to-shorts'),
        gte(tasks.createdAt, startOfMonth)
      )
    );

  const current = Number(videoCount[0]?.count || 0);
  const limit = 3;

  console.log('[Usage Limits] Video processing check:', {
    userId,
    current,
    limit,
    subscriptionStatus: user.subscriptionStatus,
  });

  if (current >= limit) {
    return {
      allowed: false,
      reason: `Free tier limit reached. You've processed ${current} videos this month. Upgrade to Pro for unlimited processing.`,
      limit,
      current,
    };
  }

  return { allowed: true, limit, current };
}

/**
 * Check if user can create a social media post
 *
 * Pro users have unlimited posting
 */
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

  // Free users: enforce 3 posts/month limit
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const postCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(socialMediaPosts)
    .where(
      and(
        eq(socialMediaPosts.userId, userId),
        gte(socialMediaPosts.createdAt, startOfMonth)
      )
    );

  const current = Number(postCount[0]?.count || 0);
  const limit = 3;

  console.log('[Usage Limits] Post creation check:', {
    userId,
    current,
    limit,
    subscriptionStatus: user.subscriptionStatus,
  });

  if (current >= limit) {
    return {
      allowed: false,
      reason: `Free tier limit reached. You've posted ${current} times this month. Upgrade to Pro for unlimited posting.`,
      limit,
      current,
    };
  }

  return { allowed: true, limit, current };
}
```

**Key Changes:**
- Check `user.subscriptionStatus === 'pro'` first
- If Pro, return `{ allowed: true }` immediately (no limit checks)
- If Free, continue with existing limit logic
- Updated error messages to encourage upgrade

---

## Frontend Implementation Plan

### Step 1: Create Pricing Page

**File:** `client/src/pages/PricingPage.tsx`

This page displays pricing tiers and initiates checkout flow.

```typescript
import { useState } from 'react';
import { useLocation } from 'wouter';
import { Check, Loader2, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/AuthProvider';
import { getAuthHeaders } from '@/lib/queryClient';

export default function PricingPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    if (!user) {
      setLocation('/login');
      return;
    }

    setLoading(true);

    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create checkout session');
      }

      const data = await response.json();

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to start checkout',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-muted-foreground">
            Choose the plan that's right for you
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Tier */}
          <Card>
            <CardHeader>
              <CardTitle>Free</CardTitle>
              <CardDescription>Perfect for trying out Streamline</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-600 mr-2" />
                  <span>3 videos processed per month</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-600 mr-2" />
                  <span>3 social media posts per month</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-600 mr-2" />
                  <span>All platforms (Instagram, TikTok, YouTube)</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-600 mr-2" />
                  <span>Klap AI-powered clip creation</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setLocation('/register')}
              >
                Get Started
              </Button>
            </CardFooter>
          </Card>

          {/* Pro Tier */}
          <Card className="border-primary relative">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                POPULAR
              </span>
            </div>
            <CardHeader>
              <CardTitle className="flex items-center">
                Pro
                <Zap className="w-5 h-5 ml-2 text-primary" />
              </CardTitle>
              <CardDescription>For creators and businesses</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">$29</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-600 mr-2" />
                  <span className="font-semibold">Unlimited video processing</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-600 mr-2" />
                  <span className="font-semibold">Unlimited social media posts</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-600 mr-2" />
                  <span>All platforms (Instagram, TikTok, YouTube)</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-600 mr-2" />
                  <span>Klap AI-powered clip creation</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-600 mr-2" />
                  <span>Priority processing</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-600 mr-2" />
                  <span>Early access to new features</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                onClick={handleUpgrade}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Upgrade to Pro'
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 text-center">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
              <p className="text-muted-foreground">
                Yes! You can cancel your Pro subscription at any time. Your subscription will remain active until the end of your billing period.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">What happens when I hit the free tier limits?</h3>
              <p className="text-muted-foreground">
                Your limits reset on the 1st of each month. If you need more, you can upgrade to Pro for unlimited processing and posting.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Do you offer refunds?</h3>
              <p className="text-muted-foreground">
                Yes, we offer a 14-day money-back guarantee. If you're not satisfied, contact support for a full refund.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Can I change my plan later?</h3>
              <p className="text-muted-foreground">
                Yes, you can upgrade or downgrade your plan at any time from your billing settings.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Route:** Add to `client/src/App.tsx`:
```typescript
<Route path="/pricing" component={PricingPage} />
```

---

### Step 2: Create Billing Success Page

**File:** `client/src/pages/billing/SuccessPage.tsx`

```typescript
import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { CheckCircle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function BillingSuccessPage() {
  const [, setLocation] = useLocation();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Redirect to home after 5 seconds
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setLocation('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>

            <h2 className="text-2xl font-bold text-green-600">Payment Successful!</h2>

            <p className="text-muted-foreground">
              Welcome to Streamline Pro! Your subscription is now active.
            </p>

            <div className="p-4 bg-gray-50 rounded-lg w-full">
              <h3 className="font-semibold mb-2">What's Next?</h3>
              <ul className="text-sm text-muted-foreground space-y-1 text-left">
                <li>• Unlimited video processing</li>
                <li>• Unlimited social media posting</li>
                <li>• Priority processing queue</li>
                <li>• Early access to new features</li>
              </ul>
            </div>

            <div className="text-sm text-muted-foreground">
              Redirecting to home in {countdown} seconds...
            </div>

            <div className="flex gap-2 w-full">
              <Button variant="outline" onClick={() => setLocation('/settings/billing')} className="flex-1">
                View Billing
              </Button>
              <Button onClick={() => setLocation('/')} className="flex-1">
                Go to Home
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Route:** Add to `client/src/App.tsx`:
```typescript
<Route path="/billing/success" component={BillingSuccessPage} />
```

**Query Parameter:** Stripe redirects with `?session_id={CHECKOUT_SESSION_ID}` which can be used to verify payment status if needed.

---

### Step 3: Create Billing Cancel Page

**File:** `client/src/pages/billing/CancelPage.tsx`

```typescript
import { useLocation } from 'wouter';
import { XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function BillingCancelPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
              <XCircle className="w-10 h-10 text-orange-600" />
            </div>

            <h2 className="text-2xl font-bold">Payment Cancelled</h2>

            <p className="text-muted-foreground">
              Your payment was cancelled. No charges were made to your account.
            </p>

            <div className="p-4 bg-gray-50 rounded-lg w-full">
              <p className="text-sm text-muted-foreground">
                If you encountered any issues during checkout, please contact our support team.
              </p>
            </div>

            <div className="flex gap-2 w-full">
              <Button variant="outline" onClick={() => setLocation('/')} className="flex-1">
                Go to Home
              </Button>
              <Button onClick={() => setLocation('/pricing')} className="flex-1">
                Try Again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Route:** Add to `client/src/App.tsx`:
```typescript
<Route path="/billing/cancel" component={BillingCancelPage} />
```

---

### Step 4: Update Settings Page with Billing Section

**File:** `client/src/pages/settings/BillingSettingsPage.tsx` (new file)

```typescript
import { useState, useEffect } from 'react';
import { Loader2, CreditCard, Calendar, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/AuthProvider';
import { getAuthHeaders } from '@/lib/queryClient';

export default function BillingSettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const isPro = user?.subscriptionStatus === 'pro';
  const subscriptionEndsAt = user?.subscriptionEndsAt;

  const handleManageBilling = async () => {
    setPortalLoading(true);

    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to open billing portal');
      }

      const data = await response.json();

      // Redirect to Stripe Customer Portal
      window.location.href = data.url;
    } catch (error: any) {
      console.error('Portal error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to open billing portal',
        variant: 'destructive',
      });
      setPortalLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Billing Settings</h1>

      {/* Current Plan */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            {isPro && <CheckCircle className="w-5 h-5 text-green-600 mr-2" />}
            Current Plan: {isPro ? 'Pro' : 'Free'}
          </CardTitle>
          <CardDescription>
            {isPro
              ? 'You have unlimited access to all features'
              : 'Upgrade to Pro for unlimited video processing and posting'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isPro ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <CreditCard className="w-5 h-5 text-green-600 mr-3" />
                  <div>
                    <p className="font-semibold">Pro Subscription</p>
                    <p className="text-sm text-muted-foreground">$29/month</p>
                  </div>
                </div>
                {subscriptionEndsAt && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4 mr-1" />
                    Renews on {new Date(subscriptionEndsAt).toLocaleDateString()}
                  </div>
                )}
              </div>

              <Button
                onClick={handleManageBilling}
                disabled={portalLoading}
                variant="outline"
                className="w-full"
              >
                {portalLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Manage Subscription'
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Cancel anytime, update payment method, or view billing history
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                You're currently on the free plan with:
              </p>
              <ul className="text-sm space-y-2 mb-4">
                <li>• 3 videos processed per month</li>
                <li>• 3 social media posts per month</li>
              </ul>
              <Button onClick={() => window.location.href = '/pricing'} className="w-full">
                Upgrade to Pro
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Information */}
      {!isPro && (
        <Card>
          <CardHeader>
            <CardTitle>Usage Limits</CardTitle>
            <CardDescription>Your limits reset on the 1st of each month</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Upgrade to Pro to remove all usage limits and unlock unlimited video processing and social media posting.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

**Route:** Add to `client/src/App.tsx`:
```typescript
<Route path="/settings/billing" component={BillingSettingsPage} />
```

**Navigation:** Add "Billing" link to settings sidebar/navigation

---

### Step 5: Add Upgrade Prompts to Limit Messages

**File:** `client/src/components/LimitReachedDialog.tsx` (new component)

```typescript
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useLocation } from 'wouter';

interface LimitReachedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  limitType: 'video' | 'post';
  current: number;
  limit: number;
}

export function LimitReachedDialog({
  open,
  onOpenChange,
  limitType,
  current,
  limit
}: LimitReachedDialogProps) {
  const [, setLocation] = useLocation();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Monthly Limit Reached</AlertDialogTitle>
          <AlertDialogDescription>
            You've reached your free tier limit of {limit} {limitType === 'video' ? 'videos' : 'posts'} per month.
            Upgrade to Pro for unlimited {limitType === 'video' ? 'video processing' : 'social media posting'}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-semibold mb-2">Pro Plan includes:</p>
          <ul className="text-sm space-y-1">
            <li>• Unlimited video processing</li>
            <li>• Unlimited social media posting</li>
            <li>• Priority processing</li>
            <li>• Early access to new features</li>
          </ul>
          <p className="text-sm font-bold mt-3">Only $29/month</p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Maybe Later</AlertDialogCancel>
          <AlertDialogAction onClick={() => setLocation('/pricing')}>
            Upgrade to Pro
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

**Usage:** Show this dialog when users hit limits (in video processing and social posting pages)

---

## Webhook & Testing Strategy

### Webhook Signature Verification

**Critical for Security:** Always verify webhook signatures to ensure requests actually come from Stripe.

```typescript
// ✅ CORRECT - Verify signature
const event = stripeService.verifyWebhookSignature(req.body, signature);

// ❌ WRONG - Never trust unverified webhooks
const event = JSON.parse(req.body);
```

**How it works:**
1. Stripe signs each webhook with your webhook secret
2. Signature sent in `Stripe-Signature` header
3. SDK verifies signature matches payload + secret
4. If verification fails, reject the request (potential attack)

---

### Local Webhook Testing with Stripe CLI

**Setup:**
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:5000/api/stripe/webhook
```

**Output:**
```
> Ready! Your webhook signing secret is whsec_... (^C to quit)
```

**Copy webhook secret to `.env`:**
```bash
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Trigger test events:**
```bash
# Test successful checkout
stripe trigger checkout.session.completed

# Test subscription updated
stripe trigger customer.subscription.updated

# Test subscription deleted
stripe trigger customer.subscription.deleted

# Test payment failed
stripe trigger invoice.payment_failed
```

**Verify in logs:**
```
[Stripe Webhook] Received event: { eventId: 'evt_...', eventType: 'checkout.session.completed' }
[Stripe Webhook] Checkout completed: { userId: '...', customerId: 'cus_...' }
[Stripe Webhook] User upgraded to Pro: ...
```

---

### Production Webhook Setup

**Stripe Dashboard:**
1. Go to Developers → Webhooks
2. Click "Add endpoint"
3. Enter URL: `https://launchready-streamline-mvp.onrender.com/api/stripe/webhook`
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Copy signing secret → Add to Render environment variables

**Render Environment Variables:**
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_PRO=price_...
```

**Test production webhook:**
- Make a real test payment using Stripe test card: `4242 4242 4242 4242`
- Check Render logs for webhook processing
- Verify user upgraded in database

---

### End-to-End Testing Checklist

**✅ Checkout Flow:**
1. Click "Upgrade to Pro" on pricing page
2. Redirected to Stripe Checkout
3. Fill test card: `4242 4242 4242 4242`, any future expiry, any CVC
4. Complete payment
5. Redirected to `/billing/success`
6. User subscriptionStatus updated to "pro" in database
7. User can now process unlimited videos/posts

**✅ Usage Limits:**
1. Create free user, process 3 videos
2. Try to process 4th video → see limit error with upgrade prompt
3. Upgrade to Pro
4. Process 10+ videos → all succeed (unlimited)

**✅ Customer Portal:**
1. Go to Settings → Billing
2. Click "Manage Subscription"
3. Redirected to Stripe Customer Portal
4. Cancel subscription
5. Webhook fires → user downgraded to "free"
6. Usage limits re-applied

**✅ Failed Payment:**
1. Use test card that triggers payment failure: `4000 0000 0000 0341`
2. Subscription marked as `past_due`
3. User still has access during grace period
4. Email notification sent (if implemented)

**✅ Idempotency:**
1. Send same webhook event twice (replay attack simulation)
2. Second request returns `already_processed`
3. User not upgraded twice

---

### Test Cards

**Successful Payment:**
- `4242 4242 4242 4242` - Visa
- Any future expiry date
- Any 3-digit CVC

**Payment Declined:**
- `4000 0000 0000 0002` - Card declined

**Failed Payment (for testing failed invoice):**
- `4000 0000 0000 0341` - Charge succeeds but subsequent payment fails

**Full list:** https://stripe.com/docs/testing

---

## Environment Variable Setup

### Development (.env)

```bash
# Stripe Test Mode Keys
STRIPE_SECRET_KEY=sk_test_51...
STRIPE_WEBHOOK_SECRET=whsec_... # From stripe listen command
STRIPE_PRICE_ID_PRO=price_1... # Test price ID from Stripe Dashboard

# Frontend (client/.env)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51...
```

### Production (Render Environment Variables)

```bash
# Stripe Live Mode Keys
STRIPE_SECRET_KEY=sk_live_51...
STRIPE_WEBHOOK_SECRET=whsec_... # From production webhook endpoint
STRIPE_PRICE_ID_PRO=price_1... # Live price ID from Stripe Dashboard

# Frontend
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_51...
```

**Security Notes:**
- Never commit `.env` files to git (already in `.gitignore`)
- Use test keys in development, live keys in production
- Rotate keys if accidentally exposed
- Webhook secret is CRITICAL for security - keep it private

---

## Timeline & Estimates

### Phase Breakdown

**Total Estimated Time: 12-15 hours**

| Task | Description | Estimated Time |
|------|-------------|----------------|
| **Backend** |  |  |
| Stripe service setup | Create `server/services/stripe.ts` with SDK wrapper | 1.5 hours |
| Checkout endpoint | POST `/api/stripe/create-checkout-session` | 1 hour |
| Webhook endpoint | POST `/api/stripe/webhook` with event handlers | 2 hours |
| Portal endpoint | POST `/api/stripe/create-portal-session` | 0.5 hours |
| Usage limits modification | Update `usageLimits.ts` to bypass for Pro users | 1 hour |
| Database migration | Create `stripe_events` table for idempotency | 0.5 hours |
| **Frontend** |  |  |
| Pricing page | Design and implement `/pricing` with tier comparison | 2 hours |
| Success/Cancel pages | `/billing/success` and `/billing/cancel` | 1 hour |
| Billing settings | `/settings/billing` with plan display and portal link | 1.5 hours |
| Upgrade prompts | Limit reached dialogs with upgrade CTAs | 1 hour |
| **Testing & Deployment** |  |  |
| Local testing | Stripe CLI, test webhooks, end-to-end flow | 2 hours |
| Production setup | Stripe Dashboard config, webhook endpoint, env vars | 1 hour |
| End-to-end testing | Real test payments, verify all flows work | 1.5 hours |

### Critical Path

1. **Stripe Account Setup** → Blocks everything (can't test without API keys)
2. **Backend Implementation** → Must complete before frontend can call endpoints
3. **Webhook Setup** → Must work before payments can update database
4. **Frontend Implementation** → Can work in parallel with backend if using mock data
5. **Testing** → Final validation before launch

### Rollout Strategy

**Week 1:**
- Days 1-2: Backend implementation (services, endpoints, migrations)
- Days 3-4: Frontend implementation (pages, components)
- Day 5: Local testing with Stripe CLI

**Week 2:**
- Day 1: Production setup (Stripe Dashboard, webhooks, env vars)
- Day 2: End-to-end testing with real test payments
- Day 3: Soft launch (invite beta users to test)
- Day 4-5: Monitor, fix bugs, optimize

**Launch:**
- Deploy to production with feature flag (Stripe enabled only for admins)
- Gradually enable for all users
- Monitor Stripe Dashboard for successful payments
- Watch error logs for webhook failures

---

## Rollback Strategy

### Pre-Launch Checklist

Before launching Stripe integration:

1. **Backup database:** `pg_dump` or Supabase snapshot
2. **Test all flows:** Checkout, webhooks, portal, cancellation
3. **Verify webhook signature verification:** Prevent security issues
4. **Document environment variables:** Know how to disable quickly
5. **Monitor setup:** Stripe Dashboard + server logs

### Rollback Procedure

**If critical issues discovered after launch:**

#### Step 1: Disable Stripe Frontend

**File:** `client/src/pages/PricingPage.tsx`

```typescript
// Add feature flag at top of component
const STRIPE_ENABLED = import.meta.env.VITE_STRIPE_ENABLED === 'true';

// In render:
{!STRIPE_ENABLED && (
  <div className="text-center p-8 bg-yellow-50 rounded-lg">
    <p>Subscription billing is temporarily unavailable. Please check back soon.</p>
  </div>
)}
```

**Environment variable:**
```bash
# Render: Set VITE_STRIPE_ENABLED=false
VITE_STRIPE_ENABLED=false
```

This disables upgrade buttons while keeping existing Pro users functional.

---

#### Step 2: Disable Webhook Processing

**File:** `server/routes.ts`

```typescript
// Add at top of webhook handler
const STRIPE_WEBHOOKS_ENABLED = process.env.STRIPE_WEBHOOKS_ENABLED !== 'false';

if (!STRIPE_WEBHOOKS_ENABLED) {
  console.log('[Stripe Webhook] Webhooks disabled via environment variable');
  return res.json({ received: true, status: 'disabled' });
}
```

**Environment variable:**
```bash
# Render: Set STRIPE_WEBHOOKS_ENABLED=false
STRIPE_WEBHOOKS_ENABLED=false
```

This prevents webhooks from modifying database while we investigate issues.

---

#### Step 3: Pause Stripe Dashboard Webhooks

**Stripe Dashboard:**
1. Go to Developers → Webhooks
2. Click on production webhook endpoint
3. Click "Disable endpoint"

This stops Stripe from sending webhooks entirely (prevents queue buildup).

---

#### Step 4: Manual Database Cleanup (if needed)

**If users were incorrectly upgraded/downgraded:**

```sql
-- Find affected users
SELECT id, email, subscription_status, stripe_customer_id, updated_at
FROM users
WHERE subscription_status != 'free'
  AND updated_at > '2025-01-XX' -- Date of incident
ORDER BY updated_at DESC;

-- Manually fix individual users
UPDATE users
SET subscription_status = 'free',
    subscription_ends_at = NULL
WHERE id = '<user-id>';
```

**If Stripe events table filled with duplicates:**

```sql
-- Check for duplicate event processing
SELECT event_id, COUNT(*) as count
FROM stripe_events
GROUP BY event_id
HAVING COUNT(*) > 1;

-- Delete duplicate events (keep oldest)
DELETE FROM stripe_events
WHERE id NOT IN (
  SELECT MIN(id)
  FROM stripe_events
  GROUP BY event_id
);
```

---

#### Step 5: Refund Affected Users

**Stripe Dashboard:**
1. Go to Payments → All payments
2. Find affected transactions
3. Click transaction → "Refund"
4. Select full or partial refund
5. Add internal note explaining reason

**Programmatic refunds (if many users affected):**

```typescript
// One-time admin script
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const affectedPaymentIntents = ['pi_...', 'pi_...'];

for (const paymentIntentId of affectedPaymentIntents) {
  await stripe.refunds.create({
    payment_intent: paymentIntentId,
    reason: 'requested_by_customer', // or 'fraudulent', 'duplicate'
  });
  console.log(`Refunded: ${paymentIntentId}`);
}
```

---

### Re-enabling After Fix

1. **Fix identified issue** in code
2. **Deploy fix** to production
3. **Test thoroughly** with Stripe CLI and test payments
4. **Re-enable webhooks** in Stripe Dashboard
5. **Re-enable frontend** by setting `VITE_STRIPE_ENABLED=true`
6. **Monitor closely** for 24-48 hours

---

### Data Integrity Safeguards

**Prevent data loss during rollback:**

1. **Never delete `stripe_customer_id`** - Needed to refund/manage existing customers
2. **Never delete `subscription_status`** - Existing Pro users must retain access
3. **Archive instead of delete** - Keep historical data for auditing

**Audit trail:**

```sql
-- Create audit table (optional, for forensics)
CREATE TABLE subscription_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  old_status TEXT,
  new_status TEXT,
  changed_by TEXT, -- 'webhook', 'admin', 'user'
  event_id TEXT, -- Stripe event ID if applicable
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
```

---

### Communication Plan

**If rollback is needed:**

1. **Status Page Update:** Post incident notice
2. **Email to Affected Users:** Explain what happened, when it will be fixed
3. **Internal Slack/Discord:** Notify team of rollback
4. **Stripe Dashboard Note:** Document incident for future reference

**Template Email:**
```
Subject: Temporary Issue with Streamline Billing

Hi [User],

We experienced a temporary issue with our billing system on [DATE].

What happened:
- [Brief explanation]

What we did:
- [Actions taken]
- Your account has been [refunded/restored/etc.]

What's next:
- We're working on a fix and will notify you when billing is re-enabled
- In the meantime, [your Pro access remains active / you've been given a free month / etc.]

We apologize for the inconvenience. If you have any questions, please reply to this email.

Best,
Streamline Team
```

---

## Success Metrics

**Track these metrics post-launch:**

- **Conversion rate:** Pricing page visits → checkout sessions started
- **Completion rate:** Checkout sessions → successful payments
- **Revenue:** Monthly recurring revenue (MRR)
- **Churn rate:** Subscription cancellations per month
- **Upgrade triggers:** Where users upgrade (pricing page, limit dialog, settings)
- **Failed payments:** Monitor for payment issues, update billing info prompts

**Stripe Dashboard Analytics:**
- Payments → Overview
- Billing → Subscriptions
- Developers → Webhooks (success rate)

---

## Future Enhancements

**Post-Phase 8 ideas:**

1. **Annual billing discount** - Offer 2 months free for annual subscriptions
2. **Usage-based pricing** - Pay-per-video instead of flat subscription
3. **Team plans** - Multi-user accounts with shared billing
4. **Free trial** - 7-day Pro trial for new users
5. **Promo codes** - Referral discounts, seasonal promotions
6. **Invoice history** - Show past invoices in settings
7. **Email notifications** - Payment success, renewal reminders, failed payment alerts
8. **Dunning management** - Smart retry logic for failed payments
9. **Plan analytics** - Show users their usage trends (videos/month chart)

---

## Conclusion

This Phase 8 implementation adds **subscription billing** to Streamline using Stripe, enabling:

- ✅ Self-service subscription upgrades
- ✅ Unlimited usage for Pro users
- ✅ Secure webhook handling with signature verification
- ✅ Customer portal for subscription management
- ✅ Comprehensive testing strategy
- ✅ Rollback plan for incident response

**Total estimated time: 12-15 hours**

**Key files to create/modify:**
- `server/services/stripe.ts` (new)
- `server/routes.ts` (add 3 endpoints)
- `server/services/usageLimits.ts` (modify)
- `db/migrations/0004_stripe_events.sql` (new)
- `client/src/pages/PricingPage.tsx` (new)
- `client/src/pages/billing/SuccessPage.tsx` (new)
- `client/src/pages/billing/CancelPage.tsx` (new)
- `client/src/pages/settings/BillingSettingsPage.tsx` (new)
- `client/src/components/LimitReachedDialog.tsx` (new)

**Next steps:**
1. Create Stripe account and get API keys
2. Implement backend (services, endpoints, migrations)
3. Implement frontend (pages, components)
4. Test locally with Stripe CLI
5. Deploy to production with feature flag
6. Monitor and optimize

---

**Document Version:** 1.0
**Last Updated:** 2025-10-28
**Author:** Streamline Team
