'use server';

import { cookies } from 'next/headers';
import { Locale, isValidLocale } from '@/lib/i18n/types';
import { LOCALE_COOKIE_NAME } from '@/lib/i18n/server';

export async function setLocaleAction(locale: Locale): Promise<{ success: boolean }> {
  if (!isValidLocale(locale)) {
    return { success: false };
  }

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE_NAME, locale, {
    maxAge: 31536000, // 1 year
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  return { success: true };
}
