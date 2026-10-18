import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generatePublicJsonExport } from '@/lib/services/gedcom';
import { Person, Relationship, Source } from '@/lib/types/database';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createServerSupabaseClient();

  // Fetch all public deceased non-archived persons
  const { data: personsData, error: personsError } = await supabase
    .from('persons')
    .select('*')
    .is('archived_at', null)
    .eq('life_status', 'deceased')
    .eq('visibility', 'public');

  if (personsError) {
    return NextResponse.json({ error: 'Erreur lors de la récupération des données.' }, { status: 500 });
  }

  // Fetch all non-archived relationships
  const { data: relsData } = await supabase
    .from('relationships')
    .select('*')
    .is('archived_at', null);

  // Fetch all public sources
  const { data: sourcesData } = await supabase
    .from('sources')
    .select('*')
    .eq('is_public', true);

  const persons = (personsData as Person[]) || [];
  const relationships = (relsData as Relationship[]) || [];
  const sources = (sourcesData as Source[]) || [];

  const exportPayload = generatePublicJsonExport(persons, relationships, sources);

  const nowStr = new Date().toISOString().split('T')[0];

  return new NextResponse(JSON.stringify(exportPayload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="habses-donnees-publiques-${nowStr}.json"`,
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
