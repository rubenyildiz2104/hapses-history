import Link from 'next/link';
import { Compass, Shield, Users, BookOpen } from 'lucide-react';

export default function AProposPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      <div className="space-y-3 pb-6 border-b border-heritage-200">
        <div className="inline-flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-heritage-600">
          <Compass className="w-4 h-4 text-heritage-600" />
          <span>Démarche patrimoniale</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-heritage-950">
          À propos du projet Habses Histoire & Familles
        </h1>
        <p className="text-heritage-700 text-sm sm:text-base leading-relaxed font-serif">
          Une démarche de mémoire partagée pour préserver et valoriser l&apos;histoire humaine, 
          sociale et patrimoniale de la commune.
        </p>
      </div>

      <div className="space-y-10 text-heritage-800 text-sm sm:text-base leading-relaxed">
        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold text-heritage-950">
            Une mémoire progressive et documentée
          </h2>
          <p>
            L&apos;histoire d&apos;un village ne s&apos;écrit pas en un jour. Certaines époques sont richement documentées 
            grâce à la conservation des registres paroissiaux et de l&apos;état civil, tandis que d&apos;autres comportent encore 
            des zones d&apos;ombre.
          </p>
          <p>
            Ce projet fait le choix de la transparence méthodologique : nous distinguons clairement les faits établis par des actes 
            authentiques, les traditions orales et les hypothèses de travail en cours de vérification.
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-heritage-200">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-lg bg-heritage-100 text-heritage-800 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-serif font-bold text-heritage-950 text-base">Fiabilité & Traçabilité</h3>
            <p className="text-xs sm:text-sm text-heritage-700">
              Chaque fiche officielle est reliée autant que possible à des cotes d&apos;archives consultables.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-10 h-10 rounded-lg bg-heritage-100 text-heritage-800 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-serif font-bold text-heritage-950 text-base">Modération humaine</h3>
            <p className="text-xs sm:text-sm text-heritage-700">
              Aucune proposition externe ne modifie la base sans vérification préalable par l&apos;administrateur.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-10 h-10 rounded-lg bg-heritage-100 text-heritage-800 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="font-serif font-bold text-heritage-950 text-base">Contexte historique</h3>
            <p className="text-xs sm:text-sm text-heritage-700">
              La généalogie s&apos;enrichit des métiers, des lieux et des événements de l&apos;histoire communale.
            </p>
          </div>
        </section>

        <section className="p-6 rounded-2xl bg-heritage-100/70 border border-heritage-200 space-y-3">
          <h2 className="font-serif text-lg font-bold text-heritage-950">
            Participer à la reconstitution
          </h2>
          <p className="text-sm text-heritage-700">
            Descendants, passionnés d&apos;histoire locale ou généalogistes : vous pouvez contribuer en proposant 
            de nouvelles personnes ou en corrigeant des fiches existantes avec vos références d&apos;actes.
          </p>
          <div className="pt-2">
            <Link
              href="/connexion"
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-heritage-800 text-heritage-50 text-xs font-semibold hover:bg-heritage-900 transition-colors"
            >
              <span>Accéder à l&apos;espace de contribution</span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
