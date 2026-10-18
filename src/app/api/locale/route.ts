import { NextResponse } from 'next/server';
import { isValidLocale, LOCALE_COOKIE_NAME } from '@/lib/i18n/types';

export async function POST(request: Request) {
  try {
    const { locale } = await request.json();

    if (!locale || !isValidLocale(locale)) {
      return NextResponse.json({ error: 'Invalid locale' }, { status: 400 });
    }

    const response = NextResponse.json({ success: true, locale });
    response.cookies.set(LOCALE_COOKIE_NAME, locale, {
      path: '/',
      maxAge: 31536000, // 1 year
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Failed to set locale' }, { status: 500 });
  }
}
