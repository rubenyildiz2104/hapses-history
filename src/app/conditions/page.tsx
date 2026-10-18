import { Scale, Users, ShieldCheck, Share2, BookOpen } from 'lucide-react';
import { getServerDictionary } from '@/lib/i18n/server';

export const metadata = {
  title: 'Conditions d’utilisation | Habses Histoire & Familles',
  description: 'Conditions générales d’utilisation et charte collaborative du projet de préservation mémorielle et généalogique du village d’Habses.',
};

export default async function ConditionsPage() {
  const { t } = await getServerDictionary();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10">
      <div className="space-y-3 pb-6 border-b border-heritage-200">
        <div className="inline-flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-heritage-600">
          <Scale className="w-4 h-4 text-heritage-600" />
          <span>{t('terms.badge')}</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-heritage-950">
          {t('terms.title')}
        </h1>
        <p className="text-heritage-700 text-sm sm:text-base leading-relaxed">
          {t('terms.subtitle')}
        </p>
      </div>

      <div className="space-y-8 text-heritage-800 text-sm leading-relaxed">
        {/* Section 1 */}
        <section className="space-y-3">
          <div className="flex items-center space-x-2 text-heritage-950">
            <BookOpen className="w-5 h-5 text-heritage-700 shrink-0" />
            <h2 className="font-serif text-xl font-bold">{t('terms.sec1Title')}</h2>
          </div>
          <p className="leading-relaxed text-heritage-700">
            {t('terms.sec1P')}
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <div className="flex items-center space-x-2 text-heritage-950">
            <Users className="w-5 h-5 text-heritage-700 shrink-0" />
            <h2 className="font-serif text-xl font-bold">{t('terms.sec2Title')}</h2>
          </div>
          <p className="leading-relaxed text-heritage-700">
            {t('terms.sec2P')}
          </p>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <div className="flex items-center space-x-2 text-heritage-950">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <h2 className="font-serif text-xl font-bold">{t('terms.sec3Title')}</h2>
          </div>
          <p className="leading-relaxed text-heritage-700">
            {t('terms.sec3P')}
          </p>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <div className="flex items-center space-x-2 text-heritage-950">
            <Share2 className="w-5 h-5 text-heritage-700 shrink-0" />
            <h2 className="font-serif text-xl font-bold">{t('terms.sec4Title')}</h2>
          </div>
          <p className="leading-relaxed text-heritage-700">
            {t('terms.sec4P')}
          </p>
        </section>
      </div>
    </div>
  );
}
