import { describe, it, expect } from 'vitest';
import { isPersonPublic, isRelationshipPublic, sanitizeSourceForPublic, isArticlePublic } from '../src/lib/services/privacy';
import { Person, Relationship, Source, HistoricalArticle } from '../src/lib/types/database';

describe('Privacy and Visibility Rules (Specifications v1.0 Section 6)', () => {
  it('allows deceased person with public visibility', () => {
    const person: Partial<Person> = {
      life_status: 'deceased',
      visibility: 'public',
      archived_at: null,
    };
    expect(isPersonPublic(person as Person)).toBe(true);
  });

  it('strictly hides living person even if visibility is mistakenly marked public', () => {
    const livingPerson: Partial<Person> = {
      life_status: 'living',
      visibility: 'public', // Must STILL be hidden
      archived_at: null,
    };
    expect(isPersonPublic(livingPerson as Person)).toBe(false);
  });

  it('strictly hides person with unknown life status by default', () => {
    const unknownPerson: Partial<Person> = {
      life_status: 'unknown',
      visibility: 'public',
      archived_at: null,
    };
    expect(isPersonPublic(unknownPerson as Person)).toBe(false);
  });

  it('strictly hides archived person even if deceased and public', () => {
    const archivedPerson: Partial<Person> = {
      life_status: 'deceased',
      visibility: 'public',
      archived_at: '2026-01-01T00:00:00Z',
    };
    expect(isPersonPublic(archivedPerson as Person)).toBe(false);
  });

  it('hides relationship if either related individual is living or private', () => {
    const rel: Partial<Relationship> = { archived_at: null };
    const deceasedPublic: Partial<Person> = { life_status: 'deceased', visibility: 'public', archived_at: null };
    const livingPrivate: Partial<Person> = { life_status: 'living', visibility: 'private', archived_at: null };

    // Between two deceased public persons -> visible
    expect(isRelationshipPublic(rel as Relationship, deceasedPublic as Person, deceasedPublic as Person)).toBe(true);

    // Between a deceased person and a living person -> MUST BE HIDDEN (Section 6.3)
    expect(isRelationshipPublic(rel as Relationship, deceasedPublic as Person, livingPrivate as Person)).toBe(false);
    expect(isRelationshipPublic(rel as Relationship, livingPrivate as Person, deceasedPublic as Person)).toBe(false);
  });

  it('sanitizes public sources by stripping private notes', () => {
    const source: Source = {
      id: '123',
      title: 'Registre paroissial',
      source_type: 'parish_register',
      author_or_organization: 'Paroisse',
      source_date: '1842',
      archive_reference: '5E 123',
      url: null,
      description: 'Baptême',
      private_notes: 'NE PAS DIVULGUER : Données privées de famille',
      is_public: true,
      rights_status: 'Domaine public',
      created_by: null,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    };

    const sanitized = sanitizeSourceForPublic(source);
    expect(sanitized).not.toBeNull();
    expect((sanitized as any).private_notes).toBeUndefined();
    expect(sanitized?.title).toBe('Registre paroissial');
  });

  it('returns null for non-public sources', () => {
    const privateSource: Source = {
      id: '456',
      title: 'Journal intime privé',
      source_type: 'private_document',
      author_or_organization: null,
      source_date: null,
      archive_reference: null,
      url: null,
      description: null,
      private_notes: 'Confidentiel',
      is_public: false,
      rights_status: null,
      created_by: null,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    };

    expect(sanitizeSourceForPublic(privateSource)).toBeNull();
  });

  it('hides draft and archived historical articles from the public', () => {
    const draftArticle: Partial<HistoricalArticle> = { status: 'draft' };
    const publishedArticle: Partial<HistoricalArticle> = { status: 'published' };
    const archivedArticle: Partial<HistoricalArticle> = { status: 'archived' };

    expect(isArticlePublic(draftArticle as HistoricalArticle)).toBe(false);
    expect(isArticlePublic(publishedArticle as HistoricalArticle)).toBe(true);
    expect(isArticlePublic(archivedArticle as HistoricalArticle)).toBe(false);
  });
});
