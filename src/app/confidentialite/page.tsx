import { ShieldCheck, Lock, EyeOff, FileText, UserCheck } from 'lucide-react';
import { getServerDictionary } from '@/lib/i18n/server';

export default async function ConfidentialitePage() {
  const { t } = await getServerDictionary();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10">
      <div className="space-y-3 pb-6 border-b border-heritage-200">
        <div className="inline-flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-heritage-600">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>{t('privacy.badge')}</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-heritage-950">
          {t('privacy.title')}
        </h1>
        <p className="text-heritage-700 text-sm sm:text-base leading-relaxed">
          {t('privacy.subtitle')}
        </p>
      </div>

      <div className="space-y-8 text-heritage-800 text-sm leading-relaxed">
        {/* Section 1 */}
        <section className="space-y-3">
          <div className="flex items-center space-x-2 text-heritage-950">
            <Lock className="w-5 h-5 text-heritage-700" />
            <h2 className="font-serif text-xl font-bold">{t('privacy.sec1Title')}</h2>
          </div>
          <p>
            {t('privacy.sec1P1')}
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-heritage-700">
            <li>{t('privacy.sec1Li1')}</li>
            <li>{t('privacy.sec1Li2')}</li>
            <li>{t('privacy.sec1Li3')}</li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <div className="flex items-center space-x-2 text-heritage-950">
            <EyeOff className="w-5 h-5 text-heritage-700" />
            <h2 className="font-serif text-xl font-bold">{t('privacy.sec2Title')}</h2>
          </div>
          <p>
            {t('privacy.sec2P1')}
          </p>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <div className="flex items-center space-x-2 text-heritage-950">
            <FileText className="w-5 h-5 text-heritage-700" />
            <h2 className="font-serif text-xl font-bold">{t('privacy.sec3Title')}</h2>
          </div>
          <p>
            {t('privacy.sec3P1')}
          </p>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <div className="flex items-center space-x-2 text-heritage-950">
            <UserCheck className="w-5 h-5 text-heritage-700" />
            <h2 className="font-serif text-xl font-bold">{t('privacy.sec4Title')}</h2>
          </div>
          <p>
            {t('privacy.sec4P1')}
          </p>
          <p>
            {t('privacy.sec4P2')}
          </p>
        </section>
      </div>
    </div>
  );
}
