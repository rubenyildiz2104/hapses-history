import { describe, it, expect } from 'vitest';
import { formatHistoricalDate, formatLifespan } from '../src/lib/services/dates';

describe('Historical and Partial Date Formatting (Specifications v1.0 Section 5.2)', () => {
  it('formats exact dates correctly in French', () => {
    const formatted = formatHistoricalDate({
      date: '1842-07-14',
      precision: 'exact',
    });
    expect(formatted).toBe('14 juillet 1842');
  });

  it('formats year-only dates without fabricating a day or month', () => {
    // Crucial requirement: "si seule l'année 1842 est connue, il ne faut pas enregistrer
    // artificiellement le 1er janvier 1842 comme date exacte."
    const formatted = formatHistoricalDate({
      year: 1842,
      precision: 'year_only',
    });
    expect(formatted).toBe('1842');
  });

  it('formats month and year dates', () => {
    const formatted = formatHistoricalDate({
      date: '1842-07-01',
      precision: 'month_year',
    });
    expect(formatted).toBe('juillet 1842');
  });

  it('formats approximate, before, and after date precisions', () => {
    expect(formatHistoricalDate({ year: 1842, precision: 'approximate' })).toBe('vers 1842');
    expect(formatHistoricalDate({ year: 1842, precision: 'before' })).toBe('avant 1842');
    expect(formatHistoricalDate({ year: 1842, precision: 'after' })).toBe('après 1842');
  });

  it('handles unknown dates without failing', () => {
    expect(formatHistoricalDate({ precision: 'unknown' })).toBe('Date inconnue');
    expect(formatHistoricalDate({})).toBe('Date inconnue');
  });

  it('formats lifespan summary for deceased persons', () => {
    const lifespan = formatLifespan(
      { year: 1842, precision: 'year_only' },
      { date: '1912-11-03', precision: 'exact' },
      'deceased'
    );
    expect(lifespan).toBe('1842 – 3 novembre 1912');
  });

  it('formats lifespan for living person without fabricated death', () => {
    const lifespan = formatLifespan(
      { year: 1985, precision: 'year_only' },
      {},
      'living'
    );
    expect(lifespan).toBe('né(e) en 1985');
  });
});
