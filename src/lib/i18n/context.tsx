'use client';

import React, { createContext, useContext, useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Locale, Dictionary, DEFAULT_LOCALE, isValidLocale } from './types';
import { getDictionary } from './index';
import { setLocaleAction } from '@/app/actions/locale';

interface LanguageContextType {
  locale: Locale;
  setLocale: (newLocale: Locale) => void;
  t: (keyPath: string, params?: Record<string, string | number>) => string;
  dict: Dictionary;
  isPending: boolean;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [isPending, startTransition] = useTransition();

  // Read cookie on mount if available
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const match = document.cookie.match(/(?:^|;\s*)habses_locale=([^;]+)/);
      if (match && isValidLocale(match[1]) && match[1] !== locale) {
        setLocaleState(match[1] as Locale);
      }
    }
  }, [locale]);

  const dict = getDictionary(locale);

  function setLocale(newLocale: Locale) {
    if (newLocale === locale) return;
    setLocaleState(newLocale);

    // Set client cookie
    if (typeof document !== 'undefined') {
      document.cookie = `habses_locale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    }

    startTransition(async () => {
      // Set server cookie and refresh active server components
      await setLocaleAction(newLocale);
      router.refresh();
    });
  }

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

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, dict, isPending }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Return a safe fallback if used outside Provider
    const dict = getDictionary(DEFAULT_LOCALE);
    return {
      locale: DEFAULT_LOCALE,
      setLocale: () => {},
      t: (keyPath: string) => keyPath,
      dict,
      isPending: false,
    };
  }
  return context;
}
