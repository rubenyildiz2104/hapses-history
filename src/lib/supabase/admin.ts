import { createClient } from '@supabase/supabase-js';
import { getResolvedSupabaseUrl, getResolvedSupabaseServiceRoleKey } from './config';

/**
 * Privileged Admin Supabase Client.
 * WARNING: This client bypasses Row Level Security via the service_role key.
 * MUST ONLY be called in trusted server-side code (Server Actions, API Routes, RPCs).
 * NEVER expose to the browser!
 */
export function createAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error('FATAL: createAdminClient cannot be called from the client browser!');
  }

  const supabaseUrl = getResolvedSupabaseUrl();
  const serviceRoleKey = getResolvedSupabaseServiceRoleKey();

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
