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
  ChevronUp
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

          {/* SIDE-BY-SIDE DIFF VIEW (FOR UPDATE_PERSON) OR SINGLE VIEW (FOR ADD_PERSON) */}
          {proposal.proposal_type === 'update_person' && target ? (
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
