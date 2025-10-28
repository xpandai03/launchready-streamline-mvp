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
