import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { HistoricalArticle, Person, Source } from '@/lib/types/database';
import { isPersonPublic, sanitizeSourceForPublic } from '@/lib/services/privacy';
import { PersonCard } from '@/components/genealogy/PersonCard';
import { RichContentRenderer } from '@/components/ui/RichContentRenderer';
import { getServerDictionary } from '@/lib/i18n/server';
import { 
  Users, 
  Calendar, 
  ArrowLeft, 
  FileText, 
  ExternalLink 
} from 'lucide-react';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata(props: PageProps) {
  const { slug } = await props.params;
  const supabase = await createServerSupabaseClient();
  const { data: article } = await supabase
    .from('historical_articles')
    .select('title, summary, family_name')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (!article) return { title: 'Histoire de famille introuvable | Habses' };

  return {
    title: `${article.title} | Familles de Habses`,
    description: article.summary ?? `Monographie et mémoire de la famille ${article.family_name} à Habses.`,
  };
}

export default async function FamilleArticlePage(props: PageProps) {
  const { slug } = await props.params;
  const { t } = await getServerDictionary();
  const supabase = await createServerSupabaseClient();

  // Query article
  const { data: articleData, error: articleError } = await supabase
    .from('historical_articles')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (articleError || !articleData) {
    notFound();
  }

  const article = articleData as HistoricalArticle;

  // Query linked persons
  const { data: rawLinks } = await supabase
    .from('historical_article_links')
    .select('context, person_id, persons(*)')
    .eq('article_id', article.id);

  const linkedPersons: Person[] = [];
  if (rawLinks) {
    for (const link of rawLinks) {
      const p = link.persons as unknown as Person;
      if (p && isPersonPublic(p)) {
        linkedPersons.push(p);
      }
    }
  }

  // Also query persons with matching last name if no explicit links exist
  if (linkedPersons.length === 0 && article.family_name) {
    const { data: familyPersons } = await supabase
      .from('persons')
      .select('*')
      .ilike('last_name', article.family_name)
      .eq('visibility', 'public')
      .is('archived_at', null)
      .order('birth_year', { ascending: true, nullsFirst: false })
      .limit(6);

    if (familyPersons) {
      for (const p of familyPersons) {
        if (isPersonPublic(p as Person)) {
          linkedPersons.push(p as Person);
        }
      }
    }
  }

  // Query linked sources
  const { data: rawSources } = await supabase
    .from('historical_article_sources')
    .select('citation_details, source_id, sources(*)')
    .eq('article_id', article.id);

  const linkedSources: Array<{ source: Omit<Source, 'private_notes'>; citationDetails?: string }> = [];
  if (rawSources) {
    for (const item of rawSources) {
      const s = item.sources as unknown as Source;
      if (s && s.is_public) {
        const sanitized = sanitizeSourceForPublic(s);
        if (sanitized) {
          linkedSources.push({
            source: sanitized,
            citationDetails: item.citation_details || undefined,
          });
        }
      }
    }
  }

  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center space-x-2 text-xs text-heritage-600 font-medium">
        <Link href="/" className="hover:text-heritage-950 transition-colors">
          {t('history.breadcrumbHome')}
        </Link>
        <span>/</span>
        <Link href="/familles" className="hover:text-heritage-950 transition-colors">
          {t('family.breadcrumbFamilies')}
        </Link>
        <span>/</span>
        <span className="text-heritage-900 truncate max-w-xs">{article.title}</span>
      </nav>

      {/* Header */}
      <header className="space-y-4 pb-8 border-b border-heritage-200">
        <div className="flex flex-wrap items-center gap-3 text-xs text-heritage-600">
          {article.family_name && (
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-heritage-800 text-heritage-50 font-semibold uppercase tracking-wider">
              <Users className="w-3.5 h-3.5" />
              <span>{t('family.familyBadge', { name: article.family_name })}</span>
            </span>
          )}

          {article.period_description && (
            <span className="inline-flex items-center space-x-1 text-heritage-600">
              <Calendar className="w-3.5 h-3.5 text-heritage-400" />
              <span>{article.period_description}</span>
            </span>
          )}
        </div>

        <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-heritage-950 leading-tight">
          {article.title}
        </h1>

        {article.summary && (
          <p className="text-base sm:text-lg text-heritage-700 font-serif leading-relaxed italic border-l-2 border-heritage-400 pl-4 py-1">
            {article.summary}
          </p>
        )}

        {article.featured_image_url && (
          <figure className="rounded-2xl overflow-hidden border border-heritage-200 bg-heritage-100 my-6 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={article.featured_image_url}
              alt={article.title}
              className="w-full max-h-[480px] object-cover"
            />
            {article.featured_image_credit && (
              <figcaption className="p-3 text-right text-xs text-heritage-600 bg-heritage-50/90 border-t border-heritage-200 italic">
                {article.featured_image_credit}
              </figcaption>
            )}
          </figure>
        )}
      </header>

      {/* Main text content with rich media rendering */}
      <RichContentRenderer content={article.content} />

      {/* Linked Family Members */}
      {linkedPersons.length > 0 && (
        <section className="pt-8 border-t border-heritage-200 space-y-4" aria-labelledby="family-members-heading">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-heritage-700" />
            <h2 id="family-members-heading" className="font-serif text-xl font-bold text-heritage-950">
              {t('family.familyMembersTitle', { count: linkedPersons.length })}
            </h2>
          </div>
          <p className="text-xs text-heritage-600">
            {t('family.familyMembersSubtitle')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {linkedPersons.map((person) => (
              <PersonCard key={person.id} person={person} />
            ))}
          </div>
        </section>
      )}

      {/* Linked Sources Section */}
      {linkedSources.length > 0 && (
        <section className="pt-8 border-t border-heritage-200 space-y-4" aria-labelledby="sources-heading">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-heritage-700" />
            <h2 id="sources-heading" className="font-serif text-xl font-bold text-heritage-950">
              {t('family.familySourcesTitle', { count: linkedSources.length })}
            </h2>
          </div>
          <div className="space-y-3">
            {linkedSources.map(({ source, citationDetails }) => (
              <div
                key={source.id}
                className="p-4 rounded-xl border border-heritage-200 bg-white space-y-1.5 text-xs text-heritage-700"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-semibold text-sm text-heritage-900 font-serif">
                    {source.title}
                  </h3>
                  {source.source_type && (
                    <span className="px-2 py-0.5 rounded bg-heritage-100 text-heritage-700 text-[11px]">
                      {source.source_type}
                    </span>
                  )}
                </div>
                {source.author_or_organization && (
                  <p>{t('sources.authorOrg')} {source.author_or_organization}</p>
                )}
                {source.archive_reference && (
                  <p>{t('sources.refCote')} <span className="font-mono">{source.archive_reference}</span></p>
                )}
                {citationDetails && (
                  <p className="italic text-heritage-600 font-serif">« {citationDetails} »</p>
                )}
                {source.url && (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1 text-heritage-900 underline font-medium hover:text-black pt-1"
                  >
                    <span>{t('sources.consultRegister')}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Back button */}
      <div className="pt-10 border-t border-heritage-200">
        <Link
          href="/familles"
          className="inline-flex items-center space-x-2 text-sm font-semibold text-heritage-800 hover:text-heritage-950 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('genealogy.backToFamilies')}</span>
        </Link>
      </div>
    </article>
  );
}
