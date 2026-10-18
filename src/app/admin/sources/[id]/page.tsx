import { createAdminClient } from '@/lib/supabase/admin';
import { SourceEditorForm } from '@/components/admin/SourceEditorForm';
import { notFound } from 'next/navigation';
import { Source, Person } from '@/lib/types/database';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export const metadata = {
  title: 'Modifier la source d’archive | Administration',
};

export default async function AdminEditSourcePage(props: PageProps) {
  const { id } = await props.params;
  const adminClient = createAdminClient();

  // Fetch source
  const { data: source, error } = await adminClient
    .from('sources')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !source) {
    notFound();
  }

  // Fetch all persons for linking
  const { data: personsData } = await adminClient
    .from('persons')
    .select('*')
    .order('last_name', { ascending: true });

  const persons = (personsData as Person[]) || [];

  // Fetch linked person ids
  const { data: linkedPersonRows } = await adminClient
    .from('person_sources')
    .select('person_id')
    .eq('source_id', id);

  const initialLinkedPersonIds = (linkedPersonRows || []).map((row) => row.person_id);

  return (
    <SourceEditorForm
      initialSource={source as Source}
      availablePersons={persons}
      initialLinkedPersonIds={initialLinkedPersonIds}
    />
  );
}
