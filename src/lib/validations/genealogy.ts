import { z } from 'zod';

export const DatePrecisionSchema = z.enum([
  'exact',
  'year_only',
  'month_year',
  'approximate',
  'before',
  'after',
  'unknown',
]);

export const LifeStatusSchema = z.enum(['living', 'deceased', 'unknown']);

export const VisibilityStatusSchema = z.enum(['public', 'private']);

export const PersonBaseSchema = z.object({
  first_names: z.string().min(1, 'Le ou les prénoms sont requis').max(150),
  last_name: z.string().min(1, 'Le nom de famille est requis').max(150),
  name_variants: z.array(z.string()).default([]),
  gender: z.enum(['M', 'F', 'other', 'unknown']).nullable().optional(),
  
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format AAAA-MM-JJ attendu').nullable().optional(),
  birth_date_precision: DatePrecisionSchema.default('unknown'),
  birth_year: z.number().int().min(800).max(2100).nullable().optional(),
  birth_place: z.string().max(200).nullable().optional(),
  
  death_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format AAAA-MM-JJ attendu').nullable().optional(),
  death_date_precision: DatePrecisionSchema.default('unknown'),
  death_year: z.number().int().min(800).max(2100).nullable().optional(),
  death_place: z.string().max(200).nullable().optional(),
  
  life_status: LifeStatusSchema.default('unknown'),
  visibility: VisibilityStatusSchema.default('private'),
  
  profession: z.string().max(200).nullable().optional(),
  biography: z.string().max(5000).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
});

export const PersonSchema = PersonBaseSchema.refine((data) => {
  // If living, death date and death year MUST be null
  if (data.life_status === 'living') {
    return !data.death_date && !data.death_year;
  }
  return true;
}, {
  message: 'Une personne vivante ne peut pas avoir de date ou d\'année de décès.',
  path: ['life_status'],
}).refine((data) => {
  // If death date or year is provided, life_status must be 'deceased'
  if (data.death_date || data.death_year) {
    return data.life_status === 'deceased';
  }
  return true;
}, {
  message: 'Si une date ou une année de décès est renseignée, le statut doit être "décédé".',
  path: ['life_status'],
}).refine((data) => {
  // Birth year <= Death year check
  if (data.birth_year && data.death_year) {
    return data.birth_year <= data.death_year;
  }
  return true;
}, {
  message: 'L\'année de naissance ne peut pas être postérieure à l\'année de décès.',
  path: ['death_year'],
});

export const RelationshipSchema = z.object({
  relationship_type: z.enum(['parent_child', 'spouse']),
  person_a_id: z.string().uuid('ID de personne A invalide'),
  person_b_id: z.string().uuid('ID de personne B invalide'),
  
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  start_date_precision: DatePrecisionSchema.default('unknown'),
  start_year: z.number().int().min(800).max(2100).nullable().optional(),
  start_place: z.string().max(200).nullable().optional(),
  
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  end_date_precision: DatePrecisionSchema.default('unknown'),
  end_year: z.number().int().min(800).max(2100).nullable().optional(),
  end_place: z.string().max(200).nullable().optional(),
  
  notes: z.string().max(2000).nullable().optional(),
}).refine((data) => data.person_a_id !== data.person_b_id, {
  message: 'Une personne ne peut pas être liée à elle-même.',
  path: ['person_b_id'],
});
