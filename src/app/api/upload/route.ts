import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'application/pdf',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const DEFAULT_SUPABASE_URL = 'https://octtjcjpsporndodwjmb.supabase.co';
const DEFAULT_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jdHRqY2pwc3Bvcm5kb2R3am1iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjMxOTAyMywiZXhwIjoyMTA3ODk1MDIzfQ.XSimS5EuSzkoUG9Red_UNUyShPAll8_lna8RMeuTbWI';

function cleanEnv(val: string | undefined, fallback: string): string {
  if (!val) return fallback;
  const cleaned = val.trim().replace(/^["']|["']$/g, '');
  return cleaned || fallback;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user from session cookies
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Vous devez être connecté pour téléverser des documents.' },
        { status: 401 }
      );
    }

    // 2. Extract form data
    const formData = await req.formData();
    const file = formData.get('file');
    const folder = (formData.get('folder') as string) || 'general';

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'Aucun fichier valide fourni.' },
        { status: 400 }
      );
    }

    // 3. Validate size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Le fichier dépasse la taille maximale autorisée (10 Mo).' },
        { status: 400 }
      );
    }

    // 4. Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            'Format de fichier non supporté. Formats acceptés : JPG, PNG, WebP, AVIF, PDF.',
        },
        { status: 400 }
      );
    }

    // 5. Construct sanitized unique file path
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const cleanBaseName = file.name
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 30);
    const filePath = `${folder}/${Date.now()}-${cleanBaseName}.${ext}`;

    // 6. Convert to Buffer and upload directly to Supabase Storage API
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const supabaseUrl = cleanEnv(
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
      DEFAULT_SUPABASE_URL
    );
    const serviceKey = cleanEnv(
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      DEFAULT_SERVICE_ROLE_KEY
    );
    const uploadEndpoint = `${supabaseUrl}/storage/v1/object/archives/${filePath}`;

    const uploadRes = await fetch(uploadEndpoint, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': file.type || 'image/jpeg',
        'Cache-Control': 'max-age=31536000',
        'x-upsert': 'true',
      },
      body: buffer,
      // @ts-expect-error duplex option needed for Node.js undici streaming body
      duplex: 'half',
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error('Storage upload error:', uploadRes.status, errText);
      return NextResponse.json(
        { error: `Erreur lors de l’écriture du fichier (${uploadRes.status}).` },
        { status: 500 }
      );
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/archives/${filePath}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      path: filePath,
    });
  } catch (err: unknown) {
    console.error('API Upload error:', err);
    const message =
      err instanceof Error ? err.message : 'Erreur interne lors du téléversement.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
