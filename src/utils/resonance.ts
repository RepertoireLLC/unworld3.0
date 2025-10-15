export type ResonanceTone = 'insight' | 'empathy' | 'stability' | 'alert';

export interface AnalyzeResonanceOptions {
  role?: 'user' | 'ai' | 'observer' | 'ally';
  conversationActivity?: number;
  previousCoherence?: number;
}

export interface AnalyzedResonance {
  tone: ResonanceTone;
  magnitude: number;
  coherence: number;
  spectrum: [number, number, number];
  preview: string;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

const toneKeywordMap: Record<ResonanceTone, string[]> = {
  insight: ['idea', 'discover', 'map', 'pattern', 'trace', 'vision', 'clarity', 'decode'],
  empathy: ['feel', 'support', 'care', 'listening', 'holding', 'together', 'understand'],
  stability: ['steady', 'ground', 'calm', 'breath', 'balance', 'anchor', 'align'],
  alert: ['warn', 'urgent', 'critical', 'threat', 'signal', 'alert', 'breach', 'distress'],
};

const roleTonePreference: Partial<Record<Required<AnalyzeResonanceOptions>['role'], ResonanceTone>> = {
  ai: 'insight',
  observer: 'stability',
  ally: 'empathy',
};

const toneColorMap: Record<ResonanceTone, string> = {
  insight: '#f6c34c',
  empathy: '#c084fc',
  stability: '#38bdf8',
  alert: '#f97316',
};

function detectTone(content: string, role?: AnalyzeResonanceOptions['role']): ResonanceTone {
  const lowerContent = content.toLowerCase();
  const keywordMatches = (tone: ResonanceTone) =>
    toneKeywordMap[tone].reduce((count, keyword) => (lowerContent.includes(keyword) ? count + 1 : count), 0);

  let detectedTone: ResonanceTone = 'stability';
  let maxScore = -1;
  (Object.keys(toneKeywordMap) as ResonanceTone[]).forEach((tone) => {
    const score = keywordMatches(tone);
    if (score > maxScore) {
      maxScore = score;
      detectedTone = tone;
    }
  });

  if (maxScore === 0 && role && roleTonePreference[role]) {
    return roleTonePreference[role]!;
  }

  if (maxScore === 0) {
    const normalizedLength = clamp(content.length / 180, 0, 1);
    if (normalizedLength > 0.65) {
      return 'insight';
    }
    if (normalizedLength > 0.35) {
      return 'empathy';
    }
  }

  return detectedTone;
}

function deriveSpectrum(tone: ResonanceTone, coherence: number, magnitude: number): [number, number, number] {
  const base = 0.2;
  switch (tone) {
    case 'insight':
      return [clamp(magnitude, base, 1), clamp(coherence, base, 1), clamp(0.5 + magnitude * 0.4, base, 1)];
    case 'empathy':
      return [clamp(0.45 + coherence * 0.3, base, 1), clamp(magnitude, base, 1), clamp(0.35 + coherence * 0.4, base, 1)];
    case 'alert':
      return [clamp(0.6 + magnitude * 0.3, base, 1), clamp(0.25 + coherence * 0.4, base, 1), clamp(0.2 + magnitude * 0.2, base, 1)];
    case 'stability':
    default:
      return [clamp(0.3 + coherence * 0.3, base, 1), clamp(0.4 + magnitude * 0.2, base, 1), clamp(coherence, base, 1)];
  }
}

function normalizeContentPreview(content: string): string {
  const trimmed = content.trim();
  if (trimmed.length <= 140) {
    return trimmed;
  }
  return `${trimmed.slice(0, 132)}…`;
}

export function analyzeResonance(
  content: string,
  options: AnalyzeResonanceOptions = {}
): AnalyzedResonance {
  const sanitized = content.replace(/\s+/g, ' ').trim();
  const baselineMagnitude = clamp(sanitized.length / 280, 0.05, 1);
  const activityBoost = options.conversationActivity ? clamp(options.conversationActivity / 12, 0, 0.2) : 0;
  const magnitude = clamp(baselineMagnitude + activityBoost, 0.05, 1);

  const tone = detectTone(sanitized, options.role);
  const keywordBonus = toneKeywordMap[tone].some((keyword) => sanitized.toLowerCase().includes(keyword)) ? 0.15 : 0;
  const coherenceBaseline = clamp(0.45 + keywordBonus, 0, 1);
  const previousInfluence = options.previousCoherence ? options.previousCoherence * 0.25 : 0;
  const coherence = clamp(coherenceBaseline + previousInfluence, 0.1, 1);

  const spectrum = deriveSpectrum(tone, coherence, magnitude);
  const preview = normalizeContentPreview(sanitized);

  return {
    tone,
    magnitude,
    coherence,
    spectrum,
    preview,
  };
}

export function toneToSymbolicColor(tone: ResonanceTone): string {
  return toneColorMap[tone];
}

