import { NextRequest, NextResponse } from 'next/server';
import { PROVIDERS, type LLMProvider } from '@/lib/agent/llm';

interface ModelEntry {
  id: string;
  name: string;
  provider: LLMProvider;
  description: string;
  contextLength: number;
  category: string;
  source: 'api' | 'catalog';
}

/**
 * GET /api/settings/llm/models?provider=nvidia&apiKey=xxx&baseUrl=xxx
 * Fetch available models from the provider's /models endpoint.
 * Falls back to the hardcoded catalog if the API call fails.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider') as LLMProvider | null;
    const apiKey = searchParams.get('apiKey') || '';
    const baseUrl = searchParams.get('baseUrl') || '';

    if (!provider || !apiKey) {
      return NextResponse.json({ error: 'provider and apiKey are required' }, { status: 400 });
    }

    const resolvedBaseUrl = baseUrl || PROVIDERS[provider]?.baseUrl || '';
    if (!resolvedBaseUrl) {
      return NextResponse.json({ error: 'baseUrl is required for this provider' }, { status: 400 });
    }

    // Try fetching from provider's /models API
    let apiModels: ModelEntry[] = [];

    try {
      const modelsUrl = `${resolvedBaseUrl}/models`;
      const resp = await fetch(modelsUrl, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        signal: AbortSignal.timeout(15000),
      });

      if (resp.ok) {
        const data = await resp.json();
        const rawModels = data?.data || data?.models || [];

        // Map API response to our format
        apiModels = rawModels
          .map((m: { id: string; name?: string; owned_by?: string; context_length?: number; max_model_len?: number; description?: string }) => {
            const modelId = m.id || '';
            // Skip embedding models and image models — keep text/chat models
            const skipPatterns = /embed|embedding|image|tts|stt|whisper|dall-e|moderat|bark|xtts/i;
            if (skipPatterns.test(modelId)) return null;

            // Infer context length
            let contextLength = m.context_length || m.max_model_len || 131072;
            if (typeof contextLength !== 'number' || contextLength <= 0) contextLength = 131072;

            // Infer category from model name
            let category = 'General';
            if (/flash|mini|small|tiny|nano|lite|turbo/i.test(modelId)) category = 'Fast';
            else if (/pro|ultra|flagship|plus|max|large/i.test(modelId)) category = 'Flagship';
            else if (/code|coder|codin/i.test(modelId)) category = 'Code';
            else if (/reason|think|o1|o3|deep/i.test(modelId)) category = 'Reasoning';
            else if (/vision|multimodal|omni|vlm/i.test(modelId)) category = 'Multimodal';
            else if (/audio|tts|speech|voice/i.test(modelId)) category = 'Audio';
            else if (/embed/i.test(modelId)) return null; // skip embeddings

            // Clean name
            const displayName = m.name || modelId;

            return {
              id: modelId,
              name: displayName,
              provider,
              description: m.description || `Model from ${PROVIDERS[provider]?.name || provider}`,
              contextLength,
              category,
              source: 'api' as const,
            };
          })
          .filter(Boolean) as ModelEntry[];

        // Sort by category then name
        const categoryOrder = { Flagship: 0, Reasoning: 1, General: 2, Code: 3, Multimodal: 4, Audio: 5, Fast: 6 };
        apiModels.sort((a, b) =>
          (categoryOrder[a.category] ?? 7) - (categoryOrder[b.category] ?? 7) ||
          a.name.localeCompare(b.name)
        );
      }
    } catch (err) {
      console.error('Failed to fetch models from API:', err instanceof Error ? err.message : 'Unknown');
    }

    return NextResponse.json({
      models: apiModels,
      count: apiModels.length,
      source: apiModels.length > 0 ? 'api' : 'none',
    });
  } catch (error) {
    console.error('Models fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch models' }, { status: 500 });
  }
}
