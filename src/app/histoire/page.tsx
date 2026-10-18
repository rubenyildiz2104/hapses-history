import Link from 'next/link';
import { Landmark, Calendar, ArrowRight } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { HistoricalArticle } from '@/lib/types/database';

export default async function HistoirePage() {
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
      <div className="max-w-3xl space-y-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-heritage-600">
          Mémoire locale
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-heritage-950">
          Histoire du village
        </h1>
        <p className="text-heritage-700 text-sm sm:text-base leading-relaxed">
          Les grandes périodes et les événements qui ont marqué la vie locale. 
          Les recherches étant progressives, les époques encore mal connues sont signalées 
          comme étant en cours de reconstitution.
        </p>
      </div>

      {articles.length === 0 ? (
        <div className="p-10 rounded-2xl border border-dashed border-heritage-300 bg-white text-center space-y-3">
          <Landmark className="w-8 h-8 text-heritage-400 mx-auto" />
          <h2 className="font-serif text-lg font-bold text-heritage-900">
            Recherches historiques en cours
          </h2>
          <p className="text-sm text-heritage-600 max-w-md mx-auto">
            Les premiers récits historiques sont en phase de rédaction et de documentation dans les archives.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {articles.map((article) => (
            <article
              key={article.id}
              className="p-6 sm:p-8 rounded-2xl border border-heritage-200 bg-white hover:border-heritage-300 transition-colors space-y-3"
            >
              <div className="flex items-center space-x-2 text-xs text-heritage-600">
                <Calendar className="w-3.5 h-3.5 text-heritage-400" />
                <span>
                  {article.period_description ||
                    (article.period_start && article.period_end
                      ? `${article.period_start} – ${article.period_end}`
                      : 'Période en cours d\'étude')}
                </span>
              </div>

              <h2 className="font-serif text-2xl font-bold text-heritage-950 hover:text-heritage-800 transition-colors">
                <Link href={`/histoire/${article.slug}`}>
                  {article.title}
                </Link>
              </h2>

              {article.summary && (
                <p className="text-sm sm:text-base text-heritage-700 leading-relaxed font-serif">
                  {article.summary}
                </p>
              )}

              <div className="pt-2">
                <Link
                  href={`/histoire/${article.slug}`}
                  className="inline-flex items-center space-x-1.5 text-xs font-semibold uppercase tracking-wider text-heritage-800 hover:text-heritage-950"
                >
                  <span>Lire l&apos;article complet</span>
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
