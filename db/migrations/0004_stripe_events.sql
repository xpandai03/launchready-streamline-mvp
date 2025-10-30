-- Migration: Create stripe_events table for webhook idempotency
-- Date: 2025-10-28
-- Purpose: Track processed Stripe webhook events to prevent duplicate processing

-- Create stripe_events table
CREATE TABLE IF NOT EXISTS stripe_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMP NOT NULL DEFAULT now(),
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Create index for fast event ID lookups
CREATE INDEX IF NOT EXISTS idx_stripe_events_event_id ON stripe_events(event_id);

-- Add comments for documentation
COMMENT ON TABLE stripe_events IS 'Tracks processed Stripe webhook events for idempotency - prevents duplicate event processing';
COMMENT ON COLUMN stripe_events.id IS 'Primary key (UUID)';
COMMENT ON COLUMN stripe_events.event_id IS 'Stripe event ID (format: evt_...) - unique identifier from Stripe';
COMMENT ON COLUMN stripe_events.event_type IS 'Stripe event type (e.g., checkout.session.completed, customer.subscription.updated)';
COMMENT ON COLUMN stripe_events.processed_at IS 'Timestamp when the event was successfully processed';
COMMENT ON COLUMN stripe_events.created_at IS 'Timestamp when the record was created';
