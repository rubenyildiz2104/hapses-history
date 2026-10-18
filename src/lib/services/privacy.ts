import { Person, Relationship, Source, HistoricalArticle } from '../types/database';

/**
 * Checks if a person can be made visible to the public.
 * Rule:
 * - Must NOT be archived
 * - Must have visibility === 'public' (living and deceased persons are public when visibility is public)
 */
export function isPersonPublic(person: Pick<Person, 'archived_at' | 'life_status' | 'visibility'>): boolean {
  if (person.archived_at !== null && person.archived_at !== undefined) {
    return false;
  }
  return person.visibility === 'public';
}

/**
 * Checks if a relationship between two persons is publicly visible.
 * Rule:
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
 * Rule:
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
 * Rule:
 * - Only 'published' status is visible. Drafts and archived are hidden.
 */
export function isArticlePublic(article: Pick<HistoricalArticle, 'status'>): boolean {
  return article.status === 'published';
}
