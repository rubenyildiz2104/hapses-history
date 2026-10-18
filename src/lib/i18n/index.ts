import { Locale, Dictionary, DEFAULT_LOCALE, LOCALES } from './types';
import { fr } from './dictionaries/fr';
import { en } from './dictionaries/en';

const dictionaries: Record<Locale, Dictionary> = {
  fr,
  en,
};

export function getDictionary(locale: Locale = DEFAULT_LOCALE): Dictionary {
  return dictionaries[locale] || dictionaries[DEFAULT_LOCALE];
}

export function isValidLocale(locale: string): locale is Locale {
  return LOCALES.includes(locale as Locale);
}

export * from './types';
