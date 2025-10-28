import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * SupabaseConnectionTest Component
 *
 * Diagnostic component to verify Supabase client connection
 * Tests if the client can query the public.users table
 *
 * Usage: Add to any page temporarily to test connection
 * <SupabaseConnectionTest />
 */
export function SupabaseConnectionTest() {
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    error: string | null;
    details: any;
  }>({
    connected: false,
    error: null,
    details: null
  });

  useEffect(() => {
    async function testConnection() {
      try {
        console.log('🔍 Testing Supabase client connection...');

        // Test 1: Check if Supabase URL is configured
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        console.log('Environment Variables:');
        console.log('- VITE_SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing');
        console.log('- VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✓ Set' : '✗ Missing');

        if (!supabaseUrl || !supabaseAnonKey) {
          throw new Error('Missing Supabase environment variables');
        }

        // Test 2: Try to query users table (should respect RLS)
        console.log('Testing query to public.users table...');
        const { data, error, count } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true });

        if (error) {
          console.error('❌ Supabase query error:', error);
          setConnectionStatus({
            connected: false,
            error: error.message,
            details: error
          });
        } else {
          console.log('✅ Supabase connected successfully!');
          console.log('User count:', count);
          setConnectionStatus({
            connected: true,
            error: null,
            details: { userCount: count }
          });
        }
      } catch (err: any) {
        console.error('❌ Supabase connection test failed:', err);
        setConnectionStatus({
          connected: false,
          error: err.message,
          details: err
        });
      }
    }

    testConnection();
  }, []);

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      padding: '16px',
      backgroundColor: connectionStatus.connected ? '#10b981' : '#ef4444',
      color: 'white',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      zIndex: 9999,
      maxWidth: '300px',
      fontSize: '14px'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
        {connectionStatus.connected ? '✅ Supabase Connected' : '❌ Supabase Disconnected'}
      </div>
      {connectionStatus.error && (
        <div style={{ fontSize: '12px', opacity: 0.9 }}>
          Error: {connectionStatus.error}
        </div>
      )}
      {connectionStatus.connected && connectionStatus.details && (
        <div style={{ fontSize: '12px', opacity: 0.9 }}>
          Users in database: {connectionStatus.details.userCount ?? 0}
        </div>
      )}
      <div style={{ fontSize: '11px', marginTop: '8px', opacity: 0.8 }}>
        Check console for detailed logs
      </div>
    </div>
  );
}
