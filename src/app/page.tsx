import Link from 'next/link';
import { Search, Landmark, BookOpen, Users, ShieldCheck, ArrowRight, Compass } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getServerDictionary } from '@/lib/i18n/server';
import { HistoricalArticle } from '@/lib/types/database';

export default async function HomePage() {
  const { t } = await getServerDictionary();
  const supabase = await createServerSupabaseClient();

  // Fetch recent published articles for discovery
  let featuredArticles: HistoricalArticle[] = [];
  try {
    const { data } = await supabase
      .from('historical_articles')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(3);

    if (data) {
      featuredArticles = data as HistoricalArticle[];
    }
  } catch {
    // If not connected yet, gracefully display empty
  }

  return (
    <div className="space-y-16 sm:space-y-24 pb-16">
      {/* 1. HERO SECTION */}
      <section className="relative bg-gradient-to-b from-heritage-100 to-heritage-50/50 border-b border-heritage-200/80 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-heritage-200/80 border border-heritage-300 text-xs font-semibold uppercase tracking-wider text-heritage-800">
            <Compass className="w-3.5 h-3.5" />
            <span>{t('home.heroBadge')}</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-heritage-950 leading-tight">
            {t('home.heroTitle')}
          </h1>

          <p className="text-base sm:text-lg lg:text-xl text-heritage-700 max-w-2xl mx-auto leading-relaxed font-serif">
            {t('home.heroSubtitle')}
          </p>

          {/* Quick Search Card */}
          <div className="max-w-2xl mx-auto pt-4">
            <form
              action="/genealogie"
              method="GET"
              className="p-2 sm:p-2.5 rounded-2xl bg-white border border-heritage-300 shadow-sm flex flex-col sm:flex-row items-center gap-2"
            >
              <div className="flex-1 flex items-center space-x-2 w-full px-3 py-2 text-sm">
                <Search className="w-5 h-5 text-heritage-400 shrink-0" />
                <input
                  type="text"
                  name="lastName"
                  placeholder={t('home.searchPlaceholder')}
                  className="w-full bg-transparent text-heritage-950 placeholder-heritage-400 focus:outline-none text-sm"
                />
              </div>
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-heritage-800 text-heritage-50 text-sm font-semibold hover:bg-heritage-900 transition-colors shrink-0"
              >
                {t('home.searchButton')}
              </button>
            </form>
            <p className="text-xs text-heritage-500 mt-2">
              {t('home.privacyBadgeDesc')}
            </p>
          </div>
        </div>
      </section>

      {/* 2. THE THREE PILLARS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Pillar 1: Genealogy */}
          <div className="p-6 sm:p-8 rounded-2xl bg-white border border-heritage-200 space-y-4 hover:border-heritage-300 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-heritage-100 text-heritage-800 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <h2 className="font-serif text-xl font-bold text-heritage-950">
              {t('home.cardGenealogyTitle')}
            </h2>
            <p className="text-sm text-heritage-700 leading-relaxed">
              {t('home.cardGenealogyDesc')}
            </p>
            <div>
              <Link
                href="/genealogie"
                className="inline-flex items-center space-x-1.5 text-sm font-semibold text-heritage-800 hover:text-heritage-950 hover:underline"
              >
                <span>{t('genealogy.searchAction')}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Pillar 2: Village History */}
          <div className="p-6 sm:p-8 rounded-2xl bg-white border border-heritage-200 space-y-4 hover:border-heritage-300 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-heritage-100 text-heritage-800 flex items-center justify-center">
              <Landmark className="w-6 h-6" />
            </div>
            <h2 className="font-serif text-xl font-bold text-heritage-950">
              {t('home.cardHistoryTitle')}
            </h2>
            <p className="text-sm text-heritage-700 leading-relaxed">
              {t('home.cardHistoryDesc')}
            </p>
            <div>
              <Link
                href="/histoire"
                className="inline-flex items-center space-x-1.5 text-sm font-semibold text-heritage-800 hover:text-heritage-950 hover:underline"
              >
                <span>{t('common.readMore')}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Pillar 3: Family Histories */}
          <div className="p-6 sm:p-8 rounded-2xl bg-white border border-heritage-200 space-y-4 hover:border-heritage-300 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-heritage-100 text-heritage-800 flex items-center justify-center">
              <BookOpen className="w-6 h-6" />
            </div>
            <h2 className="font-serif text-xl font-bold text-heritage-950">
              {t('family.title')}
            </h2>
            <p className="text-sm text-heritage-700 leading-relaxed">
              {t('family.subtitle')}
            </p>
            <div>
              <Link
                href="/familles"
                className="inline-flex items-center space-x-1.5 text-sm font-semibold text-heritage-800 hover:text-heritage-950 hover:underline"
              >
                <span>{t('family.viewLineage')}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FEATURED ARTICLES & RECENT PUBLICATIONS */}
      {featuredArticles.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-3 border-b border-heritage-200">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-heritage-600">
                Publications récentes
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-heritage-950">
                Derniers récits historiques documentés
              </h2>
            </div>
            <Link
              href="/histoire"
              className="mt-2 sm:mt-0 text-sm font-semibold text-heritage-800 hover:underline"
            >
              Tous les articles →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredArticles.map((article) => (
              <article
                key={article.id}
                className="p-6 rounded-xl border border-heritage-200 bg-white space-y-3 flex flex-col justify-between hover:border-heritage-300 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-xs text-heritage-600">
                    <span className="capitalize font-medium text-heritage-800">
                      {article.article_type === 'family' ? 'Histoire de famille' : 'Histoire du village'}
                    </span>
                    {article.period_description && <span>• {article.period_description}</span>}
                  </div>
                  <h3 className="font-serif text-lg font-bold text-heritage-950 hover:text-heritage-800 transition-colors">
                    <Link href={`/${article.article_type === 'family' ? 'familles' : 'histoire'}/${article.slug}`}>
                      {article.title}
                    </Link>
                  </h3>
                  {article.summary && (
                    <p className="text-sm text-heritage-700 line-clamp-3">
                      {article.summary}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-heritage-100 flex items-center justify-between text-xs text-heritage-500">
                  <span>Sources documentées</span>
                  <Link
                    href={`/${article.article_type === 'family' ? 'familles' : 'histoire'}/${article.slug}`}
                    className="font-semibold text-heritage-800 hover:underline"
                  >
                    Lire →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* 4. COLLABORATIVE MEMORY & CONTRIBUTIONS CALLOUT */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-heritage-900 text-heritage-50 p-8 sm:p-12 lg:p-16 relative overflow-hidden">
          <div className="max-w-2xl space-y-5">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-heritage-800 border border-heritage-700 text-xs text-heritage-200 uppercase tracking-wider font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Patrimoine participatif & Modéré</span>
            </div>

            <h2 className="font-serif text-2xl sm:text-4xl font-bold leading-tight">
              Une mémoire collective construite pas à pas
            </h2>

            <p className="text-sm sm:text-base text-heritage-200 leading-relaxed font-serif">
              Toute personne détenant des actes de registres paroissiaux, d&apos;état civil, des photographies
              anciennes ou des récits familiaux peut créer un compte pour proposer un ajout ou une correction. 
              Chaque contribution est vérifiée et validée par l&apos;administrateur avant toute intégration officielle.
            </p>

            <div className="pt-3 flex flex-wrap gap-4">
              <Link
                href="/inscription"
                className="px-6 py-3 rounded-xl bg-heritage-50 text-heritage-950 font-semibold text-sm hover:bg-heritage-200 transition-colors shadow-sm"
              >
                Créer un compte contributeur
              </Link>
              <Link
                href="/a-propos"
                className="px-6 py-3 rounded-xl border border-heritage-700 text-heritage-100 font-medium text-sm hover:bg-heritage-800 transition-colors"
              >
                En savoir plus sur les règles de publication
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
