import Link from 'next/link';
import { Suspense } from 'react';
import { searchPersonsPublic, SearchPersonsFilters } from '@/lib/services/genealogy';
import { SearchForm } from '@/components/genealogy/SearchForm';
import { PersonCard } from '@/components/genealogy/PersonCard';
import { Users, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { getServerDictionary } from '@/lib/i18n/server';

interface GenealogiePageProps {
  searchParams: Promise<{
    query?: string;
    lastName?: string;
    firstNames?: string;
    birthYear?: string;
    deathYear?: string;
    page?: string;
  }>;
}

export default async function GenealogiePage({ searchParams }: GenealogiePageProps) {
  const params = await searchParams;
  const { t } = await getServerDictionary();

  const filters: SearchPersonsFilters = {
    query: params.query,
    lastName: params.lastName,
    firstNames: params.firstNames,
    birthYear: params.birthYear ? parseInt(params.birthYear, 10) : undefined,
    deathYear: params.deathYear ? parseInt(params.deathYear, 10) : undefined,
    page: params.page ? parseInt(params.page, 10) : 1,
    limit: 15,
  };

  const { persons, totalCount, currentPage, totalPages } = await searchPersonsPublic(filters);

  // Helper for pagination links preserving active query filters
  function getPageUrl(pageNum: number) {
    const q = new URLSearchParams();
    if (params.query) q.set('query', params.query);
    if (params.lastName) q.set('lastName', params.lastName);
    if (params.firstNames) q.set('firstNames', params.firstNames);
    if (params.birthYear) q.set('birthYear', params.birthYear);
    if (params.deathYear) q.set('deathYear', params.deathYear);
    q.set('page', pageNum.toString());
    return `/genealogie?${q.toString()}`;
  }

  const hasActiveFilters = Boolean(
    params.lastName || params.firstNames || params.birthYear || params.deathYear || params.query
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
      {/* Header */}
      <div className="max-w-3xl space-y-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-heritage-600">
          {t('genealogy.pageBadge')}
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-heritage-950">
          {t('genealogy.pageTitle')}
        </h1>
        <p className="text-heritage-700 text-sm sm:text-base leading-relaxed">
          {t('genealogy.pageDesc')}
        </p>
      </div>

      {/* Search Form */}
      <Suspense fallback={<div className="bg-white p-6 rounded-xl border border-heritage-200 shadow-sm animate-pulse h-28" />}>
        <SearchForm initialValues={params} />
      </Suspense>

      {/* Results Section */}
      <section className="space-y-6" aria-labelledby="results-heading">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-heritage-200 text-sm text-heritage-700">
          <h2 id="results-heading" className="font-serif text-xl font-bold text-heritage-900">
            {hasActiveFilters ? (
              <span>{t('genealogy.resultsCountActive', { count: totalCount })}</span>
            ) : (
              <span>{t('genealogy.resultsCountAll', { count: totalCount })}</span>
            )}
          </h2>

          <span className="text-xs text-heritage-500 mt-1 sm:mt-0">
            {t('genealogy.pageOf', { current: currentPage, total: Math.max(1, totalPages) })}
          </span>
        </div>

        {persons.length === 0 ? (
          <div className="p-10 rounded-2xl border border-dashed border-heritage-300 bg-white text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-heritage-100 text-heritage-600 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-lg font-bold text-heritage-900">
              {t('genealogy.noResultsHeading')}
            </h3>
            <p className="text-sm text-heritage-600 max-w-md mx-auto">
              {t('genealogy.noResultsHelp')}
            </p>
            <div className="pt-2">
              <Link
                href="/genealogie"
                className="inline-flex text-xs font-semibold text-heritage-800 hover:underline"
              >
                {t('genealogy.showAllPublic')}
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {persons.map((person) => (
              <PersonCard key={person.id} person={person} />
            ))}
          </div>
        )}

        {/* Pagination controls */}
        {totalPages > 1 && (
          <nav className="flex items-center justify-between pt-6 border-t border-heritage-200">
            <div>
              {currentPage > 1 ? (
                <Link
                  href={getPageUrl(currentPage - 1)}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg border border-heritage-300 text-sm font-medium text-heritage-800 hover:bg-heritage-100 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>{t('genealogy.previous')}</span>
                </Link>
              ) : (
                <span className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg border border-heritage-200 text-sm font-medium text-heritage-400 cursor-not-allowed">
                  <ChevronLeft className="w-4 h-4" />
                  <span>{t('genealogy.previous')}</span>
                </span>
              )}
            </div>

            <div className="hidden sm:flex items-center space-x-2 text-sm font-medium text-heritage-700">
              <span>{currentPage}</span>
              <span>/</span>
              <span>{totalPages}</span>
            </div>

            <div>
              {currentPage < totalPages ? (
                <Link
                  href={getPageUrl(currentPage + 1)}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg border border-heritage-300 text-sm font-medium text-heritage-800 hover:bg-heritage-100 transition-colors"
                >
                  <span>{t('genealogy.next')}</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              ) : (
                <span className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg border border-heritage-200 text-sm font-medium text-heritage-400 cursor-not-allowed">
                  <span>{t('genealogy.next')}</span>
                  <ChevronRight className="w-4 h-4" />
                </span>
              )}
            </div>
          </nav>
        )}
      </section>

      {/* Proposal invitation banner */}
      <aside className="p-6 rounded-2xl bg-heritage-100/70 border border-heritage-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-heritage-700 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <h4 className="font-serif text-sm font-bold text-heritage-950">
              {t('genealogy.proposeNoticeTitle')}
            </h4>
            <p className="text-xs text-heritage-700 leading-relaxed">
              {t('genealogy.proposeNoticeDesc')}
            </p>
          </div>
        </div>

        <Link
          href="/connexion"
          className="shrink-0 px-4 py-2 rounded-lg bg-heritage-800 text-heritage-50 text-xs font-semibold hover:bg-heritage-900 transition-colors"
        >
          {t('genealogy.proposeButton')}
        </Link>
      </aside>
    </div>
  );
}
