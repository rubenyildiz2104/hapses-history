import { describe, it, expect } from 'vitest';
import { Person, Relationship, FamilyEntourage } from '../src/lib/types/database';
import { isPersonPublic, isRelationshipPublic } from '../src/lib/services/privacy';

describe('Genealogy Entourage and Filiation Logic (Phase 2)', () => {
  const patriarch: Person = {
    id: 'p-1',
    first_names: 'Pierre',
    last_name: 'DUPONT',
    name_variants: ['Dupond'],
    gender: 'M',
    birth_date: '1842-07-14',
    birth_date_precision: 'exact',
    birth_year: 1842,
    birth_place: 'Habses',
    death_date: '1912-11-03',
    death_date_precision: 'exact',
    death_year: 1912,
    death_place: 'Habses',
    life_status: 'deceased',
    visibility: 'public',
    profession: 'Forgeron',
    biography: 'Forgeron communal.',
    notes: null,
    created_by: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    archived_at: null,
  };

  const matriarch: Person = {
    id: 'p-2',
    first_names: 'Marie',
    last_name: 'LECLERC',
    name_variants: [],
    gender: 'F',
    birth_date: null,
    birth_date_precision: 'approximate',
    birth_year: 1846,
    birth_place: 'Commune voisine',
    death_date: null,
    death_date_precision: 'year_only',
    death_year: 1920,
    death_place: 'Habses',
    life_status: 'deceased',
    visibility: 'public',
    profession: 'Tisserande',
    biography: null,
    notes: null,
    created_by: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    archived_at: null,
  };

  const childDeceased: Person = {
    id: 'p-3',
    first_names: 'Jean',
    last_name: 'DUPONT',
    name_variants: [],
    gender: 'M',
    birth_date: '1870-05-12',
    birth_date_precision: 'exact',
    birth_year: 1870,
    birth_place: 'Habses',
    death_date: '1940-02-15',
    death_date_precision: 'exact',
    death_year: 1940,
    death_place: 'Habses',
    life_status: 'deceased',
    visibility: 'public',
    profession: 'Cultivateur',
    biography: null,
    notes: null,
    created_by: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    archived_at: null,
  };

  const childLiving: Person = {
    id: 'p-4',
    first_names: 'Jacques',
    last_name: 'DUPONT',
    name_variants: [],
    gender: 'M',
    birth_date: null,
    birth_date_precision: 'year_only',
    birth_year: 1985,
    birth_place: 'Habses',
    death_date: null,
    death_date_precision: 'unknown',
    death_year: null,
    death_place: null,
    life_status: 'living',
    visibility: 'private',
    profession: 'Ingénieur',
    biography: null,
    notes: null,
    created_by: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    archived_at: null,
  };

  it('validates public deceased person access', () => {
    expect(isPersonPublic(patriarch)).toBe(true);
    expect(isPersonPublic(matriarch)).toBe(true);
    expect(isPersonPublic(childDeceased)).toBe(true);
  });

  it('strictly blocks living individual from being public', () => {
    expect(isPersonPublic(childLiving)).toBe(false);
  });

  it('filters out relationships connecting to living persons', () => {
    const parentRelDeceased: Partial<Relationship> = { archived_at: null };
    expect(isRelationshipPublic(parentRelDeceased as Relationship, patriarch, childDeceased)).toBe(true);

    const parentRelLiving: Partial<Relationship> = { archived_at: null };
    expect(isRelationshipPublic(parentRelLiving as Relationship, childDeceased, childLiving)).toBe(false);
  });

  it('assembles a compliant public family entourage model', () => {
    const mockEntourage: FamilyEntourage = {
      person: childDeceased,
      parents: [
        { person: patriarch, relationId: 'rel-1' },
        { person: matriarch, relationId: 'rel-2' },
      ],
      spouses: [],
      children: [], // Living child Jacques is strictly excluded!
      siblings: [],
      sources: [],
      relatedArticles: [],
    };

    expect(mockEntourage.person.first_names).toBe('Jean');
    expect(mockEntourage.parents.length).toBe(2);
    expect(mockEntourage.parents[0].person.last_name).toBe('DUPONT');
    expect(mockEntourage.parents[1].person.last_name).toBe('LECLERC');
    expect(mockEntourage.children.length).toBe(0);
  });
});
