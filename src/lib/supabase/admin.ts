import { createClient } from '@supabase/supabase-js';

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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Configuration manquante : SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_URL');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
