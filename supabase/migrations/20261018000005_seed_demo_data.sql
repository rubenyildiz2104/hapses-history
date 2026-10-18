-- ============================================================================
-- Migration 000005: Demonstration / Test Fixtures Data
-- NOTICE: All records in this file are clearly marked as DEMO / FICTITIOUS
-- to satisfy Requirement 22.5 ("Les données de démonstration doivent être
-- clairement identifiées").
-- ============================================================================

DO $$
DECLARE
    v_admin_id UUID := '00000000-0000-0000-0000-000000000001'::UUID;
    v_user_id UUID := '00000000-0000-0000-0000-000000000002'::UUID;

    v_p_patriarch UUID := '11111111-1111-1111-1111-111111111111'::UUID;
    v_p_matriarch UUID := '22222222-2222-2222-2222-222222222222'::UUID;
    v_p_child_dec UUID := '33333333-3333-3333-3333-333333333333'::UUID;
    v_p_living    UUID := '44444444-4444-4444-4444-444444444444'::UUID; -- MUST BE HIDDEN FROM PUBLIC
    v_p_unknown   UUID := '55555555-5555-5555-5555-555555555555'::UUID; -- MUST BE HIDDEN FROM PUBLIC

    v_source_pub  UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::UUID;
    v_source_priv UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID;

    v_article_pub   UUID := 'cccccccc-cccc-cccc-cccc-cccccccccccc'::UUID;
    v_article_draft UUID := 'dddddddd-dddd-dddd-dddd-dddddddddddd'::UUID;
    v_article_fam   UUID := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::UUID;
BEGIN
    -- 1. DEMO PERSONS
    -- Patriarch: Pierre DUPONT (deceased, public, partial date 1842)
    INSERT INTO public.persons (
        id, first_names, last_name, name_variants, gender,
        birth_year, birth_date_precision, birth_place,
        death_year, death_date_precision, death_place,
        life_status, visibility, profession, biography, notes
    ) VALUES (
        v_p_patriarch,
        'Pierre [DÉMO]', 'DUPONT', ARRAY['Dupond', 'Depont'], 'M',
        1842, 'year_only', 'Hapses',
        1912, 'exact', 'Hapses',
        'deceased', 'public', 'Forgeron communal',
        'Fiche de démonstration : Pierre Dupont exerça le métier de forgeron au village au XIXe siècle.',
        'Notes d''administration pour test interne.'
    ) ON CONFLICT (id) DO NOTHING;

    -- Matriarch: Marie LECLERC (deceased, public)
    INSERT INTO public.persons (
        id, first_names, last_name, name_variants, gender,
        birth_year, birth_date_precision, birth_place,
        death_year, death_date_precision, death_place,
        life_status, visibility, profession, biography
    ) VALUES (
        v_p_matriarch,
        'Marie [DÉMO]', 'LECLERC', ARRAY['Le Clerc'], 'F',
        1846, 'approximate', 'Commune voisine',
        1920, 'year_only', 'Hapses',
        'deceased', 'public', 'Tisserande',
        'Fiche de démonstration : épouse de Pierre Dupont.'
    ) ON CONFLICT (id) DO NOTHING;

    -- Child (deceased, public): Jean DUPONT (1870-1940)
    INSERT INTO public.persons (
        id, first_names, last_name, name_variants, gender,
        birth_year, birth_date_precision, birth_place,
        death_year, death_date_precision, death_place,
        life_status, visibility, profession, biography
    ) VALUES (
        v_p_child_dec,
        'Jean [DÉMO]', 'DUPONT', '{}', 'M',
        1870, 'exact', 'Hapses',
        1940, 'exact', 'Hapses',
        'deceased', 'public', 'Cultivateur',
        'Fils de Pierre Dupont et Marie Leclerc.'
    ) ON CONFLICT (id) DO NOTHING;

    -- Living descendant: Jacques DUPONT (living, private -> RLS must hide this from public visitors)
    INSERT INTO public.persons (
        id, first_names, last_name, name_variants, gender,
        birth_year, birth_date_precision, birth_place,
        life_status, visibility, profession, biography
    ) VALUES (
        v_p_living,
        'Jacques [DÉMO PRIVÉ]', 'DUPONT', '{}', 'M',
        1985, 'year_only', 'Hapses',
        'living', 'private', 'Ingénieur',
        'Fiche confidentielle d''une personne vivante de test.'
    ) ON CONFLICT (id) DO NOTHING;

    -- Unknown status person: Sophie DUPONT (unknown, private -> RLS must hide this from public visitors)
    INSERT INTO public.persons (
        id, first_names, last_name, name_variants, gender,
        birth_year, birth_date_precision,
        life_status, visibility
    ) VALUES (
        v_p_unknown,
        'Sophie [DÉMO STATUT INCONNU]', 'DUPONT', '{}', 'F',
        1910, 'approximate',
        'unknown', 'private'
    ) ON CONFLICT (id) DO NOTHING;

    -- 2. RELATIONSHIPS
    -- Spouse: Pierre & Marie
    INSERT INTO public.relationships (
        relationship_type, person_a_id, person_b_id,
        start_year, start_date_precision, start_place
    ) VALUES (
        'spouse', v_p_patriarch, v_p_matriarch,
        1868, 'year_only', 'Hapses'
    ) ON CONFLICT DO NOTHING;

    -- Parents of Jean (Pierre is father, Marie is mother)
    INSERT INTO public.relationships (
        relationship_type, person_a_id, person_b_id
    ) VALUES (
        'parent_child', v_p_patriarch, v_p_child_dec
    ) ON CONFLICT DO NOTHING;

    INSERT INTO public.relationships (
        relationship_type, person_a_id, person_b_id
    ) VALUES (
        'parent_child', v_p_matriarch, v_p_child_dec
    ) ON CONFLICT DO NOTHING;

    -- Relationship with living person: Jean is parent of living Jacques
    -- (This relationship MUST NOT be visible to public since Jacques is living/private)
    INSERT INTO public.relationships (
        relationship_type, person_a_id, person_b_id
    ) VALUES (
        'parent_child', v_p_child_dec, v_p_living
    ) ON CONFLICT DO NOTHING;

    -- 3. SOURCES
    -- Public source: Parish register 1842
    INSERT INTO public.sources (
        id, title, source_type, author_or_organization, source_date,
        archive_reference, description, is_public, rights_status
    ) VALUES (
        v_source_pub,
        '[DÉMO] Registre paroissial des baptêmes (1840-1845)',
        'parish_register',
        'Archives départementales',
        '1842',
        '5E 123/4 vue 18',
        'Acte de baptême de Pierre Dupont en date de 1842.',
        TRUE,
        'Domaine public'
    ) ON CONFLICT (id) DO NOTHING;

    -- Private source: Private family diary
    INSERT INTO public.sources (
        id, title, source_type, description, private_notes, is_public
    ) VALUES (
        v_source_priv,
        '[DÉMO PRIVÉE] Carnet de famille manuscrit',
        'private_document',
        'Notes de famille privées.',
        'Contient des coordonnées privées et mentions familiales non publiables.',
        FALSE -- Strict privacy: non public
    ) ON CONFLICT (id) DO NOTHING;

    -- Link public source to Pierre Dupont
    INSERT INTO public.person_sources (person_id, source_id, description)
    VALUES (v_p_patriarch, v_source_pub, 'Baptême de Pierre Dupont')
    ON CONFLICT DO NOTHING;

    -- 4. HISTORICAL ARTICLES
    -- Published Village History
    INSERT INTO public.historical_articles (
        id, article_type, title, slug, summary, content,
        period_start, period_end, period_description,
        status, published_at
    ) VALUES (
        v_article_pub,
        'village_history',
        '[DÉMO] Le développement de la forge et de l''artisanat au XIXe siècle',
        'developpement-forge-xixe',
        'Histoire du renouveau artisanal du village autour des métiers du fer et du bois au XIXe siècle.',
        '## L''essor de la forge artisanale\n\nAu cours du XIXe siècle, le village a connu une structuration remarquable de ses ateliers artisanaux...\n\n*Document d''illustration pour les tests de l''application.*',
        1830, 1890, 'XIXe siècle',
        'published', timezone('utc'::text, now())
    ) ON CONFLICT (id) DO NOTHING;

    -- Draft Village History (Must be INVISIBLE to public)
    INSERT INTO public.historical_articles (
        id, article_type, title, slug, summary, content,
        status
    ) VALUES (
        v_article_draft,
        'village_history',
        '[DÉMO BROUILLON] Les moulins du ruisseau médiéval',
        'moulins-ruisseau-medieval',
        'Recherches en cours sur l''emplacement des anciens moulins.',
        'Contenu en cours de rédaction par l''administrateur...',
        'draft'
    ) ON CONFLICT (id) DO NOTHING;

    -- Published Family History: La famille Dupont
    INSERT INTO public.historical_articles (
        id, article_type, title, slug, summary, content,
        family_name, period_start, period_end,
        status, published_at
    ) VALUES (
        v_article_fam,
        'family',
        '[DÉMO] Histoire de la famille Dupont à Hapses',
        'histoire-famille-dupont',
        'Présence documentée de la lignée Dupont, forgerons et cultivateurs de 1840 au début du XXe siècle.',
        '## Une lignée d''artisans du village\n\nLa famille Dupont s''établit durablement dans le village avec Pierre Dupont...\n\n### Limites des connaissances actuelles\nLes registres antérieurs à la Révolution restent à dépouiller.',
        'Dupont', 1842, 1940,
        'published', timezone('utc'::text, now())
    ) ON CONFLICT (id) DO NOTHING;

    -- Link Family Article with Pierre Dupont and Jean Dupont
    INSERT INTO public.historical_article_links (article_id, person_id, context)
    VALUES 
        (v_article_fam, v_p_patriarch, 'Fondateur de l''atelier de forge'),
        (v_article_fam, v_p_child_dec, 'Reprise de l''activité agricole')
    ON CONFLICT DO NOTHING;

    -- Link Article with Source
    INSERT INTO public.historical_article_sources (article_id, source_id, citation_details)
    VALUES (v_article_pub, v_source_pub, 'Registre paroissial attestant la présence du forgeron')
    ON CONFLICT DO NOTHING;

END $$;
