import { NextRequest, NextResponse } from 'next/server';
import {
  getLLMConfig,
  setLLMConfig,
  resolveBaseUrl,
  DEFAULT_LLM_CONFIG,
  PROVIDERS,
  MODEL_CATALOG,
  type LLMProviderConfig,
  type LLMProvider,
} from '@/lib/agent/llm';

export async function GET() {
  const config = await getLLMConfig();

  // Mask the API key for security
  const maskedConfig = {
    ...config,
    apiKey: config.apiKey ? `${config.apiKey.slice(0, 8)}...${config.apiKey.slice(-4)}` : '',
  };

  return NextResponse.json({
    config: maskedConfig,
    providers: Object.entries(PROVIDERS).map(([id, p]) => ({ id, ...p })),
    models: MODEL_CATALOG,
    defaultModel: DEFAULT_LLM_CONFIG.model,
    defaultProvider: DEFAULT_LLM_CONFIG.provider,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, apiKey, baseUrl, model, maxTokens, temperature } = body as Partial<LLMProviderConfig>;

    if (!provider || !apiKey || !model) {
      return NextResponse.json({ error: 'provider, apiKey, and model are required' }, { status: 400 });
    }

    const resolvedBaseUrl = baseUrl || PROVIDERS[provider as LLMProvider]?.baseUrl || '';
    if (!resolvedBaseUrl) {
      return NextResponse.json({ error: 'baseUrl is required for this provider' }, { status: 400 });
    }

    await setLLMConfig({
      provider: provider as LLMProvider,
      apiKey,
      baseUrl: resolvedBaseUrl,
      model,
      maxTokens: maxTokens || 4096,
      temperature: temperature !== undefined ? temperature : 0.7,
    });

    return NextResponse.json({ success: true, message: 'LLM configuration updated' });
  } catch (error) {
    console.error('LLM config error:', error);
    return NextResponse.json({ error: 'Failed to update LLM configuration' }, { status: 500 });
  }
}
