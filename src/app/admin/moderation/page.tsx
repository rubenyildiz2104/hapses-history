import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ProposalModerationCard, ModerationProposal, DuplicateCandidate } from '@/components/admin/ProposalModerationCard';
import { ProposalStatus, ProposalType } from '@/lib/types/database';
import Link from 'next/link';
import { CheckSquare, Clock, AlertCircle, CheckCircle2, XCircle, Filter } from 'lucide-react';

export const metadata = {
  title: 'Modération des propositions | Administration Habses',
  description: 'Interface de modération transactionnelle des propositions communautaires.',
};

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function AdminModerationPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const currentStatus: ProposalStatus = (searchParams.status as ProposalStatus) || 'pending';

  const supabase = await createServerSupabaseClient();

  // Fetch status counts for navigation tabs
  const [
    { count: pendingCount },
    { count: needsInfoCount },
    { count: acceptedCount },
    { count: rejectedCount },
  ] = await Promise.all([
    supabase.from('proposals').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('proposals').select('*', { count: 'exact', head: true }).eq('status', 'needs_information'),
    supabase.from('proposals').select('*', { count: 'exact', head: true }).eq('status', 'accepted'),
    supabase.from('proposals').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
  ]);

  // Fetch proposals for current active status
  const { data: rawProposals } = await supabase
    .from('proposals')
    .select('*')
    .eq('status', currentStatus)
    .order('created_at', { ascending: currentStatus === 'pending' }); // Oldest first for pending queue

  const proposalsList = rawProposals || [];

  // Batch fetch submitter profiles
  const submitterIds = Array.from(new Set(proposalsList.map((p) => p.submitted_by)));
  const { data: profiles } = submitterIds.length > 0
    ? await supabase.from('profiles').select('id, display_name').in('id', submitterIds)
    : { data: [] };

  const profilesMap = new Map((profiles || []).map((p) => [p.id, p.display_name]));

  // Batch fetch target persons for update_person
  const targetPersonIds = proposalsList
    .map((p) => p.target_person_id)
    .filter((id): id is string => Boolean(id));

  const { data: targetPersons } = targetPersonIds.length > 0
    ? await supabase.from('persons').select('*').in('id', targetPersonIds)
    : { data: [] };

  const targetPersonsMap = new Map((targetPersons || []).map((p) => [p.id, p]));

  // For pending proposals of type 'add_person', run duplicate detection advisory
  const enrichedProposals: ModerationProposal[] = await Promise.all(
    proposalsList.map(async (p) => {
      let potential_duplicates: DuplicateCandidate[] = [];

      if (p.status === 'pending' && p.proposal_type === 'add_person') {
        const payload = p.payload as Record<string, unknown>;
        const firstNames = payload.first_names ? String(payload.first_names) : '';
        const lastName = payload.last_name ? String(payload.last_name) : '';
        const birthYear = payload.birth_year ? Number(payload.birth_year) : null;
        const deathYear = payload.death_year ? Number(payload.death_year) : null;

        if (firstNames && lastName) {
          const { data: dups } = await supabase.rpc('find_potential_duplicates', {
            p_first_names: firstNames,
            p_last_name: lastName,
            p_birth_year: birthYear,
            p_death_year: deathYear,
          });

          if (dups && Array.isArray(dups)) {
            potential_duplicates = dups.map((d: Record<string, unknown>) => ({
              candidate_id: String(d.candidate_id),
              first_names: String(d.first_names),
              last_name: String(d.last_name),
              birth_year: d.birth_year ? Number(d.birth_year) : null,
              death_year: d.death_year ? Number(d.death_year) : null,
              confidence_score: Number(d.confidence_score || 0),
              reasons: Array.isArray(d.reasons) ? (d.reasons as string[]) : [],
            }));
          }
        }
      }

      return {
        id: p.id,
        proposal_type: p.proposal_type as ProposalType,
        submitted_by: p.submitted_by,
        submitter_name: profilesMap.get(p.submitted_by) || 'Contributeur',
        target_person_id: p.target_person_id,
        target_person: p.target_person_id ? targetPersonsMap.get(p.target_person_id) : null,
        payload: p.payload as Record<string, unknown>,
        sources_info: p.sources_info as Record<string, unknown> | null,
        status: p.status,
        created_at: p.created_at,
        potential_duplicates,
      };
    })
  );

  return (
    <div className="space-y-8">
      {/* Page Title & Stats */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-heritage-600 font-semibold">
            Modération humaine obligatoire
          </span>
          <h1 className="font-serif text-3xl font-bold text-heritage-950 mt-1">
            File de modération des propositions
          </h1>
          <p className="text-sm text-heritage-600 font-serif max-w-2xl mt-1">
            Examinez, vérifiez les sources et intégrez de façon atomique les contributions de la communauté.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-heritage-200 pb-3">
        <Link
          href="/admin/moderation?status=pending"
          className={`inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
            currentStatus === 'pending'
              ? 'bg-heritage-800 text-white shadow-sm'
              : 'text-heritage-700 hover:bg-heritage-200/60'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>En attente</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
            currentStatus === 'pending' ? 'bg-amber-400 text-heritage-950 font-bold' : 'bg-heritage-200 text-heritage-800'
          }`}>
            {pendingCount || 0}
          </span>
        </Link>

        <Link
          href="/admin/moderation?status=needs_information"
          className={`inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
            currentStatus === 'needs_information'
              ? 'bg-heritage-800 text-white shadow-sm'
              : 'text-heritage-700 hover:bg-heritage-200/60'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Précisions demandées</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
            currentStatus === 'needs_information' ? 'bg-sky-400 text-heritage-950 font-bold' : 'bg-heritage-200 text-heritage-800'
          }`}>
            {needsInfoCount || 0}
          </span>
        </Link>

        <Link
          href="/admin/moderation?status=accepted"
          className={`inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
            currentStatus === 'accepted'
              ? 'bg-heritage-800 text-white shadow-sm'
              : 'text-heritage-700 hover:bg-heritage-200/60'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Acceptées</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-heritage-200 text-heritage-800">
            {acceptedCount || 0}
          </span>
        </Link>

        <Link
          href="/admin/moderation?status=rejected"
          className={`inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
            currentStatus === 'rejected'
              ? 'bg-heritage-800 text-white shadow-sm'
              : 'text-heritage-700 hover:bg-heritage-200/60'
          }`}
        >
          <XCircle className="w-3.5 h-3.5" />
          <span>Refusées</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-heritage-200 text-heritage-800">
            {rejectedCount || 0}
          </span>
        </Link>
      </div>

      {/* Proposals Queue */}
      {enrichedProposals.length === 0 ? (
        <div className="bg-white rounded-2xl border border-heritage-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-heritage-100 text-heritage-600 flex items-center justify-center mx-auto">
            <CheckSquare className="w-6 h-6" />
          </div>
          <h2 className="font-serif text-lg font-bold text-heritage-900">
            Aucune proposition dans cette section
          </h2>
          <p className="text-xs text-heritage-600 max-w-md mx-auto">
            {currentStatus === 'pending'
              ? 'Toutes les propositions ont été traitées ! La file de modération est vide.'
              : `Aucune proposition n’a le statut "${currentStatus}".`}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {enrichedProposals.map((proposal) => (
            <ProposalModerationCard key={proposal.id} proposal={proposal} />
          ))}
        </div>
      )}
    </div>
  );
}
