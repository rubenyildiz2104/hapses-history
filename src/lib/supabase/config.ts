/**
 * Canonical Supabase Configuration & Fallbacks
 * 
 * Guarantees that the application always connects directly to the valid, tested
 * Supabase instance (octtjcjpsporndodwjmb) without being affected by missing,
 * truncated, or misconfigured environment variables on deployment platforms.
 */

export const DEFAULT_SUPABASE_URL = 'https://octtjcjpsporndodwjmb.supabase.co';

export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jdHRqY2pwc3Bvcm5kb2R3am1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzMTkwMjMsImV4cCI6MjEwNzg5NTAyM30.kktzDnfhD9h5nAna9Y2-UazO_XwoULRlEdFwI-fq_bw';

export const DEFAULT_SUPABASE_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jdHRqY2pwc3Bvcm5kb2R3am1iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjMxOTAyMywiZXhwIjoyMTA3ODk1MDIzfQ.XSimS5EuSzkoUG9Red_UNUyShPAll8_lna8RMeuTbWI';

export function getResolvedSupabaseUrl(): string {
  return DEFAULT_SUPABASE_URL;
}

export function getResolvedSupabaseAnonKey(): string {
  return DEFAULT_SUPABASE_ANON_KEY;
}

export function getResolvedSupabaseServiceRoleKey(): string {
  return DEFAULT_SUPABASE_SERVICE_ROLE_KEY;
}
