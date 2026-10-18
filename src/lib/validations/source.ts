import { z } from 'zod';

export const SourceTypeEnum = z.enum([
  'parish_register',
  'civil_registry',
  'census',
  'oral_testimony',
  'communal_archives',
  'notarial_act',
  'other',
]);

export type SourceType = z.infer<typeof SourceTypeEnum>;

export const SourceSchema = z.object({
  title: z.string().min(3, 'Le titre de la source doit comporter au moins 3 caractères').max(250),
  source_type: SourceTypeEnum,
  author_or_organization: z.string().max(200).nullable().optional(),
  source_date: z.string().max(100).nullable().optional(),
  archive_reference: z.string().max(150).nullable().optional(),
  url: z.string().url('L\'URL doit être valide').nullable().optional().or(z.literal('')),
  description: z.string().max(3000).nullable().optional(),
  private_notes: z.string().max(3000).nullable().optional(),
  is_public: z.boolean().default(true),
  rights_status: z.string().max(150).nullable().optional(),
  linked_person_ids: z.array(z.string().uuid()).default([]),
});

export type SourceInput = z.infer<typeof SourceSchema>;
