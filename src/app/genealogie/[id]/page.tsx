import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPersonWithFamily, getVisualFamilyTree } from '@/lib/services/genealogy';
import { formatHistoricalDate } from '@/lib/services/dates';
import { ConfidenceBadge } from '@/components/genealogy/ConfidenceBadge';
import { FamilyViewTabs } from '@/components/genealogy/FamilyViewTabs';
import { getServerDictionary } from '@/lib/i18n/server';
import {
  Calendar,
  MapPin,
  Briefcase,
  FileText,
  BookOpen,
  ArrowLeft,
  ExternalLink,
  Edit3,
} from 'lucide-react';

interface PersonPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PersonPage({ params }: PersonPageProps) {
  const { id } = await params;
  const { t, locale } = await getServerDictionary();

  const [entourage, treeData] = await Promise.all([
    getPersonWithFamily(id),
    getVisualFamilyTree(id),
  ]);

  // Privacy Rule: living, unknown, archived or non-existent records trigger notFound()
  if (!entourage || !treeData) {
    notFound();
  }

  const { person, sources, relatedArticles } = entourage;

  const formattedBirth = formatHistoricalDate({
    date: person.birth_date,
    year: person.birth_year,
    precision: person.birth_date_precision,
  }, locale);

  const formattedDeath = formatHistoricalDate({
    date: person.death_date,
    year: person.death_year,
    precision: person.death_date_precision,
  }, locale);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
      {/* Back button */}
      <div>
        <Link
          href="/genealogie"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold uppercase tracking-wider text-heritage-600 hover:text-heritage-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('genealogy.backToSearch')}</span>
        </Link>
      </div>

      {/* 1. FICHE HEADER */}
      <header className="p-6 sm:p-8 rounded-2xl border border-heritage-200 bg-white space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="flex items-start space-x-5">
            {person.portrait_url && (
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-heritage-100 border border-heritage-300 shrink-0 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={person.portrait_url}
                  alt={`${person.first_names} ${person.last_name}`}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-heritage-600">
                  {t('genealogy.individualRecord')}
                </span>
                <ConfidenceBadge precision={person.birth_date_precision} />
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-heritage-950 tracking-tight">
                <span className="capitalize">{person.first_names}</span>{' '}
                <span className="uppercase tracking-wide">{person.last_name}</span>
              </h1>

              {person.name_variants && person.name_variants.length > 0 && (
                <p className="text-xs sm:text-sm text-heritage-600 italic">
                  {t('genealogy.nameVariants', { variants: person.name_variants.join(', ') })}
                </p>
              )}
            </div>
          </div>

          {/* Action button to propose correction */}
          <div className="shrink-0">
            <Link
              href={`/proposer?targetPersonId=${person.id}`}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg border border-heritage-300 text-heritage-800 text-xs font-semibold hover:bg-heritage-50 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{t('genealogy.proposeCorrection')}</span>
            </Link>
          </div>
        </div>

        {/* Vital Statistics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-6 border-t border-heritage-100">
          {/* Birth */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-heritage-500 flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-heritage-400" />
              <span>{t('genealogy.birth')}</span>
            </span>
            <div className="font-medium text-heritage-900 text-base">
              {formattedBirth}
            </div>
            {person.birth_place && (
              <div className="text-xs text-heritage-600 flex items-center space-x-1">
                <MapPin className="w-3 h-3 text-heritage-400" />
                <span>{person.birth_place}</span>
              </div>
            )}
          </div>

          {/* Death */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-heritage-500 flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-heritage-400" />
              <span>{t('genealogy.death')}</span>
            </span>
            <div className="font-medium text-heritage-900 text-base">
              {formattedDeath}
            </div>
            {person.death_place && (
              <div className="text-xs text-heritage-600 flex items-center space-x-1">
                <MapPin className="w-3 h-3 text-heritage-400" />
                <span>{person.death_place}</span>
              </div>
            )}
          </div>

          {/* Profession */}
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-heritage-500 flex items-center space-x-1.5">
              <Briefcase className="w-3.5 h-3.5 text-heritage-400" />
              <span>{t('genealogy.profession')}</span>
            </span>
            <div className="font-medium text-heritage-900 text-base">
              {person.profession || t('genealogy.professionUnspecified')}
            </div>
          </div>
        </div>

        {/* Short Biography */}
        {person.biography && (
          <div className="pt-6 border-t border-heritage-100 space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-heritage-600">
              {t('genealogy.biography')}
            </h2>
            <p className="text-sm text-heritage-800 leading-relaxed font-serif whitespace-pre-line">
              {person.biography}
            </p>
          </div>
        )}
      </header>

      {/* 2. FAMILY ENTOURAGE & VISUAL TREE */}
      <section>
        <FamilyViewTabs entourage={entourage} treeData={treeData} />
      </section>

      {/* 3. SOURCES & CITATIONS */}
      <section className="space-y-4 pt-6 border-t border-heritage-200">
        <div className="flex items-center space-x-2">
          <FileText className="w-5 h-5 text-heritage-700" />
          <h2 className="font-serif text-xl font-bold text-heritage-950">
            {t('genealogy.sourcesAndReferences', { count: sources.length })}
          </h2>
        </div>

        {sources.length === 0 ? (
          <p className="text-sm text-heritage-600 italic">
            {t('genealogy.noSources')}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sources.map((source) => (
              <div
                key={source.id}
                className="p-4 rounded-xl border border-heritage-200 bg-white space-y-2"
              >
                <div className="flex items-start justify-between">
                  <h3 className="font-serif text-sm font-bold text-heritage-900">
                    {source.title}
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded bg-heritage-100 text-heritage-700 font-medium capitalize">
                    {source.source_type}
                  </span>
                </div>

                {source.archive_reference && (
                  <p className="text-xs font-mono text-heritage-600">
                    {t('genealogy.archiveReference', { reference: source.archive_reference })}
                  </p>
                )}

                {source.description && (
                  <p className="text-xs text-heritage-700">
                    {source.description}
                  </p>
                )}

                {source.document_image_url && (
                  <div className="pt-1">
                    <a
                      href={source.document_image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block relative rounded-lg overflow-hidden border border-heritage-200 group bg-heritage-100/50"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={source.document_image_url}
                        alt={source.title}
                        className="w-full h-28 object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-heritage-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold">
                        <span>{t('genealogy.enlargeArchive')}</span>
                      </div>
                    </a>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between text-xs text-heritage-500">
                  <span>{source.rights_status ?? t('common.publicDomain')}</span>
                  {source.url && (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 text-heritage-800 font-semibold hover:underline"
                    >
                      <span>{t('genealogy.consultArchive')}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. LINKED HISTORICAL ARTICLES */}
      {relatedArticles.length > 0 && (
        <section className="space-y-4 pt-6 border-t border-heritage-200">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-heritage-700" />
            <h2 className="font-serif text-xl font-bold text-heritage-950">
              {t('genealogy.mentionedInArticles', { count: relatedArticles.length })}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {relatedArticles.map((article) => (
              <Link
                key={article.id}
                href={`/${article.article_type === 'family' ? 'familles' : 'histoire'}/${article.slug}`}
                className="group block p-4 rounded-xl border border-heritage-200 bg-white hover:border-heritage-400 transition-colors space-y-1.5"
              >
                <span className="text-xs text-heritage-500 uppercase tracking-wider font-semibold">
                  {article.article_type === 'family' ? t('genealogy.familyHistoryArticle') : t('genealogy.villageHistoryArticle')}
                </span>
                <h3 className="font-serif text-base font-bold text-heritage-950 group-hover:text-heritage-800 transition-colors">
                  {article.title}
                </h3>
                {article.summary && (
                  <p className="text-xs text-heritage-700 line-clamp-2">
                    {article.summary}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
