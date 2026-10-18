'use client';

import Link from 'next/link';
import { useState } from 'react';
import { BookOpen, Users, Landmark, FileText, Info, Menu, X, User } from 'lucide-react';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Accueil' },
    { href: '/genealogie', label: 'Généalogie', icon: Users },
    { href: '/histoire', label: 'Histoire du village', icon: Landmark },
    { href: '/familles', label: 'Histoires de familles', icon: BookOpen },
    { href: '/sources', label: 'Sources & Archives', icon: FileText },
    { href: '/a-propos', label: 'À propos', icon: Info },
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
                  Histoire & Familles
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

          {/* User Account Action */}
          <div className="hidden md:flex items-center space-x-3">
            <Link
              href="/connexion"
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-sm font-medium rounded-full border border-heritage-300 text-heritage-800 hover:bg-heritage-100 hover:border-heritage-400 transition-colors"
            >
              <User className="w-4 h-4 text-heritage-600" />
              <span>Connexion</span>
            </Link>
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
        <div className="md:hidden border-b border-heritage-200 bg-heritage-50 px-4 pt-2 pb-4 space-y-1">
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
          <div className="pt-3 border-t border-heritage-200 mt-2">
            <Link
              href="/connexion"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center space-x-2 w-full py-2.5 px-4 rounded-md bg-heritage-800 text-heritage-50 font-medium text-sm hover:bg-heritage-900 transition-colors"
            >
              <User className="w-4 h-4" />
              <span>Espace Membre / Connexion</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
