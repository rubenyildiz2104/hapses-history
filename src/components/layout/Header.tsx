'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  Users,
  Landmark,
  Info,
  Menu,
  X,
  User,
  PlusCircle,
  Shield,
  FileText,
  Mail,
  ChevronDown,
  LogOut,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useTranslation } from '@/lib/i18n/context';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { signOutAction } from '@/app/actions/auth';

interface UserProfile {
  display_name?: string | null;
  role?: string | null;
}

export function Header() {
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setUserMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    setMounted(true);
    const supabase = createClient();

    // Check initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        supabase
          .from('profiles')
          .select('display_name, role')
          .eq('id', user.id)
          .single()
          .then(({ data }) => {
            setProfile(data);
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
          .select('display_name, role')
          .eq('id', currentUser.id)
          .single()
          .then(({ data }) => {
            setProfile(data);
            setIsAdmin(data?.role === 'admin');
          });
      } else {
        setProfile(null);
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
    { href: '/contact', label: t('nav.contact'), icon: Mail },
  ];

  const displayName = profile?.display_name || user?.email?.split('@')[0] || t('nav.profile');
  const userInitial = (displayName.charAt(0) || 'U').toUpperCase();

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

            {/* Auth Section: Skeleton during hydration, Profile dropdown when logged in, or SignIn button */}
            {!mounted ? (
              <div className="w-24 h-8 rounded-full bg-heritage-200/50 animate-pulse" />
            ) : user ? (
              <div className="relative" ref={userMenuRef}>
                {/* User Profile Trigger Button */}
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className={`inline-flex items-center space-x-2 pl-1.5 pr-2.5 py-1 rounded-full border transition-all text-xs font-medium ${
                    userMenuOpen
                      ? 'border-heritage-800 bg-heritage-100 text-heritage-950 shadow-xs'
                      : 'border-heritage-300 text-heritage-800 hover:bg-heritage-100 hover:border-heritage-400'
                  }`}
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                >
                  <div className="w-6 h-6 rounded-full bg-heritage-800 text-heritage-50 flex items-center justify-center font-serif text-xs font-bold shrink-0">
                    {userInitial}
                  </div>
                  <span className="max-w-[110px] truncate font-medium text-heritage-900">
                    {displayName}
                  </span>
                  {isAdmin && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white" title="Administrateur" />
                  )}
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-heritage-500 transition-transform ${
                      userMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-heritage-200 shadow-lg py-2 z-50 animate-in fade-in slide-in-from-top-1">
                    {/* Header with user info */}
                    <div className="px-4 py-3 border-b border-heritage-100">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-9 h-9 rounded-full bg-heritage-800 text-heritage-50 flex items-center justify-center font-serif text-sm font-bold shrink-0">
                          {userInitial}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-heritage-950 truncate">
                            {displayName}
                          </p>
                          <p className="text-xs text-heritage-500 truncate font-mono">
                            {user.email}
                          </p>
                        </div>
                      </div>

                      <div className="mt-2.5">
                        {isAdmin ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                            <Shield className="w-3 h-3 text-amber-700" />
                            <span>Administrateur</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-heritage-100 text-heritage-700 border border-heritage-200">
                            Membre contributeur
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Navigation Items */}
                    <div className="py-1">
                      <Link
                        href="/compte/propositions"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center space-x-2.5 px-4 py-2 text-xs text-heritage-800 hover:bg-heritage-50 hover:text-heritage-950 transition-colors"
                      >
                        <FileText className="w-4 h-4 text-heritage-600" />
                        <span>{t('nav.myProposals')}</span>
                      </Link>

                      <Link
                        href="/proposer"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center space-x-2.5 px-4 py-2 text-xs text-heritage-800 hover:bg-heritage-50 hover:text-heritage-950 transition-colors"
                      >
                        <PlusCircle className="w-4 h-4 text-heritage-600" />
                        <span>{t('nav.propose')}</span>
                      </Link>

                      <Link
                        href="/contact"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center space-x-2.5 px-4 py-2 text-xs text-heritage-800 hover:bg-heritage-50 hover:text-heritage-950 transition-colors"
                      >
                        <Mail className="w-4 h-4 text-heritage-600" />
                        <span>{t('nav.contact')}</span>
                      </Link>

                      {isAdmin && (
                        <Link
                          href="/admin/moderation"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center space-x-2.5 px-4 py-2 text-xs font-semibold text-amber-900 bg-amber-50/60 hover:bg-amber-100 transition-colors"
                        >
                          <Shield className="w-4 h-4 text-amber-700" />
                          <span>Espace Administration</span>
                        </Link>
                      )}
                    </div>

                    {/* Sign Out Action */}
                    <div className="pt-1 border-t border-heritage-100">
                      <form action={signOutAction} className="w-full">
                        <button
                          type="submit"
                          className="flex items-center space-x-2.5 w-full px-4 py-2 text-xs text-red-700 hover:bg-red-50 hover:text-red-900 font-medium transition-colors text-left"
                        >
                          <LogOut className="w-4 h-4 text-red-600" />
                          <span>{t('nav.signOut')}</span>
                        </button>
                      </form>
                    </div>
                  </div>
                )}
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
        <div className="md:hidden border-b border-heritage-200 bg-heritage-50 px-4 pt-3 pb-4 space-y-3">
          {/* Mobile Language Switcher */}
          <div className="flex items-center justify-between pb-2 border-b border-heritage-200">
            <span className="text-xs uppercase font-semibold text-heritage-600 tracking-wider">
              Langue / Language :
            </span>
            <LanguageSwitcher />
          </div>

          {/* Logged in User Profile Card (Mobile) */}
          {mounted && user && (
            <div className="p-3.5 rounded-xl bg-white border border-heritage-200 space-y-2.5 shadow-xs">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-heritage-800 text-heritage-50 flex items-center justify-center font-serif text-sm font-bold shrink-0">
                  {userInitial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-serif font-bold text-sm text-heritage-950 truncate">
                    {displayName}
                  </p>
                  <p className="text-xs text-heritage-500 truncate font-mono">
                    {user.email}
                  </p>
                </div>
              </div>

              <div>
                {isAdmin ? (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                    <Shield className="w-3 h-3 text-amber-700" />
                    <span>Administrateur</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-heritage-100 text-heritage-700 border border-heritage-200">
                    Membre contributeur
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Navigation Links */}
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

          {/* Action Links */}
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
                  <FileText className="w-4 h-4" />
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

                <form action={signOutAction} className="w-full pt-1">
                  <button
                    type="submit"
                    className="flex items-center justify-center space-x-2 w-full py-2 px-4 rounded-md text-red-700 hover:bg-red-50 text-sm font-medium transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{t('nav.signOut')}</span>
                  </button>
                </form>
              </>
            ) : mounted ? (
              <Link
                href="/connexion"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center space-x-2 w-full py-2.5 px-4 rounded-md border border-heritage-300 text-heritage-800 font-medium text-sm hover:bg-heritage-100 transition-colors"
              >
                <User className="w-4 h-4" />
                <span>{t('nav.signIn')}</span>
              </Link>
            ) : null}
          </div>
        </div>
      )}
    </header>
  );
}
