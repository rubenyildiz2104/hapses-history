'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
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

  revalidatePath('/admin/moderation');
  revalidatePath('/admin/audit');
  revalidatePath('/compte/propositions');
  revalidatePath('/genealogie');

  return {
    success: true,
    data: data as Record<string, unknown>,
  };
}
