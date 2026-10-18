'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { HistoricalArticleSchema } from '@/lib/validations/article';
import { revalidatePath } from 'next/cache';

export interface ArticleActionResult {
  success: boolean;
  articleId?: string;
  error?: string;
}

export async function upsertArticleAction(
  articleId: string | null,
  rawInput: Record<string, unknown>
): Promise<ArticleActionResult> {
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
  const validation = HistoricalArticleSchema.safeParse(rawInput);
  if (!validation.success) {
    const errorMsg = validation.error.issues.map((i) => i.message).join('. ');
    return { success: false, error: errorMsg };
  }

  const {
    article_type,
    title,
    slug,
    summary,
    content,
    period_start,
    period_end,
    period_description,
    family_name,
    status,
    featured_image_url,
    featured_image_credit,
    linked_person_ids,
    linked_source_ids,
  } = validation.data;

  const adminClient = createAdminClient();

  let targetId = articleId;

  if (articleId) {
    // UPDATE
    const { error: updateError } = await adminClient
      .from('historical_articles')
      .update({
        article_type,
        title,
        slug,
        summary: summary || null,
        content,
        period_start: period_start || null,
        period_end: period_end || null,
        period_description: period_description || null,
        family_name: family_name || null,
        status,
        featured_image_url: featured_image_url || null,
        featured_image_credit: featured_image_credit || null,
        published_at: status === 'published' ? new Date().toISOString() : null,
      })
      .eq('id', articleId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Log in audit_logs
    await adminClient.from('audit_logs').insert({
      actor_id: user.id,
      action: 'update_article',
      entity_type: 'historical_article',
      entity_id: articleId,
      details: { title, slug, article_type, status },
    });
  } else {
    // INSERT
    const { data: newArticle, error: insertError } = await adminClient
      .from('historical_articles')
      .insert({
        article_type,
        title,
        slug,
        summary: summary || null,
        content,
        period_start: period_start || null,
        period_end: period_end || null,
        period_description: period_description || null,
        family_name: family_name || null,
        status,
        featured_image_url: featured_image_url || null,
        featured_image_credit: featured_image_credit || null,
        author_id: user.id,
        published_at: status === 'published' ? new Date().toISOString() : null,
      })
      .select('id')
      .single();

    if (insertError || !newArticle) {
      return { success: false, error: insertError?.message || 'Erreur lors de la création de l\'article.' };
    }

    targetId = newArticle.id;

    // Log in audit_logs
    await adminClient.from('audit_logs').insert({
      actor_id: user.id,
      action: 'create_article',
      entity_type: 'historical_article',
      entity_id: targetId,
      details: { title, slug, article_type, status },
    });
  }

  if (targetId) {
    // Sync linked persons
    await adminClient.from('historical_article_links').delete().eq('article_id', targetId);
    if (linked_person_ids && linked_person_ids.length > 0) {
      const linksToInsert = linked_person_ids.map((personId) => ({
        article_id: targetId,
        person_id: personId,
      }));
      await adminClient.from('historical_article_links').insert(linksToInsert);
    }

    // Sync linked sources
    await adminClient.from('historical_article_sources').delete().eq('article_id', targetId);
    if (linked_source_ids && linked_source_ids.length > 0) {
      const sourcesToInsert = linked_source_ids.map((sourceId) => ({
        article_id: targetId,
        source_id: sourceId,
      }));
      await adminClient.from('historical_article_sources').insert(sourcesToInsert);
    }
  }

  revalidatePath('/histoire');
  revalidatePath('/familles');
  revalidatePath(`/histoire/${slug}`);
  revalidatePath(`/familles/${slug}`);
  revalidatePath('/admin/articles');

  return { success: true, articleId: targetId ?? undefined };
}

export async function deleteArticleAction(articleId: string): Promise<ArticleActionResult> {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Accès non autorisé.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return { success: false, error: 'Accès refusé : administrateur uniquement.' };
  }

  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from('historical_articles')
    .delete()
    .eq('id', articleId);

  if (error) {
    return { success: false, error: error.message };
  }

  await adminClient.from('audit_logs').insert({
    actor_id: user.id,
    action: 'delete_article',
    entity_type: 'historical_article',
    entity_id: articleId,
    details: { deleted_article_id: articleId },
  });

  revalidatePath('/histoire');
  revalidatePath('/familles');
  revalidatePath('/admin/articles');

  return { success: true };
}
