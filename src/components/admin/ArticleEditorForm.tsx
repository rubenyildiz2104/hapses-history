'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Save, 
  Trash2, 
  ArrowLeft, 
  Wand2, 
  Users, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { upsertArticleAction, deleteArticleAction } from '@/app/actions/articles';
import { HistoricalArticle, ArticleType, ArticleStatus, Person, Source } from '@/lib/types/database';

interface ArticleEditorFormProps {
  initialArticle?: HistoricalArticle | null;
  availablePersons: Person[];
  availableSources: Source[];
  initialLinkedPersonIds?: string[];
  initialLinkedSourceIds?: string[];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export function ArticleEditorForm({
  initialArticle,
  availablePersons,
  availableSources,
  initialLinkedPersonIds = [],
  initialLinkedSourceIds = [],
}: ArticleEditorFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEditing = Boolean(initialArticle);

  const [articleType, setArticleType] = useState<ArticleType>(
    initialArticle?.article_type || 'village_history'
  );
  const [title, setTitle] = useState(initialArticle?.title || '');
  const [slug, setSlug] = useState(initialArticle?.slug || '');
  const [familyName, setFamilyName] = useState(initialArticle?.family_name || '');
  const [periodStart, setPeriodStart] = useState(
    initialArticle?.period_start ? String(initialArticle.period_start) : ''
  );
  const [periodEnd, setPeriodEnd] = useState(
    initialArticle?.period_end ? String(initialArticle.period_end) : ''
  );
  const [periodDescription, setPeriodDescription] = useState(
    initialArticle?.period_description || ''
  );
  const [summary, setSummary] = useState(initialArticle?.summary || '');
  const [content, setContent] = useState(initialArticle?.content || '');
  const [status, setStatus] = useState<ArticleStatus>(initialArticle?.status || 'draft');

  const [linkedPersonIds, setLinkedPersonIds] = useState<string[]>(initialLinkedPersonIds);
  const [linkedSourceIds, setLinkedSourceIds] = useState<string[]>(initialLinkedSourceIds);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleAutoSlug() {
    if (title.trim()) {
      setSlug(slugify(title.trim()));
    }
  }

  function togglePersonLink(id: string) {
    if (linkedPersonIds.includes(id)) {
      setLinkedPersonIds(linkedPersonIds.filter((pId) => pId !== id));
    } else {
      setLinkedPersonIds([...linkedPersonIds, id]);
    }
  }

  function toggleSourceLink(id: string) {
    if (linkedSourceIds.includes(id)) {
      setLinkedSourceIds(linkedSourceIds.filter((sId) => sId !== id));
    } else {
      setLinkedSourceIds([...linkedSourceIds, id]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const payload = {
      article_type: articleType,
      title: title.trim(),
      slug: slug.trim(),
      summary: summary.trim() || null,
      content: content.trim(),
      period_start: periodStart ? parseInt(periodStart, 10) : null,
      period_end: periodEnd ? parseInt(periodEnd, 10) : null,
      period_description: periodDescription.trim() || null,
      family_name: articleType === 'family' ? familyName.trim() : null,
      status,
      linked_person_ids: linkedPersonIds,
      linked_source_ids: linkedSourceIds,
    };

    startTransition(async () => {
      const res = await upsertArticleAction(initialArticle?.id || null, payload);
      if (res.success) {
        setSuccess(true);
        if (!isEditing && res.articleId) {
          router.push(`/admin/articles/${res.articleId}`);
        } else {
          router.refresh();
        }
      } else {
        setError(res.error || 'Erreur lors de l’enregistrement.');
      }
    });
  }

  async function handleDelete() {
    if (!initialArticle) return;
    if (!confirm(`Supprimer définitivement l’article "${initialArticle.title}" ? Cette action est irréversible.`)) {
      return;
    }

    startTransition(async () => {
      const res = await deleteArticleAction(initialArticle.id);
      if (res.success) {
        router.push('/admin/articles');
      } else {
        setError(res.error || 'Erreur lors de la suppression.');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Messages */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Article enregistré avec succès !</span>
        </div>
      )}

      {/* Top action buttons */}
      <div className="flex items-center justify-between pb-4 border-b border-heritage-200">
        <Link
          href="/admin/articles"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-heritage-700 hover:text-heritage-950"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour à la liste des articles</span>
        </Link>

        <div className="flex items-center space-x-3">
          {isEditing && (
            <button
              type="button"
              disabled={isPending}
              onClick={handleDelete}
              className="inline-flex items-center space-x-1 px-3 py-2 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Supprimer</span>
            </button>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center space-x-1.5 px-5 py-2 rounded-lg bg-heritage-800 text-heritage-50 text-xs font-semibold hover:bg-heritage-900 transition-colors shadow-sm disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isPending ? 'Enregistrement...' : isEditing ? 'Mettre à jour' : 'Créer l’article'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Fields (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-heritage-200 space-y-4 shadow-sm">
            <h2 className="font-serif text-lg font-bold text-heritage-950">
              Contenu éditorial
            </h2>

            {/* Type selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-heritage-800 mb-1.5">
                Type de publication
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setArticleType('village_history')}
                  className={`p-3 rounded-xl border text-xs font-semibold text-left transition-colors flex items-center space-x-2 ${
                    articleType === 'village_history'
                      ? 'border-heritage-800 bg-heritage-800 text-white'
                      : 'border-heritage-200 text-heritage-700 hover:bg-heritage-50'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Histoire du village</span>
                </button>

                <button
                  type="button"
                  onClick={() => setArticleType('family')}
                  className={`p-3 rounded-xl border text-xs font-semibold text-left transition-colors flex items-center space-x-2 ${
                    articleType === 'family'
                      ? 'border-heritage-800 bg-heritage-800 text-white'
                      : 'border-heritage-200 text-heritage-700 hover:bg-heritage-50'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Monographie de famille</span>
                </button>
              </div>
            </div>

            {/* Family name if family type */}
            {articleType === 'family' && (
              <div>
                <label htmlFor="familyName" className="block text-xs font-semibold uppercase tracking-wider text-heritage-800 mb-1.5">
                  Nom de famille associé *
                </label>
                <input
                  type="text"
                  id="familyName"
                  required
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  placeholder="Ex: DUPONT"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-heritage-300 text-heritage-950 placeholder-heritage-400 text-sm focus:outline-none focus:ring-2 focus:ring-heritage-600"
                />
              </div>
            )}

            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-xs font-semibold uppercase tracking-wider text-heritage-800 mb-1.5">
                Titre de l’article *
              </label>
              <input
                type="text"
                id="title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Les métiers de la forge et du bois à Habses"
                className="w-full px-3.5 py-2.5 rounded-lg border border-heritage-300 text-heritage-950 placeholder-heritage-400 text-base font-serif font-bold focus:outline-none focus:ring-2 focus:ring-heritage-600"
              />
            </div>

            {/* Slug */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="slug" className="block text-xs font-semibold uppercase tracking-wider text-heritage-800">
                  Identifiant URL (slug) *
                </label>
                <button
                  type="button"
                  onClick={handleAutoSlug}
                  className="inline-flex items-center space-x-1 text-xs text-heritage-600 hover:text-heritage-900 underline"
                >
                  <Wand2 className="w-3 h-3" />
                  <span>Générer depuis le titre</span>
                </button>
              </div>
              <input
                type="text"
                id="slug"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="ex: metiers-forge-habses"
                className="w-full px-3.5 py-2 rounded-lg border border-heritage-300 text-heritage-950 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-heritage-600"
              />
            </div>

            {/* Summary */}
            <div>
              <label htmlFor="summary" className="block text-xs font-semibold uppercase tracking-wider text-heritage-800 mb-1.5">
                Résumé d’accroche
              </label>
              <textarea
                id="summary"
                rows={2}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Brève synthèse affichée en tête d’article et dans les listes..."
                className="w-full p-3 rounded-lg border border-heritage-300 text-heritage-950 text-sm font-serif placeholder-heritage-400 focus:outline-none focus:ring-2 focus:ring-heritage-600"
              />
            </div>

            {/* Content */}
            <div>
              <label htmlFor="content" className="block text-xs font-semibold uppercase tracking-wider text-heritage-800 mb-1.5">
                Corps de l’article *
              </label>
              <textarea
                id="content"
                required
                rows={14}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Rédigez le récit historique en séparant les paragraphes par des sauts de ligne..."
                className="w-full p-3.5 rounded-lg border border-heritage-300 text-heritage-950 text-sm font-serif leading-relaxed placeholder-heritage-400 focus:outline-none focus:ring-2 focus:ring-heritage-600"
              />
            </div>
          </div>
        </div>

        {/* Sidebar Settings (1 col) */}
        <div className="space-y-6">
          {/* Status & Publication */}
          <div className="bg-white p-5 rounded-2xl border border-heritage-200 space-y-4 shadow-sm">
            <h3 className="font-serif text-sm font-bold text-heritage-950">
              Statut de publication
            </h3>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ArticleStatus)}
              className="w-full px-3 py-2 rounded-lg border border-heritage-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-heritage-600 bg-heritage-50"
            >
              <option value="draft">Brouillon (invisible au public)</option>
              <option value="published">Publié (visible publiquement)</option>
              <option value="archived">Archivé (retiré de la vue publique)</option>
            </select>
          </div>

          {/* Timeframe */}
          <div className="bg-white p-5 rounded-2xl border border-heritage-200 space-y-3 shadow-sm text-xs">
            <h3 className="font-serif text-sm font-bold text-heritage-950">
              Période temporelle
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-heritage-700 mb-1">
                  Début (année)
                </label>
                <input
                  type="number"
                  min="500"
                  max="2100"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  placeholder="1840"
                  className="w-full px-2.5 py-1.5 rounded border border-heritage-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-heritage-700 mb-1">
                  Fin (année)
                </label>
                <input
                  type="number"
                  min="500"
                  max="2100"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  placeholder="1914"
                  className="w-full px-2.5 py-1.5 rounded border border-heritage-300 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-heritage-700 mb-1">
                Description de la période
              </label>
              <input
                type="text"
                value={periodDescription}
                onChange={(e) => setPeriodDescription(e.target.value)}
                placeholder="Ex: XIXe siècle ou Période ottomane tardive"
                className="w-full px-2.5 py-1.5 rounded border border-heritage-300 text-xs"
              />
            </div>
          </div>

          {/* Linked Persons */}
          <div className="bg-white p-5 rounded-2xl border border-heritage-200 space-y-3 shadow-sm text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-sm font-bold text-heritage-950">
                Personnes liées ({linkedPersonIds.length})
              </h3>
            </div>
            <p className="text-[11px] text-heritage-500">
              Associez des fiches généalogiques publiques citées dans le texte.
            </p>

            <div className="max-h-48 overflow-y-auto space-y-1.5 border border-heritage-100 rounded-lg p-2 bg-heritage-50/50">
              {availablePersons.map((p) => {
                const checked = linkedPersonIds.includes(p.id);
                return (
                  <label
                    key={p.id}
                    className="flex items-center space-x-2 p-1.5 rounded hover:bg-heritage-100 cursor-pointer text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePersonLink(p.id)}
                      className="rounded border-heritage-300 text-heritage-800 focus:ring-heritage-600"
                    />
                    <span className="font-medium text-heritage-900">
                      {p.first_names} {p.last_name}
                    </span>
                    {p.birth_year && (
                      <span className="text-[11px] text-heritage-500">({p.birth_year})</span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Linked Sources */}
          <div className="bg-white p-5 rounded-2xl border border-heritage-200 space-y-3 shadow-sm text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-sm font-bold text-heritage-950">
                Sources d’archives liées ({linkedSourceIds.length})
              </h3>
            </div>
            <p className="text-[11px] text-heritage-500">
              Citez les registres paroissiaux ou documents d’appui.
            </p>

            <div className="max-h-48 overflow-y-auto space-y-1.5 border border-heritage-100 rounded-lg p-2 bg-heritage-50/50">
              {availableSources.map((s) => {
                const checked = linkedSourceIds.includes(s.id);
                return (
                  <label
                    key={s.id}
                    className="flex items-center space-x-2 p-1.5 rounded hover:bg-heritage-100 cursor-pointer text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSourceLink(s.id)}
                      className="rounded border-heritage-300 text-heritage-800 focus:ring-heritage-600"
                    />
                    <span className="font-medium text-heritage-900 truncate">
                      {s.title}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
