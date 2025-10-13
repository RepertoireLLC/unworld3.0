import type { AIModelType } from '../store/aiStore';

export const AI_DEFAULT_ENDPOINTS: Record<AIModelType, string> = {
  ChatGPT: 'https://api.openai.com/v1/chat/completions',
  Gemini: 'https://generativelanguage.googleapis.com/v1beta/models',
  Grok: 'https://api.x.ai/v1/chat',
  DeepBlue: 'https://api.deepblueai.com/v1/query',
  'Custom API': '',
  'Local Model': 'http://localhost:5000',
};

export const AI_MODEL_COLORS: Record<AIModelType, string> = {
  ChatGPT: '#3b82f6',
  Gemini: '#facc15',
  Grok: '#e0f2ff',
  DeepBlue: '#4338ca',
  'Custom API': '#f472b6',
  'Local Model': '#cbd5f5',
};

export const ONLINE_MODELS: AIModelType[] = [
  'ChatGPT',
  'Gemini',
  'Grok',
  'DeepBlue',
  'Custom API',
];

export function isOnlineModel(modelType: AIModelType) {
  return ONLINE_MODELS.includes(modelType) && modelType !== 'Local Model';
}
