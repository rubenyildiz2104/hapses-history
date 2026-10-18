# Fonctions Serveur et Procédures Transactionnelles

Ce document recense les fonctions indispensables (procédures stockées PostgreSQL, triggers et Server Actions Next.js) requises par les sections 7.5, 12, 13 et 14 du **Cahier des charges fonctionnel et technique v1.0**.

---

## 1. Procédures et Fonctions PostgreSQL

### 1.1. `review_proposal_transaction` (Modération Atomique)
**Fichier :** `supabase/migrations/20261018000003_proposal_moderation_rpc.sql`  
**Type :** `SECURITY DEFINER` (s'exécute dans un contexte contrôlé).

#### Responsabilités :
1. **Contrôle d'habilitation :** Vérifie que l'appelant actuel possède bien le rôle `admin` (`public.is_admin(auth.uid())`).
2. **Verrouillage concurrent :** Exécute un `SELECT ... FOR UPDATE` sur la ligne ciblée de la table `proposals` pour empêcher les doubles validations simultanées par deux administrateurs.
3. **Contrôle d'état :** Vérifie que le statut de la proposition est bien `pending` ou `needs_information`.
4. **Application des modifications officielles :**
   - Si `p_decision = 'accept'` :
     - Pour `add_person` : Insère la personne dans `public.persons`, extrait l'UUID généré.
     - Pour `update_person` : Met à jour la fiche dans `public.persons`.
     - Pour `add_relationship` : Insère le lien dans `public.relationships` (le trigger anti-boucle valide la filiation).
     - Pour `update_relationship` : Met à jour la relation ciblée.
   - Met à jour la proposition (`status = 'accepted'`, `reviewed_by`, `reviewed_at`, `review_comment`).
   - Insère une entrée détaillée dans `public.audit_logs`.
   - Si `p_decision = 'reject'` : Met à jour le statut en `rejected`, conserve le motif et journalise dans l'audit.
   - Si `p_decision = 'needs_information'` : Met à jour le statut et journalise.
5. **Atomicité :** Tout échec (erreur de validation, cycle de filiation, contrainte d'unicité) provoque un **ROLLBACK intégral** de la transaction. Aucune modification partielle n'est enregistrée.

---

### 1.2. `check_relationship_cycles` (Détection des Boucles de Filiation)
**Fichier :** `supabase/migrations/20261018000001_init_schema.sql`  
**Type :** `TRIGGER BEFORE INSERT OR UPDATE ON public.relationships`

#### Responsabilités :
Lorsqu'un lien `parent_child` est inséré ou modifié (où `person_a_id` est le Parent et `person_b_id` est l'Enfant) :
- Exécute une requête récursive (Common Table Expression - CTE) parcourant toute la chaîne de filiation descendante à partir de l'enfant `person_b_id`.
- Si le parent `person_a_id` est retrouvé parmi les descendants de son propre enfant, une exception fatale est levée :
  `Incohérence généalogique détectée : boucle de filiation impossible (un ancêtre ne peut pas être son propre descendant).`

---

### 1.3. `search_public_persons` (Recherche Publique Sécurisée)
**Fichier :** `supabase/migrations/20261018000004_duplicate_detection_search.sql`  
**Type :** `FUNCTION STABLE`

#### Responsabilités :
- Recherche tolérante aux accents (`unaccent`) et insensible à la casse.
- Recherche par trigrammes (`pg_trgm`) et variantes orthographiques (`name_variants`).
- Filtres combinables : nom, prénom, année de naissance, année de décès.
- **Filtrage de confidentialité strict intégré :** `archived_at IS NULL AND life_status = 'deceased' AND visibility = 'public'`.
- Pagination avec `LIMIT` et `OFFSET` pour éviter les charges excessives.

---

### 1.4. `find_potential_duplicates` (Détection Conseillée des Doublons)
**Fichier :** `supabase/migrations/20261018000004_duplicate_detection_search.sql`  
**Type :** `FUNCTION STABLE SECURITY DEFINER`

#### Responsabilités :
- Calcule un indice de confiance (0 à 100) basé sur la similarité trigramme du nom, du prénom et la proximité des années de naissance et de décès (+/- 2 ans).
- Retourne une liste de candidats potentiels avec les motifs détaillés de ressemblance.
- Ne procède à aucune fusion automatique, conformément à la section 5.4.

---

### 1.5. Triggers de Sécurité et d'Intégrité
- `trg_protect_profile_role` : Empêche un utilisateur d'élever son propre rôle vers `admin`.
- `on_auth_user_created` : Crée automatiquement la ligne correspondante dans `profiles` avec `role = 'user'`.
- `trg_*_updated_at` : Maintient automatiquement l'horodatage `updated_at` à l'heure UTC actuelle.

---

## 2. Server Actions Next.js (Application Web)

Les Server Actions suivantes centralisent la logique métier côté serveur dans l'application Next.js :

| Server Action | Rôle requis | Responsabilité |
| :--- | :--- | :--- |
| `searchPersons(filters)` | Public | Valide les filtres via Zod, appelle `search_public_persons`, retourne les fiches publiques paginées. |
| `getPersonDetails(id)` | Public / Auth | Charge la fiche, vérifie la visibilité, charge les parents, conjoints, enfants, frères/sœurs publics, les sources publiques et les articles associés. |
| `submitProposal(data)` | Connecté | Valide le formulaire via Zod (`SubmitProposalSchema`), vérifie la non-duplication immédiate, insère la proposition en statut `pending`. |
| `reviewProposal(id, decision, comment)` | Admin | Valide la décision via Zod, invoque la RPC transactionnelle `review_proposal_transaction`. |
| `saveArticle(data)` | Admin | Valide les champs via Zod (`HistoricalArticleSchema`), nettoie le contenu Markdown, gère les liaisons avec personnes et sources. |
| `publishArticle(id)` | Admin | Passe l'article au statut `published`, fixe `published_at = now()`, consigne l'événement dans `audit_logs`. |
| `archivePerson(id)` | Admin | Positionne `archived_at = now()`, masque la fiche du domaine public, consigne dans `audit_logs`. |
