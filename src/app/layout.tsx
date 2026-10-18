import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { LanguageProvider } from '@/lib/i18n/context';
import { getServerLocale } from '@/lib/i18n/server';

export const metadata: Metadata = {
  title: 'Habses — Histoire & Familles',
  description:
    'Mémoire, généalogie collaborative et histoire locale du village d\'Habses. Reconstitution progressive des familles et préservation du patrimoine.',
  keywords: ['généalogie', 'village', 'Habses', 'histoire locale', 'familles', 'archives', 'patrimoine'],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getServerLocale();

  return (
    <html lang={locale} className="h-full" suppressHydrationWarning>
      <body className="flex flex-col min-h-screen bg-heritage-50 text-heritage-950 font-sans antialiased selection:bg-heritage-200" suppressHydrationWarning>
        <LanguageProvider initialLocale={locale}>
          <Header />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}
