import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables. Please add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to your environment.')
}

/**
 * Supabase Admin Client
 *
 * IMPORTANT: This client uses the SERVICE_ROLE_KEY which bypasses Row Level Security (RLS).
 * - Use this ONLY on the server-side
 * - NEVER expose the service role key to the frontend
 * - Use for admin operations and user validation
 *
 * The service role key grants full access to the database, bypassing all RLS policies.
 */
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
