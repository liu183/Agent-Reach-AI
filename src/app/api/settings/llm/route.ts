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

// Test model connectivity without saving
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, apiKey, baseUrl, model } = body as Partial<LLMProviderConfig>;

    if (!provider || !apiKey || !model) {
      return NextResponse.json({ success: false, error: 'provider, apiKey, and model are required' }, { status: 400 });
    }

    const resolvedBaseUrl = baseUrl || PROVIDERS[provider as LLMProvider]?.baseUrl || '';
    if (!resolvedBaseUrl) {
      return NextResponse.json({ success: false, error: 'baseUrl is required for this provider' }, { status: 400 });
    }

    const startTime = Date.now();
    const url = `${resolvedBaseUrl}/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Reply with exactly: Connection successful!' },
        ],
        max_tokens: 50,
        temperature: 0,
      }),
      signal: AbortSignal.timeout(30000),
    });

    const latency = Date.now() - startTime;

    if (!response.ok) {
      let errorMsg = `HTTP ${response.status}`;
      try {
        const errBody = await response.json();
        errorMsg = errBody?.error?.message || errBody?.message || errorMsg;
      } catch { /* use default error */ }
      return NextResponse.json({
        success: false,
        error: errorMsg,
        latency,
        status: response.status,
      });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || '';
    const modelUsed = data.model || model;

    return NextResponse.json({
      success: true,
      message: 'Model connection successful',
      reply: reply.substring(0, 200),
      modelUsed,
      latency,
    });
  } catch (error) {
    const latency = 0;
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      latency,
    });
  }
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
