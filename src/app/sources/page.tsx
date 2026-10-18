import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Source, Person } from '@/lib/types/database';
import { isPersonPublic, sanitizeSourceForPublic } from '@/lib/services/privacy';
import { SourcesExplorer, EnrichedSource } from '@/components/sources/SourcesExplorer';
import { FileText, ShieldCheck } from 'lucide-react';

export const metadata = {
  title: 'Sources & Archives | Habses Histoire & Familles',
  description: 'Inventaire public des registres paroissiaux, actes d’état civil, recensements et témoignages documentant le village de Habses.',
};

export default async function SourcesPage() {
  const supabase = await createServerSupabaseClient();

  // Fetch all public sources
  const { data: sourcesData } = await supabase
    .from('sources')
    .select('*')
    .eq('is_public', true)
    .order('source_date', { ascending: true, nullsFirst: false });

  const rawSources = (sourcesData as Source[]) || [];

  // Fetch linked persons for each source
  const sourceIds = rawSources.map((s) => s.id);
  const { data: personSourceRows } = sourceIds.length > 0
    ? await supabase
        .from('person_sources')
        .select('source_id, person_id, persons(*)')
        .in('source_id', sourceIds)
    : { data: [] };

  // Group persons by source_id (filtering strictly through isPersonPublic)
  const personsBySource = new Map<string, Person[]>();
  if (personSourceRows) {
    for (const row of personSourceRows) {
      const p = row.persons as unknown as Person;
      if (p && isPersonPublic(p)) {
        const list = personsBySource.get(row.source_id) || [];
        list.push(p);
        personsBySource.set(row.source_id, list);
      }
    }
  }

  // Enrich sources
  const enrichedSources: EnrichedSource[] = rawSources
    .map((s) => sanitizeSourceForPublic(s))
    .filter((s): s is Omit<Source, 'private_notes'> => Boolean(s))
    .map((s) => ({
      ...s,
      linkedPersons: personsBySource.get(s.id) || [],
    }));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10">
      {/* Header */}
      <div className="max-w-3xl space-y-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-heritage-600">
          Archives & Traçabilité
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-heritage-950">
          Sources & Registres d’archives
        </h1>
        <p className="text-heritage-700 text-sm sm:text-base leading-relaxed font-serif">
          Consultez les documents historiques officiels ayant permis d’établir les filiations et récits du village :
          registres de baptême, recensements, actes communaux et témoignages vérifiés.
        </p>

        <div className="flex items-center space-x-2 text-xs text-heritage-600 pt-1">
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          <span>
            Chaque lien de parenté et événement historique repose sur une source vérifiée ou signalée avec son degré de certitude.
          </span>
        </div>
      </div>

      {/* Explorer */}
      <SourcesExplorer initialSources={enrichedSources} />
    </div>
  );
}
