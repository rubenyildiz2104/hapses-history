import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-heritage-100 border-t border-heritage-200 mt-20 text-heritage-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Column 1: Project Identity */}
          <div className="md:col-span-2 space-y-3">
            <span className="font-serif text-lg font-bold text-heritage-950">
              Habses — Histoire & Familles
            </span>
            <p className="text-sm text-heritage-700 leading-relaxed max-w-md">
              Projet patrimonial et collaboratif dédié à la mémoire du village, à la reconstitution 
              progressive de ses lignées familiales et à la préservation de son histoire locale documentée.
            </p>
            <p className="text-xs text-heritage-600">
              Les données relatives aux personnes vivantes et informations privées sont strictement protégées.
            </p>
          </div>

          {/* Column 2: Navigation */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-heritage-900 mb-3">
              Exploration
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/genealogie" className="hover:text-heritage-950 transition-colors">
                  Recherche généalogique
                </Link>
              </li>
              <li>
                <Link href="/histoire" className="hover:text-heritage-950 transition-colors">
                  Chronologie du village
                </Link>
              </li>
              <li>
                <Link href="/familles" className="hover:text-heritage-950 transition-colors">
                  Histoires de familles
                </Link>
              </li>
              <li>
                <Link href="/sources" className="hover:text-heritage-950 transition-colors">
                  Sources & Registres
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Governance & Legal */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-heritage-900 mb-3">
              Informations
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/a-propos" className="hover:text-heritage-950 transition-colors">
                  À propos de la démarche
                </Link>
              </li>
              <li>
                <Link href="/confidentialite" className="hover:text-heritage-950 transition-colors">
                  Politique de confidentialité
                </Link>
              </li>
              <li>
                <Link href="/conditions" className="hover:text-heritage-950 transition-colors">
                  Conditions d&apos;utilisation
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-heritage-950 transition-colors">
                  Contact & Modération
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-heritage-200 flex flex-col sm:flex-row justify-between items-center text-xs text-heritage-600">
          <p>© {new Date().getFullYear()} Habses Histoire & Familles. Tous droits réservés.</p>
          <p className="mt-2 sm:mt-0">
            Conçu pour la recherche généalogique locale et l&apos;histoire communale.
          </p>
        </div>
      </div>
    </footer>
  );
}
