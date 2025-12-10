-- Migration: Add brand_settings table for white-label customization
-- Created: 2025-12-09

-- Create brand_settings table
CREATE TABLE IF NOT EXISTS brand_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_name TEXT NOT NULL DEFAULT 'Streamline',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Insert default row (only if table is empty)
INSERT INTO brand_settings (app_name)
SELECT 'Streamline'
WHERE NOT EXISTS (SELECT 1 FROM brand_settings LIMIT 1);
