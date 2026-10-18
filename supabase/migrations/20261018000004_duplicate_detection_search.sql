-- ============================================================================
-- Migration 000004: Duplicate Detection & Public Genea Search
-- Compliant with Specifications v1.0 (Sections 5.1, 5.4)
-- ============================================================================

-- 1. SECURE PUBLIC SEARCH FUNCTION
-- Returns only allowed persons (deceased + public + non-archived), accent-insensitive, partial matching
CREATE OR REPLACE FUNCTION public.search_public_persons(
    p_query TEXT DEFAULT NULL,
    p_last_name TEXT DEFAULT NULL,
    p_first_names TEXT DEFAULT NULL,
    p_birth_year INTEGER DEFAULT NULL,
    p_death_year INTEGER DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    first_names TEXT,
    last_name TEXT,
    name_variants TEXT[],
    birth_year INTEGER,
    birth_date_precision date_precision,
    birth_place TEXT,
    death_year INTEGER,
    death_date_precision date_precision,
    death_place TEXT,
    profession TEXT,
    similarity_score REAL
) AS $$
DECLARE
    v_clean_query TEXT := NULLIF(TRIM(p_query), '');
    v_clean_last TEXT := NULLIF(TRIM(p_last_name), '');
    v_clean_first TEXT := NULLIF(TRIM(p_first_names), '');
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.first_names,
        p.last_name,
        p.name_variants,
        p.birth_year,
        p.birth_date_precision,
        p.birth_place,
        p.death_year,
        p.death_date_precision,
        p.death_place,
        p.profession,
        CASE 
            WHEN v_clean_query IS NOT NULL THEN
                similarity(lower(unaccent(p.last_name || ' ' || p.first_names)), lower(unaccent(v_clean_query)))
            ELSE 1.0::REAL
        END AS similarity_score
    FROM public.persons p
    WHERE 
        -- Strict privacy rule
        p.archived_at IS NULL
        AND p.life_status = 'deceased'
        AND p.visibility = 'public'
        
        -- Query filtering
        AND (
            v_clean_query IS NULL 
            OR lower(unaccent(p.last_name || ' ' || p.first_names)) ILIKE ('%' || lower(unaccent(v_clean_query)) || '%')
            OR lower(unaccent(array_to_string(p.name_variants, ' '))) ILIKE ('%' || lower(unaccent(v_clean_query)) || '%')
            OR p.last_name % v_clean_query
        )
        AND (
            v_clean_last IS NULL 
            OR lower(unaccent(p.last_name)) ILIKE ('%' || lower(unaccent(v_clean_last)) || '%')
            OR lower(unaccent(array_to_string(p.name_variants, ' '))) ILIKE ('%' || lower(unaccent(v_clean_last)) || '%')
        )
        AND (
            v_clean_first IS NULL 
            OR lower(unaccent(p.first_names)) ILIKE ('%' || lower(unaccent(v_clean_first)) || '%')
        )
        AND (
            p_birth_year IS NULL 
            OR p.birth_year = p_birth_year
        )
        AND (
            p_death_year IS NULL 
            OR p.death_year = p_death_year
        )
    ORDER BY similarity_score DESC, p.last_name ASC, p.first_names ASC
    LIMIT LEAST(p_limit, 100)
    OFFSET GREATEST(p_offset, 0);
END;
$$ LANGUAGE plpgsql STABLE SECURITY INVOKER;

-- 2. POTENTIAL DUPLICATES DETECTION FUNCTION (ADMIN / CONTRIBUTOR ADVISORY)
-- Detects duplicates using name similarity (Levenshtein/trigram) + compatible dates
CREATE OR REPLACE FUNCTION public.find_potential_duplicates(
    p_first_names TEXT,
    p_last_name TEXT,
    p_birth_year INTEGER DEFAULT NULL,
    p_death_year INTEGER DEFAULT NULL,
    p_exclude_id UUID DEFAULT NULL
)
RETURNS TABLE (
    candidate_id UUID,
    first_names TEXT,
    last_name TEXT,
    birth_year INTEGER,
    death_year INTEGER,
    confidence_score INTEGER,
    reasons TEXT[]
) AS $$
DECLARE
    v_norm_first TEXT := lower(unaccent(TRIM(p_first_names)));
    v_norm_last TEXT := lower(unaccent(TRIM(p_last_name)));
BEGIN
    RETURN QUERY
    WITH scored_candidates AS (
        SELECT 
            p.id AS c_id,
            p.first_names AS c_first,
            p.last_name AS c_last,
            p.birth_year AS c_byear,
            p.death_year AS c_dyear,
            similarity(lower(unaccent(p.last_name)), v_norm_last) AS last_sim,
            similarity(lower(unaccent(p.first_names)), v_norm_first) AS first_sim,
            p.birth_year,
            p.death_year
        FROM public.persons p
        WHERE p.archived_at IS NULL
          AND (p_exclude_id IS NULL OR p.id <> p_exclude_id)
          AND (
              lower(unaccent(p.last_name)) % v_norm_last
              OR lower(unaccent(p.first_names)) % v_norm_first
              OR p.last_name ILIKE ('%' || TRIM(p_last_name) || '%')
          )
    )
    SELECT 
        sc.c_id,
        sc.c_first,
        sc.c_last,
        sc.c_byear,
        sc.c_dyear,
        ROUND((
            (sc.last_sim * 45) +
            (sc.first_sim * 35) +
            (CASE 
                WHEN p_birth_year IS NOT NULL AND sc.c_byear IS NOT NULL AND abs(p_birth_year - sc.c_byear) <= 1 THEN 20
                WHEN p_birth_year IS NOT NULL AND sc.c_byear IS NOT NULL AND abs(p_birth_year - sc.c_byear) <= 3 THEN 10
                ELSE 0 
            END)
        ))::INTEGER AS confidence_score,
        ARRAY_REMOVE(ARRAY[
            CASE WHEN sc.last_sim > 0.8 THEN 'Nom identique ou très similaire' ELSE NULL END,
            CASE WHEN sc.first_sim > 0.8 THEN 'Prénom identique ou très similaire' ELSE NULL END,
            CASE WHEN p_birth_year IS NOT NULL AND sc.c_byear = p_birth_year THEN 'Même année de naissance (' || p_birth_year || ')' ELSE NULL END,
            CASE WHEN p_death_year IS NOT NULL AND sc.c_dyear = p_death_year THEN 'Même année de décès (' || p_death_year || ')' ELSE NULL END
        ], NULL) AS reasons
    FROM scored_candidates sc
    WHERE (sc.last_sim > 0.4 AND sc.first_sim > 0.4)
    ORDER BY confidence_score DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
