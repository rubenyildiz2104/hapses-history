'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/context';

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="bg-heritage-100 border-t border-heritage-200 mt-20 text-heritage-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Column 1: Project Identity */}
          <div className="md:col-span-2 space-y-3">
            <span className="font-serif text-lg font-bold text-heritage-950">
              {t('common.appName')}
            </span>
            <p className="text-sm text-heritage-700 leading-relaxed max-w-md">
              {t('footer.desc')}
            </p>
            <p className="text-xs text-heritage-600">
              {t('home.privacyBadgeDesc')}
            </p>
          </div>

          {/* Column 2: Navigation */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-heritage-900 mb-3">
              {t('footer.quickLinks')}
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/genealogie" className="hover:text-heritage-950 transition-colors">
                  {t('nav.genealogy')}
                </Link>
              </li>
              <li>
                <Link href="/histoire" className="hover:text-heritage-950 transition-colors">
                  {t('nav.villageHistory')}
                </Link>
              </li>
              <li>
                <Link href="/familles" className="hover:text-heritage-950 transition-colors">
                  {t('nav.familyStories')}
                </Link>
              </li>
              <li>
                <Link href="/sources" className="hover:text-heritage-950 transition-colors">
                  {t('nav.sources')}
                </Link>
              </li>
              <li>
                <Link href="/export" className="hover:text-heritage-950 transition-colors">
                  {t('nav.export')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Governance & Legal */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-heritage-900 mb-3">
              {t('footer.legal')}
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/a-propos" className="hover:text-heritage-950 transition-colors">
                  {t('nav.about')}
                </Link>
              </li>
              <li>
                <Link href="/confidentialite" className="hover:text-heritage-950 transition-colors">
                  {t('footer.privacyPolicy')}
                </Link>
              </li>
              <li>
                <Link href="/export" className="hover:text-heritage-950 transition-colors">
                  {t('footer.openData')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-heritage-200 flex flex-col sm:flex-row justify-between items-center text-xs text-heritage-600">
          <p>© {new Date().getFullYear()} {t('common.appName')}. {t('footer.rights')}</p>
        </div>
      </div>
    </footer>
  );
}
