import { describe, it, expect } from 'vitest';
import { getDictionary, isValidLocale } from '@/lib/i18n';
import { fr } from '@/lib/i18n/dictionaries/fr';
import { en } from '@/lib/i18n/dictionaries/en';
import { formatHistoricalDate, formatLifespan } from '@/lib/services/dates';

describe('i18n Infrastructure', () => {
  it('validates supported locales and rejects unsupported ones', () => {
    expect(isValidLocale('fr')).toBe(true);
    expect(isValidLocale('en')).toBe(true);
    expect(isValidLocale('de')).toBe(false);
    expect(isValidLocale('')).toBe(false);
    expect(isValidLocale('es')).toBe(false);
  });

  it('retrieves dictionaries for valid locales and falls back to default', () => {
    expect(getDictionary('fr')).toBe(fr);
    expect(getDictionary('en')).toBe(en);
    // @ts-expect-error test fallback
    expect(getDictionary('unknown')).toBe(fr);
  });

  it('ensures French and English dictionaries have matching top-level and nested keys', () => {
    function getAllKeys(obj: Record<string, unknown>, prefix = ''): string[] {
      let keys: string[] = [];
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          keys = keys.concat(getAllKeys(value as Record<string, unknown>, fullKey));
        } else {
          keys.push(fullKey);
        }
      }
      return keys.sort();
    }

    const frKeys = getAllKeys(fr as unknown as Record<string, unknown>);
    const enKeys = getAllKeys(en as unknown as Record<string, unknown>);

    expect(frKeys).toEqual(enKeys);
    expect(frKeys.length).toBeGreaterThan(50);
  });

  it('formats historical dates in English and French accurately', () => {
    // Exact date
    const dateOpts = { date: '1895-04-12', year: 1895, precision: 'exact' as const };
    expect(formatHistoricalDate(dateOpts, 'fr')).toBe('12 avril 1895');
    expect(formatHistoricalDate(dateOpts, 'en')).toBe('April 12, 1895');

    // Approximate date
    const approxOpts = { year: 1840, precision: 'approximate' as const };
    expect(formatHistoricalDate(approxOpts, 'fr')).toBe('vers 1840');
    expect(formatHistoricalDate(approxOpts, 'en')).toBe('c. 1840');

    // Before / After
    const beforeOpts = { year: 1915, precision: 'before' as const };
    expect(formatHistoricalDate(beforeOpts, 'fr')).toBe('avant 1915');
    expect(formatHistoricalDate(beforeOpts, 'en')).toBe('before 1915');

    const afterOpts = { year: 1920, precision: 'after' as const };
    expect(formatHistoricalDate(afterOpts, 'fr')).toBe('après 1920');
    expect(formatHistoricalDate(afterOpts, 'en')).toBe('after 1920');
  });

  it('formats lifespan strings in English and French accurately', () => {
    const birth = { year: 1840, precision: 'year_only' as const };
    const death = { year: 1915, precision: 'year_only' as const };

    expect(formatLifespan(birth, death, 'deceased', 'fr')).toBe('1840 – 1915');
    expect(formatLifespan(birth, death, 'deceased', 'en')).toBe('1840 – 1915');

    expect(formatLifespan(birth, {}, 'living', 'fr')).toBe('né(e) en 1840');
    expect(formatLifespan(birth, {}, 'living', 'en')).toBe('born in 1840');

    expect(formatLifespan({}, {}, 'living', 'fr')).toBe('vivant(e)');
    expect(formatLifespan({}, {}, 'living', 'en')).toBe('living');
  });

  it('correctly parses locale cookies without unexpected matches', () => {
    const testCookie = 'other=val; habses_locale=en; session=123';
    const match = testCookie.match(/(?:^|;\s*)habses_locale=([^;]+)/);
    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('en');
    expect(isValidLocale(match![1])).toBe(true);
  });
});
