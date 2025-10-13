export interface RawAIResponse {
  text: string;
  model: string;
  reasoning?: string;
  timestamp?: string;
}

export interface HarmonizedResponse {
  text: string;
  reasoning: string;
  ethics: {
    truthSeeking: boolean;
    empathyDriven: boolean;
    userPrivacy: boolean;
  };
  model: string;
  timestamp: string;
}

export function harmonizeResponse(aiResponse: RawAIResponse): HarmonizedResponse {
  const timestamp = aiResponse.timestamp ?? new Date().toISOString();
  return {
    text: aiResponse.text,
    reasoning: aiResponse.reasoning ?? 'Harmonia transparent mode active.',
    ethics: {
      truthSeeking: true,
      empathyDriven: true,
      userPrivacy: true,
    },
    model: aiResponse.model,
    timestamp,
  };
}

export function enforceEmpatheticTone(text: string) {
  return text.replace(/\b(you|they)\b/gi, (match) => match.toLowerCase());
}
