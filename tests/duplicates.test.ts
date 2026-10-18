import { describe, it, expect } from 'vitest';
import { evaluateDuplicateScore, computeBigramSimilarity } from '../src/lib/services/duplicates';

describe('Duplicate Person Detection (Specifications v1.0 Section 5.4)', () => {
  it('detects high similarity for identical names and years', () => {
    const result = evaluateDuplicateScore(
      { first_names: 'Pierre', last_name: 'DUPONT', birth_year: 1842, death_year: 1912 },
      { first_names: 'Pierre', last_name: 'Dupont', birth_year: 1842, death_year: 1912 }
    );

    expect(result.score).toBe(100);
    expect(result.reasons).toContain('Nom de famille identique ou très approchant');
    expect(result.reasons).toContain('Prénom identique ou très approchant');
    expect(result.reasons).toContain('Même année de naissance (1842)');
    expect(result.reasons).toContain('Même année de décès (1912)');
  });

  it('detects spelling variations (e.g., Dupont vs Dupond)', () => {
    const sim = computeBigramSimilarity('Dupont', 'Dupond');
    expect(sim).toBeGreaterThan(0.7);

    const result = evaluateDuplicateScore(
      { first_names: 'Pierre Jean', last_name: 'Dupont', birth_year: 1842 },
      { first_names: 'Pierre', last_name: 'Dupond', birth_year: 1842 }
    );

    expect(result.score).toBeGreaterThan(65);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('assigns low score for distinct individuals with same last name', () => {
    const result = evaluateDuplicateScore(
      { first_names: 'Pierre', last_name: 'Dupont', birth_year: 1842, death_year: 1912 },
      { first_names: 'Marguerite', last_name: 'Dupont', birth_year: 1920, death_year: 1995 }
    );

    expect(result.score).toBeLessThan(50);
  });
});
