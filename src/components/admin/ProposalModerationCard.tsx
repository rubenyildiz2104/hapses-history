'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  AlertTriangle, 
  User, 
  Calendar, 
  MapPin, 
  BookOpen, 
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  HeartHandshake,
  Users
} from 'lucide-react';
import { reviewProposalAction } from '@/app/actions/moderation';
import { ProposalType, DatePrecision, LifeStatus } from '@/lib/types/database';

export interface DuplicateCandidate {
  candidate_id: string;
  first_names: string;
  last_name: string;
  birth_year: number | null;
  death_year: number | null;
  confidence_score: number;
  reasons: string[];
}

export interface ModerationProposal {
  id: string;
  proposal_type: ProposalType;
  submitted_by: string;
  submitter_name: string;
  submitter_email?: string;
  target_person_id: string | null;
  target_person?: Record<string, unknown> | null;
  person_a?: Record<string, unknown> | null;
  person_b?: Record<string, unknown> | null;
  parent_person?: Record<string, unknown> | null;
  spouse_person?: Record<string, unknown> | null;
  sibling_person?: Record<string, unknown> | null;
  payload: Record<string, unknown>;
  sources_info: Record<string, unknown> | null;
  status: string;
  review_comment?: string | null;
  created_at: string;
  potential_duplicates?: DuplicateCandidate[];
}

export function ProposalModerationCard({ proposal }: { proposal: ModerationProposal }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeModal, setActiveModal] = useState<'accept' | 'reject' | 'needs_information' | null>(null);
  const [adminComment, setAdminComment] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  const payload = proposal.payload;
  const sources = proposal.sources_info;
  const target = proposal.target_person;
  const duplicates = proposal.potential_duplicates || [];

  const personName = payload.first_names || payload.last_name
    ? `${payload.first_names ?? ''} ${payload.last_name ?? ''}`.trim()
    : 'Sans nom';

  const typeLabels: Record<ProposalType, string> = {
    add_person: 'Nouvelle personne',
    update_person: 'Modification de fiche',
    add_relationship: 'Nouveau lien de parenté',
    update_relationship: 'Modification de lien',
  };

  async function handleDecisionSubmit(decision: 'accept' | 'reject' | 'needs_information') {
    if ((decision === 'reject' || decision === 'needs_information') && !adminComment.trim()) {
      setActionError('Un motif ou commentaire explicatif est requis pour cette décision.');
      return;
    }

    setActionError(null);
    startTransition(async () => {
      const res = await reviewProposalAction(proposal.id, decision, adminComment.trim() || null);
      if (res.success) {
        setActiveModal(null);
        setAdminComment('');
        router.refresh();
      } else {
        setActionError(res.error || 'Erreur lors de l’enregistrement de la décision.');
      }
    });
  }

  return (
    <div className="bg-white rounded-xl border border-heritage-200 shadow-sm overflow-hidden transition-all">
      {/* Header bar */}
      <div className="p-5 bg-heritage-50/70 border-b border-heritage-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <span className="px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wider bg-heritage-800 text-heritage-50">
            {typeLabels[proposal.proposal_type] || proposal.proposal_type}
          </span>
          <span className="text-xs text-heritage-600">
            Proposé par <strong className="text-heritage-900">{proposal.submitter_name}</strong>
            {proposal.submitter_email && ` (${proposal.submitter_email})`}
          </span>
          <span className="text-xs text-heritage-400">•</span>
          <span className="text-xs text-heritage-500">
            {new Date(proposal.created_at).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-heritage-600 hover:text-heritage-900 flex items-center space-x-1"
        >
          <span>{expanded ? 'Masquer détails' : 'Afficher détails'}</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Main card body */}
      {expanded && (
        <div className="p-6 space-y-6">
          {/* PREVIOUS CLARIFICATION REMINDER IF RE-SUBMITTED */}
          {Boolean(proposal.review_comment) && (
            <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 space-y-1.5 shadow-sm">
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-sky-800">
                <MessageSquare className="w-4 h-4 text-sky-600 shrink-0" />
                <span>Demande de précisions envoyée précédemment</span>
              </div>
              <p className="font-serif italic text-xs sm:text-sm pl-6 text-sky-950 leading-relaxed">
                « {proposal.review_comment} »
              </p>
            </div>
          )}

          {/* POTENTIAL DUPLICATE ADVISORY BANNER */}
          {duplicates.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-300 text-amber-900 space-y-2">
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Avertissement : {duplicates.length} doublon(s) potentiel(s) détecté(s)</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed font-serif">
                Le moteur de détection a repéré des personnes déjà enregistrées présentant de fortes similarités :
              </p>
              <div className="space-y-2 pt-1">
                {duplicates.map((dup) => (
                  <div
                    key={dup.candidate_id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-lg bg-white/80 border border-amber-200 text-xs gap-2"
                  >
                    <div>
                      <span className="font-bold text-heritage-900">
                        {dup.first_names} {dup.last_name}
                      </span>
                      <span className="text-heritage-600 ml-2">
                        ({dup.birth_year ? `° ${dup.birth_year}` : '° ?'} — {dup.death_year ? `† ${dup.death_year}` : '† ?'})
                      </span>
                      <div className="text-[11px] text-heritage-500 mt-0.5">
                        Indice de confiance : <strong className="text-amber-700">{dup.confidence_score}%</strong> • {dup.reasons.join(', ')}
                      </div>
                    </div>
                    <Link
                      href={`/genealogie/${dup.candidate_id}`}
                      target="_blank"
                      className="inline-flex items-center space-x-1 text-xs font-semibold text-heritage-800 hover:underline shrink-0"
                    >
                      <span>Vérifier fiche</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ADD_RELATIONSHIP VIEW */}
          {proposal.proposal_type === 'add_relationship' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-4">
                <div className="p-4 rounded-xl bg-heritage-50/70 border border-heritage-200 space-y-4">
                  <span className="font-semibold text-heritage-600 block uppercase tracking-wide text-xs">
                    Lien de parenté proposé
                  </span>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-white border border-heritage-200">
                    {/* Person A */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold uppercase text-heritage-500">Personne A</span>
                      <p className="font-serif font-bold text-base text-heritage-950">
                        {proposal.person_a ? `${String(proposal.person_a.first_names)} ${String(proposal.person_a.last_name)}` : String(payload.person_a_id)}
                      </p>
                      {proposal.person_a && (
                        <p className="text-xs text-heritage-500">
                          {proposal.person_a.birth_year ? `° ${String(proposal.person_a.birth_year)}` : '° ?'} — {proposal.person_a.death_year ? `† ${String(proposal.person_a.death_year)}` : '† ?'}
                        </p>
                      )}
                      {proposal.person_a && (
                        <Link
                          href={`/genealogie/${String(proposal.person_a.id)}`}
                          target="_blank"
                          className="text-xs text-heritage-700 underline inline-flex items-center space-x-1 font-medium"
                        >
                          <span>Consulter fiche</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </div>

                    {/* Relation indicator badge */}
                    <div className="flex flex-col items-center justify-center px-4 py-2.5 rounded-xl bg-heritage-100 border border-heritage-300 text-center shrink-0">
                      {payload.relationship_type === 'parent_child' ? (
                        <>
                          <span className="text-xs font-bold text-heritage-900 uppercase">Est le parent de</span>
                          <span className="text-[11px] text-heritage-600 font-medium">➔ Filiation</span>
                        </>
                      ) : payload.relationship_type === 'sibling' ? (
                        <>
                          <span className="text-xs font-bold text-heritage-900 uppercase flex items-center justify-center">
                            <Users className="w-3.5 h-3.5 mr-1 inline" />
                            <span>Frères & Sœurs</span>
                          </span>
                          <span className="text-[11px] text-heritage-600 font-medium">👥 Fratrie</span>
                        </>
                      ) : (
                        <>
                          <span className="text-xs font-bold text-heritage-900 uppercase">Époux / Épouse de</span>
                          <span className="text-[11px] text-heritage-600 font-medium">💍 Conjoints</span>
                        </>
                      )}
                    </div>

                    {/* Person B */}
                    <div className="space-y-1 text-left sm:text-right">
                      <span className="text-[11px] font-semibold uppercase text-heritage-500">Personne B</span>
                      <p className="font-serif font-bold text-base text-heritage-950">
                        {proposal.person_b ? `${String(proposal.person_b.first_names)} ${String(proposal.person_b.last_name)}` : String(payload.person_b_id)}
                      </p>
                      {proposal.person_b && (
                        <p className="text-xs text-heritage-500">
                          {proposal.person_b.birth_year ? `° ${String(proposal.person_b.birth_year)}` : '° ?'} — {proposal.person_b.death_year ? `† ${String(proposal.person_b.death_year)}` : '† ?'}
                        </p>
                      )}
                      {proposal.person_b && (
                        <Link
                          href={`/genealogie/${String(proposal.person_b.id)}`}
                          target="_blank"
                          className="text-xs text-heritage-700 underline inline-flex items-center space-x-1 font-medium"
                        >
                          <span>Consulter fiche</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Marriage details if applicable */}
                  {(Boolean(payload.start_year) || Boolean(payload.start_date) || Boolean(payload.start_place)) && (
                    <div className="p-3 rounded-lg bg-white border border-heritage-200 text-xs text-heritage-800 space-y-1">
                      <span className="font-semibold block text-heritage-700">Détails du mariage / de l’union</span>
                      <p>
                        {payload.start_year ? `Année : ${String(payload.start_year)}` : ''}
                        {payload.start_date ? ` (le ${String(payload.start_date)})` : ''}
                        {payload.start_place ? ` à ${String(payload.start_place)}` : ''}
                      </p>
                    </div>
                  )}

                  {/* Sibling details if applicable */}
                  {payload.relationship_type === 'sibling' && (
                    <div className="p-3 rounded-lg bg-white border border-heritage-200 text-xs text-heritage-800 space-y-1">
                      <span className="font-semibold block text-heritage-700">Filiation fraternelle</span>
                      <p className="text-heritage-600">
                        {payload.common_parent_first_names
                          ? `Parent commun : ${String(payload.common_parent_first_names)} ${String(payload.common_parent_last_name || '')} (${payload.common_parent_gender === 'F' ? 'Mère' : 'Père'})`
                          : 'Rattachement automatique aux parents existants ou création automatique d\'un parent commun.'}
                      </p>
                    </div>
                  )}

                  {Boolean(payload.notes) && (
                    <div className="p-3 rounded-lg bg-white border border-heritage-200 text-xs text-heritage-800 space-y-1">
                      <span className="font-semibold block text-heritage-700">Précisions sur ce lien</span>
                      <p className="font-serif italic leading-relaxed">« {String(payload.notes)} »</p>
                    </div>
                  )}
                </div>

                {Boolean(payload.user_explanation) && (
                  <div className="text-xs text-heritage-700 bg-amber-50/40 p-3 rounded-lg border border-amber-200">
                    <strong className="text-amber-900 block mb-1">Explication du contributeur :</strong>
                    <p className="font-serif italic leading-relaxed">« {String(payload.user_explanation)} »</p>
                  </div>
                )}
              </div>

              {/* Source verification column */}
              <div className="bg-heritage-50/60 p-4 rounded-xl border border-heritage-200 text-xs space-y-2 h-fit">
                <span className="font-bold uppercase tracking-wider text-heritage-800 flex items-center space-x-1.5">
                  <BookOpen className="w-4 h-4 text-heritage-600" />
                  <span>Sources & Références</span>
                </span>
                {sources ? (
                  <div className="space-y-1.5 text-heritage-700 pt-1">
                    <p className="font-bold text-heritage-950">{String(sources.title || 'Sans titre')}</p>
                    {Boolean(sources.archive_reference) && (
                      <p className="text-heritage-600">Archive : {String(sources.archive_reference)}</p>
                    )}
                    {Boolean(sources.description) && (
                      <p className="text-heritage-600 font-serif italic">{String(sources.description)}</p>
                    )}
                    {Boolean(sources.uncertainty_notes) && (
                      <p className="text-amber-800 bg-amber-50 p-1.5 rounded border border-amber-200 text-[11px]">
                        Note : {String(sources.uncertainty_notes)}
                      </p>
                    )}
                    {Boolean(sources.url) && (
                      <a
                        href={String(sources.url)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1 text-heritage-900 underline font-medium hover:text-black mt-1"
                      >
                        <span>Consulter document</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="text-heritage-500 italic pt-1">
                    Aucune source formelle fournie par le contributeur.
                  </p>
                )}
              </div>
            </div>
          ) : proposal.proposal_type === 'update_person' && target ? (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-heritage-700">
                Comparatif des modifications proposées
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Existing data */}
                <div className="p-4 rounded-xl bg-heritage-50/70 border border-heritage-200 text-xs space-y-2">
                  <span className="font-semibold text-heritage-600 block uppercase tracking-wide text-[11px]">
                    Données actuelles en base
                  </span>
                  <p className="font-serif text-base font-bold text-heritage-900">
                    {String(target.first_names)} {String(target.last_name)}
                  </p>
                  <div className="space-y-1 text-heritage-700">
                    <p>Naissance : {target.birth_year ? `Année ${target.birth_year}` : 'Inconnue'} {target.birth_place ? `à ${target.birth_place}` : ''}</p>
                    <p>Décès : {target.death_year ? `Année ${target.death_year}` : 'Inconnu'} {target.death_place ? `à ${target.death_place}` : ''}</p>
                    <p>Statut : <span className="font-medium">{String(target.life_status)}</span> (visibilité : {String(target.visibility)})</p>
                    {Boolean(target.profession) && <p>Métier : {String(target.profession)}</p>}
                    {Boolean(target.biography) && <p className="italic font-serif line-clamp-2">Bio : « {String(target.biography)} »</p>}
                  </div>
                </div>

                {/* Proposed data */}
                <div className="p-4 rounded-xl bg-amber-50/40 border border-amber-200 text-xs space-y-2">
                  <span className="font-semibold text-amber-800 block uppercase tracking-wide text-[11px]">
                    Modifications proposées
                  </span>
                  <p className="font-serif text-base font-bold text-heritage-900">
                    {payload.first_names ? String(payload.first_names) : String(target.first_names)}{' '}
                    {payload.last_name ? String(payload.last_name) : String(target.last_name)}
                  </p>
                  <div className="space-y-1 text-heritage-700">
                    <p className={payload.birth_year ? 'font-semibold text-heritage-900' : ''}>
                      Naissance : {payload.birth_year ? `Année ${payload.birth_year}` : target.birth_year ? `Année ${target.birth_year}` : 'Inconnue'}{' '}
                      {payload.birth_place ? `à ${payload.birth_place}` : target.birth_place ? `à ${target.birth_place}` : ''}
                    </p>
                    <p className={payload.death_year ? 'font-semibold text-heritage-900' : ''}>
                      Décès : {payload.death_year ? `Année ${payload.death_year}` : target.death_year ? `Année ${target.death_year}` : 'Inconnu'}{' '}
                      {payload.death_place ? `à ${payload.death_place}` : target.death_place ? `à ${target.death_place}` : ''}
                    </p>
                    <p>Statut : {payload.life_status ? String(payload.life_status) : String(target.life_status)}</p>
                    {Boolean(payload.profession) && <p>Métier : {String(payload.profession)}</p>}
                    {Boolean(payload.biography) && <p className="italic font-serif">Bio : « {String(payload.biography)} »</p>}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Standard View for ADD_PERSON or other proposal types */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-3">
                <div className="flex items-center space-x-2">
                  <User className="w-5 h-5 text-heritage-600 shrink-0" />
                  <span className="font-serif font-bold text-xl text-heritage-950">
                    {personName}
                  </span>
                  {Boolean(payload.gender) && (
                    <span className="text-xs text-heritage-500">
                      ({payload.gender === 'M' ? 'Homme' : payload.gender === 'F' ? 'Femme' : 'Non spécifié'})
                    </span>
                  )}
                </div>

                {Array.isArray(payload.name_variants) && payload.name_variants.length > 0 && (
                  <p className="text-xs text-heritage-600">
                    <strong className="text-heritage-800">Variantes / Surnoms : </strong>
                    {payload.name_variants.join(', ')}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-heritage-800 pt-1">
                  <div className="p-3 rounded-lg bg-heritage-50 border border-heritage-100 space-y-1">
                    <span className="font-semibold text-heritage-700 block">Naissance</span>
                    <p className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-heritage-500" />
                      <span>{payload.birth_year ? `Année ${payload.birth_year}` : 'Non précisée'} ({String(payload.birth_date_precision || 'unknown')})</span>
                    </p>
                    {Boolean(payload.birth_place) && (
                      <p className="flex items-center space-x-1 text-heritage-600">
                        <MapPin className="w-3.5 h-3.5 text-heritage-400" />
                        <span>{String(payload.birth_place)}</span>
                      </p>
                    )}
                  </div>

                  <div className="p-3 rounded-lg bg-heritage-50 border border-heritage-100 space-y-1">
                    <span className="font-semibold text-heritage-700 block">Décès & Statut</span>
                    <p className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-heritage-500" />
                      <span>{payload.death_year ? `Année ${payload.death_year}` : 'Non précisée'} ({String(payload.death_date_precision || 'unknown')})</span>
                    </p>
                    <p className="text-heritage-600">
                      Statut vie : <strong className="text-heritage-800">{String(payload.life_status || 'unknown')}</strong>
                    </p>
                  </div>
                </div>

                {/* Optional family linkages to create with this person */}
                {(Boolean(proposal.parent_person) || Boolean(proposal.spouse_person) || Boolean(proposal.sibling_person)) && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-2">
                    <span className="font-semibold text-emerald-900 uppercase text-[11px] block">
                      Liens familiaux créés automatiquement à l&apos;approbation :
                    </span>
                    {proposal.parent_person && (
                      <div className="flex items-center space-x-2 text-emerald-900">
                        <span>👪 <strong>Parent :</strong></span>
                        <span>{String(proposal.parent_person.first_names)} {String(proposal.parent_person.last_name)}</span>
                        {Boolean(proposal.parent_person.birth_year) && (
                          <span className="text-emerald-700">(° {String(proposal.parent_person.birth_year)})</span>
                        )}
                        <Link
                          href={`/genealogie/${String(proposal.parent_person.id)}`}
                          target="_blank"
                          className="text-emerald-800 underline hover:text-emerald-950 inline-flex items-center space-x-0.5 ml-2 font-medium"
                        >
                          <span>Fiche</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    )}
                    {proposal.sibling_person && (
                      <div className="flex items-center space-x-2 text-emerald-900">
                        <span>👥 <strong>Frère / Sœur :</strong></span>
                        <span>{String(proposal.sibling_person.first_names)} {String(proposal.sibling_person.last_name)}</span>
                        {Boolean(proposal.sibling_person.birth_year) && (
                          <span className="text-emerald-700">(° {String(proposal.sibling_person.birth_year)})</span>
                        )}
                        <Link
                          href={`/genealogie/${String(proposal.sibling_person.id)}`}
                          target="_blank"
                          className="text-emerald-800 underline hover:text-emerald-950 inline-flex items-center space-x-0.5 ml-2 font-medium"
                        >
                          <span>Fiche</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    )}
                    {proposal.spouse_person && (
                      <div className="flex items-center space-x-2 text-emerald-900">
                        <span>💍 <strong>Conjoint(e) :</strong></span>
                        <span>{String(proposal.spouse_person.first_names)} {String(proposal.spouse_person.last_name)}</span>
                        {Boolean(proposal.spouse_person.birth_year) && (
                          <span className="text-emerald-700">(° {String(proposal.spouse_person.birth_year)})</span>
                        )}
                        <Link
                          href={`/genealogie/${String(proposal.spouse_person.id)}`}
                          target="_blank"
                          className="text-emerald-800 underline hover:text-emerald-950 inline-flex items-center space-x-0.5 ml-2 font-medium"
                        >
                          <span>Fiche</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {Boolean(payload.profession) && (
                  <p className="text-xs text-heritage-700">
                    <strong className="text-heritage-800">Profession : </strong>
                    {String(payload.profession)}
                  </p>
                )}

                {Boolean(payload.biography) && (
                  <div className="text-xs text-heritage-700 bg-heritage-50/50 p-3 rounded-lg border border-heritage-100">
                    <strong className="text-heritage-800 block mb-1">Notice biographique :</strong>
                    <p className="font-serif leading-relaxed">{String(payload.biography)}</p>
                  </div>
                )}

                {Boolean(payload.user_explanation) && (
                  <div className="text-xs text-heritage-700 bg-amber-50/40 p-3 rounded-lg border border-amber-200">
                    <strong className="text-amber-900 block mb-1">Explication du contributeur :</strong>
                    <p className="font-serif italic leading-relaxed">« {String(payload.user_explanation)} »</p>
                  </div>
                )}
              </div>

              {/* Source verification column */}
              <div className="bg-heritage-50/60 p-4 rounded-xl border border-heritage-200 text-xs space-y-2 h-fit">
                <span className="font-bold uppercase tracking-wider text-heritage-800 flex items-center space-x-1.5">
                  <BookOpen className="w-4 h-4 text-heritage-600" />
                  <span>Sources & Références</span>
                </span>
                {sources ? (
                  <div className="space-y-1.5 text-heritage-700 pt-1">
                    <p className="font-bold text-heritage-950">{String(sources.title || 'Sans titre')}</p>
                    {Boolean(sources.archive_reference) && (
                      <p className="text-heritage-600">Archive : {String(sources.archive_reference)}</p>
                    )}
                    {Boolean(sources.description) && (
                      <p className="text-heritage-600 font-serif italic">{String(sources.description)}</p>
                    )}
                    {Boolean(sources.uncertainty_notes) && (
                      <p className="text-amber-800 bg-amber-50 p-1.5 rounded border border-amber-200 text-[11px]">
                        Note : {String(sources.uncertainty_notes)}
                      </p>
                    )}
                    {Boolean(sources.url) && (
                      <a
                        href={String(sources.url)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1 text-heritage-900 underline font-medium hover:text-black mt-1"
                      >
                        <span>Consulter document</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="text-heritage-500 italic pt-1">
                    Aucune source formelle fournie par le contributeur.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Action error */}
          {actionError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs">
              {actionError}
            </div>
          )}

          {/* Action Decision buttons */}
          <div className="pt-4 border-t border-heritage-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2 text-xs text-heritage-500">
              <ShieldCheck className="w-4 h-4 text-heritage-400" />
              <span>L’acceptation exécutera une transaction PostgreSQL atomique avec journalisation d’audit.</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setActiveModal('needs_information');
                  setActionError(null);
                }}
                className="px-3 py-2 rounded-lg border border-sky-300 text-sky-800 hover:bg-sky-50 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                Demander un complément
              </button>

              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setActiveModal('reject');
                  setActionError(null);
                }}
                className="px-3 py-2 rounded-lg border border-rose-300 text-rose-800 hover:bg-rose-50 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                Refuser
              </button>

              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setActiveModal('accept');
                  setActionError(null);
                }}
                className="px-4 py-2 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 inline-flex items-center space-x-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Accepter et intégrer</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decision confirmation modal / drawer */}
      {activeModal && (
        <div className="p-6 bg-heritage-100/60 border-t border-heritage-300 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-serif font-bold text-sm text-heritage-950">
              {activeModal === 'accept' && 'Confirmer l’acceptation de la proposition'}
              {activeModal === 'needs_information' && 'Demander des précisions ou sources'}
              {activeModal === 'reject' && 'Confirmer le rejet de la proposition'}
            </h4>
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="text-xs text-heritage-500 hover:text-heritage-800"
            >
              Annuler
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-heritage-800 mb-1">
              {activeModal === 'accept' ? 'Commentaire de validation (optionnel) :' : 'Motif ou instructions pour le contributeur (obligatoire) :'}
            </label>
            <textarea
              rows={3}
              value={adminComment}
              onChange={(e) => setAdminComment(e.target.value)}
              placeholder={
                activeModal === 'accept'
                  ? 'Ex: Fiche validée d’après le registre paroissial de 1895.'
                  : activeModal === 'needs_information'
                  ? 'Ex: Pourriez-vous indiquer la source orale ou la date approximative de mariage ?'
                  : 'Ex: Fiche rejetée car la personne existe déjà sous l’ID #... ou informations contradictoires.'
              }
              className="w-full p-2.5 rounded-lg border border-heritage-300 text-heritage-950 text-xs placeholder-heritage-400 focus:outline-none focus:ring-2 focus:ring-heritage-600 bg-white"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="px-3 py-1.5 rounded-md border border-heritage-300 text-heritage-700 text-xs hover:bg-white"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleDecisionSubmit(activeModal)}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold text-white shadow-sm transition-colors ${
                activeModal === 'accept'
                  ? 'bg-emerald-700 hover:bg-emerald-800'
                  : activeModal === 'needs_information'
                  ? 'bg-sky-700 hover:bg-sky-800'
                  : 'bg-rose-700 hover:bg-rose-800'
              }`}
            >
              {isPending ? 'En cours de validation...' : 'Confirmer la décision'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
