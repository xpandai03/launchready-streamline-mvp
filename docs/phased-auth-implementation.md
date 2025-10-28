# Phased Authentication Implementation Plan

**Project:** Streamline MVP - Multi-Tenant Auth with Supabase
**Database:** Supabase PostgreSQL (project: hfnmgonoxkjaqlelnqwc)
**Current State:** Deployed on Render, hardcoded admin user (id=1), Supabase CLI linked
**Goal:** Add email/password authentication with per-user data isolation and Late.dev profiles

---

## 1. Overview & Goals

### What Auth Solves

This implementation adds **multi-tenant user authentication** to enable:

1. **User Registration & Login** - Email/password authentication via Supabase Auth
2. **Data Isolation** - Each user sees only their own videos, clips, and social posts
3. **Per-User Late.dev Profiles** - Every user gets their own Late profile for connecting social accounts
4. **Usage Tracking** - Free tier limits (3 videos/month, 3 posts/month) before Stripe integration
5. **Scalability** - Foundation for Stripe billing and OAuth providers (Google, etc.)

### User Isolation Requirements

**Current Problem:**
- All operations use hardcoded `DEFAULT_USER_ID = 1` (admin)
- No authentication required to access any endpoint
- All users would see each other's data

**After Auth:**
- Each user has a unique UUID from Supabase Auth
- Row Level Security (RLS) enforces database-level isolation
- API endpoints derive `userId` from authenticated session
- Users can only read/write their own:
  - Tasks (video processing jobs)
  - Projects (generated clips)
  - Exports (video downloads)
  - Social posts (Instagram/TikTok posts)

### Late.dev Integration Per User

**Current State:**
- Single hardcoded Instagram account ID: `6900d2cd8bbca9c10cbfff74`
- Uses global `LATE_BASE_PROFILE_ID` from environment

**After Auth:**
- Each user gets their own Late.dev profile created on signup
- User can connect their own Instagram/TikTok accounts via Late OAuth
- Posts use the authenticated user's connected accounts
- `users.late_profile_id` stores each user's Late profile
- `users.late_account_id` stores connected social account (future: support multiple)

---

## 2. Architecture & Data Model

### 2.1 Schema Changes

#### Current Users Table (Neon PostgreSQL)
```sql
-- Current: INTEGER-based, single admin user
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE
);
-- Only contains: { id: 1, username: 'admin' }
```

#### New Users Table (Supabase Auth Integration)
```sql
-- New: UUID-based, synced with auth.users
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  late_profile_id TEXT,              -- Late.dev profile ID
  late_account_id TEXT,               -- Connected social account ID (Instagram/TikTok)
  stripe_customer_id TEXT,            -- For future Stripe integration
  subscription_status TEXT DEFAULT 'free', -- free, trial, pro
  subscription_ends_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Add user_id to Existing Tables

**Tasks table:**
```sql
ALTER TABLE tasks
  DROP COLUMN user_id,  -- Drop old INTEGER column
  ADD COLUMN user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE;

CREATE INDEX idx_tasks_user_id ON tasks(user_id);
```

**Projects table:**
```sql
ALTER TABLE projects
  ADD COLUMN user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE;

CREATE INDEX idx_projects_user_id ON projects(user_id);
```

**Exports table:**
```sql
ALTER TABLE exports
  ADD COLUMN user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE;

CREATE INDEX idx_exports_user_id ON exports(user_id);
```

**Social Posts table:**
```sql
ALTER TABLE social_posts
  ADD COLUMN user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE;

CREATE INDEX idx_social_posts_user_id ON social_posts(user_id);
```

**Folders table:**
```sql
ALTER TABLE folders
  ADD COLUMN user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE;

CREATE INDEX idx_folders_user_id ON folders(user_id);
```

**API Logs table** (optional - for admin visibility):
```sql
ALTER TABLE api_logs
  ADD COLUMN user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX idx_api_logs_user_id ON api_logs(user_id);
```

#### New Table: Usage Tracking

```sql
CREATE TABLE user_usage (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- Format: 'YYYY-MM'
  videos_created INTEGER DEFAULT 0,
  posts_created INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, month)
);

CREATE INDEX idx_user_usage_user_month ON user_usage(user_id, month);
```

### 2.2 Row Level Security (RLS) Policies

#### Enable RLS on All Tables

```sql
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;
-- api_logs: Admin-only, no RLS needed
```

#### RLS Policy Principles

1. **Users can only see their own data** - All SELECT/UPDATE/DELETE policies check `auth.uid() = user_id`
2. **Users can only create data for themselves** - All INSERT policies enforce `auth.uid() = user_id`
3. **Service role bypasses RLS** - Backend uses `SUPABASE_SERVICE_ROLE_KEY` for admin operations
4. **Anon key respects RLS** - Frontend uses `SUPABASE_ANON_KEY`, policies enforced

### 2.3 Session Handling

#### Client-Side (Frontend)
- Uses Supabase JS Client with `SUPABASE_ANON_KEY`
- Session stored in localStorage by Supabase SDK
- Automatic token refresh handled by SDK
- AuthProvider context makes session available app-wide

#### Server-Side (Backend)
- Uses Supabase Admin Client with `SUPABASE_SERVICE_ROLE_KEY`
- Validates session token from `Authorization: Bearer <token>` header
- Extracts `userId` from validated session
- Uses `userId` to scope all database queries
- **Never** exposes service role key to client

### 2.4 Environment Variables

#### Supabase Configuration

**Already Set:**
```bash
SUPABASE_URL=https://hfnmgonoxkjaqlelnqwc.supabase.co
SUPABASE_ANON_KEY=eyJhbGci... (public, safe for frontend)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci... (secret, server-only)
```

**Required on Render:**
- `SUPABASE_URL` - Public Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Server-side admin key (secret)
- `SUPABASE_ANON_KEY` - Frontend public key (already exposed)

**Required on Frontend:**
- `VITE_SUPABASE_URL` - Public URL (exposed via Vite)
- `VITE_SUPABASE_ANON_KEY` - Public anon key

---

## 3. Phased Implementation Plan

### Phase 1: Schema Migration & RLS Foundations

**Goal:** Migrate database from INTEGER user IDs to UUID, add user_id columns to all tables, implement RLS policies

**Dependencies:**
- Supabase CLI installed and linked ✅
- Database backup recommended (Neon → export before migration)

**Tasks:**

1. **Create migration file**
   ```bash
   supabase migration new auth_schema_uuid_migration
   ```

2. **Migration SQL** (see Section 5 for complete SQL)
   - Drop old `users` table with INTEGER id
   - Create new `users` table with UUID id referencing `auth.users`
   - Create `user_usage` table for tracking limits
   - Add `user_id UUID` column to: tasks, folders, projects, exports, social_posts, api_logs
   - Add indexes on all `user_id` columns
   - Enable RLS on all tables
   - Create RLS policies (see Section 4)

3. **Handle existing data**
   - Export existing tasks/projects/exports/social_posts (likely none or test data)
   - After migration, can manually re-create or assign to a new admin UUID

4. **Push migration**
   ```bash
   supabase db push
   ```

5. **Verify schema**
   ```bash
   supabase db list
   ```

**Deliverables:**
- ✅ New `users` table with UUID primary key
- ✅ All tables have `user_id UUID` foreign keys
- ✅ RLS enabled on all tables with SELECT/INSERT/UPDATE/DELETE policies
- ✅ `user_usage` table created for free tier limits

**Testing:**
- Connect to Supabase Studio → SQL Editor
- Verify RLS policies exist: `SELECT * FROM pg_policies WHERE tablename IN ('users', 'tasks', 'projects');`
- Test RLS enforcement: Try selecting data as anon user (should return empty)

**Rollback Plan:**
```bash
supabase db reset
# Re-push previous migration state
```

---

### Phase 2: Supabase Auth Setup

**Goal:** Enable email/password authentication in Supabase, configure auto-confirm, install Supabase SDK

**Dependencies:**
- Phase 1 complete (schema migrated)

**Tasks:**

1. **Enable Email Auth in Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard/project/hfnmgonoxkjaqlelnqwc/auth/providers
   - Enable "Email" provider
   - Configure settings:
     - ✅ **Confirm email:** OFF (auto-confirm for MVP)
     - ✅ **Secure email change:** ON
     - ✅ **Enable signup:** ON
     - Customize email templates (optional)

2. **Configure Email Settings**
   - Go to: Authentication → Email Templates
   - Customize confirmation email (even though auto-confirm is on, good for later)
   - Set `SITE_URL` to production URL (e.g., `https://streamline.onrender.com`)

3. **Install Supabase SDK**
   ```bash
   npm install @supabase/supabase-js
   ```

4. **Create Supabase client files**
   - Frontend client: `client/src/lib/supabase.ts`
   - Backend client: `server/services/supabaseAuth.ts`

**Deliverables:**
- ✅ Email/password auth enabled in Supabase
- ✅ Auto-confirm enabled (no email verification required)
- ✅ Supabase SDK installed
- ✅ Client and server Supabase instances configured

**Testing:**
- Supabase Dashboard → Authentication → Users
- Manually create a test user via Dashboard
- Verify user appears in `auth.users` table

**Rollback Plan:**
- Disable email provider in Supabase Dashboard
- Revert to previous authentication state (none)

---

### Phase 3: Frontend Auth UI & Session Management

**Goal:** Build login/signup pages, create AuthProvider context, protect routes

**Dependencies:**
- Phase 2 complete (Supabase Auth enabled)

**Tasks:**

1. **Create Supabase client** (`client/src/lib/supabase.ts`)
   ```typescript
   import { createClient } from '@supabase/supabase-js'

   export const supabase = createClient(
     import.meta.env.VITE_SUPABASE_URL!,
     import.meta.env.VITE_SUPABASE_ANON_KEY!
   )
   ```

2. **Create AuthProvider context** (`client/src/contexts/AuthContext.tsx`)
   - Provides: `{ user, session, signUp, signIn, signOut, loading }`
   - Listens to `onAuthStateChange` for session updates
   - Stores user state in React context

3. **Create auth pages**
   - `client/src/pages/auth/LoginPage.tsx` - Email/password login form
   - `client/src/pages/auth/SignupPage.tsx` - Email/password signup form
   - Use shadcn/ui components (Form, Input, Button, Card)

4. **Add auth routes to App.tsx**
   ```tsx
   <Route path="/auth/login" component={LoginPage} />
   <Route path="/auth/signup" component={SignupPage} />
   ```

5. **Create ProtectedRoute component**
   ```tsx
   // Redirects to /auth/login if not authenticated
   function ProtectedRoute({ component: Component, ...props }) {
     const { user, loading } = useAuth()
     if (loading) return <LoadingSpinner />
     if (!user) return <Redirect to="/auth/login" />
     return <Component {...props} />
   }
   ```

6. **Protect existing routes**
   ```tsx
   <Route path="/" component={ProtectedRoute} />
   <Route path="/videos" component={ProtectedRoute} />
   <Route path="/details/:id" component={ProtectedRoute} />
   ```

7. **Add navigation header**
   - Display user email
   - Logout button
   - Link to dashboard

**Deliverables:**
- ✅ Login page with email/password form
- ✅ Signup page with email/password form
- ✅ AuthProvider context wrapping app
- ✅ Protected routes redirect unauthenticated users
- ✅ Session persists across page refreshes
- ✅ Logout functionality

**Testing:**
- Sign up with test email/password
- Verify auto-login after signup (no email confirmation)
- Logout and login again
- Try accessing protected route while logged out (should redirect)
- Check localStorage for Supabase session token

**Rollback Plan:**
- Remove auth routes from App.tsx
- Remove ProtectedRoute wrapper
- App returns to unauthenticated state

---

### Phase 4: Backend API Protection & User Scoping

**Goal:** Update all API endpoints to require authentication and scope queries to authenticated user

**Dependencies:**
- Phase 3 complete (frontend auth working)

**Tasks:**

1. **Create Supabase auth service** (`server/services/supabaseAuth.ts`)
   ```typescript
   import { createClient } from '@supabase/supabase-js'

   export const supabaseAdmin = createClient(
     process.env.SUPABASE_URL!,
     process.env.SUPABASE_SERVICE_ROLE_KEY! // Server-side only
   )
   ```

2. **Create auth middleware** (`server/middleware/auth.ts`)
   ```typescript
   export async function requireAuth(req, res, next) {
     const token = req.headers.authorization?.split('Bearer ')[1]
     if (!token) return res.status(401).json({ error: 'Unauthorized' })

     const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
     if (error || !user) return res.status(401).json({ error: 'Invalid token' })

     req.userId = user.id // Attach to request
     next()
   }
   ```

3. **Apply middleware to all routes** (`server/routes.ts`)
   ```typescript
   import { requireAuth } from './middleware/auth'

   // Apply to all API routes
   app.use('/api/*', requireAuth)
   ```

4. **Update route handlers to use req.userId**

   **Example: POST /api/videos**
   ```typescript
   // BEFORE
   const task = await db.insert(tasks).values({
     userId: DEFAULT_USER_ID, // ❌ Hardcoded
     sourceVideoUrl,
     status: 'processing'
   })

   // AFTER
   const task = await db.insert(tasks).values({
     userId: req.userId, // ✅ From authenticated session
     sourceVideoUrl,
     status: 'processing'
   })
   ```

   **Example: GET /api/videos**
   ```typescript
   // BEFORE
   const allTasks = await db.select().from(tasks) // ❌ Returns all users' tasks

   // AFTER
   const allTasks = await db.select()
     .from(tasks)
     .where(eq(tasks.userId, req.userId)) // ✅ Only user's tasks
   ```

5. **Update all endpoints** (comprehensive list in Section 7)
   - POST /api/videos
   - POST /api/videos/bulk
   - GET /api/videos
   - GET /api/videos/:id
   - POST /api/videos/:id/export
   - POST /api/process-video
   - POST /api/process-video-advanced
   - POST /api/social/post
   - GET /api/social/posts/:projectId
   - GET /api/social/posts/task/:taskId

6. **Add authorization checks**
   ```typescript
   // Verify user owns the resource before mutation
   const task = await db.query.tasks.findFirst({
     where: and(eq(tasks.id, taskId), eq(tasks.userId, req.userId))
   })
   if (!task) return res.status(404).json({ error: 'Task not found' })
   ```

**Deliverables:**
- ✅ Auth middleware protecting all `/api/*` routes
- ✅ All database queries scoped to `req.userId`
- ✅ Authorization checks prevent cross-user access
- ✅ Removed `DEFAULT_USER_ID` constant

**Testing:**
- Login as User A, create a video task
- Login as User B, try to access User A's task ID (should 404)
- Verify GET /api/videos only returns logged-in user's tasks
- Test with invalid/expired JWT token (should 401)

**Rollback Plan:**
- Remove auth middleware
- Revert queries to use DEFAULT_USER_ID
- API returns to unauthenticated state

---

### Phase 5: Late.dev Per-User Profiles

**Goal:** Create a unique Late.dev profile for each user on signup, store late_profile_id

**Dependencies:**
- Phase 4 complete (backend auth working)

**Tasks:**

1. **Update Late.dev service** (`server/services/late.ts`)
   ```typescript
   export const lateService = {
     // New method: Create user profile
     async createProfile(email: string): Promise<{ profileId: string }> {
       const response = await fetch('https://getlate.dev/api/v1/profiles', {
         method: 'POST',
         headers: {
           'Authorization': `Bearer ${process.env.LATE_API_KEY}`,
           'Content-Type': 'application/json'
         },
         body: JSON.stringify({ email })
       })
       const data = await response.json()
       return { profileId: data.id }
     },

     // Updated: Post to Instagram using user's profile
     async postToInstagram(profileId: string, accountId: string, videoUrl: string, caption: string) {
       // Use profileId + accountId instead of hardcoded values
     }
   }
   ```

2. **Create profile on signup** (trigger)

   **Option A: Database trigger** (Recommended)
   ```sql
   -- Create function to call from trigger
   CREATE OR REPLACE FUNCTION create_user_late_profile()
   RETURNS TRIGGER AS $$
   BEGIN
     -- Late profile creation will be handled by backend webhook
     -- Just ensure user row exists
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;

   CREATE TRIGGER on_auth_user_created
     AFTER INSERT ON auth.users
     FOR EACH ROW
     EXECUTE FUNCTION create_user_late_profile();
   ```

   **Option B: Backend webhook** (Implemented)
   - Listen to Supabase Auth webhooks
   - On `user.created` event, call Late.dev API
   - Update `users.late_profile_id`

3. **Implement signup webhook handler** (`server/routes.ts`)
   ```typescript
   app.post('/api/auth/webhook', async (req, res) => {
     const event = req.body

     if (event.type === 'user.created') {
       const { id: userId, email } = event.user

       // Create Late profile
       const { profileId } = await lateService.createProfile(email)

       // Update user record
       await db.update(users)
         .set({ late_profile_id: profileId })
         .where(eq(users.id, userId))
     }

     res.json({ received: true })
   })
   ```

4. **Configure webhook in Supabase Dashboard**
   - Navigate to: Authentication → Webhooks
   - Add webhook URL: `https://streamline.onrender.com/api/auth/webhook`
   - Enable `user.created` event
   - Add webhook secret for validation

5. **Update social posting logic**
   ```typescript
   // Get user's Late profile
   const user = await db.query.users.findFirst({
     where: eq(users.id, req.userId)
   })

   if (!user.late_profile_id) {
     return res.status(400).json({ error: 'No Late profile configured' })
   }

   // Use user's profile for posting
   await lateService.postToInstagram(
     user.late_profile_id,
     user.late_account_id, // Will be null until they connect account
     videoUrl,
     caption
   )
   ```

**Deliverables:**
- ✅ Late.dev profile created automatically on signup
- ✅ `users.late_profile_id` populated for all new users
- ✅ Social posting uses user's profile instead of global profile
- ✅ Webhook handler for `user.created` event

**Testing:**
- Sign up with new test account
- Check `users` table - verify `late_profile_id` is populated
- Verify Late.dev dashboard shows new profile
- Test that old global profile is no longer used

**Rollback Plan:**
- Remove webhook handler
- Revert to using `LATE_BASE_PROFILE_ID` from environment
- Late.dev profile creation becomes manual

---

### Phase 6: Usage Limits & Tracking (Free Tier)

**Goal:** Enforce 3 videos/month and 3 posts/month limits for free users before Stripe integration

**Dependencies:**
- Phase 5 complete (user profiles working)

**Tasks:**

1. **Create usage tracking functions** (`server/services/usageLimits.ts`)
   ```typescript
   export async function checkVideoLimit(userId: string): Promise<boolean> {
     const month = new Date().toISOString().slice(0, 7) // YYYY-MM

     const usage = await db.query.userUsage.findFirst({
       where: and(
         eq(userUsage.userId, userId),
         eq(userUsage.month, month)
       )
     })

     return (usage?.videos_created || 0) < 3
   }

   export async function checkPostLimit(userId: string): Promise<boolean> {
     const month = new Date().toISOString().slice(0, 7)

     const usage = await db.query.userUsage.findFirst({
       where: and(
         eq(userUsage.userId, userId),
         eq(userUsage.month, month)
       )
     })

     return (usage?.posts_created || 0) < 3
   }

   export async function incrementVideoUsage(userId: string) {
     const month = new Date().toISOString().slice(0, 7)

     await db.insert(userUsage)
       .values({
         userId,
         month,
         videos_created: 1,
         posts_created: 0
       })
       .onConflictDoUpdate({
         target: [userUsage.userId, userUsage.month],
         set: {
           videos_created: sql`user_usage.videos_created + 1`,
           updated_at: new Date()
         }
       })
   }

   export async function incrementPostUsage(userId: string) {
     const month = new Date().toISOString().slice(0, 7)

     await db.insert(userUsage)
       .values({
         userId,
         month,
         videos_created: 0,
         posts_created: 1
       })
       .onConflictDoUpdate({
         target: [userUsage.userId, userUsage.month],
         set: {
           posts_created: sql`user_usage.posts_created + 1`,
           updated_at: new Date()
         }
       })
   }
   ```

2. **Add limit checks to endpoints**

   **POST /api/videos**
   ```typescript
   const canCreateVideo = await checkVideoLimit(req.userId)
   if (!canCreateVideo) {
     return res.status(403).json({
       error: 'Monthly video limit reached',
       message: 'Free plan allows 3 videos per month. Upgrade to Pro for unlimited.',
       limit: 3
     })
   }

   // Create video task...
   await incrementVideoUsage(req.userId)
   ```

   **POST /api/social/post**
   ```typescript
   const canPost = await checkPostLimit(req.userId)
   if (!canPost) {
     return res.status(403).json({
       error: 'Monthly post limit reached',
       message: 'Free plan allows 3 posts per month. Upgrade to Pro for unlimited.',
       limit: 3
     })
   }

   // Post to social...
   await incrementPostUsage(req.userId)
   ```

3. **Add usage display to frontend**
   - Create `/api/usage` endpoint
   - Display usage widget: "2/3 videos this month"
   - Show upgrade CTA when limit reached

4. **Bypass limits for pro users** (future Stripe integration)
   ```typescript
   const user = await db.query.users.findFirst({
     where: eq(users.id, req.userId)
   })

   if (user.subscription_status === 'pro') {
     // Skip limit check
   } else {
     // Enforce free tier limits
   }
   ```

**Deliverables:**
- ✅ `user_usage` table tracking videos_created and posts_created per month
- ✅ Limit checks on POST /api/videos and POST /api/social/post
- ✅ Clear error messages when limits exceeded
- ✅ Frontend displays current usage

**Testing:**
- Sign up as free user
- Create 3 video tasks - 4th should fail with 403
- Create 3 social posts - 4th should fail with 403
- Verify usage resets next month (manually update month or wait)

**Rollback Plan:**
- Remove limit checks from endpoints
- Drop `user_usage` table
- Return to unlimited free usage

---

### Phase 7: Testing, QA & Production Hardening

**Goal:** Comprehensive testing, security audit, deployment to production

**Dependencies:**
- Phases 1-6 complete

**Tasks:**

1. **Manual QA Checklist** (see Section 8)
   - User signup flow
   - User login flow
   - Data isolation verification
   - Late.dev profile creation
   - Usage limits enforcement
   - Session persistence
   - Logout functionality

2. **Security Audit**
   - ✅ RLS policies enabled and tested
   - ✅ Service role key never exposed to frontend
   - ✅ CORS configured correctly
   - ✅ SQL injection prevention (parameterized queries)
   - ✅ XSS prevention (React auto-escapes)
   - ✅ JWT token validation on backend
   - ✅ HTTPS enforced in production

3. **Performance Testing**
   - Load test auth endpoints
   - Verify RLS doesn't significantly slow queries
   - Check database indexes on user_id columns

4. **Error Handling & Logging**
   - Log all authentication errors
   - Monitor failed login attempts
   - Alert on RLS policy violations
   - Track API errors in Sentry/LogRocket

5. **Documentation**
   - Update API documentation with auth requirements
   - Document environment variables for deployment
   - Create runbook for common issues

6. **Deployment**
   - Add Supabase env vars to Render
   - Deploy to production
   - Smoke test all flows
   - Monitor logs for errors

**Deliverables:**
- ✅ All QA tests passing
- ✅ Security audit complete
- ✅ Deployed to production
- ✅ Monitoring and alerting configured
- ✅ Documentation updated

**Testing:** See Section 8 (Acceptance Criteria)

**Rollback Plan:**
- Revert to previous deployment
- Disable auth in Supabase
- Use previous database schema

---

## 4. RLS Policy Examples

### 4.1 Users Table

```sql
-- Users can read their own profile
CREATE POLICY "Users can view own profile"
ON public.users FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.users FOR UPDATE
USING (auth.uid() = id);

-- Users cannot delete themselves (admin only)
-- Service role can do anything (bypasses RLS)
```

### 4.2 Tasks Table

```sql
-- Users can view their own tasks
CREATE POLICY "Users can view own tasks"
ON tasks FOR SELECT
USING (auth.uid() = user_id);

-- Users can create tasks for themselves
CREATE POLICY "Users can create own tasks"
ON tasks FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own tasks
CREATE POLICY "Users can update own tasks"
ON tasks FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own tasks
CREATE POLICY "Users can delete own tasks"
ON tasks FOR DELETE
USING (auth.uid() = user_id);
```

### 4.3 Projects Table

```sql
-- Users can view their own projects
CREATE POLICY "Users can view own projects"
ON projects FOR SELECT
USING (auth.uid() = user_id);

-- Users cannot directly create projects (created by Klap API callback)
-- But need INSERT policy for service role operations
CREATE POLICY "Users can create own projects"
ON projects FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own projects
CREATE POLICY "Users can update own projects"
ON projects FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own projects
CREATE POLICY "Users can delete own projects"
ON projects FOR DELETE
USING (auth.uid() = user_id);
```

### 4.4 Social Posts Table

```sql
-- Users can view their own posts
CREATE POLICY "Users can view own posts"
ON social_posts FOR SELECT
USING (auth.uid() = user_id);

-- Users can create posts for themselves
CREATE POLICY "Users can create own posts"
ON social_posts FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own posts
CREATE POLICY "Users can update own posts"
ON social_posts FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own posts
CREATE POLICY "Users can delete own posts"
ON social_posts FOR DELETE
USING (auth.uid() = user_id);
```

### 4.5 Exports Table

```sql
-- Users can view their own exports
CREATE POLICY "Users can view own exports"
ON exports FOR SELECT
USING (auth.uid() = user_id);

-- Users can create exports for themselves
CREATE POLICY "Users can create own exports"
ON exports FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own exports
CREATE POLICY "Users can update own exports"
ON exports FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own exports
CREATE POLICY "Users can delete own exports"
ON exports FOR DELETE
USING (auth.uid() = user_id);
```

### 4.6 Folders Table

```sql
-- Users can view their own folders
CREATE POLICY "Users can view own folders"
ON folders FOR SELECT
USING (auth.uid() = user_id);

-- Users can create folders for themselves
CREATE POLICY "Users can create own folders"
ON folders FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own folders
CREATE POLICY "Users can update own folders"
ON folders FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own folders
CREATE POLICY "Users can delete own folders"
ON folders FOR DELETE
USING (auth.uid() = user_id);
```

### 4.7 User Usage Table

```sql
-- Users can view their own usage
CREATE POLICY "Users can view own usage"
ON user_usage FOR SELECT
USING (auth.uid() = user_id);

-- Only service role can insert/update usage (backend only)
-- No INSERT/UPDATE policies for users
```

---

## 5. Migrations Plan

### 5.1 Migration File Structure

```
supabase/
  migrations/
    20251028190011_init_users_table.sql        (existing, will be replaced)
    20251029000000_auth_schema_uuid_migration.sql  (new, comprehensive)
```

### 5.2 Complete Migration SQL

**File:** `supabase/migrations/20251029000000_auth_schema_uuid_migration.sql`

```sql
-- ============================================
-- STREAMLINE AUTH MIGRATION
-- Migrates from INTEGER user IDs to UUID
-- Adds RLS policies for multi-tenant isolation
-- ============================================

-- Step 1: Drop existing users table (INTEGER-based)
DROP TABLE IF EXISTS public.users CASCADE;

-- Step 2: Create new users table (UUID-based, synced with auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  late_profile_id TEXT,              -- Late.dev profile ID
  late_account_id TEXT,               -- Connected social account ID
  stripe_customer_id TEXT,            -- For future Stripe integration
  subscription_status TEXT DEFAULT 'free', -- free, trial, pro
  subscription_ends_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Step 3: Create user_usage table for free tier limits
CREATE TABLE user_usage (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- Format: 'YYYY-MM'
  videos_created INTEGER DEFAULT 0,
  posts_created INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, month)
);

CREATE INDEX idx_user_usage_user_month ON user_usage(user_id, month);

-- Step 4: Modify tasks table - add UUID user_id
ALTER TABLE tasks DROP COLUMN IF EXISTS user_id;
ALTER TABLE tasks ADD COLUMN user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE;
CREATE INDEX idx_tasks_user_id ON tasks(user_id);

-- Step 5: Add user_id to folders table
ALTER TABLE folders ADD COLUMN user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE;
CREATE INDEX idx_folders_user_id ON folders(user_id);

-- Step 6: Add user_id to projects table
ALTER TABLE projects ADD COLUMN user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE;
CREATE INDEX idx_projects_user_id ON projects(user_id);

-- Step 7: Add user_id to exports table
ALTER TABLE exports ADD COLUMN user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE;
CREATE INDEX idx_exports_user_id ON exports(user_id);

-- Step 8: Add user_id to social_posts table
ALTER TABLE social_posts ADD COLUMN user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE;
CREATE INDEX idx_social_posts_user_id ON social_posts(user_id);

-- Step 9: Add user_id to api_logs table (optional, for admin tracking)
ALTER TABLE api_logs ADD COLUMN user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
CREATE INDEX idx_api_logs_user_id ON api_logs(user_id);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES - USERS TABLE
-- ============================================

CREATE POLICY "Users can view own profile"
ON public.users FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.users FOR UPDATE
USING (auth.uid() = id);

-- ============================================
-- RLS POLICIES - TASKS TABLE
-- ============================================

CREATE POLICY "Users can view own tasks"
ON tasks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tasks"
ON tasks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
ON tasks FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks"
ON tasks FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES - FOLDERS TABLE
-- ============================================

CREATE POLICY "Users can view own folders"
ON folders FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own folders"
ON folders FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own folders"
ON folders FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own folders"
ON folders FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES - PROJECTS TABLE
-- ============================================

CREATE POLICY "Users can view own projects"
ON projects FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects"
ON projects FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
ON projects FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
ON projects FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES - EXPORTS TABLE
-- ============================================

CREATE POLICY "Users can view own exports"
ON exports FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own exports"
ON exports FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exports"
ON exports FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own exports"
ON exports FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES - SOCIAL_POSTS TABLE
-- ============================================

CREATE POLICY "Users can view own posts"
ON social_posts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own posts"
ON social_posts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts"
ON social_posts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
ON social_posts FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES - USER_USAGE TABLE
-- ============================================

CREATE POLICY "Users can view own usage"
ON user_usage FOR SELECT
USING (auth.uid() = user_id);

-- No INSERT/UPDATE policies - only service role can modify

-- ============================================
-- TRIGGERS - Auto-create user profile
-- ============================================

-- Function to create public.users entry when auth.users entry is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
```

### 5.3 Migration Commands

```bash
# Create migration file
supabase migration new auth_schema_uuid_migration

# Edit the file and paste SQL above

# Push to Supabase
supabase db push

# Verify migration applied
supabase db list

# Check RLS policies
supabase db diff
```

### 5.4 Rollback Strategy

```bash
# Reset database to previous state
supabase db reset

# Or manually drop changes
psql $DATABASE_URL <<EOF
  DROP TABLE IF EXISTS user_usage CASCADE;
  ALTER TABLE tasks DROP COLUMN IF EXISTS user_id;
  ALTER TABLE folders DROP COLUMN IF EXISTS user_id;
  ALTER TABLE projects DROP COLUMN IF EXISTS user_id;
  ALTER TABLE exports DROP COLUMN IF EXISTS user_id;
  ALTER TABLE social_posts DROP COLUMN IF EXISTS user_id;
  ALTER TABLE api_logs DROP COLUMN IF EXISTS user_id;
  -- Recreate old users table with INTEGER id
EOF
```

---

## 6. Frontend Work Plan

### 6.1 Files to Create

**Authentication:**
- `client/src/lib/supabase.ts` - Supabase client configuration
- `client/src/contexts/AuthContext.tsx` - Auth state management
- `client/src/hooks/useAuth.ts` - Auth hook for components
- `client/src/pages/auth/LoginPage.tsx` - Login form
- `client/src/pages/auth/SignupPage.tsx` - Signup form
- `client/src/components/ProtectedRoute.tsx` - Route guard

**UI Components:**
- `client/src/components/Header.tsx` - Navigation with user menu
- `client/src/components/UserMenu.tsx` - Dropdown with logout
- `client/src/components/UsageWidget.tsx` - Display current usage (2/3 videos)

### 6.2 Supabase Client Setup

**File:** `client/src/lib/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

**Environment file:** `.env` (add these)

```bash
VITE_SUPABASE_URL=https://hfnmgonoxkjaqlelnqwc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 6.3 Auth Context Provider

**File:** `client/src/contexts/AuthContext.tsx`

```typescript
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
```

### 6.4 Protected Route Component

**File:** `client/src/components/ProtectedRoute.tsx`

```typescript
import { useAuth } from '@/contexts/AuthContext'
import { Redirect } from 'wouter'

export function ProtectedRoute({ component: Component, ...props }: any) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  if (!user) {
    return <Redirect to="/auth/login" />
  }

  return <Component {...props} />
}
```

### 6.5 Login Page

**File:** `client/src/pages/auth/LoginPage.tsx`

```typescript
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useLocation } from 'wouter'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const [, navigate] = useLocation()
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await signIn(email, password)
      navigate('/')
    } catch (error: any) {
      toast({
        title: 'Login failed',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login to Streamline</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
          <p className="mt-4 text-sm text-center">
            Don't have an account?{' '}
            <a href="/auth/signup" className="text-blue-600 hover:underline">
              Sign up
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

### 6.6 Signup Page

**File:** `client/src/pages/auth/SignupPage.tsx`

```typescript
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useLocation } from 'wouter'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()
  const [, navigate] = useLocation()
  const { toast } = useToast()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await signUp(email, password)
      toast({
        title: 'Account created!',
        description: 'You can now log in and start creating content.'
      })
      navigate('/auth/login')
    } catch (error: any) {
      toast({
        title: 'Signup failed',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder="Password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Sign up'}
            </Button>
          </form>
          <p className="mt-4 text-sm text-center">
            Already have an account?{' '}
            <a href="/auth/login" className="text-blue-600 hover:underline">
              Login
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

### 6.7 Update App.tsx

**File:** `client/src/App.tsx`

```typescript
import { Switch, Route, Redirect } from "wouter"
import { QueryClientProvider } from "@tanstack/react-query"
import { queryClient } from "./lib/queryClient"
import { Toaster } from "@/components/ui/toaster"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AuthProvider } from "@/contexts/AuthContext"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import HomePage from "@/pages/HomePage"
import VideoListPage from "@/pages/VideoListPage"
import VideoDetailPage from "@/pages/VideoDetailPage"
import LoginPage from "@/pages/auth/LoginPage"
import SignupPage from "@/pages/auth/SignupPage"
import NotFound from "@/pages/not-found"

function Router() {
  return (
    <Switch>
      <Route path="/auth/login" component={LoginPage} />
      <Route path="/auth/signup" component={SignupPage} />
      <Route path="/">
        {() => <ProtectedRoute component={HomePage} />}
      </Route>
      <Route path="/videos">
        {() => <ProtectedRoute component={VideoListPage} />}
      </Route>
      <Route path="/details/:id">
        {(params) => <ProtectedRoute component={VideoDetailPage} params={params} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
```

### 6.8 Session Usage Pattern

All API calls must include the session token:

```typescript
// In React Query mutations/queries
const { session } = useAuth()

const { data } = useQuery({
  queryKey: ['videos'],
  queryFn: async () => {
    const res = await fetch('/api/videos', {
      headers: {
        'Authorization': `Bearer ${session?.access_token}`
      }
    })
    return res.json()
  }
})
```

---

## 7. Backend Work Plan

### 7.1 Files to Create/Modify

**New Files:**
- `server/services/supabaseAuth.ts` - Supabase admin client
- `server/middleware/auth.ts` - Auth middleware
- `server/services/usageLimits.ts` - Usage tracking functions

**Files to Modify:**
- `server/routes.ts` - Apply auth middleware, update all endpoints
- `server/services/late.ts` - Add createProfile method, use user's profileId
- `shared/schema.ts` - Update users table schema in Drizzle

### 7.2 Supabase Server Client

**File:** `server/services/supabaseAuth.ts`

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables')
}

// Admin client - bypasses RLS, use carefully
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
```

### 7.3 Auth Middleware

**File:** `server/middleware/auth.ts`

```typescript
import { Request, Response, NextFunction } from 'express'
import { supabaseAdmin } from '../services/supabaseAuth'

declare global {
  namespace Express {
    interface Request {
      userId?: string
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization token' })
    }

    const token = authHeader.split('Bearer ')[1]

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    req.userId = user.id
    next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    return res.status(500).json({ error: 'Authentication failed' })
  }
}
```

### 7.4 Update Routes

**File:** `server/routes.ts`

```typescript
import { requireAuth } from './middleware/auth'

// Remove DEFAULT_USER_ID constant
// const DEFAULT_USER_ID = 1; // ❌ DELETE THIS

// Apply auth middleware to all API routes
app.use('/api/*', requireAuth)

// Update endpoints to use req.userId

// Example: POST /api/videos
app.post('/api/videos', async (req, res) => {
  const { sourceVideoUrl, autoExport } = req.body

  // Check usage limits
  const canCreate = await checkVideoLimit(req.userId!)
  if (!canCreate) {
    return res.status(403).json({
      error: 'Monthly video limit reached',
      message: 'Free plan allows 3 videos per month. Upgrade to Pro for unlimited.',
      limit: 3
    })
  }

  // Create task with authenticated user
  const task = await db.insert(tasks).values({
    id: taskId,
    userId: req.userId!, // ✅ Use authenticated user
    sourceVideoUrl,
    status: 'processing',
    autoExportRequested: autoExport ? 'true' : 'false'
  })

  // Increment usage
  await incrementVideoUsage(req.userId!)

  res.json({ taskId, status: 'processing' })
})

// Example: GET /api/videos
app.get('/api/videos', async (req, res) => {
  const userTasks = await db.select()
    .from(tasks)
    .where(eq(tasks.userId, req.userId!)) // ✅ Filter by user
    .orderBy(desc(tasks.createdAt))

  res.json(userTasks)
})

// Example: GET /api/videos/:id
app.get('/api/videos/:id', async (req, res) => {
  const { id } = req.params

  const task = await db.query.tasks.findFirst({
    where: and(
      eq(tasks.id, id),
      eq(tasks.userId, req.userId!) // ✅ Verify ownership
    ),
    with: {
      projects: true,
      // ... other relations
    }
  })

  if (!task) {
    return res.status(404).json({ error: 'Task not found' })
  }

  res.json(task)
})

// Example: POST /api/social/post
app.post('/api/social/post', async (req, res) => {
  const { projectId, caption } = req.body

  // Check usage limits
  const canPost = await checkPostLimit(req.userId!)
  if (!canPost) {
    return res.status(403).json({
      error: 'Monthly post limit reached',
      message: 'Free plan allows 3 posts per month. Upgrade to Pro for unlimited.',
      limit: 3
    })
  }

  // Verify user owns project
  const project = await db.query.projects.findFirst({
    where: and(
      eq(projects.id, projectId),
      eq(projects.userId, req.userId!) // ✅ Verify ownership
    )
  })

  if (!project) {
    return res.status(404).json({ error: 'Project not found' })
  }

  // Get user's Late profile
  const user = await db.query.users.findFirst({
    where: eq(users.id, req.userId!)
  })

  if (!user?.late_profile_id) {
    return res.status(400).json({ error: 'No Late profile configured' })
  }

  if (!user?.late_account_id) {
    return res.status(400).json({
      error: 'No social account connected',
      message: 'Please connect your Instagram account first'
    })
  }

  // Post using user's profile
  const result = await lateService.postToInstagram(
    user.late_profile_id,
    user.late_account_id,
    exportUrl,
    caption
  )

  // Increment usage
  await incrementPostUsage(req.userId!)

  res.json(result)
})
```

### 7.5 Update Drizzle Schema

**File:** `shared/schema.ts`

```typescript
// Replace users table definition
export const users = pgTable("users", {
  id: text("id").primaryKey(), // UUID from auth.users
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  lateProfileId: text("late_profile_id"),
  lateAccountId: text("late_account_id"),
  stripeCustomerId: text("stripe_customer_id"),
  subscriptionStatus: text("subscription_status").default("free"),
  subscriptionEndsAt: timestamp("subscription_ends_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Update tasks table - change userId to text (UUID)
export const tasks = pgTable("tasks", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  // ... rest of columns
});

// Add userUsage table
export const userUsage = pgTable("user_usage", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  month: text("month").notNull(), // YYYY-MM
  videosCreated: integer("videos_created").default(0),
  postsCreated: integer("posts_created").default(0),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
}, (table) => ({
  userMonthUnique: unique().on(table.userId, table.month)
}));
```

### 7.6 Usage Limits Service

**File:** `server/services/usageLimits.ts`

```typescript
import { db } from '../db'
import { userUsage, users } from '@shared/schema'
import { eq, and, sql } from 'drizzle-orm'

const FREE_VIDEO_LIMIT = 3
const FREE_POST_LIMIT = 3

function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7) // YYYY-MM
}

export async function checkVideoLimit(userId: string): Promise<boolean> {
  // Check if user is pro
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId)
  })

  if (user?.subscriptionStatus === 'pro') {
    return true // No limits for pro users
  }

  const month = getCurrentMonth()
  const usage = await db.query.userUsage.findFirst({
    where: and(
      eq(userUsage.userId, userId),
      eq(userUsage.month, month)
    )
  })

  return (usage?.videosCreated || 0) < FREE_VIDEO_LIMIT
}

export async function checkPostLimit(userId: string): Promise<boolean> {
  // Check if user is pro
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId)
  })

  if (user?.subscriptionStatus === 'pro') {
    return true // No limits for pro users
  }

  const month = getCurrentMonth()
  const usage = await db.query.userUsage.findFirst({
    where: and(
      eq(userUsage.userId, userId),
      eq(userUsage.month, month)
    )
  })

  return (usage?.postsCreated || 0) < FREE_POST_LIMIT
}

export async function incrementVideoUsage(userId: string) {
  const month = getCurrentMonth()

  await db.insert(userUsage)
    .values({
      userId,
      month,
      videosCreated: 1,
      postsCreated: 0
    })
    .onConflictDoUpdate({
      target: [userUsage.userId, userUsage.month],
      set: {
        videosCreated: sql`user_usage.videos_created + 1`,
        updatedAt: new Date()
      }
    })
}

export async function incrementPostUsage(userId: string) {
  const month = getCurrentMonth()

  await db.insert(userUsage)
    .values({
      userId,
      month,
      videosCreated: 0,
      postsCreated: 1
    })
    .onConflictDoUpdate({
      target: [userUsage.userId, userUsage.month],
      set: {
        postsCreated: sql`user_usage.posts_created + 1`,
        updatedAt: new Date()
      }
    })
}

export async function getCurrentUsage(userId: string) {
  const month = getCurrentMonth()

  const usage = await db.query.userUsage.findFirst({
    where: and(
      eq(userUsage.userId, userId),
      eq(userUsage.month, month)
    )
  })

  return {
    month,
    videosCreated: usage?.videosCreated || 0,
    videosLimit: FREE_VIDEO_LIMIT,
    postsCreated: usage?.postsCreated || 0,
    postsLimit: FREE_POST_LIMIT
  }
}
```

### 7.7 Update Late.dev Service

**File:** `server/services/late.ts`

```typescript
// Add createProfile method
export const lateService = {
  async createProfile(email: string): Promise<{ profileId: string }> {
    const response = await fetch('https://getlate.dev/api/v1/profiles', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.LATE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    })

    if (!response.ok) {
      throw new Error(`Late.dev profile creation failed: ${response.statusText}`)
    }

    const data = await response.json()
    return { profileId: data.id }
  },

  // Update postToInstagram to use profileId and accountId
  async postToInstagram(
    profileId: string,
    accountId: string,
    videoUrl: string,
    caption: string
  ): Promise<LatePostResponse> {
    const response = await fetch('https://getlate.dev/api/v1/posts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.LATE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        profileId,
        accountId,
        videoUrl,
        caption,
        publishNow: true
      })
    })

    return response.json()
  }
}
```

---

## 8. Acceptance Criteria & Test Matrix

### 8.1 Must-Pass Checks

#### Auth Flow
- ✅ User can sign up with email/password
- ✅ User receives confirmation (auto-confirm enabled, no email needed)
- ✅ User can log in with correct credentials
- ✅ User cannot log in with incorrect credentials
- ✅ User session persists across page refreshes
- ✅ User can log out
- ✅ Logged-out user is redirected to /auth/login when accessing protected routes

#### Data Isolation
- ✅ User A creates video task → User B cannot see it
- ✅ User A creates project → User B cannot access project ID
- ✅ User A posts to social → User B cannot see post in their history
- ✅ GET /api/videos returns only logged-in user's tasks
- ✅ GET /api/videos/:id returns 404 if task belongs to different user
- ✅ Direct database query with User B's token cannot access User A's data (RLS enforced)

#### Late.dev Integration
- ✅ New user signup creates Late.dev profile automatically
- ✅ `users.late_profile_id` is populated after signup
- ✅ Social posts use user's Late profile, not global profile
- ✅ Each user can connect their own Instagram account (future)

#### Usage Limits
- ✅ Free user can create 3 videos in a month
- ✅ 4th video creation attempt returns 403 with clear error
- ✅ Free user can create 3 posts in a month
- ✅ 4th post attempt returns 403 with clear error
- ✅ Usage resets on new month
- ✅ Pro user (future) bypasses limits

### 8.2 Manual Test Steps

**Signup & Login Flow:**
```bash
1. Navigate to /auth/signup
2. Enter email: test1@example.com, password: test123
3. Click "Sign up"
4. Verify redirect to /auth/login or auto-login to /
5. Logout
6. Login again with same credentials
7. Verify successful login
```

**Data Isolation Test:**
```bash
# Terminal 1 - User A
curl -X POST http://localhost:5000/api/videos \
  -H "Authorization: Bearer <USER_A_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"sourceVideoUrl": "https://example.com/video1.mp4"}'
# Note the returned taskId

# Terminal 2 - User B
curl http://localhost:5000/api/videos/<USER_A_TASK_ID> \
  -H "Authorization: Bearer <USER_B_TOKEN>"
# Should return 404
```

**Usage Limits Test:**
```bash
# Create 3 videos (should succeed)
for i in {1..3}; do
  curl -X POST http://localhost:5000/api/videos \
    -H "Authorization: Bearer <TOKEN>" \
    -H "Content-Type: application/json" \
    -d '{"sourceVideoUrl": "https://example.com/video'$i'.mp4"}'
done

# Create 4th video (should fail with 403)
curl -X POST http://localhost:5000/api/videos \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"sourceVideoUrl": "https://example.com/video4.mp4"}'
# Expected: {"error":"Monthly video limit reached","limit":3}
```

**RLS Enforcement Test (Supabase SQL Editor):**
```sql
-- Set session to User A
SELECT set_config('request.jwt.claims', '{"sub":"<USER_A_UUID>"}', true);

-- Try to query tasks
SELECT * FROM tasks;
-- Should only return User A's tasks

-- Try to insert task for User B (should fail)
INSERT INTO tasks (id, user_id, source_video_url, status)
VALUES ('test-123', '<USER_B_UUID>', 'https://example.com/video.mp4', 'processing');
-- Expected: RLS policy violation error
```

### 8.3 Optional Automation (Future)

**Vitest Unit Tests:**
- Test auth middleware with valid/invalid/expired tokens
- Test usage limit functions (checkVideoLimit, incrementVideoUsage)
- Test Late.dev profile creation

**Playwright E2E Tests:**
- Full signup → create video → logout → login flow
- Multi-user data isolation test
- Usage limit enforcement test

---

## 9. Risks & Mitigations

### 9.1 Session Expiration

**Risk:** User sessions expire after 1 hour (Supabase default), breaking UX

**Mitigation:**
- Supabase SDK auto-refreshes tokens before expiry
- Frontend `onAuthStateChange` listener handles silent refresh
- If refresh fails, gracefully redirect to /auth/login with return URL
- Configure session duration in Supabase Dashboard (max 24 hours)

### 9.2 RLS Misconfiguration

**Risk:** Incorrectly configured RLS policies allow cross-user data access

**Mitigation:**
- Test all RLS policies in Supabase SQL Editor before production
- Use `auth.uid()` consistently in all policies
- Never use `user_id = '...'` with hardcoded UUIDs in policies
- Enable RLS on ALL tables, even if service role is primary accessor
- Audit RLS policies quarterly

### 9.3 Leaked Service Role Key

**Risk:** `SUPABASE_SERVICE_ROLE_KEY` exposed to frontend bypasses RLS entirely

**Mitigation:**
- **NEVER** include service role key in frontend code or env vars
- Only use `SUPABASE_ANON_KEY` on frontend
- Store service role key only in Render environment variables
- Add .env to .gitignore (already done)
- Rotate keys immediately if leaked

### 9.4 Migration Failures

**Risk:** Migration adds `user_id NOT NULL` to tables with existing data, fails due to null constraint

**Mitigation:**
- **Backup database** before migration (export from Neon)
- Run migration on staging environment first
- If production has existing data:
  - Add `user_id` as nullable first
  - Backfill existing rows with a placeholder UUID
  - Then add NOT NULL constraint
- Test rollback procedure before production migration

### 9.5 Late.dev API Failures

**Risk:** Late.dev profile creation fails during signup, leaving user without profile

**Mitigation:**
- Make Late profile creation async (webhook approach)
- If creation fails, log error and retry later via cron job
- Allow users to manually trigger profile creation from settings
- Display clear error if posting attempted without profile

### 9.6 Usage Limit Bypass

**Risk:** Users create multiple accounts to bypass free tier limits

**Mitigation:**
- Require email verification (Phase 2 improvement)
- Rate limit signup endpoint (1 account per IP per hour)
- Monitor for suspicious patterns (same IP, similar usernames)
- Stripe integration makes this less critical (paying users have no limits)

### 9.7 CORS Issues

**Risk:** Frontend can't make authenticated requests to backend due to CORS

**Mitigation:**
- Configure CORS in `server/index.ts`:
  ```typescript
  app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
  }))
  ```
- Set `CLIENT_URL` in Render environment to production frontend URL

### 9.8 Database Performance

**Risk:** RLS policies slow down queries at scale

**Mitigation:**
- All `user_id` columns are indexed (done in migration)
- RLS policies use simple equality checks (`auth.uid() = user_id`)
- Monitor slow query log in Supabase Dashboard
- Consider materialized views for complex queries if needed

---

## 10. Timeline & Effort Estimates

### 10.1 Phase Breakdown

| Phase | Tasks | Estimated Hours | Dependencies |
|-------|-------|-----------------|--------------|
| **Phase 1** | Schema migration, RLS policies | 3-4 hours | Supabase CLI linked ✅ |
| **Phase 2** | Enable Supabase Auth, install SDK | 1-2 hours | Phase 1 complete |
| **Phase 3** | Frontend auth UI, AuthProvider | 4-5 hours | Phase 2 complete |
| **Phase 4** | Backend API protection, user scoping | 5-6 hours | Phase 3 complete |
| **Phase 5** | Late.dev per-user profiles | 2-3 hours | Phase 4 complete |
| **Phase 6** | Usage limits & tracking | 3-4 hours | Phase 5 complete |
| **Phase 7** | Testing, QA, deployment | 4-5 hours | Phase 6 complete |
| **TOTAL** | | **22-29 hours** | ~3-4 days |

### 10.2 Critical Path

**Day 1 (6-8 hours):**
- Phase 1: Schema migration ✅
- Phase 2: Enable Supabase Auth ✅
- Start Phase 3: Frontend auth pages

**Day 2 (6-8 hours):**
- Complete Phase 3: AuthProvider, protected routes ✅
- Phase 4: Backend auth middleware, update endpoints

**Day 3 (5-7 hours):**
- Complete Phase 4: All endpoints user-scoped ✅
- Phase 5: Late.dev profiles ✅
- Phase 6: Usage limits

**Day 4 (5-6 hours):**
- Complete Phase 6: Usage tracking frontend ✅
- Phase 7: Testing, QA, deployment ✅

### 10.3 Parallelization Opportunities

- **Frontend + Backend:** Different developers can work on Phase 3 (frontend) and Phase 4 (backend) simultaneously after Phase 2 is complete
- **Testing:** Start writing test cases during Phase 3-4, run during Phase 7
- **Documentation:** Update API docs as endpoints are modified

### 10.4 Stripe Integration (Future)

**Not included in this plan, but estimated:**
- Add Stripe SDK: 1 hour
- Create checkout session endpoint: 2 hours
- Handle webhooks (subscription.created, subscription.deleted): 3 hours
- Update usage limit checks to respect subscription: 2 hours
- Frontend pricing page and checkout flow: 4 hours
- **Total:** ~12-15 hours (add as Phase 8 after auth is live)

---

## Appendix A: Quick Reference

### Environment Variables Checklist

**Render (Backend):**
```bash
SUPABASE_URL=https://hfnmgonoxkjaqlelnqwc.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci... (secret)
LATE_API_KEY=sk_4db1d4d490bb7515200e27057ce812940413dada899c06215ed761bd5bbc3bd3
KLAP_API_KEY=kak_vHVRyhIsXheSTnXfkkQJNxsd
DATABASE_URL=postgresql://... (Neon or Supabase)
```

**Frontend (.env):**
```bash
VITE_SUPABASE_URL=https://hfnmgonoxkjaqlelnqwc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci... (public)
```

### Key Commands

```bash
# Migration
supabase migration new auth_schema_uuid_migration
supabase db push
supabase db reset  # Rollback

# Install dependencies
npm install @supabase/supabase-js

# Database schema sync (Drizzle)
npm run db:push

# Run locally
npm run dev

# Deploy to Render
git push origin main  # Auto-deploys via GitHub integration
```

### Supabase Dashboard Links

- **Project:** https://supabase.com/dashboard/project/hfnmgonoxkjaqlelnqwc
- **Auth Settings:** https://supabase.com/dashboard/project/hfnmgonoxkjaqlelnqwc/auth/providers
- **Database:** https://supabase.com/dashboard/project/hfnmgonoxkjaqlelnqwc/editor
- **SQL Editor:** https://supabase.com/dashboard/project/hfnmgonoxkjaqlelnqwc/sql

---

## Summary

This implementation plan provides a **complete roadmap** for adding multi-tenant authentication to Streamline MVP using Supabase Auth. Key decisions:

✅ **UUID-based users** (replacing INTEGER)
✅ **Auto-confirm emails** (MVP speed)
✅ **Free tier: 3 videos + 3 posts/month**
✅ **Late profile created on signup** (immediate)
✅ **RLS enforced on all tables** (true multi-tenancy)

**Estimated effort:** 22-29 hours (~3-4 days)

**Next step:** Execute Phase 1 (schema migration) by running the migration SQL in Section 5.2.

---

**End of Document**
