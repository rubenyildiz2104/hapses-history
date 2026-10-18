import { createBrowserClient } from '@supabase/ssr';
import { getResolvedSupabaseUrl, getResolvedSupabaseAnonKey } from './config';

export function createClient() {
  const supabaseUrl = getResolvedSupabaseUrl();
  const supabaseAnonKey = getResolvedSupabaseAnonKey();

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
