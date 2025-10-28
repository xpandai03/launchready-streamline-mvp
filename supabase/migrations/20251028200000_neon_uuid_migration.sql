-- ============================================
-- STREAMLINE AUTH MIGRATION (NEON DATABASE)
-- Migrates from INTEGER user IDs to UUID
-- Modified for plain PostgreSQL/Neon (no Supabase auth schema)
-- ============================================

-- Step 1: Drop all existing data by dropping tables CASCADE
-- Since we're migrating from INTEGER to UUID, we need a clean slate
DROP TABLE IF EXISTS public.social_posts CASCADE;
DROP TABLE IF EXISTS public.exports CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.folders CASCADE;
DROP TABLE IF EXISTS public.api_logs CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.user_usage CASCADE;

-- Step 2: Create new users table (UUID-based)
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  late_profile_id TEXT,
  late_account_id TEXT,
  stripe_customer_id TEXT,
  subscription_status TEXT DEFAULT 'free',
  subscription_ends_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Step 3: Create user_usage table
CREATE TABLE public.user_usage (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  videos_created INTEGER DEFAULT 0,
  posts_created INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, month)
);

CREATE INDEX idx_user_usage_user_month ON user_usage(user_id, month);

-- Step 4: Recreate tasks table with UUID user_id
CREATE TABLE public.tasks (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  source_video_url TEXT NOT NULL,
  email TEXT,
  status TEXT NOT NULL,
  output_id TEXT,
  error_message TEXT,
  klap_response JSONB,
  auto_export_requested TEXT DEFAULT 'false' NOT NULL,
  auto_export_status TEXT,
  auto_export_error TEXT,
  auto_export_completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_tasks_user_id ON tasks(user_id);

-- Step 5: Recreate folders table
CREATE TABLE public.folders (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_folders_user_id ON folders(user_id);
CREATE INDEX idx_folders_task_id ON folders(task_id);

-- Step 6: Recreate projects table
CREATE TABLE public.projects (
  id TEXT PRIMARY KEY,
  folder_id TEXT NOT NULL REFERENCES public.folders(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  virality_score INTEGER,
  preview_url TEXT,
  klap_response JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_folder_id ON projects(folder_id);
CREATE INDEX idx_projects_task_id ON projects(task_id);

-- Step 7: Recreate exports table
CREATE TABLE public.exports (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  folder_id TEXT NOT NULL,
  task_id TEXT NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  src_url TEXT,
  error_message TEXT,
  klap_response JSONB,
  is_auto_export TEXT DEFAULT 'false' NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_exports_user_id ON exports(user_id);
CREATE INDEX idx_exports_project_id ON exports(project_id);
CREATE INDEX idx_exports_task_id ON exports(task_id);

-- Step 8: Recreate social_posts table
CREATE TABLE public.social_posts (
  id SERIAL PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  late_post_id TEXT,
  platform_post_url TEXT,
  caption TEXT,
  status TEXT NOT NULL,
  error_message TEXT,
  late_response JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  published_at TIMESTAMP
);

CREATE INDEX idx_social_posts_user_id ON social_posts(user_id);
CREATE INDEX idx_social_posts_project_id ON social_posts(project_id);
CREATE INDEX idx_social_posts_task_id ON social_posts(task_id);

-- Step 9: Recreate api_logs table
CREATE TABLE public.api_logs (
  id SERIAL PRIMARY KEY,
  task_id TEXT,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  request_body JSONB,
  response_body JSONB,
  status_code INTEGER,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_api_logs_user_id ON api_logs(user_id);
CREATE INDEX idx_api_logs_task_id ON api_logs(task_id);

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Note: This migration is for a plain PostgreSQL/Neon database
-- without Supabase's auth schema. User management will be handled
-- by your application layer via Supabase Auth SDK.
