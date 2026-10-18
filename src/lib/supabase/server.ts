import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getResolvedSupabaseUrl, getResolvedSupabaseAnonKey } from './config';

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  const supabaseUrl = getResolvedSupabaseUrl();
  const supabaseAnonKey = getResolvedSupabaseAnonKey();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            cookieStore.set(name, value, options as any)
          );
        } catch {
          // Handled when called from Server Components
        }
      },
    },
  });
}
