import { z } from 'zod';

export const HistoricalArticleSchema = z.object({
  article_type: z.enum(['village_history', 'family']),
  title: z.string().min(3, 'Le titre doit comporter au moins 3 caractères').max(250),
  slug: z.string().min(3).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Format slug invalide (ex: histoire-du-moulin)'),
  summary: z.string().max(1000).nullable().optional(),
  content: z.string().min(10, 'Le contenu doit comporter au moins 10 caractères'),
  
  period_start: z.number().int().min(500).max(2100).nullable().optional(),
  period_end: z.number().int().min(500).max(2100).nullable().optional(),
  period_description: z.string().max(150).nullable().optional(),
  
  family_name: z.string().max(100).nullable().optional(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  
  featured_image_url: z.string().url().nullable().optional().or(z.literal('')),
  featured_image_credit: z.string().max(200).nullable().optional(),
  
  linked_person_ids: z.array(z.string().uuid()).default([]),
  linked_source_ids: z.array(z.string().uuid()).default([]),
}).refine((data) => {
  if (data.period_start && data.period_end) {
    return data.period_start <= data.period_end;
  }
  return true;
}, {
  message: 'L\'année de début de la période ne peut pas être postérieure à l\'année de fin.',
  path: ['period_end'],
}).refine((data) => {
  if (data.article_type === 'family') {
    return Boolean(data.family_name && data.family_name.trim().length > 0);
  }
  return true;
}, {
  message: 'Le nom de famille est obligatoire pour un article de type "famille".',
  path: ['family_name'],
});
