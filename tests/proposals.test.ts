import { describe, it, expect } from 'vitest';
import { SubmitProposalSchema } from '../src/lib/validations/proposal';

describe('Proposal Submission & Editing Validation', () => {
  it('validates a new person proposal with profession and biography', () => {
    const validProposal = {
      proposal_type: 'add_person',
      payload: {
        first_names: 'Joseph',
        last_name: 'YILDIZ',
        name_variants: ['Yildiz'],
        gender: 'M',
        birth_year: 1910,
        birth_place: 'Habses',
        life_status: 'deceased',
        visibility: 'public',
        profession: 'Cultivateur',
        biography: 'Habitant historique du village.',
      },
      sources_info: {
        title: 'Registre d\'état civil de Habses',
        archive_reference: 'Vue 42',
      },
      user_explanation: 'Ajout de mon aïeul',
    };

    const res = SubmitProposalSchema.safeParse(validProposal);
    expect(res.success).toBe(true);
  });

  it('validates an updated proposal (update_person) with target_person_id', () => {
    const updateProposal = {
      proposal_type: 'update_person',
      target_person_id: '11111111-1111-4111-8111-111111111111',
      payload: {
        profession: 'Tisserand de lin',
        birth_year: 1875,
      },
      sources_info: {
        title: 'Recensement 1901',
      },
    };

    const res = SubmitProposalSchema.safeParse(updateProposal);
    expect(res.success).toBe(true);
  });

  it('rejects an update_person proposal without target_person_id', () => {
    const invalidUpdate = {
      proposal_type: 'update_person',
      payload: {
        profession: 'Tisserand',
      },
    };

    const res = SubmitProposalSchema.safeParse(invalidUpdate);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues.some((i) => i.path.includes('target_person_id'))).toBe(true);
    }
  });

  it('validates proposal preserving precision and living status constraints', () => {
    const livingPersonProposal = {
      proposal_type: 'add_person',
      payload: {
        first_names: 'Émile',
        last_name: 'MARTIN',
        name_variants: [],
        gender: 'M',
        birth_year: 1980,
        life_status: 'living',
        death_year: 2020, // Invalid: cannot have death year if living
        visibility: 'public',
      },
    };

    const res = SubmitProposalSchema.safeParse(livingPersonProposal);
    expect(res.success).toBe(false);
  });

  it('validates an add_person proposal with optional parent_id and spouse_id', () => {
    const newPersonWithFamily = {
      proposal_type: 'add_person',
      payload: {
        first_names: 'Marie',
        last_name: 'YILDIZ',
        gender: 'F',
        birth_year: 1935,
        life_status: 'deceased',
        parent_id: '11111111-1111-4111-8111-111111111111',
        spouse_id: '22222222-2222-4222-8222-222222222222',
        visibility: 'public',
      },
    };

    const res = SubmitProposalSchema.safeParse(newPersonWithFamily);
    expect(res.success).toBe(true);
  });

  it('validates an add_relationship proposal (parent_child)', () => {
    const parentChildProposal = {
      proposal_type: 'add_relationship',
      payload: {
        relationship_type: 'parent_child',
        person_a_id: '11111111-1111-4111-8111-111111111111',
        person_b_id: '22222222-2222-4222-8222-222222222222',
        notes: 'Filiation attestée par le livret de famille',
      },
      sources_info: {
        title: 'Livret de famille',
      },
      user_explanation: 'Lien père-fils',
    };

    const res = SubmitProposalSchema.safeParse(parentChildProposal);
    expect(res.success).toBe(true);
  });

  it('validates an add_relationship proposal (spouse with marriage details)', () => {
    const spouseProposal = {
      proposal_type: 'add_relationship',
      payload: {
        relationship_type: 'spouse',
        person_a_id: '11111111-1111-4111-8111-111111111111',
        person_b_id: '33333333-3333-4333-8333-333333333333',
        start_year: 1912,
        start_date: '1912-06-15',
        start_place: 'Habses',
        notes: 'Mariage religieux',
      },
      sources_info: {
        title: 'Registre de mariage',
        archive_reference: 'Vue 88',
      },
    };

    const res = SubmitProposalSchema.safeParse(spouseProposal);
    expect(res.success).toBe(true);
  });

  it('rejects an add_relationship proposal linking a person to themselves', () => {
    const selfRelProposal = {
      proposal_type: 'add_relationship',
      payload: {
        relationship_type: 'spouse',
        person_a_id: '11111111-1111-4111-8111-111111111111',
        person_b_id: '11111111-1111-4111-8111-111111111111',
      },
    };

    const res = SubmitProposalSchema.safeParse(selfRelProposal);
    expect(res.success).toBe(false);
  });

  it('validates an add_relationship proposal (sibling) with optional common parent fields', () => {
    const siblingProposal = {
      proposal_type: 'add_relationship',
      payload: {
        relationship_type: 'sibling',
        person_a_id: '11111111-1111-4111-8111-111111111111',
        person_b_id: '22222222-2222-4222-8222-222222222222',
        common_parent_first_names: 'Hanna',
        common_parent_last_name: 'YILDIZ',
        common_parent_gender: 'M',
        notes: 'Frères biologiques',
      },
      sources_info: {
        title: 'Mémoire familiale',
      },
    };

    const res = SubmitProposalSchema.safeParse(siblingProposal);
    expect(res.success).toBe(true);
  });

  it('validates an add_person proposal with sibling_id and common parent info', () => {
    const newPersonWithSibling = {
      proposal_type: 'add_person',
      payload: {
        first_names: 'Sara',
        last_name: 'YILDIZ',
        gender: 'F',
        birth_year: 1940,
        life_status: 'deceased',
        sibling_id: '11111111-1111-4111-8111-111111111111',
        common_parent_first_names: 'Hanna',
        common_parent_gender: 'M',
        visibility: 'public',
      },
    };

    const res = SubmitProposalSchema.safeParse(newPersonWithSibling);
    expect(res.success).toBe(true);
  });

  it('validates an add_relationship proposal (parent_child) linking both parents simultaneously via second_parent_id', () => {
    const dualParentProposal = {
      proposal_type: 'add_relationship',
      payload: {
        relationship_type: 'parent_child',
        person_a_id: '11111111-1111-4111-8111-111111111111', // Father: Gevriye
        person_b_id: '22222222-2222-4222-8222-222222222222', // Child: Ruben
        second_parent_id: '33333333-3333-4333-8333-333333333333', // Mother: Behiye
        notes: 'Filiation père et mère simultanée',
      },
      sources_info: {
        title: 'Livret de famille',
      },
    };

    const res = SubmitProposalSchema.safeParse(dualParentProposal);
    expect(res.success).toBe(true);
  });

  it('validates an add_person proposal with both parent_id and parent_2_id', () => {
    const newPersonDualParents = {
      proposal_type: 'add_person',
      payload: {
        first_names: 'Gabriel',
        last_name: 'YILDIZ',
        gender: 'M',
        birth_year: 1965,
        life_status: 'deceased',
        parent_id: '11111111-1111-4111-8111-111111111111',
        parent_2_id: '33333333-3333-4333-8333-333333333333',
        visibility: 'public',
      },
    };

    const res = SubmitProposalSchema.safeParse(newPersonDualParents);
    expect(res.success).toBe(true);
  });
});


