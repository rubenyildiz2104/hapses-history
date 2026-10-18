import Link from 'next/link';
import { Search, Home, ShieldAlert } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <div className="w-14 h-14 rounded-full bg-heritage-100 text-heritage-700 flex items-center justify-center mx-auto mb-4 border border-heritage-200">
        <ShieldAlert className="w-7 h-7" />
      </div>

      <h1 className="font-serif text-2xl sm:text-3xl font-bold text-heritage-950 mb-3">
        Fiche ou document introuvable
      </h1>

      <p className="text-heritage-700 text-sm sm:text-base leading-relaxed mb-8 max-w-lg mx-auto">
        Cette page n&apos;existe pas ou n&apos;est pas accessible publiquement. Conformément à nos règles de
        confidentialité, les fiches des personnes vivantes, les statuts non établis et les documents privés
        ne sont pas diffusés.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          href="/genealogie"
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-heritage-800 text-heritage-50 text-sm font-semibold hover:bg-heritage-900 transition-colors w-full sm:w-auto justify-center"
        >
          <Search className="w-4 h-4" />
          <span>Recherche généalogique</span>
        </Link>
        <Link
          href="/"
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg border border-heritage-300 text-heritage-800 text-sm font-medium hover:bg-heritage-100 transition-colors w-full sm:w-auto justify-center"
        >
          <Home className="w-4 h-4" />
          <span>Retour à l&apos;accueil</span>
        </Link>
      </div>
    </div>
  );
}
