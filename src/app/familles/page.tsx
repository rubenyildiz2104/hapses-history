import { createServerSupabaseClient } from '@/lib/supabase/server';
import { HistoricalArticle } from '@/lib/types/database';
import { FamillesExplorer } from '@/components/history/FamillesExplorer';

export const metadata = {
  title: 'Histoires de familles de Habses | Monographies & Lignées',
  description: 'Monographies historiques et récits familiaux des lignées originaires du village d’Habses.',
};

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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10">
      <div className="max-w-3xl space-y-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-heritage-600">
          Monographies & Mémoire des lignées
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-heritage-950">
          Histoires de familles de Habses
        </h1>
        <p className="text-heritage-700 text-sm sm:text-base leading-relaxed font-serif">
          Cette section rassemble les récits et études documentées sur les familles du village.
          Chaque monographie apporte un éclairage historique sur les activités, l’habitat et les filiations
          établies dans les registres.
        </p>
      </div>

      <FamillesExplorer initialArticles={familyArticles} />
    </div>
  );
}
