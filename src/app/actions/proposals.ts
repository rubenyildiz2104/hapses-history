'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
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

export async function getProposalForEditAction(proposalId: string) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const adminClient = createAdminClient();
  const { data: proposal, error } = await adminClient
    .from('proposals')
    .select('*')
    .eq('id', proposalId)
    .single();

  if (error || !proposal) {
    return null;
  }

  // Verify ownership or admin role
  if (proposal.submitted_by !== user.id) {
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return null;
    }
  }

  return proposal;
}

export async function getPersonForCorrectionAction(personId: string) {
  const adminClient = createAdminClient();
  const { data: person, error } = await adminClient
    .from('persons')
    .select('*')
    .eq('id', personId)
    .is('archived_at', null)
    .single();

  if (error || !person) {
    return null;
  }

  return person;
}

export async function getPersonSummaryAction(personId: string) {
  if (!personId) return null;
  const adminClient = createAdminClient();
  const { data: person } = await adminClient
    .from('persons')
    .select('id, first_names, last_name, birth_year, death_year, profession')
    .eq('id', personId)
    .is('archived_at', null)
    .single();

  return person || null;
}

export async function getPersonParentsAction(personId: string) {
  if (!personId) return [];
  const adminClient = createAdminClient();
  const { data: rels } = await adminClient
    .from('relationships')
    .select(`
      person_a_id,
      parent:persons!relationships_person_a_id_fkey(
        id,
        first_names,
        last_name,
        birth_year,
        death_year,
        profession,
        gender
      )
    `)
    .eq('relationship_type', 'parent_child')
    .eq('person_b_id', personId)
    .is('archived_at', null);

  if (!rels) return [];
  return rels
    .map((r: any) => r.parent)
    .filter((p: any): p is {
      id: string;
      first_names: string;
      last_name: string;
      birth_year: number | null;
      death_year: number | null;
      profession: string | null;
      gender: string | null;
    } => Boolean(p));
}

export async function searchPersonsForCorrectionAction(searchQuery: string) {
  if (!searchQuery || searchQuery.trim().length < 2) return [];

  const adminClient = createAdminClient();
  const queryTerm = `%${searchQuery.trim()}%`;
  const { data: persons } = await adminClient
    .from('persons')
    .select('id, first_names, last_name, birth_year, death_year, profession')
    .is('archived_at', null)
    .or(`first_names.ilike.${queryTerm},last_name.ilike.${queryTerm}`)
    .order('last_name', { ascending: true })
    .limit(10);

  return persons || [];
}

export const searchPersonsAction = searchPersonsForCorrectionAction;

export async function updateProposalAction(
  proposalId: string,
  rawInput: Record<string, unknown>
): Promise<SubmitProposalResult> {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: 'Vous devez être connecté pour modifier cette proposition.',
    };
  }

  const adminClient = createAdminClient();
  const { data: existing, error: fetchError } = await adminClient
    .from('proposals')
    .select('*')
    .eq('id', proposalId)
    .single();

  if (fetchError || !existing) {
    return { success: false, error: 'Proposition introuvable.' };
  }

  if (existing.submitted_by !== user.id) {
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return { success: false, error: 'Vous n\'êtes pas autorisé à modifier cette proposition.' };
    }
  }

  if (existing.status === 'accepted') {
    return { success: false, error: 'Cette proposition a déjà été acceptée et ne peut plus être modifiée.' };
  }

  // Validate input with defaults from existing proposal
  const inputWithDefaults = {
    proposal_type: rawInput.proposal_type || existing.proposal_type,
    target_person_id: rawInput.target_person_id ?? existing.target_person_id,
    target_relationship_id: rawInput.target_relationship_id ?? existing.target_relationship_id,
    ...rawInput,
  };

  const validation = SubmitProposalSchema.safeParse(inputWithDefaults);
  if (!validation.success) {
    const errorMsg = validation.error.issues.map((i) => i.message).join('. ');
    return { success: false, error: errorMsg };
  }

  const { payload, sources_info, user_explanation, proposal_type, target_person_id, target_relationship_id } = validation.data;

  // Update proposal and set status back to 'pending' for re-review
  const { error: updateError } = await adminClient
    .from('proposals')
    .update({
      proposal_type,
      target_person_id: target_person_id || null,
      target_relationship_id: target_relationship_id || null,
      payload: {
        ...payload,
        user_explanation: user_explanation || null,
      },
      sources_info: sources_info || null,
      status: 'pending',
      updated_at: new Date().toISOString(),
    })
    .eq('id', proposalId);

  if (updateError) {
    return {
      success: false,
      error: updateError.message || 'Erreur lors de la mise à jour de votre proposition.',
    };
  }

  revalidatePath('/compte/propositions');
  revalidatePath('/admin/moderation');

  return {
    success: true,
    proposalId,
  };
}
