'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Users, Search, ArrowRight, BookOpen, ExternalLink } from 'lucide-react';
import { HistoricalArticle } from '@/lib/types/database';
import { useTranslation } from '@/lib/i18n/context';

export function FamillesExplorer({ initialArticles }: { initialArticles: HistoricalArticle[] }) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);

  // Extract unique starting letters
  const availableLetters = useMemo(() => {
    const letters = new Set<string>();
    initialArticles.forEach((a) => {
      if (a.family_name) {
        letters.add(a.family_name.trim().charAt(0).toUpperCase());
      }
    });
    return Array.from(letters).sort();
  }, [initialArticles]);

  const filteredArticles = useMemo(() => {
    return initialArticles.filter((art) => {
      const family = (art.family_name || '').toLowerCase();
      const title = art.title.toLowerCase();
      const summary = (art.summary || '').toLowerCase();
      const q = searchQuery.trim().toLowerCase();

      // Search query filter
      if (q && !family.includes(q) && !title.includes(q) && !summary.includes(q)) {
        return false;
      }

      // Alphabet letter filter
      if (selectedLetter) {
        if (!art.family_name || art.family_name.trim().charAt(0).toUpperCase() !== selectedLetter) {
          return false;
        }
      }

      return true;
    });
  }, [initialArticles, searchQuery, selectedLetter]);

  return (
    <div className="space-y-8">
      {/* Search & Alphabet Filter Bar */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-heritage-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-heritage-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('family.searchPlaceholder')}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-heritage-300 text-sm placeholder-heritage-400 text-heritage-950 focus:outline-none focus:ring-2 focus:ring-heritage-600 bg-heritage-50/50"
            />
          </div>

          <div className="flex items-center space-x-2 text-xs text-heritage-600">
            <span>
              {t('family.familiesCount', { count: filteredArticles.length })}
            </span>
            {(searchQuery || selectedLetter) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedLetter(null);
                }}
                className="font-semibold text-heritage-800 hover:underline ml-2"
              >
                {t('family.resetFilters')}
              </button>
            )}
          </div>
        </div>

        {/* Letters index */}
        {availableLetters.length > 1 && (
          <div className="pt-3 border-t border-heritage-100 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-semibold text-heritage-600 mr-1 uppercase tracking-wider text-[11px]">
              {t('family.alphabetIndex')}
            </span>
            <button
              type="button"
              onClick={() => setSelectedLetter(null)}
              className={`px-2 py-1 rounded font-semibold transition-colors ${
                selectedLetter === null
                  ? 'bg-heritage-800 text-white'
                  : 'bg-heritage-100 text-heritage-700 hover:bg-heritage-200'
              }`}
            >
              {t('family.allFamilies')}
            </button>
            {availableLetters.map((letter) => (
              <button
                key={letter}
                type="button"
                onClick={() => setSelectedLetter(selectedLetter === letter ? null : letter)}
                className={`w-7 h-7 rounded flex items-center justify-center font-serif font-bold transition-colors ${
                  selectedLetter === letter
                    ? 'bg-heritage-800 text-white'
                    : 'bg-heritage-50 text-heritage-800 border border-heritage-200 hover:bg-heritage-200'
                }`}
              >
                {letter}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Articles Grid */}
      {filteredArticles.length === 0 ? (
        <div className="p-10 rounded-2xl border border-dashed border-heritage-300 bg-white text-center space-y-3">
          <BookOpen className="w-8 h-8 text-heritage-400 mx-auto" />
          <h3 className="font-serif text-lg font-bold text-heritage-900">
            {t('family.noMonographs')}
          </h3>
          <p className="text-sm text-heritage-600 max-w-md mx-auto">
            {t('family.noMonographsDesc')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredArticles.map((article) => (
            <article
              key={article.id}
              className="p-6 sm:p-7 rounded-2xl border border-heritage-200 bg-white hover:border-heritage-300 hover:shadow-sm transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-heritage-100 text-heritage-800 font-semibold uppercase tracking-wider">
                    <Users className="w-3.5 h-3.5" />
                    <span>{t('family.familyBadge', { name: article.family_name || 'Habses' })}</span>
                  </span>

                  <span className="text-heritage-500">
                    {article.period_description || t('family.documentedLineage')}
                  </span>
                </div>

                <h3 className="font-serif text-xl sm:text-2xl font-bold text-heritage-950 hover:text-heritage-800 transition-colors">
                  <Link href={`/familles/${article.slug}`}>
                    {article.title}
                  </Link>
                </h3>

                {article.summary && (
                  <p className="text-sm text-heritage-700 leading-relaxed font-serif line-clamp-3">
                    {article.summary}
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-heritage-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                {article.family_name && (
                  <Link
                    href={`/genealogie?lastName=${encodeURIComponent(article.family_name)}`}
                    className="inline-flex items-center space-x-1 font-semibold text-heritage-700 hover:text-heritage-950 hover:underline"
                  >
                    <span>{t('family.viewPersonsInTree')}</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                )}

                <Link
                  href={`/familles/${article.slug}`}
                  className="inline-flex items-center space-x-1.5 font-semibold uppercase tracking-wider text-heritage-800 hover:text-heritage-950 hover:underline ml-auto"
                >
                  <span>{t('family.readStory')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
