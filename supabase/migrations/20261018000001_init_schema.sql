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
CREATE INDEX IF NOT EXISTS idx_persons_trgm_search ON public.persons USING gin (
    (lower(unaccent(last_name || ' ' || first_names))) gin_trgm_ops
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
