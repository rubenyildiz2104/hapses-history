'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Calendar, ArrowRight, Landmark } from 'lucide-react';
import { HistoricalArticle } from '@/lib/types/database';
import { VillageTimeline, getHistoricalEras } from './VillageTimeline';
import { useTranslation } from '@/lib/i18n/context';

export function HistoireExplorer({ initialArticles }: { initialArticles: HistoricalArticle[] }) {
  const { t, locale } = useTranslation();
  const [activeEraId, setActiveEraId] = useState<string | null>(null);

  const eras = getHistoricalEras(locale);
  const activeEra = eras.find((e) => e.id === activeEraId);

  const filteredArticles = activeEraId && activeEra
    ? initialArticles.filter((art) => {
        if (!art.period_start) return false;
        return art.period_start >= activeEra.yearRange[0] && art.period_start <= activeEra.yearRange[1];
      })
    : initialArticles;

  return (
    <div className="space-y-10">
      {/* Interactive Timeline */}
      <VillageTimeline
        articles={initialArticles}
        selectedEraId={activeEraId}
        onSelectEra={setActiveEraId}
      />

      {/* Articles Section */}
      <section className="space-y-6" aria-labelledby="articles-heading">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-heritage-200">
          <div>
            <h2 id="articles-heading" className="font-serif text-2xl font-bold text-heritage-900">
              {activeEra ? (
                <span>{activeEra.name} ({filteredArticles.length})</span>
              ) : (
                <span>{t('history.showAllNarratives')} ({initialArticles.length})</span>
              )}
            </h2>
            {activeEra && (
              <p className="text-xs text-heritage-600 mt-0.5">
                {t('history.period')} {activeEra.periodText}
              </p>
            )}
          </div>

          {activeEra && (
            <button
              type="button"
              onClick={() => setActiveEraId(null)}
              className="text-xs font-semibold text-heritage-700 hover:text-heritage-950 underline mt-2 sm:mt-0"
            >
              {t('history.showAllNarratives')}
            </button>
          )}
        </div>

        {filteredArticles.length === 0 ? (
          <div className="p-10 rounded-2xl border border-dashed border-heritage-300 bg-white text-center space-y-3">
            <Landmark className="w-8 h-8 text-heritage-400 mx-auto" />
            <h3 className="font-serif text-lg font-bold text-heritage-900">
              {t('history.researchInProgress')}
            </h3>
            <p className="text-sm text-heritage-600 max-w-md mx-auto">
              {t('history.researchInProgressDesc')}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setActiveEraId(null)}
                className="text-xs font-semibold text-heritage-800 hover:underline"
              >
                {t('history.seeOtherEras')}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredArticles.map((article) => (
              <article
                key={article.id}
                className="p-6 sm:p-8 rounded-2xl border border-heritage-200 bg-white hover:border-heritage-300 hover:shadow-sm transition-all space-y-3"
              >
                <div className="flex items-center space-x-2 text-xs text-heritage-600">
                  <Calendar className="w-3.5 h-3.5 text-heritage-400" />
                  <span>
                    {article.period_description ||
                      (article.period_start && article.period_end
                        ? `${article.period_start} – ${article.period_end}`
                        : t('history.underStudy'))}
                  </span>
                </div>

                <h3 className="font-serif text-2xl font-bold text-heritage-950 hover:text-heritage-800 transition-colors">
                  <Link href={`/histoire/${article.slug}`}>
                    {article.title}
                  </Link>
                </h3>

                {article.summary && (
                  <p className="text-sm sm:text-base text-heritage-700 leading-relaxed font-serif">
                    {article.summary}
                  </p>
                )}

                <div className="pt-2">
                  <Link
                    href={`/histoire/${article.slug}`}
                    className="inline-flex items-center space-x-1.5 text-xs font-semibold uppercase tracking-wider text-heritage-800 hover:text-heritage-950 hover:underline"
                  >
                    <span>{t('history.readArticle')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
