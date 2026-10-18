import Link from 'next/link';
import { BookOpen, Users, ArrowRight } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { HistoricalArticle } from '@/lib/types/database';

export default async function FamillesPage() {
  const supabase = await createServerSupabaseClient();

  let familyArticles: HistoricalArticle[] = [];
  try {
    const { data } = await supabase
      .from('historical_articles')
      .select('*')
      .eq('article_type', 'family')
      .eq('status', 'published')
      .order('family_name', { ascending: true });

    if (data) {
      familyArticles = data as HistoricalArticle[];
    }
  } catch {
    // Graceful fallback
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
      <div className="max-w-3xl space-y-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-heritage-600">
          Monographies familiales
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-heritage-950">
          Histoires de familles
        </h1>
        <p className="text-heritage-700 text-sm sm:text-base leading-relaxed">
          Cette rubrique complète la base généalogique en apportant un contexte historique aux familles 
          ayant vécu dans le village : origines connues, activités documentées et présence dans les registres.
        </p>
      </div>

      {familyArticles.length === 0 ? (
        <div className="p-10 rounded-2xl border border-dashed border-heritage-300 bg-white text-center space-y-3">
          <BookOpen className="w-8 h-8 text-heritage-400 mx-auto" />
          <h2 className="font-serif text-lg font-bold text-heritage-900">
            Monographies en cours de rédaction
          </h2>
          <p className="text-sm text-heritage-600 max-w-md mx-auto">
            Les premières monographies familiales sont en cours de rassemblement à partir des dépouillements d&apos;archives.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {familyArticles.map((article) => (
            <article
              key={article.id}
              className="p-6 sm:p-8 rounded-2xl border border-heritage-200 bg-white hover:border-heritage-300 transition-colors space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-heritage-600">
                  <Users className="w-3.5 h-3.5" />
                  <span>Famille {article.family_name}</span>
                </div>

                <h2 className="font-serif text-xl font-bold text-heritage-950 hover:text-heritage-800 transition-colors">
                  <Link href={`/familles/${article.slug}`}>
                    {article.title}
                  </Link>
                </h2>

                {article.summary && (
                  <p className="text-sm text-heritage-700 leading-relaxed font-serif line-clamp-3">
                    {article.summary}
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-heritage-100 flex items-center justify-between">
                <span className="text-xs text-heritage-500">
                  {article.period_description ?? 'Lignée documentée'}
                </span>
                <Link
                  href={`/familles/${article.slug}`}
                  className="inline-flex items-center space-x-1.5 text-xs font-semibold uppercase tracking-wider text-heritage-800 hover:text-heritage-950"
                >
                  <span>Lire l&apos;histoire</span>
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
