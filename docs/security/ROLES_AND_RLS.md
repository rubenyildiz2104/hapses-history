# Rôles, Confidentialité et Politiques Row Level Security (RLS)

Ce document décrit l'architecture de sécurité technique et les politiques d'accès aux données, strictement conformes aux exigences des sections 3, 6 et 14 du **Cahier des charges fonctionnel et technique v1.0**.

---

## 1. Modèle des Acteurs et Rôles

Le système distingue trois niveaux d'accès :

1. **Visiteur anonyme (`anon`)** :
   - Accès en lecture seule aux données expressément publiques.
   - Aucun accès aux personnes vivantes, aux personnes au statut inconnu, aux fiches archivées, aux brouillons d'articles ou aux sources privées.
   - Ne peut pas soumettre de propositions.

2. **Utilisateur enregistré (`authenticated`, `role = 'user'`)** :
   - Dispose de tous les droits de consultation du visiteur anonyme.
   - Peut créer des propositions (`proposals`) en son nom propre avec le statut initial obligatoire `pending`.
   - Peut consulter l'historique et les motifs de traitement de ses propres propositions (`submitted_by = auth.uid()`).
   - Ne peut **en aucun cas** modifier directement les données officielles (`persons`, `relationships`, `sources`, `historical_articles`).
   - Ne peut **jamais** accepter ses propres propositions ni changer de rôle.

3. **Administrateur (`authenticated`, `role = 'admin'`)** :
   - Accès complet aux fiches officielles, relations, sources et articles en brouillon.
   - Pouvoir de modération transactionnelle des propositions (acceptation, refus, demande de complément).
   - Publication et dépublication des récits historiques.
   - Consultation intégrale du journal d'audit (`audit_logs`).

---

## 2. Règle d'or de Confidentialité des Personnes (Section 6.2 & 14.2)

Une personne est **publiquement consultable** si et seulement si :
$$\text{archived\_at IS NULL} \quad \land \quad \text{life\_status} = \text{'deceased'} \quad \land \quad \text{visibility} = \text{'public'}$$

Toute fiche ne remplissant pas simultanément ces trois conditions est inaccessible au public :
- **Personnes vivantes (`living`)** : Protégées par défaut.
- **Statut inconnu (`unknown`)** : Protégé par défaut (l'inconnu n'est jamais assimilé à décédé).
- **Fiches privées (`visibility = 'private'`)** : Protégées.
- **Fiches archivées (`archived_at IS NOT NULL`)** : Protégées.

Cette règle est garantie **au niveau du moteur PostgreSQL (RLS)** et ne dépend pas d'un simple masquage dans l'interface React.

---

## 3. Matrice d'Accès aux Tables

| Table | Opération | Visiteur (`anon`) | Utilisateur connecté (`user`) | Administrateur (`admin`) |
| :--- | :--- | :--- | :--- | :--- |
| **`profiles`** | SELECT | Aucun | Son propre profil (`id = auth.uid()`) | Tous les profils |
| | INSERT | Trigger système uniquement | Trigger système uniquement | Trigger ou admin |
| | UPDATE | ❌ | Son profil (sauf `role`) | Tous les profils |
| | DELETE | ❌ | ❌ | ❌ (ou désactivation) |
| **`persons`** | SELECT | Uniquement `deceased + public` | Uniquement `deceased + public` | Toutes les fiches |
| | INSERT / UPDATE / DELETE | ❌ | ❌ (doit proposer) | ✅ |
| **`relationships`** | SELECT | Si les deux personnes sont publiques | Si les deux personnes sont publiques | Toutes les relations |
| | INSERT / UPDATE / DELETE | ❌ | ❌ (doit proposer) | ✅ |
| **`sources`** | SELECT | Uniquement si `is_public = true` | Uniquement si `is_public = true` | Toutes les sources |
| | INSERT / UPDATE / DELETE | ❌ | ❌ | ✅ |
| **`person_sources`** | SELECT | Si personne publique et source publique | Si personne publique et source publique | Toutes |
| | INSERT / UPDATE / DELETE | ❌ | ❌ | ✅ |
| **`proposals`** | SELECT | ❌ | Ses propres propositions | Toutes les propositions |
| | INSERT | ❌ | ✅ (en `pending` uniquement) | ✅ |
| | UPDATE | ❌ | ❌ (impossible d'auto-valider) | ✅ (décision + commentaire) |
| | DELETE | ❌ | ❌ | ✅ |
| **`historical_articles`**| SELECT | Uniquement `published` | Uniquement `published` | Brouillons, publiés, archivés |
| | INSERT / UPDATE / DELETE | ❌ | ❌ | ✅ |
| **`historical_article_links`**| SELECT | Si article publié et personne publique | Si article publié et personne publique | Tous les liens |
| | INSERT / UPDATE / DELETE | ❌ | ❌ | ✅ |
| **`audit_logs`** | SELECT | ❌ | ❌ | ✅ |
| | INSERT | ❌ | ❌ | Automatique (Triggers / RPC) |
| | UPDATE / DELETE | ❌ | ❌ | ❌ (Interdiction absolue) |

---

## 4. Détail des Politiques RLS Clés

### 4.1. Protection des personnes (`persons_select_public_or_admin`)
```sql
CREATE POLICY "persons_select_public_or_admin"
    ON public.persons FOR SELECT
    USING (
        (archived_at IS NULL AND life_status = 'deceased' AND visibility = 'public')
        OR public.is_admin(auth.uid())
    );
```

### 4.2. Protection des relations bilatérales (`relationships_select_public_or_admin`)
```sql
CREATE POLICY "relationships_select_public_or_admin"
    ON public.relationships FOR SELECT
    USING (
        (
            archived_at IS NULL
            AND public.is_person_public(person_a_id)
            AND public.is_person_public(person_b_id)
        )
        OR public.is_admin(auth.uid())
    );
```
> **Conséquence :** Si une personne vivante a un lien de parenté avec une personne décédée, la relation est automatiquement masquée aux visiteurs anonymes et utilisateurs ordinaires. Aucune information privée ne fuite indirectement par les graphes de parenté.

### 4.3. Protection des propositions (`proposals_insert_user` & `proposals_update_admin_only`)
```sql
-- L'utilisateur ne peut soumettre qu'en son propre nom et en statut "pending"
CREATE POLICY "proposals_insert_user"
    ON public.proposals FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND submitted_by = auth.uid()
        AND status = 'pending'
        AND reviewed_by IS NULL
        AND reviewed_at IS NULL
    );

-- Seul l'administrateur peut modifier le statut d'une proposition
CREATE POLICY "proposals_update_admin_only"
    ON public.proposals FOR UPDATE
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));
```

### 4.4. Protection des notes de sources privées
Pour éviter la fuite de `private_notes` des sources publiques, la vue sécurisée `public.public_sources` expose uniquement les colonnes publiques :
```sql
CREATE VIEW public.public_sources AS
SELECT id, title, source_type, author_or_organization, source_date,
       archive_reference, url, description, rights_status, created_at
FROM public.sources
WHERE is_public = TRUE;
```

---

## 5. Protection contre l'auto-attribution du rôle Administrateur

Le trigger `trg_protect_profile_role` s'exécute `BEFORE UPDATE ON public.profiles` :
- Si un utilisateur tente d'envoyer un payload `role = 'admin'`, la fonction vérifie si l'acteur actuel possède déjà le statut administrateur (`is_admin(auth.uid())`).
- Si ce n'est pas le cas, la transaction est instantanément avortée avec le message :
  `Interdiction de modifier les droits et rôles utilisateur.`
