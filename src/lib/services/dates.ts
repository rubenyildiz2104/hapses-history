import { DatePrecision } from '../types/database';

const MONTH_NAMES_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
];

interface DateFormatOptions {
  date?: string | null;
  year?: number | null;
  precision?: DatePrecision;
}

/**
 * Formats a historical date respecting partial dates and precision levels.
 * Compliant with Section 5.2 ("Les dates partielles doivent être conservées correctement").
 */
export function formatHistoricalDate(options: DateFormatOptions): string {
  const { date, year, precision = 'unknown' } = options;

  if (precision === 'unknown' || (!date && !year)) {
    return 'Date inconnue';
  }

  // Parse exact date if provided
  let day: number | null = null;
  let month: number | null = null;
  let extractedYear: number | null = year ?? null;

  if (date) {
    const parts = date.split('-');
    if (parts.length === 3) {
      extractedYear = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10);
    }
  }

  const effectiveYear = extractedYear;
  if (!effectiveYear) {
    return 'Date inconnue';
  }

  switch (precision) {
    case 'exact':
      if (day && month) {
        return `${day} ${MONTH_NAMES_FR[month - 1]} ${effectiveYear}`;
      }
      return `${effectiveYear}`;

    case 'month_year':
      if (month) {
        return `${MONTH_NAMES_FR[month - 1]} ${effectiveYear}`;
      }
      return `${effectiveYear}`;

    case 'year_only':
      return `${effectiveYear}`;

    case 'approximate':
      return `vers ${effectiveYear}`;

    case 'before':
      return `avant ${effectiveYear}`;

    case 'after':
      return `après ${effectiveYear}`;

    default:
      return `${effectiveYear}`;
  }
}

/**
 * Formats the lifespan summary string (e.g., "1842 – 1912" or "vers 1840 – après 1895")
 */
export function formatLifespan(
  birthOptions: DateFormatOptions,
  deathOptions: DateFormatOptions,
  lifeStatus: 'living' | 'deceased' | 'unknown'
): string {
  const hasBirth = Boolean(birthOptions.year || birthOptions.date);
  const hasDeath = Boolean(deathOptions.year || deathOptions.date);

  const formattedBirth = hasBirth ? formatHistoricalDate(birthOptions) : '?';

  if (lifeStatus === 'living') {
    return hasBirth ? `né(e) en ${formattedBirth}` : 'vivant(e)';
  }

  const formattedDeath = hasDeath ? formatHistoricalDate(deathOptions) : '?';

  if (!hasBirth && !hasDeath) {
    return '';
  }

  return `${formattedBirth} – ${formattedDeath}`;
}
