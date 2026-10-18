import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/compte/propositions';
  const errorDescription = searchParams.get('error_description');

  if (errorDescription) {
    console.error('[Auth Callback] Error from auth provider:', errorDescription);
    return NextResponse.redirect(`${origin}/connexion?error=${encodeURIComponent(errorDescription)}`);
  }

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    } else {
      console.error('[Auth Callback] Code exchange error:', error.message);
      return NextResponse.redirect(`${origin}/connexion?error=${encodeURIComponent(error.message)}`);
    }
  }

  return NextResponse.redirect(`${origin}/connexion`);
}
