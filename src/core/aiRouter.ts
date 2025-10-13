import { useAIStore, type AIConnection } from '../store/aiStore';
import { useAuthStore } from '../store/authStore';
import { AI_DEFAULT_ENDPOINTS, isOnlineModel } from './aiRegistry';
import { harmonizeResponse, type HarmonizedResponse } from './harmoniaEthics';
import {
  composePersonaPrompt,
  parsePersonaResponse,
} from './harmoniaPersonality';
import { sanitizePayloadForAI, type DataLayer } from './dataAccess';
import { logAIIntegration } from '../utils/logger';

interface AIQueryOptions {
  payload?: Record<string, DataLayer<unknown>>;
}

interface ModelInvocationResult {
  text: string;
  model: string;
  reasoning?: string;
}

interface PersonaPromptPayload {
  conversation: string;
  contextNote?: string;
}

function resolveEndpoint(connection: AIConnection) {
  if (connection.endpoint) {
    return connection.endpoint;
  }
  return AI_DEFAULT_ENDPOINTS[connection.modelType] ?? '';
}

async function performFetch(
  endpoint: string,
  body: unknown,
  headers: Record<string, string>
) {
  if (typeof fetch === 'undefined') {
    throw new Error('Fetch API unavailable in current environment.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const init: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    };
    if (typeof window !== 'undefined') {
      init.mode = 'cors';
    }

    const response = await fetch(endpoint, init);

    clearTimeout(timeoutId);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Endpoint responded with ${response.status}: ${text}`);
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

function extractText(data: unknown) {
  if (!data || typeof data !== 'object') {
    return String(data ?? '');
  }

  const candidate = data as Record<string, unknown>;
  if (Array.isArray(candidate.choices)) {
    const first = candidate.choices[0] as Record<string, unknown> | undefined;
    if (first) {
      if (typeof first.text === 'string') {
        return first.text;
      }
      const message = first.message as Record<string, unknown> | undefined;
      if (message && typeof message.content === 'string') {
        return message.content;
      }
    }
  }

  if (typeof candidate.output === 'string') {
    return candidate.output;
  }
  if (typeof candidate.text === 'string') {
    return candidate.text;
  }

  return JSON.stringify(candidate);
}

async function callOpenAIEndpoint(query: string, connection: AIConnection) {
  if (!connection.apiKey) {
    throw new Error('API key required for ChatGPT connection.');
  }

  const endpoint = resolveEndpoint(connection);
  const payload = {
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'You are operating inside Harmonia. Honor truth, empathy, and user sovereignty.',
      },
      { role: 'user', content: query },
    ],
  };
  const data = await performFetch(endpoint, payload, {
    Authorization: `Bearer ${connection.apiKey}`,
  });
  return {
    text: extractText(data),
    model: 'ChatGPT',
    reasoning: 'OpenAI completion routed through Harmonia ethics gateway.',
  };
}

async function callGeminiEndpoint(query: string, connection: AIConnection) {
  if (!connection.apiKey) {
    throw new Error('API key required for Gemini connection.');
  }

  const endpoint = `${resolveEndpoint(connection)}:generateContent?key=${connection.apiKey}`;
  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: query }],
      },
    ],
  };
  const data = await performFetch(endpoint, payload, {});
  return {
    text: extractText(data),
    model: 'Gemini',
    reasoning: 'Gemini generative interface harmonized for transparency.',
  };
}

async function callGrokEndpoint(query: string, connection: AIConnection) {
  if (!connection.apiKey) {
    throw new Error('API key required for Grok connection.');
  }

  const endpoint = resolveEndpoint(connection);
  const payload = {
    input: query,
  };
  const data = await performFetch(endpoint, payload, {
    Authorization: `Bearer ${connection.apiKey}`,
  });
  return {
    text: extractText(data),
    model: 'Grok',
    reasoning: 'Grok routed through Harmonia empathy protocol.',
  };
}

async function callDeepBlueEndpoint(query: string, connection: AIConnection) {
  if (!connection.apiKey) {
    throw new Error('API key required for DeepBlue connection.');
  }

  const endpoint = resolveEndpoint(connection);
  const payload = {
    query,
  };
  const data = await performFetch(endpoint, payload, {
    'X-API-Key': connection.apiKey,
  });
  return {
    text: extractText(data),
    model: 'DeepBlue',
    reasoning: 'DeepBlue analytical engine synchronized with Harmonia transparency.',
  };
}

async function callLocalModel(query: string, connection: AIConnection) {
  const endpoint = resolveEndpoint(connection);
  const payload = {
    prompt: query,
  };

  if (typeof fetch === 'undefined') {
    return {
      text: `Local model offline. Stored prompt: ${query}`,
      model: 'Local Model',
      reasoning: 'Simulated local model response in non-browser environment.',
    };
  }

  const data = await performFetch(endpoint, payload, {});
  return {
    text: extractText(data),
    model: 'Local Model',
    reasoning: 'Local inference executed within sandbox.',
  };
}

async function callCustomAPI(query: string, connection: AIConnection) {
  const endpoint = resolveEndpoint(connection);
  if (!endpoint) {
    throw new Error('Custom API endpoint is required.');
  }

  const payload = {
    query,
  };

  const headers: Record<string, string> = {};
  if (connection.apiKey) {
    headers.Authorization = `Bearer ${connection.apiKey}`;
  }
  const data = await performFetch(endpoint, payload, headers);
  return {
    text: extractText(data),
    model: connection.name,
    reasoning: 'Custom API invoked through Harmonia router.',
  };
}

async function dispatchModel(
  connection: AIConnection,
  query: string
): Promise<ModelInvocationResult> {
  switch (connection.modelType) {
    case 'ChatGPT':
      return callOpenAIEndpoint(query, connection);
    case 'Gemini':
      return callGeminiEndpoint(query, connection);
    case 'Grok':
      return callGrokEndpoint(query, connection);
    case 'DeepBlue':
      return callDeepBlueEndpoint(query, connection);
    case 'Local Model':
      return callLocalModel(query, connection);
    default:
      return callCustomAPI(query, connection);
  }
}

export async function initializeAIRouter(userId?: string | null) {
  const state = useAIStore.getState();
  const effectiveUserId = userId ?? useAuthStore.getState().user?.id ?? null;
  if (!state.isHydrated || state.hydratedUserId !== effectiveUserId) {
    await state.hydrate(effectiveUserId);
  }
}

function buildQueryFromPayload(
  baseQuery: string,
  payload?: Record<string, unknown>
) : PersonaPromptPayload {
  if (!payload) {
    return {
      conversation: baseQuery,
      contextNote: undefined,
    };
  }

  const contextString = JSON.stringify(payload, null, 2);

  return {
    conversation: `${baseQuery}\n\nContext: ${contextString}`,
    contextNote: contextString,
  };
}

async function executeConnectionQuery(
  connection: AIConnection,
  query: string,
  payload?: Record<string, unknown>
) {
  const { conversation, contextNote } = buildQueryFromPayload(query, payload);
  const personaPrompt = composePersonaPrompt(conversation, {
    connectionLabel: connection.name,
    modelType: connection.modelType,
  }, contextNote);

  const result = await dispatchModel(connection, personaPrompt);
  const personaResponse = parsePersonaResponse(result.text);
  useAIStore.getState().markStatus(connection.id, 'online');
  await logAIIntegration(`Query routed through ${connection.name}`);
  return harmonizeResponse({
    ...result,
    text: personaResponse.text,
    reasoning: personaResponse.reasoning ?? result.reasoning,
    model: connection.modelType,
  });
}

export async function routeAIQuery(
  query: string,
  options: AIQueryOptions = {}
): Promise<HarmonizedResponse> {
  const { connections, activeConnectionId } = useAIStore.getState();
  if (connections.length === 0) {
    throw new Error('No AI connections configured.');
  }

  const payload = options.payload ? sanitizePayloadForAI(options.payload) : undefined;
  const ordered = connections
    .filter((connection) => connection.isEnabled)
    .sort((a, b) => (a.id === activeConnectionId ? -1 : b.id === activeConnectionId ? 1 : 0));

  if (ordered.length === 0) {
    throw new Error('No enabled AI connections available.');
  }

  for (const connection of ordered) {
    try {
      return await executeConnectionQuery(connection, query, payload);
    } catch (error) {
      const message = (error as Error).message;
      useAIStore.getState().markStatus(connection.id, 'error', message);
      await logAIIntegration(`Routing failure for ${connection.name}: ${message}`);
    }
  }

  throw new Error('All AI connections failed.');
}

export async function routeAIQueryForConnection(
  connectionId: string,
  query: string,
  options: AIQueryOptions = {}
): Promise<HarmonizedResponse> {
  const { connections } = useAIStore.getState();
  const connection = connections.find((item) => item.id === connectionId);

  if (!connection) {
    throw new Error('AI connection not found.');
  }

  if (!connection.isEnabled) {
    throw new Error(`${connection.name} is disabled. Enable the connection to chat.`);
  }

  const payload = options.payload ? sanitizePayloadForAI(options.payload) : undefined;

  try {
    return await executeConnectionQuery(connection, query, payload);
  } catch (error) {
    const message = (error as Error).message;
    useAIStore.getState().markStatus(connection.id, 'error', message);
    await logAIIntegration(`Direct chat failure for ${connection.name}: ${message}`);
    throw error;
  }
}

async function probeEndpoint(connection: AIConnection) {
  if (typeof fetch === 'undefined') {
    return true;
  }

  const endpoint = resolveEndpoint(connection);
  if (!endpoint) {
    throw new Error('Endpoint is required.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const init: RequestInit = {
      method: 'OPTIONS',
      headers: connection.apiKey
        ? {
            Authorization: `Bearer ${connection.apiKey}`,
          }
        : undefined,
      signal: controller.signal,
    };
    if (typeof window !== 'undefined') {
      init.mode = 'cors';
    }
    const response = await fetch(endpoint, init);
    clearTimeout(timeoutId);
    if (!response.ok && response.status !== 404) {
      throw new Error(`Endpoint responded with status ${response.status}`);
    }
    return true;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export async function testAIConnection(connection: AIConnection) {
  try {
    if (!connection.endpoint && !AI_DEFAULT_ENDPOINTS[connection.modelType]) {
      throw new Error('Endpoint missing for connection.');
    }

    if (isOnlineModel(connection.modelType) && !connection.apiKey) {
      throw new Error('API key required for online model.');
    }

    await probeEndpoint(connection);
    return { success: true, message: 'Connection validated successfully.' };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}
