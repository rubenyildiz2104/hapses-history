import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'application/pdf',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

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

    // 6. Convert to Buffer and upload via admin client
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: uploadError } = await adminSupabase.storage
      .from('archives')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '31536000',
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: uploadError.message || 'Erreur lors de l’écriture du fichier.' },
        { status: 500 }
      );
    }

    // 7. Get public CDN URL
    const { data: pubData } = adminSupabase.storage
      .from('archives')
      .getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      url: pubData.publicUrl,
      path: filePath,
    });
  } catch (err: unknown) {
    console.error('API Upload error:', err);
    const message =
      err instanceof Error ? err.message : 'Erreur interne lors du téléversement.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
