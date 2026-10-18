'use client';

import { useState, useTransition, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { submitProposalAction } from '@/app/actions/proposals';
import { ProposalType, DatePrecision, LifeStatus } from '@/lib/types/database';
import { UserPlus, Edit3, HeartHandshake, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import Link from 'next/link';

function ProposerForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillTargetPersonId = searchParams.get('targetPersonId');

  const [proposalType, setProposalType] = useState<ProposalType>(
    prefillTargetPersonId ? 'update_person' : 'add_person'
  );

  // Form states for Person
  const [firstNames, setFirstNames] = useState('');
  const [lastName, setLastName] = useState('');
  const [nameVariants, setNameVariants] = useState('');
  const [gender, setGender] = useState<'M' | 'F' | 'other' | 'unknown'>('unknown');

  const [birthYear, setBirthYear] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthDatePrecision, setBirthDatePrecision] = useState<DatePrecision>('unknown');
  const [birthPlace, setBirthPlace] = useState('');

  const [deathYear, setDeathYear] = useState('');
  const [deathDate, setDeathDate] = useState('');
  const [deathDatePrecision, setDeathDatePrecision] = useState<DatePrecision>('unknown');
  const [deathPlace, setDeathPlace] = useState('');

  const [lifeStatus, setLifeStatus] = useState<LifeStatus>('deceased');
  const [profession, setProfession] = useState('');
  const [biography, setBiography] = useState('');

  // Sources & explanations
  const [sourceTitle, setSourceTitle] = useState('');
  const [archiveReference, setArchiveReference] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceDescription, setSourceDescription] = useState('');
  const [uncertaintyNotes, setUncertaintyNotes] = useState('');
  const [userExplanation, setUserExplanation] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const variantsArray = nameVariants
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v.length > 0);

    const payload: Record<string, unknown> = {
      first_names: firstNames.trim(),
      last_name: lastName.trim(),
      name_variants: variantsArray,
      gender: gender === 'unknown' ? null : gender,
      birth_year: birthYear ? parseInt(birthYear, 10) : null,
      birth_date: birthDate || null,
      birth_date_precision: birthDatePrecision,
      birth_place: birthPlace.trim() || null,
      death_year: deathYear ? parseInt(deathYear, 10) : null,
      death_date: deathDate || null,
      death_date_precision: deathDatePrecision,
      death_place: deathPlace.trim() || null,
      life_status: lifeStatus,
      visibility: 'public',
      profession: profession.trim() || null,
      biography: biography.trim() || null,
    };

    const sources_info = sourceTitle.trim()
      ? {
          title: sourceTitle.trim(),
          archive_reference: archiveReference.trim() || undefined,
          url: sourceUrl.trim() || undefined,
          description: sourceDescription.trim() || undefined,
          uncertainty_notes: uncertaintyNotes.trim() || undefined,
          is_approximate: birthDatePrecision === 'approximate' || deathDatePrecision === 'approximate',
        }
      : undefined;

    startTransition(async () => {
      const res = await submitProposalAction({
        proposal_type: proposalType,
        target_person_id: prefillTargetPersonId || null,
        payload,
        sources_info,
        user_explanation: userExplanation.trim() || undefined,
      });

      if (res.success) {
        setSuccess(true);
      } else {
        setError(res.error || 'Une erreur est survenue lors de l\'envoi de la proposition.');
      }
    });
  }

  if (success) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h1 className="font-serif text-2xl font-bold text-heritage-950">
          Proposition envoyée avec succès !
        </h1>
        <p className="text-sm text-heritage-700 leading-relaxed font-serif">
          Votre proposition a été enregistrée en attente de modération. Conformément aux règles du projet, 
          elle sera examinée par l&apos;administrateur avant toute intégration officielle aux données du village.
        </p>
        <div className="pt-4 flex justify-center space-x-3">
          <Link
            href="/compte/propositions"
            className="px-5 py-2.5 rounded-lg bg-heritage-800 text-heritage-50 text-sm font-semibold hover:bg-heritage-900 transition-colors"
          >
            Suivre mes propositions
          </Link>
          <button
            type="button"
            onClick={() => {
              setSuccess(false);
              setFirstNames('');
              setLastName('');
              setNameVariants('');
              setBirthYear('');
              setDeathYear('');
              setSourceTitle('');
            }}
            className="px-5 py-2.5 rounded-lg border border-heritage-300 text-heritage-800 text-sm font-medium hover:bg-heritage-100 transition-colors"
          >
            Faire une autre proposition
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-heritage-600">
          Espace de contribution
        </span>
        <h1 className="font-serif text-3xl font-bold text-heritage-950">
          Proposer un ajout ou une correction
        </h1>
        <p className="text-sm text-heritage-700 leading-relaxed">
          Participez à la mémoire du village. Aucune modification ne modifie directement les données officielles 
          sans validation préalable par l&apos;administrateur.
        </p>
      </div>

      {/* Type Selector Tabs */}
      <div className="flex border-b border-heritage-200 gap-2">
        <button
          type="button"
          onClick={() => setProposalType('add_person')}
          className={`pb-3 px-3 text-sm font-semibold border-b-2 flex items-center space-x-2 transition-colors ${
            proposalType === 'add_person'
              ? 'border-heritage-800 text-heritage-950'
              : 'border-transparent text-heritage-500 hover:text-heritage-800'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>Ajouter une personne</span>
        </button>

        <button
          type="button"
          onClick={() => setProposalType('update_person')}
          className={`pb-3 px-3 text-sm font-semibold border-b-2 flex items-center space-x-2 transition-colors ${
            proposalType === 'update_person'
              ? 'border-heritage-800 text-heritage-950'
              : 'border-transparent text-heritage-500 hover:text-heritage-800'
          }`}
        >
          <Edit3 className="w-4 h-4" />
          <span>Corriger une fiche existante</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-start space-x-2.5">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Erreur de validation :</span> {error}
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Identité */}
        <div className="p-6 rounded-2xl bg-white border border-heritage-200 space-y-4">
          <h2 className="font-serif text-lg font-bold text-heritage-900 pb-2 border-b border-heritage-100">
            1. Identité de la personne
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-heritage-800 mb-1">
                Prénom(s) *
              </label>
              <input
                type="text"
                required
                value={firstNames}
                onChange={(e) => setFirstNames(e.target.value)}
                placeholder="Ex: Pierre François"
                className="w-full px-3.5 py-2 rounded-lg border border-heritage-300 text-sm focus:ring-2 focus:ring-heritage-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-heritage-800 mb-1">
                Nom de famille *
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Ex: DUPONT"
                className="w-full px-3.5 py-2 rounded-lg border border-heritage-300 text-sm focus:ring-2 focus:ring-heritage-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-heritage-800 mb-1">
                Variantes orthographiques
              </label>
              <input
                type="text"
                value={nameVariants}
                onChange={(e) => setNameVariants(e.target.value)}
                placeholder="Ex: Dupond, De Pont (séparées par virgules)"
                className="w-full px-3.5 py-2 rounded-lg border border-heritage-300 text-sm focus:ring-2 focus:ring-heritage-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-heritage-800 mb-1">
                Genre historique
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full px-3.5 py-2 rounded-lg border border-heritage-300 text-sm focus:ring-2 focus:ring-heritage-600"
              >
                <option value="unknown">Non précisé</option>
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Naissance & Décès */}
        <div className="p-6 rounded-2xl bg-white border border-heritage-200 space-y-4">
          <h2 className="font-serif text-lg font-bold text-heritage-900 pb-2 border-b border-heritage-100">
            2. Événements et Dates
          </h2>

          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-heritage-600">
              Naissance
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-heritage-700 mb-1">Année connue</label>
                <input
                  type="number"
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value)}
                  placeholder="Ex: 1842"
                  min="800"
                  max="2100"
                  className="w-full px-3.5 py-2 rounded-lg border border-heritage-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-heritage-700 mb-1">Date exacte (si connue)</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => {
                    setBirthDate(e.target.value);
                    if (e.target.value) setBirthDatePrecision('exact');
                  }}
                  className="w-full px-3.5 py-2 rounded-lg border border-heritage-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-heritage-700 mb-1">Précision</label>
                <select
                  value={birthDatePrecision}
                  onChange={(e) => setBirthDatePrecision(e.target.value as DatePrecision)}
                  className="w-full px-3.5 py-2 rounded-lg border border-heritage-300 text-sm"
                >
                  <option value="unknown">Inconnue</option>
                  <option value="exact">Date exacte documentée</option>
                  <option value="year_only">Année seule</option>
                  <option value="approximate">Approximative (vers)</option>
                  <option value="before">Avant</option>
                  <option value="after">Après</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs text-heritage-700 mb-1">Lieu de naissance</label>
                <input
                  type="text"
                  value={birthPlace}
                  onChange={(e) => setBirthPlace(e.target.value)}
                  placeholder="Ex: Habses, paroisse Saint-Pierre"
                  className="w-full px-3.5 py-2 rounded-lg border border-heritage-300 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-heritage-100 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-heritage-600">
              Décès & Statut vital
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-heritage-700 mb-1">Statut vital</label>
                <select
                  value={lifeStatus}
                  onChange={(e) => setLifeStatus(e.target.value as LifeStatus)}
                  className="w-full px-3.5 py-2 rounded-lg border border-heritage-300 text-sm"
                >
                  <option value="deceased">Décédé(e)</option>
                  <option value="living">Vivant(e)</option>
                  <option value="unknown">Inconnu</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-heritage-700 mb-1">Année de décès</label>
                <input
                  type="number"
                  disabled={lifeStatus === 'living'}
                  value={deathYear}
                  onChange={(e) => setDeathYear(e.target.value)}
                  placeholder="Ex: 1912"
                  min="800"
                  max="2100"
                  className="w-full px-3.5 py-2 rounded-lg border border-heritage-300 text-sm disabled:bg-heritage-100"
                />
              </div>

              <div>
                <label className="block text-xs text-heritage-700 mb-1">Précision de décès</label>
                <select
                  disabled={lifeStatus === 'living'}
                  value={deathDatePrecision}
                  onChange={(e) => setDeathDatePrecision(e.target.value as DatePrecision)}
                  className="w-full px-3.5 py-2 rounded-lg border border-heritage-300 text-sm disabled:bg-heritage-100"
                >
                  <option value="unknown">Inconnue</option>
                  <option value="exact">Date exacte documentée</option>
                  <option value="year_only">Année seule</option>
                  <option value="approximate">Approximative (vers)</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs text-heritage-700 mb-1">Lieu de décès</label>
                <input
                  type="text"
                  disabled={lifeStatus === 'living'}
                  value={deathPlace}
                  onChange={(e) => setDeathPlace(e.target.value)}
                  placeholder="Ex: Habses"
                  className="w-full px-3.5 py-2 rounded-lg border border-heritage-300 text-sm disabled:bg-heritage-100"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Sources et Justificatifs */}
        <div className="p-6 rounded-2xl bg-white border border-heritage-200 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-heritage-100">
            <h2 className="font-serif text-lg font-bold text-heritage-900">
              3. Justificatifs & Sources d&apos;archives
            </h2>
            <span className="text-xs text-heritage-500">Recommandé</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-heritage-800 mb-1">
                Intitulé de la source / document
              </label>
              <input
                type="text"
                value={sourceTitle}
                onChange={(e) => setSourceTitle(e.target.value)}
                placeholder="Ex: Registre paroissial des baptêmes (1840-1845)"
                className="w-full px-3.5 py-2 rounded-lg border border-heritage-300 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-heritage-700 mb-1">Cote d&apos;archive / Référence</label>
                <input
                  type="text"
                  value={archiveReference}
                  onChange={(e) => setArchiveReference(e.target.value)}
                  placeholder="Ex: 5E 123/4 vue 18"
                  className="w-full px-3.5 py-2 rounded-lg border border-heritage-300 text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs text-heritage-700 mb-1">Lien web vers l&apos;archive numérisée</label>
                <input
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://archives.departement.fr/..."
                  className="w-full px-3.5 py-2 rounded-lg border border-heritage-300 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-heritage-700 mb-1">
                Signaler une incertitude ou expliquer la démarche
              </label>
              <textarea
                rows={2}
                value={uncertaintyNotes}
                onChange={(e) => setUncertaintyNotes(e.target.value)}
                placeholder="Précisez si certains liens sont hypothétiques ou déduits d'un recensement..."
                className="w-full px-3.5 py-2 rounded-lg border border-heritage-300 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end space-x-3 pt-4">
          <Link
            href="/genealogie"
            className="px-5 py-2.5 rounded-lg border border-heritage-300 text-heritage-800 text-sm font-medium hover:bg-heritage-100 transition-colors"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="px-6 py-2.5 rounded-lg bg-heritage-800 text-heritage-50 font-semibold text-sm hover:bg-heritage-900 transition-colors disabled:opacity-50"
          >
            {isPending ? 'Envoi en cours...' : 'Soumettre pour modération'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ProposerPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto px-4 py-16 text-center text-heritage-600 font-serif">
          Chargement du formulaire de proposition...
        </div>
      }
    >
      <ProposerForm />
    </Suspense>
  );
}
