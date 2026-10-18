import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';
import { 
  PlusCircle, 
  BookOpen, 
  Landmark, 
  Users, 
  ExternalLink, 
  Edit3, 
  Calendar,
  Clock,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { HistoricalArticle, ArticleStatus, ArticleType } from '@/lib/types/database';

export const metadata = {
  title: 'Gestion des articles | Administration Habses',
  description: 'Création, édition et publication des articles historiques et récits de familles.',
};

interface PageProps {
  searchParams: Promise<{ type?: string; status?: string }>;
}

const STATUS_BADGES: Record<
  ArticleStatus,
  { label: string; badgeClass: string }
> = {
  published: {
    label: 'Publié',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  draft: {
    label: 'Brouillon',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  archived: {
    label: 'Archivé',
    badgeClass: 'bg-heritage-200 text-heritage-700 border-heritage-300',
  },
};

export default async function AdminArticlesPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const filterType = searchParams.type || 'all';
  const filterStatus = searchParams.status || 'all';

  const adminClient = createAdminClient();

  let query = adminClient
    .from('historical_articles')
    .select('*')
    .order('created_at', { ascending: false });

  if (filterType !== 'all') {
    query = query.eq('article_type', filterType);
  }

  if (filterStatus !== 'all') {
    query = query.eq('status', filterStatus);
  }

  const { data: articlesData } = await query;
  const articles: HistoricalArticle[] = (articlesData as HistoricalArticle[]) || [];

  return (
    <div className="space-y-8">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-heritage-600 font-semibold">
            Publication & Contenu éditorial
          </span>
          <h1 className="font-serif text-3xl font-bold text-heritage-950 mt-1">
            Articles historiques & récits de familles
          </h1>
          <p className="text-sm text-heritage-600 font-serif mt-1">
            Gérez les récits du village, les monographies de familles et leurs associations aux personnes et sources.
          </p>
        </div>

        <Link
          href="/admin/articles/nouveau"
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-heritage-800 text-heritage-50 text-sm font-semibold hover:bg-heritage-900 transition-colors shadow-sm self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Rédiger un nouvel article</span>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-heritage-200 pb-3">
        <Link
          href="/admin/articles"
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filterType === 'all'
              ? 'bg-heritage-800 text-white shadow-sm'
              : 'text-heritage-700 hover:bg-heritage-200/60'
          }`}
        >
          Tous les types ({articles.length})
        </Link>
        <Link
          href="/admin/articles?type=village_history"
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filterType === 'village_history'
              ? 'bg-heritage-800 text-white shadow-sm'
              : 'text-heritage-700 hover:bg-heritage-200/60'
          }`}
        >
          Histoire du village
        </Link>
        <Link
          href="/admin/articles?type=family"
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filterType === 'family'
              ? 'bg-heritage-800 text-white shadow-sm'
              : 'text-heritage-700 hover:bg-heritage-200/60'
          }`}
        >
          Monographies familiales
        </Link>
      </div>

      {/* Articles List Table */}
      {articles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-heritage-200 p-12 text-center space-y-4">
          <BookOpen className="w-8 h-8 text-heritage-400 mx-auto" />
          <h2 className="font-serif text-lg font-bold text-heritage-900">
            Aucun article trouvé
          </h2>
          <p className="text-sm text-heritage-600 max-w-md mx-auto">
            Commencez par rédiger le premier article historique ou une monographie sur une famille du village.
          </p>
          <div className="pt-2">
            <Link
              href="/admin/articles/nouveau"
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-heritage-800 text-heritage-50 text-xs font-semibold hover:bg-heritage-900"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Créer un article</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-heritage-200 overflow-hidden shadow-sm divide-y divide-heritage-100">
          {articles.map((article) => {
            const statusCfg = STATUS_BADGES[article.status] || {
              label: article.status,
              badgeClass: 'bg-heritage-100 text-heritage-800 border-heritage-200',
            };
            const isVillage = article.article_type === 'village_history';
            const publicPath = isVillage ? `/histoire/${article.slug}` : `/familles/${article.slug}`;

            return (
              <div
                key={article.id}
                className="p-5 sm:p-6 hover:bg-heritage-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${
                      isVillage
                        ? 'bg-amber-100 text-amber-900'
                        : 'bg-heritage-200 text-heritage-900'
                    }`}>
                      {isVillage ? <Landmark className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                      <span>{isVillage ? 'Histoire du village' : `Famille ${article.family_name || ''}`}</span>
                    </span>

                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${statusCfg.badgeClass}`}>
                      {statusCfg.label}
                    </span>

                    {article.period_description && (
                      <span className="text-xs text-heritage-500">
                        • {article.period_description}
                      </span>
                    )}
                  </div>

                  <h3 className="font-serif text-xl font-bold text-heritage-950">
                    {article.title}
                  </h3>

                  {article.summary && (
                    <p className="text-xs text-heritage-600 line-clamp-2 font-serif max-w-2xl">
                      {article.summary}
                    </p>
                  )}

                  <div className="flex items-center space-x-3 text-[11px] text-heritage-400 font-mono">
                    <span>slug: /{article.slug}</span>
                    <span>•</span>
                    <span>Créé le {new Date(article.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-heritage-100">
                  {article.status === 'published' && (
                    <Link
                      href={publicPath}
                      target="_blank"
                      className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-heritage-300 text-heritage-700 hover:bg-heritage-100 text-xs font-medium transition-colors"
                    >
                      <span>Voir sur le site</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}

                  <Link
                    href={`/admin/articles/${article.id}`}
                    className="inline-flex items-center space-x-1 px-3.5 py-1.5 rounded-lg bg-heritage-800 text-heritage-50 text-xs font-semibold hover:bg-heritage-900 transition-colors shadow-sm"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Modifier</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
