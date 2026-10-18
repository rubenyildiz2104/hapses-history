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
