/**
 * Multi-provider LLM integration
 * Supports: NVIDIA NIM, OpenAI, and any OpenAI-compatible API
 * Default provider: NVIDIA
 */
export type LLMProvider = 'nvidia' | 'openai' | 'xiaomi' | 'custom';

export interface LLMProviderConfig {
  provider: LLMProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface ModelOption {
  id: string;
  name: string;
  provider: LLMProvider;
  description: string;
  contextLength: number;
  category: string;
}

export const PROVIDERS: Record<LLMProvider, { name: string; nameZh: string; baseUrl: string; icon: string; color: string }> = {
  nvidia: {
    name: 'NVIDIA NIM',
    nameZh: '英伟达 NIM',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    icon: 'Cpu',
    color: 'text-green-400',
  },
  openai: {
    name: 'OpenAI',
    nameZh: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    icon: 'Sparkles',
    color: 'text-emerald-400',
  },
  xiaomi: {
    name: 'Xiaomi (MiMo)',
    nameZh: '小米 MiMo',
    baseUrl: 'https://api.mistral.ai/v1',
    icon: 'Smartphone',
    color: 'text-orange-400',
  },
  custom: {
    name: 'Custom (OpenAI-compatible)',
    nameZh: '自定义 (兼容 OpenAI)',
    baseUrl: '',
    icon: 'Settings2',
    color: 'text-violet-400',
  },
};

export const MODEL_CATALOG: ModelOption[] = [
  // ===== NVIDIA / Meta Llama Models =====
  { id: 'meta/llama-3.1-70b-instruct', name: 'Llama 3.1 70B Instruct', provider: 'nvidia', description: 'Meta Llama 3.1, strong general-purpose model', contextLength: 131072, category: 'General' },
  { id: 'meta/llama-3.1-405b-instruct', name: 'Llama 3.1 405B Instruct', provider: 'nvidia', description: 'Largest Llama 3.1 model, best for complex reasoning', contextLength: 131072, category: 'Flagship' },
  { id: 'meta/llama-3.1-8b-instruct', name: 'Llama 3.1 8B Instruct', provider: 'nvidia', description: 'Fast and efficient small model', contextLength: 131072, category: 'Fast' },
  { id: 'meta/llama-3.3-70b-instruct', name: 'Llama 3.3 70B Instruct', provider: 'nvidia', description: 'Latest Llama 3.3, improved multilingual', contextLength: 131072, category: 'General' },
  { id: 'meta/llama-4-maverick-17b-128e-instruct', name: 'Llama 4 Maverick 17Bx128E', provider: 'nvidia', description: 'Llama 4 MoE model with massive expert count', contextLength: 131072, category: 'Flagship' },
  { id: 'meta/codellama-70b', name: 'CodeLlama 70B', provider: 'nvidia', description: 'Specialized for code generation', contextLength: 16384, category: 'Code' },

  // ===== NVIDIA Nemotron Models =====
  { id: 'nvidia/llama-3.1-nemotron-70b-instruct', name: 'Nemotron 70B Instruct', provider: 'nvidia', description: 'NVIDIA-optimized Llama 3.1, strong general-purpose', contextLength: 128000, category: 'General' },
  { id: 'nvidia/llama-3.1-nemotron-ultra-253b-v1', name: 'Nemotron Ultra 253B', provider: 'nvidia', description: 'Largest Nemotron, best for complex reasoning', contextLength: 128000, category: 'General' },
  { id: 'nvidia/llama-3.1-nemotron-51b-instruct', name: 'Nemotron 51B Instruct', provider: 'nvidia', description: 'Compact yet powerful Nemotron model', contextLength: 128000, category: 'General' },
  { id: 'nvidia/llama-3.3-nemotron-super-49b-v1', name: 'Nemotron Super 49B v1', provider: 'nvidia', description: 'Superior performance NVIDIA model', contextLength: 131072, category: 'General' },
  { id: 'nvidia/llama-3.3-nemotron-super-49b-v1.5', name: 'Nemotron Super 49B v1.5', provider: 'nvidia', description: 'Latest improved Nemotron Super', contextLength: 131072, category: 'General' },
  { id: 'nvidia/nemotron-4-340b-instruct', name: 'Nemotron-4 340B Instruct', provider: 'nvidia', description: 'NVIDIA flagship model for instruction following', contextLength: 4096, category: 'Flagship' },
  { id: 'nvidia/nemotron-mini-4b-instruct', name: 'Nemotron Mini 4B', provider: 'nvidia', description: 'Ultra-compact model for fast inference', contextLength: 4096, category: 'Compact' },
  { id: 'nvidia/nemotron-3-super-120b-a12b', name: 'Nemotron 3 Super 120B', provider: 'nvidia', description: 'Nemotron 3 architecture with MoE', contextLength: 131072, category: 'Flagship' },

  // ===== NVIDIA Nemo / Other =====
  { id: 'nv-mistralai/mistral-nemo-12b-instruct', name: 'Mistral Nemo 12B Instruct', provider: 'nvidia', description: 'Mistral Nemo optimized by NVIDIA', contextLength: 131072, category: 'General' },
  { id: 'nvidia/llama3-chatqa-1.5-70b', name: 'Llama3 ChatQA 1.5 70B', provider: 'nvidia', description: 'Retrieval-augmented QA specialist', contextLength: 131072, category: 'RAG' },

  // ===== DeepSeek =====
  { id: 'deepseek-ai/deepseek-v3.2', name: 'DeepSeek V3.2', provider: 'nvidia', description: 'Latest DeepSeek MoE model, excellent reasoning and coding', contextLength: 131072, category: 'Flagship' },
  { id: 'deepseek-ai/deepseek-v3.1-terminus', name: 'DeepSeek V3.1 Terminus', provider: 'nvidia', description: 'DeepSeek V3.1 full-weight version', contextLength: 131072, category: 'General' },
  { id: 'deepseek-ai/deepseek-v4-flash', name: 'DeepSeek V4 Flash', provider: 'nvidia', description: 'DeepSeek V4 ultra-fast variant', contextLength: 131072, category: 'Fast' },
  { id: 'deepseek-ai/deepseek-v4-pro', name: 'DeepSeek V4 Pro', provider: 'nvidia', description: 'DeepSeek V4 Pro, top-tier reasoning', contextLength: 131072, category: 'Flagship' },
  { id: 'deepseek-ai/deepseek-coder-6.7b-instruct', name: 'DeepSeek Coder 6.7B', provider: 'nvidia', description: 'DeepSeek code generation specialist', contextLength: 16384, category: 'Code' },

  // ===== Mistral =====
  { id: 'mistralai/mistral-large-2-instruct', name: 'Mistral Large 2', provider: 'nvidia', description: 'Excellent multilingual and reasoning', contextLength: 128000, category: 'General' },
  { id: 'mistralai/mistral-large-3-675b-instruct-2512', name: 'Mistral Large 3 675B', provider: 'nvidia', description: 'Latest Mistral flagship', contextLength: 131072, category: 'Flagship' },
  { id: 'mistralai/mixtral-8x22b-instruct-v0.1', name: 'Mixtral 8x22B Instruct', provider: 'nvidia', description: 'Mistral MoE model, great performance/efficiency', contextLength: 65536, category: 'General' },
  { id: 'mistralai/mistral-small-4-119b-2603', name: 'Mistral Small 4 119B', provider: 'nvidia', description: 'Balanced performance and cost', contextLength: 131072, category: 'General' },
  { id: 'mistralai/codestral-22b-instruct-v0.1', name: 'Codestral 22B', provider: 'nvidia', description: 'Mistral code generation specialist', contextLength: 32768, category: 'Code' },

  // ===== Qwen =====
  { id: 'qwen/qwen3.5-397b-a17b', name: 'Qwen3.5 397B MoE', provider: 'nvidia', description: 'Alibaba latest flagship MoE model', contextLength: 131072, category: 'Flagship' },
  { id: 'qwen/qwen3.5-122b-a10b', name: 'Qwen3.5 122B MoE', provider: 'nvidia', description: 'Qwen3.5 mid-size MoE', contextLength: 131072, category: 'General' },
  { id: 'qwen/qwen2.5-coder-32b-instruct', name: 'Qwen2.5 Coder 32B', provider: 'nvidia', description: 'Code generation specialist', contextLength: 32768, category: 'Code' },
  { id: 'qwen/qwen3-coder-480b-a35b-instruct', name: 'Qwen3 Coder 480B MoE', provider: 'nvidia', description: 'Alibaba flagship coding MoE model', contextLength: 131072, category: 'Code' },
  { id: 'qwen/qwen3-next-80b-a3b-instruct', name: 'Qwen3 Next 80B MoE', provider: 'nvidia', description: 'Next-gen Qwen3 MoE model', contextLength: 131072, category: 'General' },

  // ===== Google Gemma =====
  { id: 'google/gemma-3-27b-it', name: 'Gemma 3 27B IT', provider: 'nvidia', description: 'Google Gemma 3 optimized by NVIDIA', contextLength: 131072, category: 'General' },
  { id: 'google/gemma-3-12b-it', name: 'Gemma 3 12B IT', provider: 'nvidia', description: 'Compact yet capable Gemma 3', contextLength: 131072, category: 'General' },
  { id: 'google/gemma-4-31b-it', name: 'Gemma 4 31B IT', provider: 'nvidia', description: 'Latest Google Gemma 4', contextLength: 131072, category: 'General' },

  // ===== Microsoft =====
  { id: 'microsoft/phi-4-mini-instruct', name: 'Phi-4 Mini Instruct', provider: 'nvidia', description: 'Microsoft compact model, excellent efficiency', contextLength: 131072, category: 'Compact' },

  // ===== Kimi / Moonshot =====
  { id: 'moonshotai/kimi-k2.5', name: 'Kimi K2.5', provider: 'nvidia', description: 'Moonshot latest long-context model', contextLength: 131072, category: 'Flagship' },
  { id: 'moonshotai/kimi-k2-instruct', name: 'Kimi K2 Instruct', provider: 'nvidia', description: 'Moonshot AI K2 instruction-tuned model', contextLength: 131072, category: 'General' },
  { id: 'moonshotai/kimi-k2-instruct-0905', name: 'Kimi K2 Instruct (0905)', provider: 'nvidia', description: 'Moonshot K2 September update variant', contextLength: 131072, category: 'General' },
  { id: 'moonshotai/kimi-k2-thinking', name: 'Kimi K2 Thinking', provider: 'nvidia', description: 'Moonshot K2 advanced thinking/reasoning model', contextLength: 131072, category: 'Reasoning' },

  // ===== GLM / Zhipu AI =====
  { id: 'z-ai/glm-5.1', name: 'GLM-5.1', provider: 'nvidia', description: 'Zhipu AI latest GLM flagship model', contextLength: 131072, category: 'Flagship' },
  { id: 'z-ai/glm5', name: 'GLM-5', provider: 'nvidia', description: 'Zhipu AI GLM-5 large model', contextLength: 131072, category: 'General' },
  { id: 'z-ai/glm4.7', name: 'GLM-4.7', provider: 'nvidia', description: 'Zhipu AI GLM-4.7 balanced model', contextLength: 131072, category: 'General' },

  // ===== OpenAI on NVIDIA =====
  { id: 'openai/gpt-oss-120b', name: 'GPT-OSS 120B', provider: 'nvidia', description: 'OpenAI open-source model on NVIDIA', contextLength: 131072, category: 'General' },
  { id: 'stockmark/stockmark-2-100b-instruct', name: 'Stockmark 2 100B', provider: 'nvidia', description: 'Financial analysis specialist', contextLength: 131072, category: 'Domain' },
  { id: 'stepfun-ai/step-3.5-flash', name: 'Step 3.5 Flash', provider: 'nvidia', description: 'StepFun ultra-fast model', contextLength: 131072, category: 'Fast' },
  { id: 'minimaxai/minimax-m2.7', name: 'MiniMax M2.7', provider: 'nvidia', description: 'MiniMax latest flagship model', contextLength: 131072, category: 'Flagship' },
  { id: 'minimaxai/minimax-m2.5', name: 'MiniMax M2.5', provider: 'nvidia', description: 'MiniMax M2.5 efficient large model', contextLength: 131072, category: 'General' },
  { id: 'databricks/dbrx-instruct', name: 'DBRX Instruct', provider: 'nvidia', description: 'Databricks open MoE model', contextLength: 32768, category: 'General' },

  // ===== OpenAI Native =====
  { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'openai', description: 'Most capable OpenAI model, multimodal', contextLength: 128000, category: 'Flagship' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', description: 'Fast and affordable', contextLength: 128000, category: 'Fast' },
  { id: 'openai/gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai', description: 'Previous generation flagship', contextLength: 128000, category: 'General' },
  { id: 'openai/o1-preview', name: 'o1 Preview', provider: 'openai', description: 'Advanced reasoning model', contextLength: 128000, category: 'Reasoning' },
  { id: 'openai/o1-mini', name: 'o1 Mini', provider: 'openai', description: 'Compact reasoning model', contextLength: 128000, category: 'Reasoning' },
  { id: 'openai/o3-mini', name: 'o3 Mini', provider: 'openai', description: 'Latest compact reasoning model', contextLength: 200000, category: 'Reasoning' },

  // ===== Xiaomi MiMo Models =====
  { id: 'MiMo-V2.5-Pro', name: 'MiMo V2.5 Pro', provider: 'xiaomi', description: 'MiMo V2.5 Pro - most capable MiMo model with superior reasoning', contextLength: 131072, category: 'Flagship' },
  { id: 'MiMo-V2.5', name: 'MiMo V2.5', provider: 'xiaomi', description: 'MiMo V2.5 - balanced performance and efficiency', contextLength: 131072, category: 'General' },
  { id: 'MiMo-V2.5-TTS-VoiceClone', name: 'MiMo V2.5 TTS VoiceClone', provider: 'xiaomi', description: 'MiMo V2.5 text-to-speech with voice cloning support', contextLength: 32768, category: 'Audio' },
  { id: 'MiMo-V2.5-TTS-VoiceDesign', name: 'MiMo V2.5 TTS VoiceDesign', provider: 'xiaomi', description: 'MiMo V2.5 text-to-speech with custom voice design', contextLength: 32768, category: 'Audio' },
  { id: 'MiMo-V2.5-TTS', name: 'MiMo V2.5 TTS', provider: 'xiaomi', description: 'MiMo V2.5 text-to-speech base model', contextLength: 32768, category: 'Audio' },
  { id: 'MiMo-V2-Pro', name: 'MiMo V2 Pro', provider: 'xiaomi', description: 'MiMo V2 Pro - previous generation Pro model', contextLength: 131072, category: 'General' },
  { id: 'MiMo-V2-Omni', name: 'MiMo V2 Omni', provider: 'xiaomi', description: 'MiMo V2 Omni - multimodal model supporting text, image, and audio', contextLength: 131072, category: 'Multimodal' },
  { id: 'MiMo-V2-TTS', name: 'MiMo V2 TTS', provider: 'xiaomi', description: 'MiMo V2 text-to-speech model', contextLength: 32768, category: 'Audio' },
];

// Default configuration: NVIDIA NIM
// IMPORTANT: No hardcoded API key — users must configure their own key in Settings.
export const DEFAULT_LLM_CONFIG: LLMProviderConfig = {
  provider: 'nvidia',
  apiKey: '',
  baseUrl: PROVIDERS.nvidia.baseUrl,
  model: 'meta/llama-3.1-70b-instruct',
  maxTokens: 4096,
  temperature: 0.7,
};

// ====== Database-backed config (persists across Vercel serverless cold starts) ======
const USER_EMAIL = 'agent@reach.local';

async function getLLMConfigFromDB(): Promise<LLMProviderConfig | null> {
  try {
    const user = await db.user.findFirst({ where: { email: USER_EMAIL } });
    if (!user) return null;
    const settings = JSON.parse(user.settings || '{}');
    return settings.llmConfig || null;
  } catch {
    return null;
  }
}

async function saveLLMConfigToDB(config: LLMProviderConfig): Promise<void> {
  try {
    await db.user.upsert({
      where: { email: USER_EMAIL },
      update: { settings: JSON.stringify({ llmConfig: config }) },
      create: {
        email: USER_EMAIL,
        name: 'Agent Reach User',
        settings: JSON.stringify({ llmConfig: config }),
      },
    });
  } catch (error) {
    console.error('Failed to save LLM config to DB:', error);
  }
}

export async function getLLMConfig(): Promise<LLMProviderConfig> {
  try {
    const config = await getLLMConfigFromDB();
    if (config) return config;
  } catch {
    // DB not available, fall through to defaults
  }
  return { ...DEFAULT_LLM_CONFIG };
}

export async function setLLMConfig(config: Partial<LLMProviderConfig>): Promise<void> {
  const current = await getLLMConfig();
  const newConfig = { ...current, ...config };
  await saveLLMConfigToDB(newConfig);
}

export function resolveBaseUrl(config: LLMProviderConfig): string {
  if (config.baseUrl) return config.baseUrl;
  return PROVIDERS[config.provider]?.baseUrl || PROVIDERS.custom.baseUrl;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Core chat completion — works with any OpenAI-compatible API
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options?: { maxTokens?: number; temperature?: number; model?: string }
): Promise<string> {
  const config = await getLLMConfig();

  if (!config.apiKey) {
    throw new Error('LLM API key not configured. Please set your API key in Settings.');
  }
  const baseUrl = resolveBaseUrl(config);
  const model = options?.model || config.model;
  const maxTokens = options?.maxTokens ?? config.maxTokens;
  const temperature = options?.temperature ?? config.temperature;

  const url = `${baseUrl}/chat/completions`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: maxTokens,
      temperature,
    }),
    signal: AbortSignal.timeout(120000),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`LLM API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Summarize web content using the configured LLM
 */
export async function summarizeWebContent(content: string, prompt: string): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `You are an expert web content summarizer. Analyze web content and provide comprehensive, well-structured summaries in Markdown format. Include key points, important details, and actionable insights. Use headings, bullet points, and code blocks where appropriate. Always respond in the same language as the content unless instructed otherwise.`,
    },
    {
      role: 'user',
      content: `Task: ${prompt}\n\nWeb Content:\n${content}`,
    },
  ];
  return chatCompletion(messages, { maxTokens: 4096 });
}
