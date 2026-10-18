import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const DEFAULT_SUPABASE_URL = 'https://octtjcjpsporndodwjmb.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jdHRqY2pwc3Bvcm5kb2R3am1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzMTkwMjMsImV4cCI6MjEwNzg5NTAyM30.kktzDnfhD9h5nAna9Y2-UazO_XwoULRlEdFwI-fq_bw';

function cleanEnvVar(val: string | undefined): string | undefined {
  if (!val) return undefined;
  const cleaned = val.trim().replace(/^["']|["']$/g, '');
  return cleaned || undefined;
}

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  const supabaseUrl =
    cleanEnvVar(process.env.NEXT_PUBLIC_SUPABASE_URL) ||
    cleanEnvVar(process.env.SUPABASE_URL) ||
    DEFAULT_SUPABASE_URL;

  const supabaseAnonKey =
    cleanEnvVar(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    cleanEnvVar(process.env.SUPABASE_ANON_KEY) ||
    DEFAULT_SUPABASE_ANON_KEY;

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
