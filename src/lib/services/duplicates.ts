/**
 * Calculates string similarity using bigram / trigram Dice coefficient.
 * Case and accent normalized.
 */
export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function computeBigramSimilarity(a: string, b: string): number {
  const normA = normalizeString(a);
  const normB = normalizeString(b);

  if (normA === normB) return 1.0;
  if (normA.length < 2 || normB.length < 2) return 0.0;

  const bigramsA = new Map<string, number>();
  for (let i = 0; i < normA.length - 1; i++) {
    const bg = normA.substring(i, i + 2);
    bigramsA.set(bg, (bigramsA.get(bg) ?? 0) + 1);
  }

  let matches = 0;
  for (let i = 0; i < normB.length - 1; i++) {
    const bg = normB.substring(i, i + 2);
    const count = bigramsA.get(bg) ?? 0;
    if (count > 0) {
      bigramsA.set(bg, count - 1);
      matches++;
    }
  }

  const total = normA.length - 1 + normB.length - 1;
  return (2 * matches) / total;
}

export interface DuplicateCheckInput {
  first_names: string;
  last_name: string;
  birth_year?: number | null;
  death_year?: number | null;
}

export interface DuplicateMatchResult {
  score: number; // 0 to 100
  reasons: string[];
}

/**
 * Evaluates duplicate likelihood score between two persons without automatic merging.
 * Compliant with Section 5.4.
 */
export function evaluateDuplicateScore(
  inputA: DuplicateCheckInput,
  inputB: DuplicateCheckInput
): DuplicateMatchResult {
  const lastSim = computeBigramSimilarity(inputA.last_name, inputB.last_name);
  const firstSim = computeBigramSimilarity(inputA.first_names, inputB.first_names);

  let score = 0;
  const reasons: string[] = [];

  // Names evaluation (up to 70 points)
  score += Math.round(lastSim * 40);
  score += Math.round(firstSim * 30);

  if (lastSim >= 0.85) {
    reasons.push('Nom de famille identique ou très approchant');
  }
  if (firstSim >= 0.85) {
    reasons.push('Prénom identique ou très approchant');
  }

  // Birth year evaluation (up to 15 points)
  if (inputA.birth_year && inputB.birth_year) {
    const diff = Math.abs(inputA.birth_year - inputB.birth_year);
    if (diff === 0) {
      score += 15;
      reasons.push(`Même année de naissance (${inputA.birth_year})`);
    } else if (diff <= 2) {
      score += 8;
      reasons.push(`Années de naissance très proches (${inputA.birth_year} vs ${inputB.birth_year})`);
    }
  }

  // Death year evaluation (up to 15 points)
  if (inputA.death_year && inputB.death_year) {
    const diff = Math.abs(inputA.death_year - inputB.death_year);
    if (diff === 0) {
      score += 15;
      reasons.push(`Même année de décès (${inputA.death_year})`);
    } else if (diff <= 2) {
      score += 8;
      reasons.push(`Années de décès très proches (${inputA.death_year} vs ${inputB.death_year})`);
    }
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    reasons,
  };
}
