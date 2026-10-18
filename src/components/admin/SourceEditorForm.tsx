'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Save,
  Trash2,
  ArrowLeft,
  Users,
  CheckCircle2,
  AlertCircle,
  FileText,
  Lock,
  Globe,
} from 'lucide-react';
import { upsertSourceAction, deleteSourceAction } from '@/app/actions/sources';
import { Source, Person } from '@/lib/types/database';

interface SourceEditorFormProps {
  initialSource?: Source | null;
  availablePersons: Person[];
  initialLinkedPersonIds?: string[];
}

export function SourceEditorForm({
  initialSource,
  availablePersons,
  initialLinkedPersonIds = [],
}: SourceEditorFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEditing = Boolean(initialSource);

  const [title, setTitle] = useState(initialSource?.title || '');
  const [sourceType, setSourceType] = useState(initialSource?.source_type || 'parish_register');
  const [authorOrOrganization, setAuthorOrOrganization] = useState(
    initialSource?.author_or_organization || ''
  );
  const [sourceDate, setSourceDate] = useState(initialSource?.source_date || '');
  const [archiveReference, setArchiveReference] = useState(
    initialSource?.archive_reference || ''
  );
  const [url, setUrl] = useState(initialSource?.url || '');
  const [description, setDescription] = useState(initialSource?.description || '');
  const [privateNotes, setPrivateNotes] = useState(initialSource?.private_notes || '');
  const [isPublic, setIsPublic] = useState(initialSource ? initialSource.is_public : true);
  const [rightsStatus, setRightsStatus] = useState(initialSource?.rights_status || 'Domaine public');

  const [linkedPersonIds, setLinkedPersonIds] = useState<string[]>(initialLinkedPersonIds);
  const [personSearch, setPersonSearch] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function togglePersonLink(id: string) {
    if (linkedPersonIds.includes(id)) {
      setLinkedPersonIds(linkedPersonIds.filter((pId) => pId !== id));
    } else {
      setLinkedPersonIds([...linkedPersonIds, id]);
    }
  }

  const filteredPersons = availablePersons.filter((p) => {
    if (!personSearch.trim()) return true;
    const term = personSearch.toLowerCase();
    const fullName = `${p.first_names} ${p.last_name}`.toLowerCase();
    return fullName.includes(term);
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const payload = {
        title,
        source_type: sourceType,
        author_or_organization: authorOrOrganization.trim() || null,
        source_date: sourceDate.trim() || null,
        archive_reference: archiveReference.trim() || null,
        url: url.trim() || null,
        description: description.trim() || null,
        private_notes: privateNotes.trim() || null,
        is_public: isPublic,
        rights_status: rightsStatus.trim() || null,
        linked_person_ids: linkedPersonIds,
      };

      const res = await upsertSourceAction(initialSource?.id || null, payload);

      if (!res.success) {
        setError(res.error || 'Erreur lors de l’enregistrement.');
      } else {
        setSuccess(true);
        if (!isEditing && res.sourceId) {
          router.push(`/admin/sources/${res.sourceId}`);
        } else {
          router.refresh();
        }
      }
    });
  }

  function handleDelete() {
    if (!initialSource) return;
    const confirmed = window.confirm(
      `Êtes-vous certain de vouloir supprimer définitivement la source "${initialSource.title}" ? Cette action est irréversible.`
    );
    if (!confirmed) return;

    startTransition(async () => {
      const res = await deleteSourceAction(initialSource.id);
      if (!res.success) {
        setError(res.error || 'Erreur lors de la suppression.');
      } else {
        router.push('/admin/sources');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-heritage-200">
        <div>
          <Link
            href="/admin/sources"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold uppercase tracking-wider text-heritage-600 hover:text-heritage-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour aux sources & archives</span>
          </Link>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-heritage-950 mt-1">
            {isEditing ? 'Modifier la source d’archive' : 'Enregistrer une nouvelle source'}
          </h1>
        </div>

        <div className="flex items-center space-x-3">
          {isEditing && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Supprimer</span>
            </button>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center space-x-2 px-5 py-2 rounded-lg bg-heritage-800 text-heritage-50 text-xs font-semibold hover:bg-heritage-900 shadow-sm transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isPending ? 'Enregistrement...' : 'Enregistrer'}</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start space-x-2">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start space-x-2">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
          <span>Source enregistrée avec succès.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Columns: Left 2 cols */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Titre & Type */}
          <div className="p-6 rounded-2xl bg-white border border-heritage-200 space-y-4 shadow-sm">
            <h2 className="font-serif text-lg font-bold text-heritage-950 flex items-center space-x-2">
              <FileText className="w-4 h-4 text-heritage-700" />
              <span>Identification de la source</span>
            </h2>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-heritage-700 mb-1">
                Titre de la source ou du document *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex : Registre de baptêmes de la paroisse Mor Hadbshabo (1890-1915)"
                className="w-full px-3.5 py-2 rounded-lg border border-heritage-300 text-sm focus:outline-none focus:ring-2 focus:ring-heritage-500 font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-heritage-700 mb-1">
                  Type de source *
                </label>
                <select
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-heritage-300 text-sm focus:outline-none focus:ring-2 focus:ring-heritage-500 bg-white"
                >
                  <option value="parish_register">Registre paroissial (baptême, mariage, décès)</option>
                  <option value="civil_registry">État civil (ottoman, syrien, turc)</option>
                  <option value="census">Recensement ou registre fiscal (defter)</option>
                  <option value="oral_testimony">Témoignage oral & mémoire vivante</option>
                  <option value="communal_archives">Archives communales ou diocésaines</option>
                  <option value="notarial_act">Acte notarié ou titre de propriété</option>
                  <option value="other">Autre document historique</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-heritage-700 mb-1">
                  Période ou date couverte
                </label>
                <input
                  type="text"
                  value={sourceDate}
                  onChange={(e) => setSourceDate(e.target.value)}
                  placeholder="Ex : 1905 ou 1890-1915"
                  className="w-full px-3.5 py-2 rounded-lg border border-heritage-300 text-sm focus:outline-none focus:ring-2 focus:ring-heritage-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-heritage-700 mb-1">
                  Institution / Auteur / Organisme
                </label>
                <input
                  type="text"
                  value={authorOrOrganization}
                  onChange={(e) => setAuthorOrOrganization(e.target.value)}
                  placeholder="Ex : Patriarcat syriaque d'Antioche / Archives de Mardin"
                  className="w-full px-3.5 py-2 rounded-lg border border-heritage-300 text-sm focus:outline-none focus:ring-2 focus:ring-heritage-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-heritage-700 mb-1">
                  Cote d&apos;archive / Référence
                </label>
                <input
                  type="text"
                  value={archiveReference}
                  onChange={(e) => setArchiveReference(e.target.value)}
                  placeholder="Ex : Reg. Paroissial n°4, Folio 12"
                  className="w-full px-3.5 py-2 rounded-lg border border-heritage-300 text-sm focus:outline-none focus:ring-2 focus:ring-heritage-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-heritage-700 mb-1">
                Lien web vers l&apos;archive numérisée (facultatif)
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2 rounded-lg border border-heritage-300 text-sm focus:outline-none focus:ring-2 focus:ring-heritage-500"
              />
            </div>
          </div>

          {/* 2. Contenu & Transcription */}
          <div className="p-6 rounded-2xl bg-white border border-heritage-200 space-y-4 shadow-sm">
            <h2 className="font-serif text-lg font-bold text-heritage-950">
              Description et transcription publique
            </h2>
            <p className="text-xs text-heritage-600">
              Détaillez le contenu de la source, sa transcription ou un résumé des informations qu&apos;elle apporte sur le village ou ses habitants.
            </p>

            <textarea
              rows={8}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Texte de transcription, résumé de l'acte, contexte de collecte..."
              className="w-full p-3.5 rounded-lg border border-heritage-300 text-sm focus:outline-none focus:ring-2 focus:ring-heritage-500 font-serif leading-relaxed"
            />
          </div>

          {/* 3. Notes Privées Confidentielles */}
          <div className="p-6 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3">
            <div className="flex items-center space-x-2 text-amber-900">
              <Lock className="w-4 h-4 text-amber-700" />
              <h2 className="font-serif text-base font-bold">
                Notes d’administration confidentielles (Privé)
              </h2>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              Ces notes sont <strong>strictement confidentielles</strong> et ne seront jamais affichées aux visiteurs publics ni incluses dans les exports de données.
            </p>
            <textarea
              rows={3}
              value={privateNotes}
              onChange={(e) => setPrivateNotes(e.target.value)}
              placeholder="Coordonnées du détenteur de l'archive, doutes paléographiques, informations sensibles réservées aux modérateurs..."
              className="w-full p-3 rounded-lg border border-amber-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-heritage-900"
            />
          </div>
        </div>

        {/* Sidebar: Right 1 col */}
        <div className="space-y-6">
          {/* Publication & Droits */}
          <div className="p-6 rounded-2xl bg-white border border-heritage-200 space-y-4 shadow-sm">
            <h3 className="font-serif text-base font-bold text-heritage-950 flex items-center space-x-2">
              <Globe className="w-4 h-4 text-heritage-700" />
              <span>Visibilité & Droits</span>
            </h3>

            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-4 h-4 rounded text-heritage-800 focus:ring-heritage-500 border-heritage-300"
                />
                <span className="text-sm font-semibold text-heritage-900">
                  Rendre la source publique
                </span>
              </label>
              <p className="text-xs text-heritage-600 pl-7 leading-relaxed">
                Si décochée, la source restera privée et réservée uniquement aux administrateurs.
              </p>
            </div>

            <div className="pt-3 border-t border-heritage-100">
              <label className="block text-xs font-semibold uppercase tracking-wider text-heritage-700 mb-1">
                Statut des droits / Copyright
              </label>
              <input
                type="text"
                value={rightsStatus}
                onChange={(e) => setRightsStatus(e.target.value)}
                placeholder="Ex : Domaine public, Collection familiale"
                className="w-full px-3 py-2 rounded-lg border border-heritage-300 text-xs focus:outline-none focus:ring-2 focus:ring-heritage-500"
              />
            </div>
          </div>

          {/* Personnes Liées */}
          <div className="p-6 rounded-2xl bg-white border border-heritage-200 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-base font-bold text-heritage-950 flex items-center space-x-2">
                <Users className="w-4 h-4 text-heritage-700" />
                <span>Personnes citées ({linkedPersonIds.length})</span>
              </h3>
            </div>

            <input
              type="text"
              value={personSearch}
              onChange={(e) => setPersonSearch(e.target.value)}
              placeholder="Filtrer les fiches..."
              className="w-full px-3 py-1.5 rounded-lg border border-heritage-300 text-xs focus:outline-none focus:ring-2 focus:ring-heritage-500"
            />

            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 border border-heritage-100 p-2 rounded-lg">
              {filteredPersons.length === 0 ? (
                <p className="text-xs text-heritage-500 italic p-2 text-center">
                  Aucune fiche correspondante.
                </p>
              ) : (
                filteredPersons.map((p) => {
                  const isChecked = linkedPersonIds.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className={`flex items-center space-x-2.5 p-2 rounded-md text-xs cursor-pointer transition-colors ${
                        isChecked ? 'bg-heritage-100 text-heritage-950 font-medium' : 'hover:bg-heritage-50 text-heritage-800'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => togglePersonLink(p.id)}
                        className="rounded text-heritage-800 focus:ring-heritage-500 border-heritage-300"
                      />
                      <span>
                        {p.first_names} {p.last_name} ({p.birth_year || '?'})
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
