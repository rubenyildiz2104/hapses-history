'use client';

import { useTranslation } from '@/lib/i18n/context';
import { Locale } from '@/lib/i18n/types';
import { Globe } from 'lucide-react';

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className = '' }: LanguageSwitcherProps) {
  const { locale, setLocale, isPending } = useTranslation();

  return (
    <div
      className={`inline-flex items-center rounded-lg border border-heritage-200 bg-heritage-100/60 p-0.5 text-xs font-semibold ${className}`}
      role="group"
      aria-label="Sélection de langue / Language selector"
    >
      <div className="pl-1.5 pr-1 text-heritage-500">
        <Globe className="w-3.5 h-3.5" />
      </div>

      <button
        type="button"
        onClick={() => setLocale('fr')}
        disabled={isPending}
        className={`px-2 py-1 rounded-md transition-all ${
          locale === 'fr'
            ? 'bg-heritage-800 text-white shadow-xs'
            : 'text-heritage-700 hover:text-heritage-950 hover:bg-heritage-200/50'
        } ${isPending ? 'opacity-70 cursor-wait' : ''}`}
        title="Passer en Français"
      >
        FR
      </button>

      <button
        type="button"
        onClick={() => setLocale('en')}
        disabled={isPending}
        className={`px-2 py-1 rounded-md transition-all ${
          locale === 'en'
            ? 'bg-heritage-800 text-white shadow-xs'
            : 'text-heritage-700 hover:text-heritage-950 hover:bg-heritage-200/50'
        } ${isPending ? 'opacity-70 cursor-wait' : ''}`}
        title="Switch to English"
      >
        EN
      </button>
    </div>
  );
}
