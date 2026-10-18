-- ============================================================================
-- Migration 000006: Storage Configuration & Media Assets
-- Configures Supabase Storage bucket 'archives' for photos, scans, and documents
-- Adds portrait_url to persons and document_image_url to sources
-- ============================================================================

-- 1. ADD COLUMNS FOR MEDIA ASSETS
ALTER TABLE public.persons 
    ADD COLUMN IF NOT EXISTS portrait_url TEXT;

ALTER TABLE public.sources 
    ADD COLUMN IF NOT EXISTS document_image_url TEXT;

-- 2. CREATE STORAGE BUCKET 'archives'
-- Public read access for fast image delivery, up to 10MB per file
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'archives',
    'archives',
    true,
    10485760, -- 10 MB
    ARRAY[
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/avif',
        'application/pdf'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY[
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/avif',
        'application/pdf'
    ];

-- 3. STORAGE RLS POLICIES
-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy 1: Public read access to all files in 'archives' bucket
DROP POLICY IF EXISTS "Public can view archives" ON storage.objects;
CREATE POLICY "Public can view archives"
ON storage.objects FOR SELECT
USING (bucket_id = 'archives');

-- Policy 2: Authenticated users can upload to 'archives'
DROP POLICY IF EXISTS "Authenticated users can upload archives" ON storage.objects;
CREATE POLICY "Authenticated users can upload archives"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'archives'
);

-- Policy 3: Admins can update any file in 'archives'
DROP POLICY IF EXISTS "Admins can update archives" ON storage.objects;
CREATE POLICY "Admins can update archives"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'archives' AND (
        public.is_admin(auth.uid()) OR auth.uid() = owner
    )
);

-- Policy 4: Admins can delete files from 'archives'
DROP POLICY IF EXISTS "Admins can delete archives" ON storage.objects;
CREATE POLICY "Admins can delete archives"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'archives' AND (
        public.is_admin(auth.uid()) OR auth.uid() = owner
    )
);
