import { cookies, headers } from 'next/headers';
import { Locale, Dictionary, DEFAULT_LOCALE, isValidLocale } from './types';
import { getDictionary } from './index';

export const LOCALE_COOKIE_NAME = 'habses_locale';

export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;

  if (cookieLocale && isValidLocale(cookieLocale)) {
    return cookieLocale;
  }

  // Fallback to Accept-Language header if cookie not set
  try {
    const headersList = await headers();
    const acceptLanguage = headersList.get('accept-language');
    if (acceptLanguage) {
      const primaryLang = acceptLanguage.split(',')[0].trim().substring(0, 2).toLowerCase();
      if (isValidLocale(primaryLang)) {
        return primaryLang;
      }
    }
  } catch {
    // Fallback if headers not available
  }

  return DEFAULT_LOCALE;
}

export async function getServerDictionary(specifiedLocale?: Locale): Promise<{
  locale: Locale;
  t: (keyPath: string, params?: Record<string, string | number>) => string;
  dict: Dictionary;
}> {
  const locale = specifiedLocale || (await getServerLocale());
  const dict = getDictionary(locale);

  function t(keyPath: string, params?: Record<string, string | number>): string {
    const keys = keyPath.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let val: any = dict;
    for (const k of keys) {
      if (val && typeof val === 'object' && k in val) {
        val = val[k];
      } else {
        return keyPath;
      }
    }

    if (typeof val !== 'string') {
      return keyPath;
    }

    if (params) {
      return Object.entries(params).reduce((str, [pKey, pVal]) => {
        return str.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pVal));
      }, val);
    }

    return val;
  }

  return { locale, t, dict };
}
