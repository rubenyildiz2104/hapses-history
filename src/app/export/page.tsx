import Link from 'next/link';
import { Download, ShieldCheck, Database, FileCode, CheckCircle, ArrowRight, HeartHandshake } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const metadata = {
  title: 'Préservation & Export des Données | Habses Histoire & Familles',
  description: 'Téléchargez les données généalogiques et archivistiques publiques du village de Habses au format standard GEDCOM 5.5.1 ou JSON.',
};

export default async function ExportPage() {
  const supabase = await createServerSupabaseClient();

  // Count public deceased persons
  const { count: publicPersonsCount } = await supabase
    .from('persons')
    .select('*', { count: 'exact', head: true })
    .is('archived_at', null)
    .eq('life_status', 'deceased')
    .eq('visibility', 'public');

  // Count public sources
  const { count: publicSourcesCount } = await supabase
    .from('sources')
    .select('*', { count: 'exact', head: true })
    .eq('is_public', true);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      {/* Header */}
      <div className="max-w-3xl space-y-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-heritage-600">
          Open Data & Sauvegarde Patrimoniale
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-heritage-950 tracking-tight">
          Préservation & Export des Données
        </h1>
        <p className="text-base sm:text-lg text-heritage-800 font-serif leading-relaxed">
          Le patrimoine et la mémoire collective de <strong>Habses</strong> n’appartiennent à aucune plateforme fermée. 
          Nous mettons à disposition l’ensemble des données historiques et généalogiques publiques dans des formats 
          ouverts et pérennes, compatibles avec les logiciels de généalogie de référence.
        </p>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-6 rounded-2xl bg-heritage-100/60 border border-heritage-200">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-heritage-800 text-heritage-50 flex items-center justify-center font-bold text-lg font-serif">
            {publicPersonsCount ?? 0}
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-heritage-600">
              Fiches Individuelles Publiques
            </div>
            <div className="text-sm font-medium text-heritage-900">
              Personnes décédées documentées
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-heritage-800 text-heritage-50 flex items-center justify-center font-bold text-lg font-serif">
            {publicSourcesCount ?? 0}
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-heritage-600">
              Sources & Archives
            </div>
            <div className="text-sm font-medium text-heritage-900">
              Registres, defters et actes référencés
            </div>
          </div>
        </div>
      </div>

      {/* Export Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Card 1: GEDCOM 5.5.1 */}
        <div className="p-8 rounded-2xl bg-white border border-heritage-200 space-y-6 shadow-sm flex flex-col justify-between hover:border-heritage-300 transition-colors">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-heritage-100 text-heritage-800 flex items-center justify-center">
              <Database className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-heritage-600">
                Standard Généalogique Universel
              </span>
              <h2 className="font-serif text-2xl font-bold text-heritage-950">
                Fichier GEDCOM 5.5.1 (.ged)
              </h2>
            </div>
            <p className="text-sm text-heritage-700 leading-relaxed">
              Format standard compatible avec tous les logiciels de généalogie : 
              <strong> Gramps, Geneanet, MyHeritage, FamilySearch, Ancestry, Heredis</strong>. 
              Comprend les individus, filiations, mariages et références de sources.
            </p>

            <ul className="space-y-2 text-xs text-heritage-800">
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Norme stricte GEDCOM 5.5.1 (UTF-8)</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Respect des dates partielles et approximatives (ABT, BEF, AFT)</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Importation directe en un clic dans vos arbres</span>
              </li>
            </ul>
          </div>

          <a
            href="/api/export/gedcom"
            download
            className="w-full inline-flex items-center justify-center space-x-2.5 px-6 py-3.5 rounded-xl bg-heritage-800 text-heritage-50 font-semibold text-sm hover:bg-heritage-900 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Télécharger le fichier GEDCOM (.ged)</span>
          </a>
        </div>

        {/* Card 2: JSON Structuré */}
        <div className="p-8 rounded-2xl bg-white border border-heritage-200 space-y-6 shadow-sm flex flex-col justify-between hover:border-heritage-300 transition-colors">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-heritage-100 text-heritage-800 flex items-center justify-center">
              <FileCode className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-heritage-600">
                Données Structurées Ouvertes
              </span>
              <h2 className="font-serif text-2xl font-bold text-heritage-950">
                Export JSON (.json)
              </h2>
            </div>
            <p className="text-sm text-heritage-700 leading-relaxed">
              Format brut idéal pour les chercheurs, archivistes, data scientists et développeurs 
              souhaitant croiser les données avec d&apos;autres corpus du Tur Abdin ou de la diaspora.
            </p>

            <ul className="space-y-2 text-xs text-heritage-800">
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Métadonnées d&apos;exportation et horodatage ISO</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Objets Persons, Relationships et Sources normalisés</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Facilement intégrable dans Python, R, Node.js ou SQLite</span>
              </li>
            </ul>
          </div>

          <a
            href="/api/export/json"
            download
            className="w-full inline-flex items-center justify-center space-x-2.5 px-6 py-3.5 rounded-xl border-2 border-heritage-800 text-heritage-900 font-semibold text-sm hover:bg-heritage-100 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4 text-heritage-700" />
            <span>Télécharger le jeu de données JSON (.json)</span>
          </a>
        </div>
      </div>

      {/* Privacy Guarantee Box */}
      <div className="p-8 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-4">
        <div className="flex items-center space-x-3 text-amber-950">
          <ShieldCheck className="w-6 h-6 text-amber-700 shrink-0" />
          <h3 className="font-serif text-xl font-bold">
            Engagement Éthique et Protection Absolue de la Vie Privée
          </h3>
        </div>
        <p className="text-sm text-amber-900 leading-relaxed">
          Conformément au cahier des charges et aux réglementations sur la protection de la vie privée (RGPD) :
        </p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-amber-950">
          <li className="p-3 bg-white/80 rounded-lg border border-amber-200/80">
            <strong>Exclusion totale des vivants :</strong> Aucune personne vivante ni aucune fiche au statut d&apos;incertitude (<code className="bg-amber-100 px-1 py-0.5 rounded">unknown</code>) n&apos;est jamais incluse dans les exports.
          </li>
          <li className="p-3 bg-white/80 rounded-lg border border-amber-200/80">
            <strong>Protection des liens familiaux :</strong> Une relation n&apos;est exportée que si les deux protagonistes sont des personnes décédées publiques.
          </li>
          <li className="p-3 bg-white/80 rounded-lg border border-amber-200/80">
            <strong>Filtrage des notes privées :</strong> Les notes administratives et coordonnées de contact sont strictement éliminées avant génération.
          </li>
          <li className="p-3 bg-white/80 rounded-lg border border-amber-200/80">
            <strong>Licence libre :</strong> Les données sont mises à disposition sous licence Creative Commons Attribution (CC BY 4.0).
          </li>
        </ul>
      </div>

      {/* Community Call to Action */}
      <div className="text-center p-8 rounded-2xl border border-heritage-200 bg-white space-y-4">
        <HeartHandshake className="w-8 h-8 text-heritage-700 mx-auto" />
        <h3 className="font-serif text-xl font-bold text-heritage-950">
          Vous possédez des archives ou des documents sur Habses ?
        </h3>
        <p className="text-sm text-heritage-700 max-w-xl mx-auto leading-relaxed">
          Chaque acte, photographie d&apos;archive, inscription ou témoignage contribue à reconstituer 
          la mémoire de nos familles. Vous pouvez soumettre des compléments ou corrections vérifiés.
        </p>
        <div>
          <Link
            href="/proposer"
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-heritage-800 text-heritage-50 text-xs font-semibold hover:bg-heritage-900 transition-colors"
          >
            <span>Proposer une contribution</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
