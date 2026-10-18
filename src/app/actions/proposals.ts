'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { SubmitProposalSchema } from '@/lib/validations/proposal';
import { revalidatePath } from 'next/cache';

export interface SubmitProposalResult {
  success: boolean;
  proposalId?: string;
  error?: string;
  warning?: string;
}

export async function submitProposalAction(
  rawInput: Record<string, unknown>
): Promise<SubmitProposalResult> {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: 'Vous devez être connecté pour soumettre une proposition.',
    };
  }

  // Validate input schema with Zod
  const validation = SubmitProposalSchema.safeParse(rawInput);
  if (!validation.success) {
    const errorMsg = validation.error.issues.map((i) => i.message).join('. ');
    return { success: false, error: errorMsg };
  }

  const { proposal_type, target_person_id, target_relationship_id, payload, sources_info, user_explanation } =
    validation.data;

  // Insert proposal into database (RLS ensures submitted_by = user.id and status = 'pending')
  const { data: proposal, error: insertError } = await supabase
    .from('proposals')
    .insert({
      submitted_by: user.id,
      proposal_type,
      target_person_id: target_person_id || null,
      target_relationship_id: target_relationship_id || null,
      payload: {
        ...payload,
        user_explanation: user_explanation || null,
      },
      sources_info: sources_info || null,
      status: 'pending',
    })
    .select('id')
    .single();

  if (insertError || !proposal) {
    return {
      success: false,
      error: insertError?.message || 'Erreur lors de l\'enregistrement de votre proposition.',
    };
  }

  revalidatePath('/compte/propositions');
  revalidatePath('/admin/moderation');

  return {
    success: true,
    proposalId: proposal.id,
  };
}
