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
});
