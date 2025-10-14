export type InterestVector = Record<string, number>;

export function cosineSimilarity(a: InterestVector, b: InterestVector): number {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  if (keys.size === 0) {
    return 0;
  }

  let dot = 0;
  let magA = 0;
  let magB = 0;

  keys.forEach((key) => {
    const valueA = a[key] ?? 0;
    const valueB = b[key] ?? 0;
    dot += valueA * valueB;
    magA += valueA * valueA;
    magB += valueB * valueB;
  });

  if (magA === 0 || magB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export function mergeInterestVectors(
  base: InterestVector,
  delta: InterestVector,
  weight: number
): InterestVector {
  const result: InterestVector = { ...base };
  Object.entries(delta).forEach(([key, value]) => {
    const current = result[key] ?? 0;
    result[key] = clamp(current + value * weight, 0, 1);
  });
  return result;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function normalizeVector(vector: InterestVector): InterestVector {
  const sum = Object.values(vector).reduce((total, value) => total + Math.abs(value), 0);
  if (sum === 0) {
    return { ...vector };
  }
  const normalized: InterestVector = {};
  Object.entries(vector).forEach(([key, value]) => {
    normalized[key] = value / sum;
  });
  return normalized;
}

export function buildInterestVectorFromTags(tags: string[]): InterestVector {
  if (tags.length === 0) {
    return {};
  }

  const vector: InterestVector = {};
  const weight = 1 / tags.length;
  tags.forEach((tag) => {
    const trimmed = tag.trim().toLowerCase();
    if (!trimmed) {
      return;
    }
    vector[trimmed] = (vector[trimmed] ?? 0) + weight;
  });
  return normalizeVector(vector);
}
