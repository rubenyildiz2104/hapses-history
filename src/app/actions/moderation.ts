'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export interface ReviewProposalResult {
  success: boolean;
  error?: string;
  data?: Record<string, unknown>;
}

export async function reviewProposalAction(
  proposalId: string,
  decision: 'accept' | 'reject' | 'needs_information',
  comment?: string | null
): Promise<ReviewProposalResult> {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Accès non autorisé : vous devez être connecté.' };
  }

  // Check if admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return {
      success: false,
      error: 'Accès refusé : seuls les administrateurs ont l\'habilitation de modération.',
    };
  }

  // Call PostgreSQL atomic moderation RPC
  const { data, error } = await supabase.rpc('review_proposal_transaction', {
    p_proposal_id: proposalId,
    p_decision: decision,
    p_comment: comment || null,
  });

  if (error) {
    return {
      success: false,
      error: error.message || 'Erreur lors de l\'exécution de la transaction de modération.',
    };
  }

  // If accepting an 'add_person' proposal with optional parent_id or spouse_id, ensure relationships are inserted
  if (decision === 'accept') {
    const adminClient = createAdminClient();
    const { data: proposal } = await adminClient
      .from('proposals')
      .select('proposal_type, target_person_id, payload, submitted_by')
      .eq('id', proposalId)
      .single();

    if (proposal && proposal.proposal_type === 'add_person' && proposal.target_person_id) {
      const payload = (proposal.payload || {}) as Record<string, unknown>;
      const newPersonId = proposal.target_person_id;

      if (payload.parent_id && typeof payload.parent_id === 'string' && payload.parent_id.trim()) {
        const parentId = payload.parent_id.trim();
        const { data: existingRel } = await adminClient
          .from('relationships')
          .select('id')
          .eq('relationship_type', 'parent_child')
          .eq('person_a_id', parentId)
          .eq('person_b_id', newPersonId)
          .is('archived_at', null)
          .maybeSingle();

        if (!existingRel) {
          await adminClient.from('relationships').insert({
            relationship_type: 'parent_child',
            person_a_id: parentId,
            person_b_id: newPersonId,
            created_by: proposal.submitted_by,
          });
        }
      }

      if (payload.spouse_id && typeof payload.spouse_id === 'string' && payload.spouse_id.trim()) {
        const spouseId = payload.spouse_id.trim();
        const { data: existingSpouse } = await adminClient
          .from('relationships')
          .select('id')
          .eq('relationship_type', 'spouse')
          .or(`and(person_a_id.eq.${newPersonId},person_b_id.eq.${spouseId}),and(person_a_id.eq.${spouseId},person_b_id.eq.${newPersonId})`)
          .is('archived_at', null)
          .maybeSingle();

        if (!existingSpouse) {
          await adminClient.from('relationships').insert({
            relationship_type: 'spouse',
            person_a_id: newPersonId,
            person_b_id: spouseId,
            created_by: proposal.submitted_by,
          });
        }
      }
    }
  }

  revalidatePath('/admin/moderation');
  revalidatePath('/admin/audit');
  revalidatePath('/compte/propositions');
  revalidatePath('/genealogie');

  return {
    success: true,
    data: data as Record<string, unknown>,
  };
}
