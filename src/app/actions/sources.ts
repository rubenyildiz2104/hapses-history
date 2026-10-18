'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { SourceSchema } from '@/lib/validations/source';
import { revalidatePath } from 'next/cache';

export interface SourceActionResult {
  success: boolean;
  sourceId?: string;
  error?: string;
}

export async function upsertSourceAction(
  sourceId: string | null,
  rawInput: Record<string, unknown>
): Promise<SourceActionResult> {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Accès non autorisé : vous devez être connecté.' };
  }

  // Check admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return { success: false, error: 'Accès refusé : privilèges administrateur requis.' };
  }

  // Validate schema
  const validation = SourceSchema.safeParse(rawInput);
  if (!validation.success) {
    const errorMsg = validation.error.issues.map((i) => i.message).join('. ');
    return { success: false, error: errorMsg };
  }

  const {
    title,
    source_type,
    author_or_organization,
    source_date,
    archive_reference,
    url,
    description,
    private_notes,
    is_public,
    rights_status,
    linked_person_ids,
  } = validation.data;

  const adminClient = createAdminClient();
  let targetId = sourceId;

  if (sourceId) {
    // UPDATE
    const { error: updateError } = await adminClient
      .from('sources')
      .update({
        title,
        source_type,
        author_or_organization: author_or_organization || null,
        source_date: source_date || null,
        archive_reference: archive_reference || null,
        url: url || null,
        description: description || null,
        private_notes: private_notes || null,
        is_public,
        rights_status: rights_status || null,
      })
      .eq('id', sourceId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Log in audit_logs
    await adminClient.from('audit_logs').insert({
      actor_id: user.id,
      action: 'update_source',
      entity_type: 'source',
      entity_id: sourceId,
      details: { title, source_type, is_public, archive_reference },
    });
  } else {
    // INSERT
    const { data: newSource, error: insertError } = await adminClient
      .from('sources')
      .insert({
        title,
        source_type,
        author_or_organization: author_or_organization || null,
        source_date: source_date || null,
        archive_reference: archive_reference || null,
        url: url || null,
        description: description || null,
        private_notes: private_notes || null,
        is_public,
        rights_status: rights_status || null,
        created_by: user.id,
      })
      .select('id')
      .single();

    if (insertError || !newSource) {
      return { success: false, error: insertError?.message || 'Erreur lors de la création de la source.' };
    }

    targetId = newSource.id;

    // Log in audit_logs
    await adminClient.from('audit_logs').insert({
      actor_id: user.id,
      action: 'create_source',
      entity_type: 'source',
      entity_id: targetId,
      details: { title, source_type, is_public, archive_reference },
    });
  }

  if (targetId) {
    // Sync linked persons in person_sources
    await adminClient.from('person_sources').delete().eq('source_id', targetId);
    if (linked_person_ids && linked_person_ids.length > 0) {
      const linksToInsert = linked_person_ids.map((personId) => ({
        source_id: targetId,
        person_id: personId,
        description: 'Mention dans la source',
      }));
      await adminClient.from('person_sources').insert(linksToInsert);
    }
  }

  revalidatePath('/sources');
  revalidatePath('/admin/sources');
  revalidatePath('/genealogie');

  return { success: true, sourceId: targetId || undefined };
}

export async function deleteSourceAction(sourceId: string): Promise<SourceActionResult> {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Accès non autorisé.' };
  }

  // Check admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return { success: false, error: 'Accès refusé : privilèges administrateur requis.' };
  }

  const adminClient = createAdminClient();

  // Get source info before deleting for audit log
  const { data: source } = await adminClient
    .from('sources')
    .select('title, source_type')
    .eq('id', sourceId)
    .single();

  const { error: deleteError } = await adminClient
    .from('sources')
    .delete()
    .eq('id', sourceId);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  // Audit log
  await adminClient.from('audit_logs').insert({
    actor_id: user.id,
    action: 'delete_source',
    entity_type: 'source',
    entity_id: sourceId,
    details: { title: source?.title, source_type: source?.source_type },
  });

  revalidatePath('/sources');
  revalidatePath('/admin/sources');
  revalidatePath('/genealogie');

  return { success: true };
}
