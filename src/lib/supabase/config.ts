/**
 * Canonical Supabase Configuration & Fallbacks
 * 
 * Ensures that even if environment variables in Vercel or local environments
 * are missing, empty, or misconfigured, the application connects reliably to the
 * project instance without runtime failure.
 */

export const DEFAULT_SUPABASE_URL = 'https://octtjcjpsporndodwjmb.supabase.co';

export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jdHRqY2pwc3Bvcm5kb2R3am1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzMTkwMjMsImV4cCI6MjEwNzg5NTAyM30.kktzDnfhD9h5nAna9Y2-UazO_XwoULRlEdFwI-fq_bw';

export const DEFAULT_SUPABASE_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jdHRqY2pwc3Bvcm5kb2R3am1iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjMxOTAyMywiZXhwIjoyMTA3ODk1MDIzfQ.XSimS5EuSzkoUG9Red_UNUyShPAll8_lna8RMeuTbWI';

function cleanEnvVal(val: string | undefined): string | undefined {
  if (!val) return undefined;
  const trimmed = val.trim().replace(/^["']|["']$/g, '');
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return undefined;
  return trimmed;
}

export function getResolvedSupabaseUrl(): string {
  const candidate =
    cleanEnvVal(process.env.NEXT_PUBLIC_SUPABASE_URL) ||
    cleanEnvVal(process.env.SUPABASE_URL);

  if (!candidate) return DEFAULT_SUPABASE_URL;

  let url = candidate.replace(/\/+$/, '');
  if (url.endsWith('.supabase.com')) {
    url = url.replace('.supabase.com', '.supabase.co');
  }

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return DEFAULT_SUPABASE_URL;
  }

  return url;
}

export function isValidJwtKey(key: string | undefined, expectedRole?: 'anon' | 'service_role'): boolean {
  const cleaned = cleanEnvVal(key);
  if (!cleaned || cleaned.length < 30) return false;

  const parts = cleaned.split('.');
  if (parts.length !== 3) return false;

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
    const jsonStr = typeof atob !== 'undefined'
      ? atob(padded)
      : Buffer.from(padded, 'base64').toString('utf-8');
    const payload = JSON.parse(jsonStr);

    if (payload.ref && payload.ref !== 'octtjcjpsporndodwjmb') {
      return false;
    }
    if (expectedRole && payload.role && payload.role !== expectedRole) {
      return false;
    }
    return payload.iss === 'supabase' && !!payload.role;
  } catch {
    return false;
  }
}

export function getResolvedSupabaseAnonKey(): string {
  const candidate =
    cleanEnvVal(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    cleanEnvVal(process.env.SUPABASE_ANON_KEY);

  if (candidate && isValidJwtKey(candidate, 'anon')) {
    return candidate;
  }

  return DEFAULT_SUPABASE_ANON_KEY;
}

export function getResolvedSupabaseServiceRoleKey(): string {
  const candidate =
    cleanEnvVal(process.env.SUPABASE_SERVICE_ROLE_KEY) ||
    cleanEnvVal(process.env.SERVICE_ROLE_KEY);

  if (candidate && isValidJwtKey(candidate, 'service_role')) {
    return candidate;
  }

  return DEFAULT_SUPABASE_SERVICE_ROLE_KEY;
}
