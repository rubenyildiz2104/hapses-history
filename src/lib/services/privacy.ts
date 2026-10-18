import { Person, Relationship, Source, HistoricalArticle } from '../types/database';

/**
 * Checks if a person can be made visible to the general public.
 * Rule (Section 6.2 & 14.2):
 * - Must NOT be archived
 * - Must have life_status === 'deceased' (Never living, never unknown!)
 * - Must have visibility === 'public'
 */
export function isPersonPublic(person: Pick<Person, 'archived_at' | 'life_status' | 'visibility'>): boolean {
  if (person.archived_at !== null && person.archived_at !== undefined) {
    return false;
  }
  return person.life_status === 'deceased' && person.visibility === 'public';
}

/**
 * Checks if a relationship between two persons is publicly visible.
 * Rule (Section 6.3 & 14.3):
 * - Must NOT be archived
 * - BOTH persons involved must satisfy isPersonPublic()
 */
export function isRelationshipPublic(
  relationship: Pick<Relationship, 'archived_at'>,
  personA: Pick<Person, 'archived_at' | 'life_status' | 'visibility'>,
  personB: Pick<Person, 'archived_at' | 'life_status' | 'visibility'>
): boolean {
  if (relationship.archived_at !== null && relationship.archived_at !== undefined) {
    return false;
  }
  return isPersonPublic(personA) && isPersonPublic(personB);
}

/**
 * Sanitizes a source for public display by stripping out private notes.
 * Rule (Section 6.4):
 * - If is_public is false, returns null
 * - If is_public is true, returns source without private_notes
 */
export function sanitizeSourceForPublic(source: Source): Omit<Source, 'private_notes'> | null {
  if (!source.is_public) {
    return null;
  }
  const { private_notes, ...publicSource } = source;
  return publicSource;
}

/**
 * Verifies if an article is viewable by public visitor.
 * Rule (Section 8.2 & 11.3):
 * - Only 'published' status is visible. Drafts and archived are hidden.
 */
export function isArticlePublic(article: Pick<HistoricalArticle, 'status'>): boolean {
  return article.status === 'published';
}
