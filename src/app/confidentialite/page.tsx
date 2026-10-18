import { ShieldCheck, Lock, EyeOff, FileText, UserCheck } from 'lucide-react';

export default function ConfidentialitePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10">
      <div className="space-y-3 pb-6 border-b border-heritage-200">
        <div className="inline-flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-heritage-600">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Protection des données & Éthique patrimoniale</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-heritage-950">
          Politique de confidentialité & Protection de la vie privée
        </h1>
        <p className="text-heritage-700 text-sm sm:text-base leading-relaxed">
          Le projet applique des règles renforcées pour préserver la vie privée des personnes vivantes 
          et garantir la conformité avec la réglementation sur les données personnelles (RGPD) et le droit des archives.
        </p>
      </div>

      <div className="space-y-8 text-heritage-800 text-sm leading-relaxed">
        {/* Section 1 */}
        <section className="space-y-3">
          <div className="flex items-center space-x-2 text-heritage-950">
            <Lock className="w-5 h-5 text-heritage-700" />
            <h2 className="font-serif text-xl font-bold">1. Protection des personnes vivantes</h2>
          </div>
          <p>
            Par principe fondamental et technique, <strong>aucune personne vivante n&apos;est publiquement identifiable ou consultable</strong> sur ce site.
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-heritage-700">
            <li>Toute personne vivante répertoriée dans la base est marquée comme privée au niveau de la base de données.</li>
            <li>Les personnes dont le statut de vie est « inconnu » sont protégées par défaut et ne sont jamais présumées décédées.</li>
            <li>Les liens de parenté reliant une personne vivante sont automatiquement masqués au public afin d&apos;empêcher toute déduction indirecte.</li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <div className="flex items-center space-x-2 text-heritage-950">
            <EyeOff className="w-5 h-5 text-heritage-700" />
            <h2 className="font-serif text-xl font-bold">2. Sécurité au niveau de la base de données (Row Level Security)</h2>
          </div>
          <p>
            La protection de la vie privée n&apos;est pas un simple masque graphique dans l&apos;interface. Elle est appliquée 
            directement au niveau du moteur PostgreSQL par le mécanisme <strong>Row Level Security (RLS)</strong>. 
            Même en devinant ou en forgeant un identifiant dans l&apos;URL, aucune donnée confidentielle ne peut être extraite.
          </p>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <div className="flex items-center space-x-2 text-heritage-950">
            <FileText className="w-5 h-5 text-heritage-700" />
            <h2 className="font-serif text-xl font-bold">3. Droit des archives et des sources</h2>
          </div>
          <p>
            Les registres paroissiaux et d&apos;état civil anciens relèvent du domaine public conformément au code du patrimoine. 
            Toutefois, les documents privés, notes de famille et pièces protégées conservent un statut strictement restreint. 
            Chaque source dispose de son propre statut de visibilité indépendant.
          </p>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <div className="flex items-center space-x-2 text-heritage-950">
            <UserCheck className="w-5 h-5 text-heritage-700" />
            <h2 className="font-serif text-xl font-bold">4. Droit de rectification et de retrait</h2>
          </div>
          <p>
            Toute personne justifiant de son identité peut demander la rectification ou le retrait immédiat de mentions la concernant 
            ou concernant ses ascendants directs lorsqu&apos;un motif légitime le justifie.
          </p>
          <p>
            Pour toute demande relative à la modération ou au respect de la vie privée, vous pouvez contacter l&apos;administrateur 
            via notre formulaire de contact.
          </p>
        </section>
      </div>
    </div>
  );
}
