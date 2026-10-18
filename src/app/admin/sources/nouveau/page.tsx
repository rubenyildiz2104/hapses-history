import { createAdminClient } from '@/lib/supabase/admin';
import { SourceEditorForm } from '@/components/admin/SourceEditorForm';
import { Person } from '@/lib/types/database';

export const metadata = {
  title: 'Nouvelle source d’archive | Administration',
};

export default async function AdminNewSourcePage() {
  const adminClient = createAdminClient();

  // Fetch persons for linking
  const { data: personsData } = await adminClient
    .from('persons')
    .select('*')
    .order('last_name', { ascending: true });

  const persons = (personsData as Person[]) || [];

  return <SourceEditorForm availablePersons={persons} />;
}
