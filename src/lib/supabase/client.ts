import { createBrowserClient } from '@supabase/ssr';

const DEFAULT_SUPABASE_URL = 'https://octtjcjpsporndodwjmb.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jdHRqY2pwc3Bvcm5kb2R3am1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzMTkwMjMsImV4cCI6MjEwNzg5NTAyM30.kktzDnfhD9h5nAna9Y2-UazO_XwoULRlEdFwI-fq_bw';

function cleanEnvVar(val: string | undefined): string | undefined {
  if (!val) return undefined;
  const cleaned = val.trim().replace(/^["']|["']$/g, '');
  return cleaned || undefined;
}

export function createClient() {
  const supabaseUrl =
    cleanEnvVar(process.env.NEXT_PUBLIC_SUPABASE_URL) ||
    cleanEnvVar(process.env.SUPABASE_URL) ||
    DEFAULT_SUPABASE_URL;

  const supabaseAnonKey =
    cleanEnvVar(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    cleanEnvVar(process.env.SUPABASE_ANON_KEY) ||
    DEFAULT_SUPABASE_ANON_KEY;

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
