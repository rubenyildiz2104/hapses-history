import { createServerSupabaseClient } from '@/lib/supabase/server';
import { HistoricalArticle } from '@/lib/types/database';
import { HistoireExplorer } from '@/components/history/HistoireExplorer';
import { getServerDictionary } from '@/lib/i18n/server';

export const metadata = {
  title: 'Histoire du village de Habses | Chronologie & Récits',
  description: 'Chronologie historique, périodes clés et récits documentés du village de Habses.',
};

export default async function HistoirePage() {
  const { t } = await getServerDictionary();
  const supabase = await createServerSupabaseClient();

  let articles: HistoricalArticle[] = [];
  try {
    const { data } = await supabase
      .from('historical_articles')
      .select('*')
      .eq('article_type', 'village_history')
      .eq('status', 'published')
      .order('period_start', { ascending: true, nullsFirst: false });

    if (data) {
      articles = data as HistoricalArticle[];
    }
  } catch {
    // Graceful fallback
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10">
      <div className="max-w-3xl space-y-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-heritage-600">
          {t('history.pageBadge')}
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-heritage-950">
          {t('history.title')}
        </h1>
        <p className="text-heritage-700 text-sm sm:text-base leading-relaxed font-serif">
          {t('history.subtitle')}
        </p>
      </div>

      <HistoireExplorer initialArticles={articles} />
    </div>
  );
}
