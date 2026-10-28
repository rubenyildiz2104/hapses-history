'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { sendProposalStatusEmail } from '@/lib/services/email';

export interface ReviewProposalResult {
  success: boolean;
  error?: string;
  data?: Record<string, unknown>;
}

async function notifyProposalAuthor(
  adminClient: ReturnType<typeof createAdminClient>,
  proposalId: string,
  decision: 'accept' | 'reject' | 'needs_information',
  comment?: string | null
) {
  try {
    const { data: prop } = await adminClient
      .from('proposals')
      .select('proposal_type, submitted_by, payload, target_person_id')
      .eq('id', proposalId)
      .single();

    if (!prop || !prop.submitted_by) return;

    // Fetch author's email
    const { data: authorData } = await adminClient.auth.admin.getUserById(prop.submitted_by);
    const authorEmail = authorData?.user?.email;
    if (!authorEmail) return;

    // Fetch author's display name
    const { data: authorProfile } = await adminClient
      .from('profiles')
      .select('display_name')
      .eq('id', prop.submitted_by)
      .single();

    const authorName =
      authorProfile?.display_name ||
      authorData?.user?.user_metadata?.display_name ||
      authorEmail.split('@')[0] ||
      'Contributeur';

    // Target person name if available
    let targetPersonName: string | null = null;
    const payload = (prop.payload || {}) as Record<string, unknown>;
    if (payload.first_names || payload.last_name) {
      targetPersonName = `${payload.first_names || ''} ${payload.last_name || ''}`.trim();
    } else if (prop.target_person_id) {
      const { data: tp } = await adminClient
        .from('persons')
        .select('first_names, last_name')
        .eq('id', prop.target_person_id)
        .single();
      if (tp) targetPersonName = `${tp.first_names} ${tp.last_name}`.trim();
    }

    await sendProposalStatusEmail({
      recipientEmail: authorEmail,
      recipientName: authorName,
      proposalId,
      proposalType: prop.proposal_type,
      decision,
      reviewComment: comment,
      targetPersonName,
    });
  } catch (emailErr) {
    console.error('Failed to notify proposal author by email:', emailErr);
  }
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

  const adminClient = createAdminClient();
  const { data: proposal, error: fetchErr } = await adminClient
    .from('proposals')
    .select('proposal_type, target_person_id, payload, submitted_by')
    .eq('id', proposalId)
    .single();

  if (fetchErr || !proposal) {
    return { success: false, error: 'Proposition introuvable.' };
  }

  const payload = (proposal.payload || {}) as Record<string, unknown>;

  // Special handling for 'sibling' relationship proposals:
  // Since Postgres relationship_type enum only supports 'parent_child' and 'spouse',
  // siblings are represented genealogically by linking both persons to the common parent(s).
  if (proposal.proposal_type === 'add_relationship' && payload.relationship_type === 'sibling') {
    if (decision === 'accept') {
      const personAId = String(payload.person_a_id);
      const personBId = String(payload.person_b_id);

      // Find parents of A
      const { data: parentsA } = await adminClient
        .from('relationships')
        .select('person_a_id')
        .eq('relationship_type', 'parent_child')
        .eq('person_b_id', personAId)
        .is('archived_at', null);

      // Find parents of B
      const { data: parentsB } = await adminClient
        .from('relationships')
        .select('person_a_id')
        .eq('relationship_type', 'parent_child')
        .eq('person_b_id', personBId)
        .is('archived_at', null);

      if (parentsA && parentsA.length > 0) {
        for (const pa of parentsA) {
          const { data: exists } = await adminClient
            .from('relationships')
            .select('id')
            .eq('relationship_type', 'parent_child')
            .eq('person_a_id', pa.person_a_id)
            .eq('person_b_id', personBId)
            .is('archived_at', null)
            .maybeSingle();

          if (!exists) {
            await adminClient.from('relationships').insert({
              relationship_type: 'parent_child',
              person_a_id: pa.person_a_id,
              person_b_id: personBId,
              created_by: proposal.submitted_by,
            });
          }
        }
      } else if (parentsB && parentsB.length > 0) {
        for (const pb of parentsB) {
          const { data: exists } = await adminClient
            .from('relationships')
            .select('id')
            .eq('relationship_type', 'parent_child')
            .eq('person_a_id', pb.person_a_id)
            .eq('person_b_id', personAId)
            .is('archived_at', null)
            .maybeSingle();

          if (!exists) {
            await adminClient.from('relationships').insert({
              relationship_type: 'parent_child',
              person_a_id: pb.person_a_id,
              person_b_id: personAId,
              created_by: proposal.submitted_by,
            });
          }
        }
      } else {
        // Neither has parents in DB: create common parent
        const { data: pA } = await adminClient.from('persons').select('last_name').eq('id', personAId).single();
        const pLastName = (payload.common_parent_last_name as string) || pA?.last_name || 'Inconnu';
        const pFirstNames = (payload.common_parent_first_names as string) || (payload.common_parent_gender === 'F' ? 'Mère inconnue' : 'Père inconnu');
        const pGender = (payload.common_parent_gender as string) || 'M';

        const { data: newParent, error: createParentErr } = await adminClient
          .from('persons')
          .insert({
            first_names: pFirstNames,
            last_name: pLastName,
            gender: pGender,
            life_status: 'deceased',
            visibility: 'public',
            created_by: proposal.submitted_by,
          })
          .select('id')
          .single();

        if (createParentErr || !newParent) {
          return { success: false, error: 'Erreur lors de la création du parent commun.' };
        }

        await adminClient.from('relationships').insert([
          {
            relationship_type: 'parent_child',
            person_a_id: newParent.id,
            person_b_id: personAId,
            created_by: proposal.submitted_by,
          },
          {
            relationship_type: 'parent_child',
            person_a_id: newParent.id,
            person_b_id: personBId,
            created_by: proposal.submitted_by,
          },
        ]);
      }

      await adminClient
        .from('proposals')
        .update({
          status: 'accepted',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_comment: comment || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', proposalId);

      await adminClient.from('audit_logs').insert({
        actor_id: user.id,
        action: 'accept_add_relationship_sibling',
        entity_type: 'relationship',
        entity_id: proposalId,
        details: {
          proposal_id: proposalId,
          submitted_by: proposal.submitted_by,
          person_a_id: personAId,
          person_b_id: personBId,
        },
      });
    } else {
      await adminClient
        .from('proposals')
        .update({
          status: decision === 'reject' ? 'rejected' : 'needs_information',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_comment: comment || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', proposalId);

      await adminClient.from('audit_logs').insert({
        actor_id: user.id,
        action: `${decision}_proposal`,
        entity_type: 'proposal',
        entity_id: proposalId,
        details: { comment },
      });
    }

    revalidatePath('/admin/moderation');
    revalidatePath('/admin/audit');
    revalidatePath('/compte/propositions');
    revalidatePath('/genealogie');

    await notifyProposalAuthor(adminClient, proposalId, decision, comment);

    return { success: true };
  }

  // Call PostgreSQL atomic moderation RPC for all standard proposal types
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

  // If accepting an 'add_person' proposal with optional parent_id, spouse_id, or sibling_id, ensure relationships are inserted
  if (decision === 'accept') {
    // Refetch proposal to get new target_person_id
    const { data: updatedProposal } = await adminClient
      .from('proposals')
      .select('proposal_type, target_person_id, payload, submitted_by')
      .eq('id', proposalId)
      .single();

    if (updatedProposal && updatedProposal.proposal_type === 'add_person' && updatedProposal.target_person_id) {
      const pPayload = (updatedProposal.payload || {}) as Record<string, unknown>;
      const newPersonId = updatedProposal.target_person_id;

      // Handle Parent link
      if (pPayload.parent_id && typeof pPayload.parent_id === 'string' && pPayload.parent_id.trim()) {
        const parentId = pPayload.parent_id.trim();
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
            created_by: updatedProposal.submitted_by,
          });
        }
      }

      // Handle Second Parent link
      if (pPayload.parent_2_id && typeof pPayload.parent_2_id === 'string' && pPayload.parent_2_id.trim()) {
        const parent2Id = pPayload.parent_2_id.trim();
        const { data: existingRel2 } = await adminClient
          .from('relationships')
          .select('id')
          .eq('relationship_type', 'parent_child')
          .eq('person_a_id', parent2Id)
          .eq('person_b_id', newPersonId)
          .is('archived_at', null)
          .maybeSingle();

        if (!existingRel2) {
          await adminClient.from('relationships').insert({
            relationship_type: 'parent_child',
            person_a_id: parent2Id,
            person_b_id: newPersonId,
            created_by: updatedProposal.submitted_by,
          });
        }
      }

      // Handle Sibling link
      if (pPayload.sibling_id && typeof pPayload.sibling_id === 'string' && pPayload.sibling_id.trim()) {
        const siblingId = pPayload.sibling_id.trim();
        const { data: sibParents } = await adminClient
          .from('relationships')
          .select('person_a_id')
          .eq('relationship_type', 'parent_child')
          .eq('person_b_id', siblingId)
          .is('archived_at', null);

        if (sibParents && sibParents.length > 0) {
          for (const sp of sibParents) {
            const { data: existingRel } = await adminClient
              .from('relationships')
              .select('id')
              .eq('relationship_type', 'parent_child')
              .eq('person_a_id', sp.person_a_id)
              .eq('person_b_id', newPersonId)
              .is('archived_at', null)
              .maybeSingle();

            if (!existingRel) {
              await adminClient.from('relationships').insert({
                relationship_type: 'parent_child',
                person_a_id: sp.person_a_id,
                person_b_id: newPersonId,
                created_by: updatedProposal.submitted_by,
              });
            }
          }
        } else {
          // Sibling does not have parents yet: create common parent
          const { data: sibPerson } = await adminClient.from('persons').select('last_name').eq('id', siblingId).single();
          const pLastName = (pPayload.common_parent_last_name as string) || sibPerson?.last_name || (pPayload.last_name as string) || 'Inconnu';
          const pFirstNames = (pPayload.common_parent_first_names as string) || (pPayload.common_parent_gender === 'F' ? 'Mère inconnue' : 'Père inconnu');
          const pGender = (pPayload.common_parent_gender as string) || 'M';

          const { data: newParent } = await adminClient
            .from('persons')
            .insert({
              first_names: pFirstNames,
              last_name: pLastName,
              gender: pGender,
              life_status: 'deceased',
              visibility: 'public',
              created_by: updatedProposal.submitted_by,
            })
            .select('id')
            .single();

          if (newParent) {
            await adminClient.from('relationships').insert([
              {
                relationship_type: 'parent_child',
                person_a_id: newParent.id,
                person_b_id: siblingId,
                created_by: updatedProposal.submitted_by,
              },
              {
                relationship_type: 'parent_child',
                person_a_id: newParent.id,
                person_b_id: newPersonId,
                created_by: updatedProposal.submitted_by,
              },
            ]);
          }
        }
      }

      // Handle Spouse link
      if (pPayload.spouse_id && typeof pPayload.spouse_id === 'string' && pPayload.spouse_id.trim()) {
        const spouseId = pPayload.spouse_id.trim();
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
            created_by: updatedProposal.submitted_by,
          });
        }
      }
    }

    if (updatedProposal && updatedProposal.proposal_type === 'add_relationship') {
      const rPayload = (updatedProposal.payload || {}) as Record<string, unknown>;
      if (rPayload.relationship_type === 'parent_child' && rPayload.second_parent_id && typeof rPayload.second_parent_id === 'string') {
        const secondParentId = rPayload.second_parent_id.trim();
        const childId = rPayload.person_b_id ? String(rPayload.person_b_id).trim() : null;
        if (secondParentId && childId) {
          const { data: existingRel } = await adminClient
            .from('relationships')
            .select('id')
            .eq('relationship_type', 'parent_child')
            .eq('person_a_id', secondParentId)
            .eq('person_b_id', childId)
            .is('archived_at', null)
            .maybeSingle();

          if (!existingRel) {
            await adminClient.from('relationships').insert({
              relationship_type: 'parent_child',
              person_a_id: secondParentId,
              person_b_id: childId,
              created_by: updatedProposal.submitted_by,
            });
          }
        }
      }
    }
  }

  revalidatePath('/admin/moderation');
  revalidatePath('/admin/audit');
  revalidatePath('/compte/propositions');
  revalidatePath('/genealogie');

  await notifyProposalAuthor(adminClient, proposalId, decision, comment);

  return {
    success: true,
    data: data as Record<string, unknown>,
  };
}
