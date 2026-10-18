import { z } from 'zod';
import { PersonSchema, RelationshipSchema } from './genealogy';

export const ProposalTypeSchema = z.enum([
  'add_person',
  'update_person',
  'add_relationship',
  'update_relationship',
]);

export const ProposalSourceInfoSchema = z.object({
  title: z.string().max(300).optional(),
  archive_reference: z.string().max(200).optional(),
  url: z.string().url('URL invalide').optional().or(z.literal('')),
  description: z.string().max(1500).optional(),
  uncertainty_notes: z.string().max(1000).optional(),
  is_approximate: z.boolean().default(false),
}).optional();

export const SubmitProposalSchema = z.object({
  proposal_type: ProposalTypeSchema,
  target_person_id: z.string().uuid().nullable().optional(),
  target_relationship_id: z.string().uuid().nullable().optional(),
  payload: z.record(z.any()),
  sources_info: ProposalSourceInfoSchema,
  user_explanation: z.string().max(1000).optional(),
}).superRefine((data, ctx) => {
  if (data.proposal_type === 'add_person') {
    const res = PersonSchema.safeParse(data.payload);
    if (!res.success) {
      res.error.issues.forEach((issue) => {
        ctx.addIssue({ ...issue, path: ['payload', ...issue.path] });
      });
    }
  }

  if (data.proposal_type === 'update_person') {
    if (!data.target_person_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'L\'identifiant de la personne ciblée est requis pour une mise à jour.',
        path: ['target_person_id'],
      });
    }
    const res = PersonSchema.partial().safeParse(data.payload);
    if (!res.success) {
      res.error.issues.forEach((issue) => {
        ctx.addIssue({ ...issue, path: ['payload', ...issue.path] });
      });
    }
  }

  if (data.proposal_type === 'add_relationship') {
    const res = RelationshipSchema.safeParse(data.payload);
    if (!res.success) {
      res.error.issues.forEach((issue) => {
        ctx.addIssue({ ...issue, path: ['payload', ...issue.path] });
      });
    }
  }

  if (data.proposal_type === 'update_relationship') {
    if (!data.target_relationship_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'L\'identifiant de la relation ciblée est requis pour une mise à jour.',
        path: ['target_relationship_id'],
      });
    }
  }
});

export const ReviewProposalSchema = z.object({
  proposal_id: z.string().uuid('ID de proposition invalide'),
  decision: z.enum(['accept', 'reject', 'needs_information']),
  comment: z.string().max(1000).optional().nullable(),
});
