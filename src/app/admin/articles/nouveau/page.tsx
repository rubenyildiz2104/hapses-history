import { createAdminClient } from '@/lib/supabase/admin';
import { ArticleEditorForm } from '@/components/admin/ArticleEditorForm';
import { Person, Source } from '@/lib/types/database';

export const metadata = {
  title: 'Nouvel article historique | Administration Habses',
  description: 'Rédiger et publier un nouvel article historique ou une monographie familiale.',
};

export default async function NouvelArticlePage() {
  const adminClient = createAdminClient();

  // Fetch available persons for linking
  const { data: personsData } = await adminClient
    .from('persons')
    .select('id, first_names, last_name, birth_year')
    .eq('visibility', 'public')
    .is('archived_at', null)
    .order('last_name', { ascending: true })
    .limit(100);

  // Fetch available sources for linking
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
          Rédiger un nouvel article historique
        </h1>
      </div>

      <ArticleEditorForm
        availablePersons={availablePersons}
        availableSources={availableSources}
      />
    </div>
  );
}
