-- Migration: Create user_usage table for tracking free tier limits
-- Date: 2025-10-28
-- Phase 6: Usage Limits & Tracking

-- Create user_usage table
CREATE TABLE IF NOT EXISTS user_usage (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- Format: YYYY-MM
  videos_created INTEGER NOT NULL DEFAULT 0,
  posts_created INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Composite primary key (user + month)
  PRIMARY KEY (user_id, month)
);

-- Create index for faster lookups by user
CREATE INDEX IF NOT EXISTS idx_user_usage_user_id ON user_usage(user_id);

-- Create index for faster lookups by month (for admin queries)
CREATE INDEX IF NOT EXISTS idx_user_usage_month ON user_usage(month);

-- Add comment for documentation
COMMENT ON TABLE user_usage IS 'Tracks monthly usage counts for free tier limits (3 videos, 3 posts per month)';
COMMENT ON COLUMN user_usage.month IS 'Month in YYYY-MM format (e.g., 2025-10)';
COMMENT ON COLUMN user_usage.videos_created IS 'Number of videos created this month';
COMMENT ON COLUMN user_usage.posts_created IS 'Number of social posts created this month';
