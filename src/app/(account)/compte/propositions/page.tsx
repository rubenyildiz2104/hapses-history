import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  PlusCircle, 
  FileText, 
  User, 
  Calendar, 
  MapPin, 
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { signOutAction } from '@/app/actions/auth';
import { ProposalStatus, ProposalType } from '@/lib/types/database';

export const metadata = {
  title: 'Mes Propositions | Habses History',
  description: 'Suivi de vos propositions de contributions généalogiques et historiques.',
};

interface ProposalRecord {
  id: string;
  submitted_by: string;
  proposal_type: ProposalType;
  target_person_id: string | null;
  target_relationship_id: string | null;
  payload: Record<string, unknown>;
  sources_info: Record<string, unknown> | null;
  status: ProposalStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_comment: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_CONFIG: Record<
  ProposalStatus,
  {
    label: string;
    icon: typeof Clock;
    badgeClass: string;
    description: string;
  }
> = {
  pending: {
    label: 'En attente d’examen',
    icon: Clock,
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    description: 'Votre proposition est enregistrée. L’administrateur va l’examiner et vérifier les sources.',
  },
  accepted: {
    label: 'Acceptée et intégrée',
    icon: CheckCircle2,
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    description: 'Cette proposition a été validée et intégrée officiellement dans la base du village.',
  },
  needs_information: {
    label: 'Précisions demandées',
    icon: AlertCircle,
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
    description: 'L’administrateur vous invite à compléter votre proposition avec des sources ou clarifications.',
  },
  rejected: {
    label: 'Non retenue',
    icon: XCircle,
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
    description: 'Cette proposition n’a pas pu être intégrée selon les règles du projet.',
  },
};

const TYPE_LABELS: Record<ProposalType, string> = {
  add_person: 'Nouvelle personne',
  update_person: 'Modification d’une fiche',
  add_relationship: 'Nouveau lien familial',
  update_relationship: 'Modification d’un lien',
};

export default async function MesPropositionsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/connexion?next=/compte/propositions');
  }

  // Fetch user profile for role
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, role')
    .eq('id', user.id)
    .single();

  // Fetch user's proposals
  const { data: proposalsData } = await supabase
    .from('proposals')
    .select('*')
    .eq('submitted_by', user.id)
    .order('created_at', { ascending: false });

  const proposals: ProposalRecord[] = proposalsData || [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-8">
      {/* Account topbar */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-heritage-200 pb-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs uppercase tracking-widest text-heritage-600 font-semibold">
              Espace Membre
            </span>
            {profile?.role === 'admin' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-heritage-800 text-heritage-50">
                Administrateur
              </span>
            )}
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-heritage-950 mt-1">
            Mes propositions de contribution
          </h1>
          <p className="text-sm text-heritage-600 mt-1 font-serif">
            Bonjour {profile?.display_name || user.email}, retrouvez l’historique et le statut de vos soumissions.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/proposer"
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-heritage-800 text-heritage-50 text-sm font-semibold hover:bg-heritage-900 transition-colors shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nouvelle proposition</span>
          </Link>

          {profile?.role === 'admin' && (
            <Link
              href="/admin/moderation"
              className="inline-flex items-center space-x-2 px-3.5 py-2.5 rounded-lg border border-heritage-300 text-heritage-800 text-sm font-medium hover:bg-heritage-100 transition-colors"
            >
              <span>Espace Modération</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}

          <form action={signOutAction}>
            <button
              type="submit"
              className="px-3 py-2.5 rounded-lg border border-heritage-300 text-heritage-600 hover:text-heritage-900 hover:bg-heritage-100 text-sm font-medium transition-colors"
            >
              Déconnexion
            </button>
          </form>
        </div>
      </div>

      {/* Proposals list */}
      {proposals.length === 0 ? (
        <div className="bg-heritage-50 border border-heritage-200 rounded-2xl p-10 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-heritage-200 text-heritage-700 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="font-serif text-lg font-bold text-heritage-900">
              Aucune proposition soumise pour le moment
            </h2>
            <p className="text-sm text-heritage-600 max-w-md mx-auto">
              Vous n’avez encore soumis aucune fiche généalogique ou correction historique.
              Participez à la mémoire de Habses en proposant une première personne !
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/proposer"
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-heritage-800 text-heritage-50 text-sm font-semibold hover:bg-heritage-900 transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Proposer une fiche généalogique</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between text-xs text-heritage-600">
            <span>
              {proposals.length} proposition{proposals.length > 1 ? 's' : ''} enregistrée{proposals.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {proposals.map((proposal) => {
              const statusCfg = STATUS_CONFIG[proposal.status];
              const StatusIcon = statusCfg.icon;
              const payload = proposal.payload as Record<string, unknown>;
              const sources = proposal.sources_info as Record<string, unknown> | null;

              const personName = payload.first_names || payload.last_name
                ? `${payload.first_names ?? ''} ${payload.last_name ?? ''}`.trim()
                : 'Fiche sans nom';

              const birthYear = payload.birth_year ? String(payload.birth_year) : null;
              const deathYear = payload.death_year ? String(payload.death_year) : null;
              const birthPlace = payload.birth_place ? String(payload.birth_place) : null;

              return (
                <div
                  key={proposal.id}
                  className="bg-white rounded-xl border border-heritage-200 p-6 shadow-sm space-y-4 hover:border-heritage-300 transition-colors"
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-heritage-100">
                    <div className="flex items-center space-x-3">
                      <span className="px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wider bg-heritage-100 text-heritage-800">
                        {TYPE_LABELS[proposal.proposal_type] || proposal.proposal_type}
                      </span>
                      <span className="text-xs text-heritage-500">
                        Soumis le {new Date(proposal.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    <div className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium border ${statusCfg.badgeClass}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      <span>{statusCfg.label}</span>
                    </div>
                  </div>

                  {/* Proposed content summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-2">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-heritage-500 shrink-0" />
                        <span className="font-serif font-bold text-lg text-heritage-950">
                          {personName}
                        </span>
                        {Boolean(payload.gender) && (
                          <span className="text-xs text-heritage-500">
                            ({payload.gender === 'M' ? 'Homme' : payload.gender === 'F' ? 'Femme' : 'Non spécifié'})
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-heritage-700">
                        {(birthYear || birthPlace) && (
                          <span className="inline-flex items-center space-x-1">
                            <Calendar className="w-3.5 h-3.5 text-heritage-400" />
                            <span>
                              Né(e) {birthYear ? `en ${birthYear}` : ''} {birthPlace ? `à ${birthPlace}` : ''}
                            </span>
                          </span>
                        )}
                        {deathYear && (
                          <span className="inline-flex items-center space-x-1">
                            <Calendar className="w-3.5 h-3.5 text-heritage-400" />
                            <span>Décédé(e) en {deathYear}</span>
                          </span>
                        )}
                        {Boolean(payload.profession) && (
                          <span className="inline-flex items-center space-x-1">
                            <span>Métier : {String(payload.profession)}</span>
                          </span>
                        )}
                      </div>

                      {Boolean(payload.user_explanation) && (
                        <p className="text-xs text-heritage-600 bg-heritage-50/70 p-2.5 rounded-lg border border-heritage-100 font-serif">
                          <strong className="font-sans font-semibold text-heritage-800">Votre note : </strong>
                          {String(payload.user_explanation)}
                        </p>
                      )}
                    </div>

                    {/* Sources attached */}
                    <div className="bg-heritage-50/50 p-3 rounded-lg border border-heritage-100 text-xs space-y-1.5">
                      <span className="font-semibold uppercase tracking-wider text-heritage-700 block">
                        Source mentionnée
                      </span>
                      {sources ? (
                        <div className="space-y-1 text-heritage-700">
                          <p className="font-medium text-heritage-900">{String(sources.title || 'Sans titre')}</p>
                          {Boolean(sources.archive_reference) && (
                            <p className="text-heritage-600">Réf : {String(sources.archive_reference)}</p>
                          )}
                          {Boolean(sources.url) && (
                            <a
                              href={String(sources.url)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-heritage-800 underline hover:text-heritage-950 block truncate"
                            >
                              Lien vers l’archive
                            </a>
                          )}
                        </div>
                      ) : (
                        <p className="text-heritage-500 italic">Aucune source formelle rattachée.</p>
                      )}
                    </div>
                  </div>

                  {/* Admin review feedback box (if commented) */}
                  {proposal.review_comment && (
                    <div className={`p-4 rounded-xl border text-xs space-y-1.5 ${
                      proposal.status === 'needs_information'
                        ? 'bg-sky-50 border-sky-200 text-sky-900'
                        : proposal.status === 'rejected'
                        ? 'bg-rose-50 border-rose-200 text-rose-900'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    }`}>
                      <div className="flex items-center space-x-1.5 font-semibold">
                        <ShieldAlert className="w-4 h-4 shrink-0" />
                        <span>Retour de l’administrateur</span>
                        {proposal.reviewed_at && (
                          <span className="font-normal opacity-75">
                            ({new Date(proposal.reviewed_at).toLocaleDateString('fr-FR')})
                          </span>
                        )}
                      </div>
                      <p className="font-serif leading-relaxed pl-5">
                        « {proposal.review_comment} »
                      </p>
                    </div>
                  )}

                  {/* Direct link if accepted and linked to official person */}
                  {proposal.status === 'accepted' && proposal.target_person_id && (
                    <div className="pt-2 flex justify-end">
                      <Link
                        href={`/genealogie/${proposal.target_person_id}`}
                        className="inline-flex items-center space-x-1 text-xs font-semibold text-heritage-800 hover:text-heritage-950 hover:underline"
                      >
                        <span>Voir la fiche généalogique officielle</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
