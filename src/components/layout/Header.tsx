'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { BookOpen, Users, Landmark, Info, Menu, X, User, PlusCircle, Shield, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useTranslation } from '@/lib/i18n/context';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

export function Header() {
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setMounted(true);
    const supabase = createClient();

    // Check initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
          .then(({ data }) => {
            setIsAdmin(data?.role === 'admin');
          });
      }
    });

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        supabase
          .from('profiles')
          .select('role')
          .eq('id', currentUser.id)
          .single()
          .then(({ data }) => {
            setIsAdmin(data?.role === 'admin');
          });
      } else {
        setIsAdmin(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const navLinks = [
    { href: '/', label: t('nav.home') },
    { href: '/genealogie', label: t('nav.genealogy'), icon: Users },
    { href: '/histoire', label: t('nav.villageHistory'), icon: Landmark },
    { href: '/familles', label: t('nav.familyStories'), icon: BookOpen },
    { href: '/sources', label: t('nav.sources'), icon: FileText },
    { href: '/a-propos', label: t('nav.about'), icon: Info },
  ];

  return (
    <header className="sticky top-0 z-40 bg-heritage-50/95 backdrop-blur border-b border-heritage-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-20">
          {/* Logo and site title */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 rounded-full bg-heritage-800 text-heritage-50 flex items-center justify-center font-serif text-xl font-bold shadow-sm group-hover:bg-heritage-900 transition-colors">
                H
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-lg sm:text-xl font-bold tracking-tight text-heritage-950">
                  Habses
                </span>
                <span className="text-xs uppercase tracking-wider text-heritage-600 font-medium">
                  {t('common.appTagline')}
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-2 rounded-md text-sm font-medium text-heritage-800 hover:text-heritage-950 hover:bg-heritage-100 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* User Account Actions & Language Switcher */}
          <div className="hidden md:flex items-center space-x-3">
            <LanguageSwitcher />

            <Link
              href="/proposer"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-heritage-800 text-heritage-50 hover:bg-heritage-900 transition-colors shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{t('nav.propose')}</span>
            </Link>

            {mounted && user ? (
              <div className="flex items-center space-x-2">
                {isAdmin && (
                  <Link
                    href="/admin/moderation"
                    className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold rounded-md border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 transition-colors"
                  >
                    <Shield className="w-3.5 h-3.5 text-amber-700" />
                    <span>{t('nav.admin')}</span>
                  </Link>
                )}

                <Link
                  href="/compte/propositions"
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-full border border-heritage-300 text-heritage-800 hover:bg-heritage-100 hover:border-heritage-400 transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-heritage-600" />
                  <span>{t('nav.myProposals')}</span>
                </Link>
              </div>
            ) : (
              <Link
                href="/connexion"
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-medium rounded-full border border-heritage-300 text-heritage-800 hover:bg-heritage-100 hover:border-heritage-400 transition-colors"
              >
                <User className="w-3.5 h-3.5 text-heritage-600" />
                <span>{t('nav.signIn')}</span>
              </Link>
            )}
          </div>

          {/* Mobile hamburger menu */}
          <div className="flex items-center md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-heritage-700 hover:bg-heritage-100 focus:outline-none"
              aria-label="Menu principal"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-heritage-200 bg-heritage-50 px-4 pt-3 pb-4 space-y-2">
          {/* Mobile Language Switcher */}
          <div className="flex items-center justify-between pb-2 border-b border-heritage-200">
            <span className="text-xs uppercase font-semibold text-heritage-600 tracking-wider">
              Langue / Language :
            </span>
            <LanguageSwitcher />
          </div>

          <div className="space-y-1 pt-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-3 px-3 py-2.5 rounded-md text-base font-medium text-heritage-800 hover:bg-heritage-100"
                >
                  {Icon && <Icon className="w-5 h-5 text-heritage-600" />}
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="pt-3 border-t border-heritage-200 mt-2 space-y-2">
            <Link
              href="/proposer"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center space-x-2 w-full py-2.5 px-4 rounded-md bg-heritage-800 text-heritage-50 font-medium text-sm hover:bg-heritage-900 transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t('nav.propose')}</span>
            </Link>

            {mounted && user ? (
              <>
                <Link
                  href="/compte/propositions"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center space-x-2 w-full py-2.5 px-4 rounded-md border border-heritage-300 text-heritage-800 font-medium text-sm hover:bg-heritage-100 transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span>{t('nav.myProposals')}</span>
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin/moderation"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center space-x-2 w-full py-2.5 px-4 rounded-md bg-amber-100 text-amber-900 font-medium text-sm hover:bg-amber-200 transition-colors"
                  >
                    <Shield className="w-4 h-4 text-amber-700" />
                    <span>{t('nav.admin')}</span>
                  </Link>
                )}
              </>
            ) : (
              <Link
                href="/connexion"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center space-x-2 w-full py-2.5 px-4 rounded-md border border-heritage-300 text-heritage-800 font-medium text-sm hover:bg-heritage-100 transition-colors"
              >
                <User className="w-4 h-4" />
                <span>{t('nav.signIn')}</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
