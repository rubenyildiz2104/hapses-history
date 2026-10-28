import Link from 'next/link';
import { Compass, Shield, Users, BookOpen } from 'lucide-react';
import { getServerDictionary } from '@/lib/i18n/server';

export default async function AProposPage() {
  const { t } = await getServerDictionary();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      <div className="space-y-3 pb-6 border-b border-heritage-200">
        <div className="inline-flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-heritage-600">
          <Compass className="w-4 h-4 text-heritage-600" />
          <span>{t('about.badge')}</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-heritage-950">
          {t('about.title')}
        </h1>
        <p className="text-heritage-700 text-sm sm:text-base leading-relaxed font-serif">
          {t('about.subtitle')}
        </p>
      </div>

      <div className="space-y-10 text-heritage-800 text-sm sm:text-base leading-relaxed">
        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold text-heritage-950">
            {t('about.section1Title')}
          </h2>
          <p>
            {t('about.section1P1')}
          </p>
          <p>
            {t('about.section1P2')}
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-heritage-200">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-lg bg-heritage-100 text-heritage-800 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-serif font-bold text-heritage-950 text-base">{t('about.pillar1Title')}</h3>
            <p className="text-xs sm:text-sm text-heritage-700">
              {t('about.pillar1Desc')}
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-10 h-10 rounded-lg bg-heritage-100 text-heritage-800 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-serif font-bold text-heritage-950 text-base">{t('about.pillar2Title')}</h3>
            <p className="text-xs sm:text-sm text-heritage-700">
              {t('about.pillar2Desc')}
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-10 h-10 rounded-lg bg-heritage-100 text-heritage-800 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="font-serif font-bold text-heritage-950 text-base">{t('about.pillar3Title')}</h3>
            <p className="text-xs sm:text-sm text-heritage-700">
              {t('about.pillar3Desc')}
            </p>
          </div>
        </section>

        <section className="p-6 sm:p-8 rounded-2xl bg-heritage-100/70 border border-heritage-200 space-y-4">
          <h2 className="font-serif text-lg sm:text-xl font-bold text-heritage-950">
            {t('about.participateTitle')}
          </h2>
          <p className="text-sm text-heritage-700 leading-relaxed">
            {t('about.participateDesc')}
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/proposer"
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-heritage-800 text-heritage-50 text-xs font-semibold hover:bg-heritage-900 transition-colors shadow-xs"
            >
              <span>{t('about.participateButton')}</span>
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-lg border border-heritage-300 text-heritage-800 text-xs font-semibold hover:bg-heritage-100 transition-colors"
            >
              <span>{t('contact.title')}</span>
            </Link>
          </div>
        </section>

        <section className="p-6 rounded-2xl bg-white border border-heritage-200 space-y-3 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-heritage-600">
            {t('contact.badge')}
          </span>
          <h2 className="font-serif text-lg font-bold text-heritage-950">
            {t('contact.directContactTitle')}
          </h2>
          <p className="text-xs sm:text-sm text-heritage-700 leading-relaxed font-serif">
            {t('contact.subtitle')}
          </p>
          <div className="pt-1">
            <Link
              href="/contact"
              className="inline-flex items-center space-x-2 text-xs font-semibold text-heritage-900 hover:text-heritage-950 underline"
            >
              <span>Accéder aux coordonnées directes et au formulaire de contact →</span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
