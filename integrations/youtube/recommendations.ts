import { analyzeResonance, type ResonanceTone } from '../../src/utils/resonance';
import {
  cosineSimilarity,
  normalizeVector,
  buildInterestVectorFromTags,
  clamp,
  type InterestVector,
} from '../../src/utils/vector';
import type {
  HarmoniaResonanceProfile,
  ResonanceRecommendation,
  YouTubeVideoMetadata,
} from './types';

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function vectorFromText(text: string, weight: number): InterestVector {
  if (!text.trim()) {
    return {};
  }
  const tokens = tokenize(text);
  const vector: InterestVector = {};
  const increment = weight / tokens.length;
  tokens.forEach((token) => {
    vector[token] = (vector[token] ?? 0) + increment;
  });
  return normalizeVector(vector);
}

function computeVideoEmbedding(video: YouTubeVideoMetadata): InterestVector {
  const tagVector = buildInterestVectorFromTags(video.tags ?? []);
  const descriptionVector = vectorFromText(video.description ?? '', 0.6);
  const titleVector = vectorFromText(video.title ?? '', 0.4);
  const transcriptVector = vectorFromText(video.transcript ?? '', 0.8);
  const combined: InterestVector = { ...tagVector };

  const merge = (source: InterestVector, factor: number) => {
    Object.entries(source).forEach(([key, value]) => {
      combined[key] = (combined[key] ?? 0) + value * factor;
    });
  };

  merge(descriptionVector, 0.7);
  merge(titleVector, 0.5);
  merge(transcriptVector, 0.9);

  return normalizeVector(combined);
}

function computeToneAlignment(video: YouTubeVideoMetadata, profile: HarmoniaResonanceProfile): ResonanceTone {
  const summary = `${video.title}\n${video.description}`;
  const analysis = analyzeResonance(summary, { role: 'ally' });

  let strongestTone: ResonanceTone = analysis.tone;
  let bestScore = 0;
  (Object.entries(profile.toneWeights) as Array<[ResonanceTone, number]>).forEach(([tone, weight]) => {
    const adjusted = weight ?? 0;
    if (adjusted > bestScore) {
      strongestTone = tone;
      bestScore = adjusted;
    }
  });

  return strongestTone;
}

function computeResonanceScore(
  profile: HarmoniaResonanceProfile,
  embedding: InterestVector,
  tone: ResonanceTone
): { score: number; alignment: number } {
  const similarity = cosineSimilarity(profile.interestVector, embedding);
  const toneWeight = profile.toneWeights[tone] ?? 0.25;
  const alignment = clamp(similarity * 0.7 + toneWeight * 0.3, 0, 1);
  const chromaAffinity = profile.affinityTags.includes(tone) ? 0.1 : 0;
  const score = clamp(alignment + chromaAffinity, 0, 1);
  return { score, alignment };
}

export function generateResonanceRecommendations(
  profile: HarmoniaResonanceProfile,
  videos: YouTubeVideoMetadata[],
  limit = 12
): ResonanceRecommendation[] {
  const recommendations: ResonanceRecommendation[] = [];

  videos.forEach((video) => {
    const embedding = computeVideoEmbedding(video);
    const tone = computeToneAlignment(video, profile);
    const { score, alignment } = computeResonanceScore(profile, embedding, tone);
    const threadIntensity = clamp(score * 0.85 + alignment * 0.15, 0, 1);

    if (score < 0.15) {
      return;
    }

    recommendations.push({
      video,
      tone,
      score,
      alignment,
      threadIntensity,
    });
  });

  return recommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function generateResonantSearchRecommendations(
  profile: HarmoniaResonanceProfile,
  videos: YouTubeVideoMetadata[],
  query: string,
  limit = 12
): ResonanceRecommendation[] {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  const queryVector = normalizeVector(vectorFromText(trimmedQuery, 1));
  const recommendations: ResonanceRecommendation[] = [];

  videos.forEach((video) => {
    const embedding = computeVideoEmbedding(video);
    const tone = computeToneAlignment(video, profile);
    const { score: resonanceScore, alignment } = computeResonanceScore(profile, embedding, tone);
    const queryMatch = clamp(cosineSimilarity(queryVector, embedding), 0, 1);

    if (queryMatch < 0.08) {
      return;
    }

    const score = clamp(queryMatch * 0.6 + resonanceScore * 0.4, 0, 1);
    const threadIntensity = clamp(alignment * 0.4 + queryMatch * 0.6, 0, 1);

    recommendations.push({
      video,
      tone,
      score,
      alignment,
      threadIntensity,
    });
  });

  return recommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
