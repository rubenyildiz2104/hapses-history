import { describe, it, expect } from 'vitest';
import { formatGedcomDate, generateGedcom, generatePublicJsonExport } from '../src/lib/services/gedcom';
import { Person, Relationship, Source } from '../src/lib/types/database';

describe('GEDCOM 5.5.1 and JSON Export Service', () => {
  describe('formatGedcomDate', () => {
    it('formats exact dates according to GEDCOM standard', () => {
      expect(formatGedcomDate('1842-07-14', 1842, 'exact')).toBe('14 JUL 1842');
      expect(formatGedcomDate('1900-01-01', 1900, 'exact')).toBe('1 JAN 1900');
      expect(formatGedcomDate('1915-12-25', 1915, 'exact')).toBe('25 DEC 1915');
    });

    it('formats year-only dates without inventing days or months', () => {
      expect(formatGedcomDate(null, 1842, 'year_only')).toBe('1842');
    });

    it('formats month and year dates', () => {
      expect(formatGedcomDate('1842-07', 1842, 'month_year')).toBe('JUL 1842');
    });

    it('formats approximate, before, and after qualifiers', () => {
      expect(formatGedcomDate(null, 1840, 'approximate')).toBe('ABT 1840');
      expect(formatGedcomDate(null, 1915, 'before')).toBe('BEF 1915');
      expect(formatGedcomDate(null, 1890, 'after')).toBe('AFT 1890');
    });

    it('returns null for unknown date precision', () => {
      expect(formatGedcomDate(null, null, 'unknown')).toBeNull();
    });
  });

  describe('generateGedcom & Privacy Enforcement', () => {
    const p1DeceasedPublic: Person = {
      id: '11111111-1111-1111-1111-111111111111',
      first_names: 'Pierre',
      last_name: 'Dupont',
      name_variants: ['Dupond'],
      gender: 'M',
      birth_date: '1842-07-14',
      birth_date_precision: 'exact',
      birth_year: 1842,
      birth_place: 'Habses',
      death_date: null,
      death_date_precision: 'year_only',
      death_year: 1912,
      death_place: 'Habses',
      life_status: 'deceased',
      visibility: 'public',
      profession: 'Agriculteur',
      biography: 'Patriarche de la famille.',
      notes: null,
      created_by: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      archived_at: null,
    };

    const p2DeceasedPublic: Person = {
      id: '22222222-2222-2222-2222-222222222222',
      first_names: 'Marie',
      last_name: 'Leclerc',
      name_variants: [],
      gender: 'F',
      birth_date: null,
      birth_date_precision: 'approximate',
      birth_year: 1845,
      birth_place: 'Habses',
      death_date: null,
      death_date_precision: 'year_only',
      death_year: 1915,
      death_place: 'Habses',
      life_status: 'deceased',
      visibility: 'public',
      profession: 'Tisserande',
      biography: null,
      notes: null,
      created_by: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      archived_at: null,
    };

    const p3Living: Person = {
      id: '33333333-3333-3333-3333-333333333333',
      first_names: 'Thomas',
      last_name: 'Dupont',
      name_variants: [],
      gender: 'M',
      birth_date: '1985-04-12',
      birth_date_precision: 'exact',
      birth_year: 1985,
      birth_place: 'Paris',
      death_date: null,
      death_date_precision: 'unknown',
      death_year: null,
      death_place: null,
      life_status: 'living', // LIVING
      visibility: 'private',
      profession: 'Ingénieur',
      biography: 'Descendant contemporain vivant.',
      notes: null,
      created_by: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      archived_at: null,
    };

    const p4UnknownStatus: Person = {
      id: '44444444-4444-4444-4444-444444444444',
      first_names: 'Inconnu',
      last_name: 'Mystere',
      name_variants: [],
      gender: 'unknown',
      birth_date: null,
      birth_date_precision: 'unknown',
      birth_year: null,
      birth_place: null,
      death_date: null,
      death_date_precision: 'unknown',
      death_year: null,
      death_place: null,
      life_status: 'unknown', // UNKNOWN
      visibility: 'private',
      profession: null,
      biography: null,
      notes: null,
      created_by: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      archived_at: null,
    };

    // Public spouse relationship between p1 and p2
    const relSpouse: Relationship = {
      id: 'rel-1',
      relationship_type: 'spouse',
      person_a_id: p1DeceasedPublic.id,
      person_b_id: p2DeceasedPublic.id,
      start_date: null,
      start_date_precision: 'year_only',
      start_year: 1868,
      start_place: 'Habses',
      end_date: null,
      end_date_precision: 'unknown',
      end_year: null,
      end_place: null,
      notes: null,
      created_by: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      archived_at: null,
    };

    // Relationship linking a deceased person and a living person
    const relWithLiving: Relationship = {
      id: 'rel-2',
      relationship_type: 'parent_child',
      person_a_id: p1DeceasedPublic.id,
      person_b_id: p3Living.id,
      start_date: null,
      start_date_precision: 'unknown',
      start_year: null,
      start_place: null,
      end_date: null,
      end_date_precision: 'unknown',
      end_year: null,
      end_place: null,
      notes: null,
      created_by: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      archived_at: null,
    };

    const source: Source = {
      id: 'src-1',
      title: 'Registre paroissial de Habses',
      source_type: 'parish_register',
      author_or_organization: 'Église Mor Hadbshabo',
      source_date: '1880-1915',
      archive_reference: 'REG-01',
      url: 'https://archives.example.com',
      description: 'Actes de baptême et mariage',
      private_notes: 'Numéro de téléphone privé du prêtre conservateur',
      is_public: true,
      rights_status: 'Domaine public',
      created_by: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };

    it('generates valid GEDCOM header and trailer', () => {
      const ged = generateGedcom([p1DeceasedPublic], [], [source]);
      expect(ged).toContain('0 HEAD');
      expect(ged).toContain('1 GEDC');
      expect(ged).toContain('2 VERS 5.5.1');
      expect(ged).toContain('1 CHAR UTF-8');
      expect(ged).toContain('0 TRLR');
    });

    it('includes deceased public persons and formats vital facts', () => {
      const ged = generateGedcom([p1DeceasedPublic, p2DeceasedPublic], [relSpouse], [source]);

      // Pierre Dupont
      expect(ged).toContain('1 NAME Pierre /DUPONT/');
      expect(ged).toContain('2 GIVN Pierre');
      expect(ged).toContain('2 SURN DUPONT');
      expect(ged).toContain('1 _AKAN Dupond');
      expect(ged).toContain('1 SEX M');
      expect(ged).toContain('2 DATE 14 JUL 1842');
      expect(ged).toContain('1 DEAT Y');
      expect(ged).toContain('2 DATE 1912');
      expect(ged).toContain('1 OCCU Agriculteur');

      // Marie Leclerc
      expect(ged).toContain('1 NAME Marie /LECLERC/');
      expect(ged).toContain('2 DATE ABT 1845');

      // Family unit
      expect(ged).toContain('0 @F');
      expect(ged).toContain('1 MARR');
      expect(ged).toContain('2 DATE 1868');
      expect(ged).toContain('2 PLAC Habses');
    });

    it('STRICT PRIVACY: never includes living persons or unknown status persons', () => {
      const allPersons = [p1DeceasedPublic, p2DeceasedPublic, p3Living, p4UnknownStatus];
      const allRels = [relSpouse, relWithLiving];

      const ged = generateGedcom(allPersons, allRels, [source]);

      // Must NOT contain Thomas Dupont (living) or Inconnu Mystere (unknown status)
      expect(ged).not.toContain('Thomas');
      expect(ged).not.toContain('Mystere');
      expect(ged).not.toContain('1985');
      expect(ged).not.toContain('Descendant contemporain vivant');

      // Must NOT export relationship linking the living individual
      expect(ged).not.toContain(p3Living.id.replace(/-/g, '').substring(0, 16));
    });

    it('STRICT PRIVACY: never includes private notes of sources', () => {
      const ged = generateGedcom([p1DeceasedPublic], [], [source]);
      expect(ged).toContain('Registre paroissial de Habses');
      expect(ged).not.toContain('Numéro de téléphone privé');
    });

    it('generatePublicJsonExport respects strict privacy', () => {
      const allPersons = [p1DeceasedPublic, p2DeceasedPublic, p3Living, p4UnknownStatus];
      const allRels = [relSpouse, relWithLiving];

      const json = generatePublicJsonExport(allPersons, allRels, [source]);

      expect(json.counts.persons).toBe(2); // Only p1 and p2
      expect(json.counts.relationships).toBe(1); // Only relSpouse
      expect(json.counts.sources).toBe(1);

      // Verify no living person in persons array
      expect(json.persons.some((p) => p.first_names === 'Thomas')).toBe(false);
      expect(json.persons.some((p) => p.last_name === 'Mystere')).toBe(false);

      // Verify no private notes in sources array
      const exportedSource = json.sources[0] as unknown as Record<string, unknown>;
      expect(exportedSource.private_notes).toBeUndefined();
    });
  });
});
