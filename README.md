# Mémoire et Généalogie d'un Village (Hapses)

Plateforme web patrimoniale et collaborative consacrée à la mémoire d’un village, à ses familles, à ses habitants passés et à son histoire.

Conforme au **Cahier des charges fonctionnel et technique v1.0**.

---

## 1. Principes Fondamentaux et Sécurité

- **Protection absolue des personnes vivantes :** Seules les personnes au statut `deceased` et déclarées `public` sont consultables par les visiteurs anonymes et utilisateurs ordinaires. Les personnes vivantes et au statut `unknown` sont protégées au niveau de la base PostgreSQL via **Row Level Security (RLS)**.
- **Préservation des liens familiaux :** Une relation familiale n'est visible que si **les deux personnes liées** sont publiquement consultables. Aucune information privée ne peut être déduite indirectement.
- **Contributions modérées sans modification directe :** Les utilisateurs proposent des ajouts et corrections dans une table isolée (`proposals`). L'intégration dans les fiches officielles requiert la validation par un administrateur via une procédure transactionnelle atomique (`review_proposal_transaction`).
- **Gestion rigoureuse des dates partielles :** Le système distingue une date exacte, une année connue (ex. 1842 sans 1er janvier fictif), une période approximative et une date inconnue.
- **Contrôle éditorial des récits historiques :** L'administrateur est seul responsable de la rédaction, des brouillons et de la publication des articles historiques et récits de familles.
- **Journal d'audit immuable :** Toute modification importante ou décision de modération est consignée de façon non modifiable et non supprimable dans `audit_logs`.

---

## 2. Arborescence du Projet

```text
├── docs/                                  # Documentation technique et d'architecture
│   ├── schema/
│   │   └── RELATIONAL_SCHEMA.md           # Documentation exhaustive du schéma PostgreSQL
│   ├── security/
│   │   └── ROLES_AND_RLS.md               # Définition des rôles et politiques de sécurité RLS
│   ├── SERVER_FUNCTIONS.md                # Procédures stockées et Server Actions indispensables
│   └── TEST_PLAN.md                       # Plan de tests, matrice de couverture et procédures
│
├── supabase/                              # Migrations PostgreSQL et données de démonstration
│   └── migrations/
│       ├── 20261018000001_init_schema.sql                # Schéma initial, contraintes et triggers anti-cycles
│       ├── 20261018000002_rls_policies.sql               # Politiques RLS et règles de confidentialité strictes
│       ├── 20261018000003_proposal_moderation_rpc.sql    # Fonction RPC atomique de modération
│       ├── 20261018000004_duplicate_detection_search.sql # Recherche tolérante aux accents & score de doublons
│       └── 20261018000005_seed_demo_data.sql             # Données de test fictives clairement annotées [DÉMO]
│
├── src/
│   ├── app/                               # Pages et routes Next.js (App Router)
│   │   ├── (public)/                      # Espace public : Accueil, Recherche, Fiche personne, Histoire, Familles
│   │   ├── (auth)/                        # Connexion, inscription, récupération de mot de passe
│   │   ├── (account)/                     # Espace personnel et suivi des propositions
│   │   └── admin/                         # Espace d'administration et de modération
│   │
│   ├── components/                        # Composants d'interface (UI, arbre familial, diff modérateur)
│   ├── lib/
│   │   ├── services/
│   │   │   ├── privacy.ts                 # Règles de visibilité et d'anonymisation
│   │   │   ├── dates.ts                   # Formatage des dates partielles et approximatives
│   │   │   └── duplicates.ts              # Algorithme de détection des doublons potentiels
│   │   ├── types/
│   │   │   └── database.ts                # Typage TypeScript aligné sur la base de données
│   │   └── validations/
│   │       ├── genealogy.ts               # Schémas Zod pour fiches et relations
│   │       ├── proposal.ts                # Schémas Zod pour les propositions
│   │       └── article.ts                 # Schémas Zod pour les articles historiques
│   │
├── tests/                                 # Tests automatisés
│   ├── privacy.test.ts                    # Tests de non-divulgation des vivants et sources
│   ├── dates.test.ts                      # Tests des dates partielles (ex: 1842)
│   └── duplicates.test.ts                 # Tests de calcul d'indice de doublons
│
├── .env.example                           # Variables d'environnement type
├── package.json                           # Configuration des dépendances
├── tsconfig.json                          # Configuration TypeScript stricte
└── vitest.config.ts                       # Configuration des tests Vitest
```

---

## 3. Installation et Lancement

### Prérequis
- Node.js (version 20+ ou 22+)
- Un projet PostgreSQL / Supabase configuré

### 1. Variables d'environnement
Copiez le fichier `.env.example` en `.env.local` et renseignez vos identifiants Supabase :
```bash
cp .env.example .env.local
```

### 2. Application des Migrations SQL
Sous Supabase, exécutez séquentiellement les scripts situés dans `supabase/migrations/` depuis le SQL Editor ou via la CLI Supabase :
1. `20261018000001_init_schema.sql`
2. `20261018000002_rls_policies.sql`
3. `20261018000003_proposal_moderation_rpc.sql`
4. `20261018000004_duplicate_detection_search.sql`
5. *(Optionnel)* `20261018000005_seed_demo_data.sql` (fixtures de test clairement identifiées [DÉMO])

### 3. Exécution des Tests
```bash
npm run test
```
