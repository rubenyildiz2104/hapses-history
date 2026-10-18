import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { ArticleEditorForm } from '@/components/admin/ArticleEditorForm';
import { HistoricalArticle, Person, Source } from '@/lib/types/database';

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: 'Modifier l’article | Administration Habses',
  description: 'Édition et mise à jour d’un article historique ou récit de famille.',
};

export default async function EditArticlePage(props: PageProps) {
  const { id } = await props.params;
  const adminClient = createAdminClient();

  // Fetch article
  const { data: articleData, error } = await adminClient
    .from('historical_articles')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !articleData) {
    notFound();
  }

  const article = articleData as HistoricalArticle;

  // Fetch initial linked person IDs
  const { data: linkRows } = await adminClient
    .from('historical_article_links')
    .select('person_id')
    .eq('article_id', id);

  const initialLinkedPersonIds = (linkRows || []).map((r) => r.person_id);

  // Fetch initial linked source IDs
  const { data: sourceRows } = await adminClient
    .from('historical_article_sources')
    .select('source_id')
    .eq('article_id', id);

  const initialLinkedSourceIds = (sourceRows || []).map((r) => r.source_id);

  // Fetch available persons
  const { data: personsData } = await adminClient
    .from('persons')
    .select('id, first_names, last_name, birth_year')
    .eq('visibility', 'public')
    .is('archived_at', null)
    .order('last_name', { ascending: true })
    .limit(100);

  // Fetch available sources
  const { data: sourcesData } = await adminClient
    .from('sources')
    .select('id, title, archive_reference')
    .order('title', { ascending: true })
    .limit(100);

  const availablePersons = (personsData as unknown as Person[]) || [];
  const availableSources = (sourcesData as unknown as Source[]) || [];

  return (
    <div className="space-y-6">
      <div>
        <span className="text-xs uppercase tracking-wider text-heritage-600 font-semibold">
          Éditeur de contenu
        </span>
        <h1 className="font-serif text-3xl font-bold text-heritage-950 mt-1">
          Modifier l’article : {article.title}
        </h1>
      </div>

      <ArticleEditorForm
        initialArticle={article}
        availablePersons={availablePersons}
        availableSources={availableSources}
        initialLinkedPersonIds={initialLinkedPersonIds}
        initialLinkedSourceIds={initialLinkedSourceIds}
      />
    </div>
  );
}
