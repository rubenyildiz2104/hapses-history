-- ============================================================================
-- Migration 000001: Initial Schema for Collaborative Village Genealogy & History
-- Compliant with Specifications v1.0
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. ENUM TYPES
DO $$ BEGIN
    CREATE TYPE date_precision AS ENUM (
        'exact',
        'year_only',
        'month_year',
        'approximate',
        'before',
        'after',
        'unknown'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE life_status AS ENUM (
        'living',
        'deceased',
        'unknown'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE visibility_status AS ENUM (
        'public',
        'private'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE relationship_type AS ENUM (
        'parent_child',
        'spouse'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE proposal_type AS ENUM (
        'add_person',
        'update_person',
        'add_relationship',
        'update_relationship'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE proposal_status AS ENUM (
        'pending',
        'accepted',
        'rejected',
        'needs_information'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM (
        'user',
        'admin'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 3. PROFILES TABLE
-- Mirrors auth.users with application role and public display info
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL CHECK (char_length(trim(display_name)) >= 2),
    role user_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Trigger to maintain updated_at on profiles
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Prevent non-admins from upgrading their role or changing roles directly
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.role IS DISTINCT FROM OLD.role) THEN
        -- Only service_role or existing admin can update role
        IF current_user != 'service_role' AND NOT (
            SELECT (p.role = 'admin') 
            FROM public.profiles p 
            WHERE p.id = auth.uid()
        ) THEN
            RAISE EXCEPTION 'Interdiction de modifier les droits et rôles utilisateur.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_protect_profile_role
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_profile_role();

-- Auto-create profile on auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
    raw_name TEXT;
BEGIN
    raw_name := COALESCE(
        NEW.raw_user_meta_data->>'display_name',
        split_part(NEW.email, '@', 1),
        'Contributeur'
    );
    
    INSERT INTO public.profiles (id, display_name, role)
    VALUES (NEW.id, raw_name, 'user')
    ON CONFLICT (id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_auth_user();

-- 4. PERSONS TABLE
CREATE TABLE IF NOT EXISTS public.persons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_names TEXT NOT NULL CHECK (char_length(trim(first_names)) > 0),
    last_name TEXT NOT NULL CHECK (char_length(trim(last_name)) > 0),
    name_variants TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    gender TEXT CHECK (gender IS NULL OR gender IN ('M', 'F', 'other', 'unknown')),
    
    -- Birth data
    birth_date DATE,
    birth_date_precision date_precision NOT NULL DEFAULT 'unknown',
    birth_year INTEGER CHECK (birth_year IS NULL OR (birth_year >= 800 AND birth_year <= 2100)),
    birth_place TEXT,
    
    -- Death data
    death_date DATE,
    death_date_precision date_precision NOT NULL DEFAULT 'unknown',
    death_year INTEGER CHECK (death_year IS NULL OR (death_year >= 800 AND death_year <= 2100)),
    death_place TEXT,
    
    -- Status & Visibility (Default = private, living or unknown)
    life_status life_status NOT NULL DEFAULT 'unknown',
    visibility visibility_status NOT NULL DEFAULT 'private',
    
    -- Biographical details
    profession TEXT,
    biography TEXT,
    notes TEXT, -- Private genealogy/admin notes
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    archived_at TIMESTAMPTZ,
    
    -- Consistency constraints
    CONSTRAINT chk_living_no_death CHECK (
        (life_status = 'living' AND death_date IS NULL AND death_year IS NULL)
        OR (life_status IN ('deceased', 'unknown'))
    ),
    CONSTRAINT chk_death_implies_deceased CHECK (
        (death_date IS NULL AND death_year IS NULL)
        OR (life_status = 'deceased')
    ),
    CONSTRAINT chk_birth_death_years CHECK (
        birth_year IS NULL OR death_year IS NULL OR birth_year <= death_year
    ),
    CONSTRAINT chk_birth_death_dates CHECK (
        birth_date IS NULL OR death_date IS NULL OR birth_date <= death_date
    )
);

CREATE TRIGGER trg_persons_updated_at
    BEFORE UPDATE ON public.persons
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Search indexes
CREATE INDEX IF NOT EXISTS idx_persons_last_name ON public.persons (last_name);
CREATE INDEX IF NOT EXISTS idx_persons_first_names ON public.persons (first_names);
CREATE INDEX IF NOT EXISTS idx_persons_visibility_life ON public.persons (visibility, life_status, archived_at);
CREATE INDEX IF NOT EXISTS idx_persons_birth_year ON public.persons (birth_year);
CREATE INDEX IF NOT EXISTS idx_persons_death_year ON public.persons (death_year);

-- Immutable unaccent wrapper function for GIN indexing
CREATE OR REPLACE FUNCTION public.immutable_unaccent(text)
RETURNS text AS $$
    SELECT public.unaccent('unaccent', $1);
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT;

CREATE INDEX IF NOT EXISTS idx_persons_trgm_search ON public.persons USING gin (
    (lower(public.immutable_unaccent(last_name || ' ' || first_names))) gin_trgm_ops
);

-- 5. RELATIONSHIPS TABLE
-- Explicit semantics:
-- If relationship_type = 'parent_child': person_a_id IS THE PARENT, person_b_id IS THE CHILD
-- If relationship_type = 'spouse': person_a_id AND person_b_id ARE SPOUSES
CREATE TABLE IF NOT EXISTS public.relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    relationship_type relationship_type NOT NULL,
    person_a_id UUID NOT NULL REFERENCES public.persons(id) ON DELETE RESTRICT,
    person_b_id UUID NOT NULL REFERENCES public.persons(id) ON DELETE RESTRICT,
    
    -- Union dates / places
    start_date DATE,
    start_date_precision date_precision NOT NULL DEFAULT 'unknown',
    start_year INTEGER CHECK (start_year IS NULL OR (start_year >= 800 AND start_year <= 2100)),
    start_place TEXT,
    
    end_date DATE,
    end_date_precision date_precision NOT NULL DEFAULT 'unknown',
    end_year INTEGER CHECK (end_year IS NULL OR (end_year >= 800 AND end_year <= 2100)),
    end_place TEXT,
    
    notes TEXT,
    
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    archived_at TIMESTAMPTZ,
    
    CONSTRAINT chk_not_self_relationship CHECK (person_a_id <> person_b_id)
);

CREATE TRIGGER trg_relationships_updated_at
    BEFORE UPDATE ON public.relationships
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Avoid duplicates:
-- For parent_child: unique (parent, child)
CREATE UNIQUE INDEX IF NOT EXISTS uq_parent_child ON public.relationships (person_a_id, person_b_id)
WHERE relationship_type = 'parent_child' AND archived_at IS NULL;

-- For spouse: unique symmetrical (least, greatest)
CREATE UNIQUE INDEX IF NOT EXISTS uq_spouse_symmetric ON public.relationships (
    LEAST(person_a_id, person_b_id),
    GREATEST(person_a_id, person_b_id)
)
WHERE relationship_type = 'spouse' AND archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_relationships_person_a ON public.relationships (person_a_id);
CREATE INDEX IF NOT EXISTS idx_relationships_person_b ON public.relationships (person_b_id);

-- Anti-Cycle Trigger on parent_child relationships
-- Verifies that person_b_id is not already an ancestor of person_a_id
CREATE OR REPLACE FUNCTION public.check_relationship_cycles()
RETURNS TRIGGER AS $$
DECLARE
    is_cycle BOOLEAN;
BEGIN
    IF NEW.relationship_type = 'parent_child' AND NEW.archived_at IS NULL THEN
        -- Person A is Parent, Person B is Child.
        -- Check if Person A is already reachable as a descendant of Person B:
        WITH RECURSIVE descendants AS (
            SELECT person_b_id AS child_id
            FROM public.relationships
            WHERE person_a_id = NEW.person_b_id
              AND relationship_type = 'parent_child'
              AND archived_at IS NULL
              AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
            UNION
            SELECT r.person_b_id
            FROM public.relationships r
            INNER JOIN descendants d ON r.person_a_id = d.child_id
            WHERE r.relationship_type = 'parent_child'
              AND r.archived_at IS NULL
              AND r.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
        )
        SELECT EXISTS (
            SELECT 1 FROM descendants WHERE child_id = NEW.person_a_id
        ) INTO is_cycle;

        IF is_cycle THEN
            RAISE EXCEPTION 'Incohérence généalogique détectée : boucle de filiation impossible (un ancêtre ne peut pas être son propre descendant).';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_relationship_cycles
    BEFORE INSERT OR UPDATE ON public.relationships
    FOR EACH ROW
    EXECUTE FUNCTION public.check_relationship_cycles();

-- 6. SOURCES TABLE
CREATE TABLE IF NOT EXISTS public.sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
    source_type TEXT NOT NULL, -- civil_registry, parish_register, census, communal_archives, oral_testimony, etc.
    author_or_organization TEXT,
    source_date TEXT,
    archive_reference TEXT,
    url TEXT,
    description TEXT,
    private_notes TEXT, -- Strictly private
    is_public BOOLEAN NOT NULL DEFAULT FALSE, -- Default is FALSE as required by specification
    rights_status TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TRIGGER trg_sources_updated_at
    BEFORE UPDATE ON public.sources
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_sources_is_public ON public.sources (is_public);

-- 7. PERSON_SOURCES JUNCTION TABLE
CREATE TABLE IF NOT EXISTS public.person_sources (
    person_id UUID NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
    source_id UUID NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (person_id, source_id)
);

CREATE INDEX IF NOT EXISTS idx_person_sources_source ON public.person_sources (source_id);

-- 8. PROPOSALS TABLE
CREATE TABLE IF NOT EXISTS public.proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submitted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    proposal_type proposal_type NOT NULL,
    target_person_id UUID REFERENCES public.persons(id) ON DELETE SET NULL,
    target_relationship_id UUID REFERENCES public.relationships(id) ON DELETE SET NULL,
    payload JSONB NOT NULL,
    sources_info JSONB, -- references or sources attached to the proposal
    status proposal_status NOT NULL DEFAULT 'pending',
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TRIGGER trg_proposals_updated_at
    BEFORE UPDATE ON public.proposals
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_proposals_submitted_by ON public.proposals (submitted_by);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON public.proposals (status);
CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON public.proposals (created_at DESC);

-- 9. HISTORICAL ARTICLES TABLE
CREATE TABLE IF NOT EXISTS public.historical_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_type TEXT NOT NULL CHECK (article_type IN ('village_history', 'family')),
    title TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
    slug TEXT NOT NULL UNIQUE CHECK (char_length(trim(slug)) > 0),
    summary TEXT,
    content TEXT NOT NULL,
    
    -- Historical timeframe
    period_start INTEGER CHECK (period_start IS NULL OR (period_start >= 500 AND period_start <= 2100)),
    period_end INTEGER CHECK (period_end IS NULL OR (period_end >= 500 AND period_end <= 2100)),
    period_description TEXT,
    
    -- Optional family link
    family_name TEXT,
    
    -- Publication status
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    
    featured_image_url TEXT,
    featured_image_credit TEXT,
    
    author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    
    CONSTRAINT chk_period_order CHECK (
        period_start IS NULL OR period_end IS NULL OR period_start <= period_end
    )
);

CREATE TRIGGER trg_historical_articles_updated_at
    BEFORE UPDATE ON public.historical_articles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_historical_articles_slug ON public.historical_articles (slug);
CREATE INDEX IF NOT EXISTS idx_historical_articles_status_type ON public.historical_articles (status, article_type);
CREATE INDEX IF NOT EXISTS idx_historical_articles_family ON public.historical_articles (lower(family_name)) WHERE family_name IS NOT NULL;

-- 10. HISTORICAL ARTICLE PERSON LINKS
CREATE TABLE IF NOT EXISTS public.historical_article_links (
    article_id UUID NOT NULL REFERENCES public.historical_articles(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
    context TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (article_id, person_id)
);

CREATE INDEX IF NOT EXISTS idx_historical_links_person ON public.historical_article_links (person_id);

-- 11. HISTORICAL ARTICLE SOURCES
CREATE TABLE IF NOT EXISTS public.historical_article_sources (
    article_id UUID NOT NULL REFERENCES public.historical_articles(id) ON DELETE CASCADE,
    source_id UUID NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
    citation_details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (article_id, source_id)
);

CREATE INDEX IF NOT EXISTS idx_historical_sources_source ON public.historical_article_sources (source_id);

-- 12. AUDIT LOGS TABLE
-- Immutable journal of sensitive operations
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs (entity_type, entity_id);
-- ============================================================================
-- Migration 000002: Row Level Security (RLS) & Privacy Enforcement Policies
-- Compliant with Specifications v1.0 (Sections 6, 12, 14)
-- ============================================================================

-- 1. SECURITY HELPER FUNCTIONS
-- Check if current authenticated user is an administrator
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    IF p_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    RETURN EXISTS (
        SELECT 1 
        FROM public.profiles 
        WHERE id = p_user_id AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if a person is publicly viewable
-- Requirement 6.2 & 14.2: Only deceased + public + not archived can be viewed publicly
CREATE OR REPLACE FUNCTION public.is_person_public(p_person_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.persons 
        WHERE id = p_person_id 
          AND archived_at IS NULL 
          AND life_status = 'deceased' 
          AND visibility = 'public'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. ENABLE ROW LEVEL SECURITY ON ALL TABLES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.person_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historical_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historical_article_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historical_article_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 3. PROFILES POLICIES
-- Anyone authenticated can read their own profile; admins can read all
CREATE POLICY "profiles_select_own_or_admin"
    ON public.profiles FOR SELECT
    USING (
        id = auth.uid() 
        OR public.is_admin(auth.uid())
    );

-- Users can update only their own profile (display_name only; role guarded by trigger)
CREATE POLICY "profiles_update_own"
    ON public.profiles FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Insert handled via auth trigger or admin
CREATE POLICY "profiles_insert_admin"
    ON public.profiles FOR INSERT
    WITH CHECK (public.is_admin(auth.uid()));

-- 4. PERSONS POLICIES
-- SELECT:
-- - Public / Authenticated: ONLY deceased + visibility=public + non-archived
-- - Admin: full access to all records
CREATE POLICY "persons_select_public_or_admin"
    ON public.persons FOR SELECT
    USING (
        (archived_at IS NULL AND life_status = 'deceased' AND visibility = 'public')
        OR public.is_admin(auth.uid())
    );

-- INSERT: Admins only
CREATE POLICY "persons_insert_admin_only"
    ON public.persons FOR INSERT
    WITH CHECK (public.is_admin(auth.uid()));

-- UPDATE: Admins only
CREATE POLICY "persons_update_admin_only"
    ON public.persons FOR UPDATE
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- DELETE: Admins only
CREATE POLICY "persons_delete_admin_only"
    ON public.persons FOR DELETE
    USING (public.is_admin(auth.uid()));

-- 5. RELATIONSHIPS POLICIES
-- SELECT:
-- - Public: Non-archived AND BOTH related individuals must be publicly viewable!
-- - Admin: full access
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

-- INSERT: Admins only (contributions go through proposals)
CREATE POLICY "relationships_insert_admin_only"
    ON public.relationships FOR INSERT
    WITH CHECK (public.is_admin(auth.uid()));

-- UPDATE: Admins only
CREATE POLICY "relationships_update_admin_only"
    ON public.relationships FOR UPDATE
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- DELETE: Admins only
CREATE POLICY "relationships_delete_admin_only"
    ON public.relationships FOR DELETE
    USING (public.is_admin(auth.uid()));

-- 6. SOURCES POLICIES
-- SELECT:
-- - Public/User: only sources with is_public = true
-- - Admin: all sources
CREATE POLICY "sources_select_public_or_admin"
    ON public.sources FOR SELECT
    USING (
        is_public = TRUE 
        OR public.is_admin(auth.uid())
    );

-- INSERT: Admins only
CREATE POLICY "sources_insert_admin_only"
    ON public.sources FOR INSERT
    WITH CHECK (public.is_admin(auth.uid()));

-- UPDATE: Admins only
CREATE POLICY "sources_update_admin_only"
    ON public.sources FOR UPDATE
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- DELETE: Admins only
CREATE POLICY "sources_delete_admin_only"
    ON public.sources FOR DELETE
    USING (public.is_admin(auth.uid()));

-- 7. PERSON_SOURCES POLICIES
-- SELECT: Public can see link only if BOTH person is public AND source is public
CREATE POLICY "person_sources_select_public_or_admin"
    ON public.person_sources FOR SELECT
    USING (
        (
            public.is_person_public(person_id)
            AND EXISTS (SELECT 1 FROM public.sources s WHERE s.id = source_id AND s.is_public = TRUE)
        )
        OR public.is_admin(auth.uid())
    );

CREATE POLICY "person_sources_insert_admin_only"
    ON public.person_sources FOR INSERT
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "person_sources_delete_admin_only"
    ON public.person_sources FOR DELETE
    USING (public.is_admin(auth.uid()));

-- 8. PROPOSALS POLICIES
-- SELECT: Author sees their own proposals; Admin sees all
CREATE POLICY "proposals_select_author_or_admin"
    ON public.proposals FOR SELECT
    USING (
        submitted_by = auth.uid()
        OR public.is_admin(auth.uid())
    );

-- INSERT: Authenticated users can insert their own proposal in 'pending' status only
CREATE POLICY "proposals_insert_user"
    ON public.proposals FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND submitted_by = auth.uid()
        AND status = 'pending'
        AND reviewed_by IS NULL
        AND reviewed_at IS NULL
    );

-- UPDATE: ONLY Admins can review / update proposal status
CREATE POLICY "proposals_update_admin_only"
    ON public.proposals FOR UPDATE
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- DELETE: Admins only
CREATE POLICY "proposals_delete_admin_only"
    ON public.proposals FOR DELETE
    USING (public.is_admin(auth.uid()));

-- 9. HISTORICAL ARTICLES POLICIES
-- SELECT: Public sees only published articles; Admin sees drafts, published, archived
CREATE POLICY "articles_select_published_or_admin"
    ON public.historical_articles FOR SELECT
    USING (
        status = 'published'
        OR public.is_admin(auth.uid())
    );

-- INSERT / UPDATE / DELETE: Admins only
CREATE POLICY "articles_insert_admin_only"
    ON public.historical_articles FOR INSERT
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "articles_update_admin_only"
    ON public.historical_articles FOR UPDATE
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "articles_delete_admin_only"
    ON public.historical_articles FOR DELETE
    USING (public.is_admin(auth.uid()));

-- 10. HISTORICAL ARTICLE LINKS POLICIES
-- SELECT: Public can see link only if article is published AND person is public
CREATE POLICY "article_links_select_published_and_public"
    ON public.historical_article_links FOR SELECT
    USING (
        (
            public.is_person_public(person_id)
            AND EXISTS (
                SELECT 1 FROM public.historical_articles a 
                WHERE a.id = article_id AND a.status = 'published'
            )
        )
        OR public.is_admin(auth.uid())
    );

CREATE POLICY "article_links_manage_admin_only"
    ON public.historical_article_links FOR ALL
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- 11. HISTORICAL ARTICLE SOURCES POLICIES
-- SELECT: Public can see citation only if article is published AND source is public
CREATE POLICY "article_sources_select_published_and_public"
    ON public.historical_article_sources FOR SELECT
    USING (
        (
            EXISTS (
                SELECT 1 FROM public.historical_articles a 
                WHERE a.id = article_id AND a.status = 'published'
            )
            AND EXISTS (
                SELECT 1 FROM public.sources s 
                WHERE s.id = source_id AND s.is_public = TRUE
            )
        )
        OR public.is_admin(auth.uid())
    );

CREATE POLICY "article_sources_manage_admin_only"
    ON public.historical_article_sources FOR ALL
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- 12. AUDIT LOGS POLICIES
-- Read-only by Admin; Insertable by Admin / System RPC; NEVER updateable or deletable
CREATE POLICY "audit_logs_select_admin_only"
    ON public.audit_logs FOR SELECT
    USING (public.is_admin(auth.uid()));

CREATE POLICY "audit_logs_insert_admin_or_system"
    ON public.audit_logs FOR INSERT
    WITH CHECK (public.is_admin(auth.uid()) OR auth.uid() IS NULL);

-- Deny all updates and deletes on audit_logs
CREATE POLICY "audit_logs_deny_update"
    ON public.audit_logs FOR UPDATE
    USING (FALSE);

CREATE POLICY "audit_logs_deny_delete"
    ON public.audit_logs FOR DELETE
    USING (FALSE);

-- 13. SECURE PUBLIC VIEWS
-- For sources, prevent exposure of private_notes to non-admins
CREATE OR REPLACE VIEW public.public_sources AS
SELECT 
    id,
    title,
    source_type,
    author_or_organization,
    source_date,
    archive_reference,
    url,
    description,
    rights_status,
    created_at
FROM public.sources
WHERE is_public = TRUE;

-- 14. EXPLICIT GRANTS FOR SUPABASE POSTGREST ROLES (anon, authenticated)
-- Note: Row Level Security (RLS) filters the rows, but GRANTs are required for PostgREST schema cache
GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON TABLE public.profiles TO anon, authenticated;
GRANT UPDATE (display_name) ON TABLE public.profiles TO authenticated;

GRANT SELECT ON TABLE public.persons TO anon, authenticated;
GRANT SELECT ON TABLE public.relationships TO anon, authenticated;
GRANT SELECT ON TABLE public.sources TO anon, authenticated;
GRANT SELECT ON TABLE public.public_sources TO anon, authenticated;
GRANT SELECT ON TABLE public.person_sources TO anon, authenticated;

GRANT SELECT, INSERT ON TABLE public.proposals TO authenticated;
GRANT SELECT ON TABLE public.historical_articles TO anon, authenticated;
GRANT SELECT ON TABLE public.historical_article_links TO anon, authenticated;
GRANT SELECT ON TABLE public.historical_article_sources TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.is_admin TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_person_public TO anon, authenticated;
-- ============================================================================
-- Migration 000003: Transactional Proposal Moderation & Verification RPC
-- Compliant with Specifications v1.0 (Sections 7, 14.5)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.review_proposal_transaction(
    p_proposal_id UUID,
    p_decision TEXT, -- 'accept', 'reject', 'needs_information'
    p_comment TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_admin_id UUID := auth.uid();
    v_proposal RECORD;
    v_new_person_id UUID;
    v_new_rel_id UUID;
    v_target_person_id UUID;
    v_target_rel_id UUID;
    v_payload JSONB;
    v_res JSONB;
BEGIN
    -- 1. Security Check: Admin role required
    IF NOT public.is_admin(v_admin_id) THEN
        RAISE EXCEPTION 'Accès refusé : seuls les administrateurs peuvent modérer les propositions.';
    END IF;

    -- 2. Validate decision argument
    IF p_decision NOT IN ('accept', 'reject', 'needs_information') THEN
        RAISE EXCEPTION 'Décision invalide : % (valeurs admises: accept, reject, needs_information)', p_decision;
    END IF;

    -- 3. Lock Proposal row to prevent concurrent moderation
    SELECT * INTO v_proposal
    FROM public.proposals
    WHERE id = p_proposal_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Proposition introuvable (ID: %)', p_proposal_id;
    END IF;

    IF v_proposal.status IN ('accepted', 'rejected') THEN
        RAISE EXCEPTION 'Cette proposition a déjà été traitée avec le statut : %', v_proposal.status;
    END IF;

    v_payload := v_proposal.payload;

    -- 4. Process Rejection
    IF p_decision = 'reject' THEN
        UPDATE public.proposals
        SET status = 'rejected',
            reviewed_by = v_admin_id,
            reviewed_at = timezone('utc'::text, now()),
            review_comment = p_comment,
            updated_at = timezone('utc'::text, now())
        WHERE id = p_proposal_id;

        INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, details)
        VALUES (
            v_admin_id,
            'reject_proposal',
            'proposal',
            p_proposal_id,
            jsonb_build_object(
                'proposal_type', v_proposal.proposal_type,
                'submitted_by', v_proposal.submitted_by,
                'comment', p_comment
            )
        );

        RETURN jsonb_build_object(
            'success', TRUE,
            'status', 'rejected',
            'proposal_id', p_proposal_id
        );
    END IF;

    -- 5. Process Request for Additional Information
    IF p_decision = 'needs_information' THEN
        UPDATE public.proposals
        SET status = 'needs_information',
            reviewed_by = v_admin_id,
            reviewed_at = timezone('utc'::text, now()),
            review_comment = p_comment,
            updated_at = timezone('utc'::text, now())
        WHERE id = p_proposal_id;

        INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, details)
        VALUES (
            v_admin_id,
            'request_info_proposal',
            'proposal',
            p_proposal_id,
            jsonb_build_object(
                'proposal_type', v_proposal.proposal_type,
                'submitted_by', v_proposal.submitted_by,
                'comment', p_comment
            )
        );

        RETURN jsonb_build_object(
            'success', TRUE,
            'status', 'needs_information',
            'proposal_id', p_proposal_id
        );
    END IF;

    -- 6. Process Acceptance (Atomically applying official changes)
    IF p_decision = 'accept' THEN
        CASE v_proposal.proposal_type

            -- 6.1 Add New Person
            WHEN 'add_person' THEN
                INSERT INTO public.persons (
                    first_names,
                    last_name,
                    name_variants,
                    gender,
                    birth_date,
                    birth_date_precision,
                    birth_year,
                    birth_place,
                    death_date,
                    death_date_precision,
                    death_year,
                    death_place,
                    life_status,
                    visibility,
                    profession,
                    biography,
                    notes,
                    created_by
                ) VALUES (
                    TRIM((v_payload->>'first_names')::TEXT),
                    TRIM((v_payload->>'last_name')::TEXT),
                    COALESCE(ARRAY(SELECT jsonb_array_elements_text(v_payload->'name_variants')), '{}'::TEXT[]),
                    v_payload->>'gender',
                    (v_payload->>'birth_date')::DATE,
                    COALESCE((v_payload->>'birth_date_precision')::date_precision, 'unknown'),
                    (v_payload->>'birth_year')::INTEGER,
                    v_payload->>'birth_place',
                    (v_payload->>'death_date')::DATE,
                    COALESCE((v_payload->>'death_date_precision')::date_precision, 'unknown'),
                    (v_payload->>'death_year')::INTEGER,
                    v_payload->>'death_place',
                    COALESCE((v_payload->>'life_status')::life_status, 'unknown'),
                    COALESCE((v_payload->>'visibility')::visibility_status, 'private'),
                    v_payload->>'profession',
                    v_payload->>'biography',
                    v_payload->>'notes',
                    v_proposal.submitted_by
                )
                RETURNING id INTO v_new_person_id;

                -- Update proposal with target and accepted status
                UPDATE public.proposals
                SET status = 'accepted',
                    target_person_id = v_new_person_id,
                    reviewed_by = v_admin_id,
                    reviewed_at = timezone('utc'::text, now()),
                    review_comment = p_comment,
                    updated_at = timezone('utc'::text, now())
                WHERE id = p_proposal_id;

                INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, details)
                VALUES (
                    v_admin_id,
                    'accept_add_person',
                    'person',
                    v_new_person_id,
                    jsonb_build_object(
                        'proposal_id', p_proposal_id,
                        'submitted_by', v_proposal.submitted_by,
                        'name', (v_payload->>'first_names') || ' ' || (v_payload->>'last_name')
                    )
                );

                v_res := jsonb_build_object(
                    'success', TRUE,
                    'status', 'accepted',
                    'proposal_id', p_proposal_id,
                    'target_person_id', v_new_person_id
                );

            -- 6.2 Update Existing Person
            WHEN 'update_person' THEN
                v_target_person_id := v_proposal.target_person_id;
                IF v_target_person_id IS NULL THEN
                    RAISE EXCEPTION 'Impossible d''accepter : target_person_id manquant pour une mise à jour de personne.';
                END IF;

                UPDATE public.persons
                SET first_names = COALESCE(NULLIF(TRIM(v_payload->>'first_names'), ''), first_names),
                    last_name = COALESCE(NULLIF(TRIM(v_payload->>'last_name'), ''), last_name),
                    name_variants = CASE 
                        WHEN v_payload ? 'name_variants' THEN ARRAY(SELECT jsonb_array_elements_text(v_payload->'name_variants'))
                        ELSE name_variants
                    END,
                    gender = COALESCE(v_payload->>'gender', gender),
                    birth_date = CASE WHEN v_payload ? 'birth_date' THEN (v_payload->>'birth_date')::DATE ELSE birth_date END,
                    birth_date_precision = CASE WHEN v_payload ? 'birth_date_precision' THEN (v_payload->>'birth_date_precision')::date_precision ELSE birth_date_precision END,
                    birth_year = CASE WHEN v_payload ? 'birth_year' THEN (v_payload->>'birth_year')::INTEGER ELSE birth_year END,
                    birth_place = CASE WHEN v_payload ? 'birth_place' THEN v_payload->>'birth_place' ELSE birth_place END,
                    death_date = CASE WHEN v_payload ? 'death_date' THEN (v_payload->>'death_date')::DATE ELSE death_date END,
                    death_date_precision = CASE WHEN v_payload ? 'death_date_precision' THEN (v_payload->>'death_date_precision')::date_precision ELSE death_date_precision END,
                    death_year = CASE WHEN v_payload ? 'death_year' THEN (v_payload->>'death_year')::INTEGER ELSE death_year END,
                    death_place = CASE WHEN v_payload ? 'death_place' THEN v_payload->>'death_place' ELSE death_place END,
                    life_status = CASE WHEN v_payload ? 'life_status' THEN (v_payload->>'life_status')::life_status ELSE life_status END,
                    visibility = CASE WHEN v_payload ? 'visibility' THEN (v_payload->>'visibility')::visibility_status ELSE visibility END,
                    profession = CASE WHEN v_payload ? 'profession' THEN v_payload->>'profession' ELSE profession END,
                    biography = CASE WHEN v_payload ? 'biography' THEN v_payload->>'biography' ELSE biography END,
                    notes = CASE WHEN v_payload ? 'notes' THEN v_payload->>'notes' ELSE notes END
                WHERE id = v_target_person_id;

                UPDATE public.proposals
                SET status = 'accepted',
                    reviewed_by = v_admin_id,
                    reviewed_at = timezone('utc'::text, now()),
                    review_comment = p_comment,
                    updated_at = timezone('utc'::text, now())
                WHERE id = p_proposal_id;

                INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, details)
                VALUES (
                    v_admin_id,
                    'accept_update_person',
                    'person',
                    v_target_person_id,
                    jsonb_build_object(
                        'proposal_id', p_proposal_id,
                        'submitted_by', v_proposal.submitted_by
                    )
                );

                v_res := jsonb_build_object(
                    'success', TRUE,
                    'status', 'accepted',
                    'proposal_id', p_proposal_id,
                    'target_person_id', v_target_person_id
                );

            -- 6.3 Add New Relationship
            WHEN 'add_relationship' THEN
                INSERT INTO public.relationships (
                    relationship_type,
                    person_a_id,
                    person_b_id,
                    start_date,
                    start_date_precision,
                    start_year,
                    start_place,
                    end_date,
                    end_date_precision,
                    end_year,
                    end_place,
                    notes,
                    created_by
                ) VALUES (
                    (v_payload->>'relationship_type')::relationship_type,
                    (v_payload->>'person_a_id')::UUID,
                    (v_payload->>'person_b_id')::UUID,
                    (v_payload->>'start_date')::DATE,
                    COALESCE((v_payload->>'start_date_precision')::date_precision, 'unknown'),
                    (v_payload->>'start_year')::INTEGER,
                    v_payload->>'start_place',
                    (v_payload->>'end_date')::DATE,
                    COALESCE((v_payload->>'end_date_precision')::date_precision, 'unknown'),
                    (v_payload->>'end_year')::INTEGER,
                    v_payload->>'end_place',
                    v_payload->>'notes',
                    v_proposal.submitted_by
                )
                RETURNING id INTO v_new_rel_id;

                UPDATE public.proposals
                SET status = 'accepted',
                    target_relationship_id = v_new_rel_id,
                    reviewed_by = v_admin_id,
                    reviewed_at = timezone('utc'::text, now()),
                    review_comment = p_comment,
                    updated_at = timezone('utc'::text, now())
                WHERE id = p_proposal_id;

                INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, details)
                VALUES (
                    v_admin_id,
                    'accept_add_relationship',
                    'relationship',
                    v_new_rel_id,
                    jsonb_build_object(
                        'proposal_id', p_proposal_id,
                        'relationship_type', v_payload->>'relationship_type',
                        'person_a_id', v_payload->>'person_a_id',
                        'person_b_id', v_payload->>'person_b_id'
                    )
                );

                v_res := jsonb_build_object(
                    'success', TRUE,
                    'status', 'accepted',
                    'proposal_id', p_proposal_id,
                    'target_relationship_id', v_new_rel_id
                );

            -- 6.4 Update Relationship
            WHEN 'update_relationship' THEN
                v_target_rel_id := v_proposal.target_relationship_id;
                IF v_target_rel_id IS NULL THEN
                    RAISE EXCEPTION 'Impossible d''accepter : target_relationship_id manquant.';
                END IF;

                UPDATE public.relationships
                SET start_date = CASE WHEN v_payload ? 'start_date' THEN (v_payload->>'start_date')::DATE ELSE start_date END,
                    start_date_precision = CASE WHEN v_payload ? 'start_date_precision' THEN (v_payload->>'start_date_precision')::date_precision ELSE start_date_precision END,
                    start_year = CASE WHEN v_payload ? 'start_year' THEN (v_payload->>'start_year')::INTEGER ELSE start_year END,
                    start_place = CASE WHEN v_payload ? 'start_place' THEN v_payload->>'start_place' ELSE start_place END,
                    end_date = CASE WHEN v_payload ? 'end_date' THEN (v_payload->>'end_date')::DATE ELSE end_date END,
                    end_date_precision = CASE WHEN v_payload ? 'end_date_precision' THEN (v_payload->>'end_date_precision')::date_precision ELSE end_date_precision END,
                    end_year = CASE WHEN v_payload ? 'end_year' THEN (v_payload->>'end_year')::INTEGER ELSE end_year END,
                    end_place = CASE WHEN v_payload ? 'end_place' THEN v_payload->>'end_place' ELSE end_place END,
                    notes = CASE WHEN v_payload ? 'notes' THEN v_payload->>'notes' ELSE notes END
                WHERE id = v_target_rel_id;

                UPDATE public.proposals
                SET status = 'accepted',
                    reviewed_by = v_admin_id,
                    reviewed_at = timezone('utc'::text, now()),
                    review_comment = p_comment,
                    updated_at = timezone('utc'::text, now())
                WHERE id = p_proposal_id;

                INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, details)
                VALUES (
                    v_admin_id,
                    'accept_update_relationship',
                    'relationship',
                    v_target_rel_id,
                    jsonb_build_object(
                        'proposal_id', p_proposal_id
                    )
                );

                v_res := jsonb_build_object(
                    'success', TRUE,
                    'status', 'accepted',
                    'proposal_id', p_proposal_id,
                    'target_relationship_id', v_target_rel_id
                );

            ELSE
                RAISE EXCEPTION 'Type de proposition non supporté : %', v_proposal.proposal_type;
        END CASE;

        RETURN v_res;
    END IF;

    RAISE EXCEPTION 'Flux de modération inattendu.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.review_proposal_transaction TO authenticated;
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

GRANT EXECUTE ON FUNCTION public.search_public_persons TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_potential_duplicates TO authenticated;
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
