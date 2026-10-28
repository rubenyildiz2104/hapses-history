import { Metadata } from 'next';
import { Mail } from 'lucide-react';
import { getServerDictionary } from '@/lib/i18n/server';
import { ContactForm } from '@/components/contact/ContactForm';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerDictionary();
  return {
    title: `${t('contact.title')} — Habses`,
    description: t('contact.subtitle'),
  };
}

export default async function ContactPage() {
  const { t } = await getServerDictionary();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10">
      {/* Page Header */}
      <div className="space-y-3 pb-6 border-b border-heritage-200">
        <div className="inline-flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-heritage-600">
          <Mail className="w-4 h-4 text-heritage-600" />
          <span>{t('contact.badge')}</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-heritage-950">
          {t('contact.title')}
        </h1>
        <p className="text-heritage-700 text-sm sm:text-base leading-relaxed font-serif max-w-3xl">
          {t('contact.subtitle')}
        </p>
      </div>

      {/* Main Content */}
      <ContactForm />
    </div>
  );
}
