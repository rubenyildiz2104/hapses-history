'use client';

import React, { createContext, useContext, useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Locale, Dictionary, DEFAULT_LOCALE, isValidLocale, LOCALE_COOKIE_NAME } from './types';
import { getDictionary } from './index';

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

  // Synchronize state if initialLocale changes on server navigation
  useEffect(() => {
    if (initialLocale && initialLocale !== locale) {
      setLocaleState(initialLocale);
    }
  }, [initialLocale, locale]);

  // Read cookie on mount if available
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE_NAME}=([^;]+)`));
      if (match && isValidLocale(match[1]) && match[1] !== locale) {
        setLocaleState(match[1] as Locale);
      }
    }
  }, [locale]);

  const dict = getDictionary(locale);

  function setLocale(newLocale: Locale) {
    if (newLocale === locale) return;
    setLocaleState(newLocale);

    // 1. Set client cookie immediately
    if (typeof document !== 'undefined') {
      document.cookie = `${LOCALE_COOKIE_NAME}=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    }

    // 2. Persist to server via lightweight API route and refresh server components
    startTransition(async () => {
      try {
        await fetch('/api/locale', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locale: newLocale }),
        });
      } catch {
        // Silently continue
      }
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
