'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Key, Shield, Save, ExternalLink, Eye, EyeOff, Globe,
  Cpu, Sparkles, Settings2, Check, AlertCircle, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import type { LLMProvider } from '@/lib/agent/llm';
import { apiFetch } from '@/lib/api-client';

// ===== Types =====
interface SettingField {
  key: string;
  label: string;
  description: string;
  placeholder: string;
  type: 'text' | 'password' | 'cookie';
  link?: string;
}

interface ProviderInfo {
  id: string;
  name: string;
  nameZh: string;
  baseUrl: string;
  icon: string;
  color: string;
}

interface ModelInfo {
  id: string;
  name: string;
  provider: LLMProvider;
  description: string;
  contextLength: number;
  category: string;
}

interface LLMSettingsData {
  config: {
    provider: LLMProvider;
    apiKey: string;
    baseUrl: string;
    model: string;
    maxTokens: number;
    temperature: number;
  };
  providers: ProviderInfo[];
  models: ModelInfo[];
  defaultModel: string;
  defaultProvider: LLMProvider;
}

// ===== Channel config fields =====
const apiKeys: SettingField[] = [
  { key: 'jina_api_key', label: 'Jina Reader API Key', description: 'For enhanced Jina Reader access', placeholder: 'jina_xxxxxx', type: 'text', link: 'https://r.jina.ai' },
  { key: 'exa_api_key', label: 'Exa Search API Key', description: 'For AI-powered web search', placeholder: 'exa_xxxxxx', type: 'password', link: 'https://exa.ai' },
  { key: 'groq_api_key', label: 'Groq API Key', description: 'For podcast transcription via Whisper', placeholder: 'gsk_xxxxxx', type: 'password', link: 'https://console.groq.com' },
  { key: 'github_token', label: 'GitHub Token (optional)', description: 'Higher rate limits for GitHub API', placeholder: 'ghp_xxxxxx', type: 'password' },
];

const cookieFields: SettingField[] = [
  { key: 'twitter_cookie', label: 'Twitter/X Cookie', description: 'Auth token for Twitter content access', placeholder: 'auth_token=...', type: 'cookie' },
  { key: 'reddit_cookie', label: 'Reddit Cookie', description: 'Session cookie for Reddit access', placeholder: 'reddit_session=...', type: 'cookie' },
  { key: 'xiaohongshu_cookie', label: 'XiaoHongShu Cookie', description: 'Cookie for XiaoHongShu content', placeholder: 'xhs_token=...', type: 'cookie' },
  { key: 'bilibili_cookie', label: 'Bilibili Cookie', description: 'SESSDATA for Bilibili API', placeholder: 'SESSDATA=...', type: 'cookie' },
  { key: 'xueqiu_cookie', label: 'Xueqiu Cookie', description: 'Cookie for Xueqiu stock data', placeholder: 'xq_a_token=...', type: 'cookie' },
];

// ===== Helpers =====
function formatContextLength(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(0)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return String(n);
}

const providerIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Cpu, Sparkles, Settings2,
};

// ===== Component =====
export function SettingsPanel() {
  // Channel settings state
  const [values, setValues] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [savingChannelSettings, setSavingChannelSettings] = useState(false);

  // Global settings state
  const [globalSettings, setGlobalSettings] = useState({ maxTurns: 15, contentMaxLength: 30000, autoSaveReports: true });
  const [savingGlobal, setSavingGlobal] = useState(false);

  // LLM settings state
  const [llmData, setLlmData] = useState<LLMSettingsData | null>(null);
  const [llmLoading, setLlmLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider>('nvidia');
  const [selectedModel, setSelectedModel] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [customBaseUrl, setCustomBaseUrl] = useState('');
  const [maxTokens, setMaxTokens] = useState(4096);
  const [temperature, setTemperature] = useState(0.7);
  const [showApiKey, setShowApiKey] = useState(false);
  const [savingLlm, setSavingLlm] = useState(false);

  // Fetch LLM config from server
  const fetchLlmConfig = useCallback(async () => {
    try {
      const data = await apiFetch<LLMSettingsData>('/api/settings/llm');
      setLlmData(data);
      setSelectedProvider(data.config.provider);
      setSelectedModel(data.config.model);
      setCustomBaseUrl(data.config.baseUrl || '');
      setMaxTokens(data.config.maxTokens || 4096);
      setTemperature(data.config.temperature ?? 0.7);
      // Pre-fill NVIDIA API key: the server returns a masked key,
      // so we use the real default NVIDIA key for the nvidia provider
      if (data.config.provider === 'nvidia') {
        setApiKeyInput('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');
      } else if (data.config.apiKey) {
        setApiKeyInput(data.config.apiKey);
      }
    } catch {
      toast.error('Failed to load LLM configuration');
    } finally {
      setLlmLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLlmConfig();
  }, [fetchLlmConfig]);

  // Filter models by selected provider
  const filteredModels = llmData?.models.filter((m) => m.provider === selectedProvider) || [];
  const modelCategories = [...new Set(filteredModels.map((m) => m.category))];

  // Channel settings handlers
  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  // Fetch global + channel settings from server
  const fetchGlobalSettings = useCallback(async () => {
    try {
      const data = await apiFetch<{ maxTurns: number; contentMaxLength: number; autoSaveReports: boolean }>('/api/settings/global');
      setGlobalSettings(data);
      // Also load channel settings from global response
      const channelData = await apiFetch<Record<string, string>>('/api/settings/global');
      // Channel keys/cookies are stored in the same global settings
    } catch {
      // silently ignore — defaults will be used
    }
  }, []);

  useEffect(() => {
    fetchGlobalSettings();
  }, [fetchGlobalSettings]);

  const handleSaveChannelSettings = async () => {
    setSavingChannelSettings(true);
    try {
      await apiFetch('/api/settings/global', {
        method: 'POST',
        body: JSON.stringify({ channelKeys: values }),
      });
      toast.success('Channel settings saved');
    } catch {
      toast.error('Failed to save channel settings');
    } finally {
      setSavingChannelSettings(false);
    }
  };

  const handleSaveGlobalSettings = async () => {
    setSavingGlobal(true);
    try {
      await apiFetch('/api/settings/global', {
        method: 'POST',
        body: JSON.stringify(globalSettings),
      });
      toast.success('Global settings saved');
    } catch {
      toast.error('Failed to save global settings');
    } finally {
      setSavingGlobal(false);
    }
  };

  const toggleSecret = (key: string) => {
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // LLM save handler
  const handleSaveLlm = async () => {
    const DEFAULT_NVIDIA_KEY = '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';
    const keyToSave = apiKeyInput || (selectedProvider === 'nvidia' ? DEFAULT_NVIDIA_KEY : '');

    if (!keyToSave) {
      toast.error('Please enter an API key');
      return;
    }

    setSavingLlm(true);
    try {
      const data = await apiFetch<{success?: boolean; error?: string}>('/api/settings/llm', {
        method: 'POST',
        body: JSON.stringify({
          provider: selectedProvider,
          apiKey: keyToSave,
          baseUrl: selectedProvider === 'custom' ? customBaseUrl : undefined,
          model: selectedModel,
          maxTokens,
          temperature,
        }),
      });
      if (data.success) {
        toast.success('LLM configuration saved successfully');
      } else {
        toast.error(data.error || 'Failed to save configuration');
      }
    } catch {
      toast.error('Failed to save LLM configuration');
    } finally {
      setSavingLlm(false);
    }
  };

  // Reset to defaults
  const handleResetLlm = () => {
    if (llmData) {
      setSelectedProvider(llmData.defaultProvider);
      setSelectedModel(llmData.defaultModel);
      setMaxTokens(4096);
      setTemperature(0.7);
      setCustomBaseUrl('');
      toast.info('Reset to default configuration');
    }
  };

  const renderField = (field: SettingField) => (
    <div key={field.key} className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={field.key} className="text-sm font-medium">{field.label}</Label>
        {field.link && (
          <a href={field.link} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-500 hover:underline flex items-center gap-1">
            Get Key <ExternalLink className="size-3" />
          </a>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Input
          id={field.key}
          type={field.type === 'password' && !showSecrets[field.key] ? 'password' : 'text'}
          placeholder={field.placeholder}
          value={values[field.key] || ''}
          onChange={(e) => handleChange(field.key, e.target.value)}
          className="font-mono text-xs"
        />
        {field.type === 'password' && (
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => toggleSecret(field.key)}>
            {showSecrets[field.key] ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{field.description}</p>
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      {/* ===== LLM Model Configuration ===== */}
      <Card className="border-emerald-500/20">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Cpu className="size-4 text-emerald-500" />
            Model Configuration
          </CardTitle>
          <CardDescription>
            Configure the LLM provider and model for content summarization. Default: NVIDIA NIM.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {llmLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <>
              {/* Provider Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Provider</Label>
                <Select value={selectedProvider} onValueChange={(v) => setSelectedProvider(v as LLMProvider)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {llmData?.providers.map((p) => {
                      const IconComp = providerIcons[p.icon] || Cpu;
                      return (
                        <SelectItem key={p.id} value={p.id}>
                          <div className="flex items-center gap-2">
                            <IconComp className={`size-4 ${p.color}`} />
                            <span>{p.name}</span>
                            <span className="text-xs text-muted-foreground">({p.nameZh})</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {selectedProvider === 'nvidia' && 'NVIDIA NIM provides fast, free API access to popular open-source models.'}
                  {selectedProvider === 'openai' && 'OpenAI GPT-4o and o-series models for high-quality summarization.'}
                  {selectedProvider === 'custom' && 'Connect to any OpenAI-compatible API endpoint.'}
                </p>
              </div>

              {/* API Key */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">API Key</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type={showApiKey ? 'text' : 'password'}
                    placeholder="Enter your API key"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    className="font-mono text-xs"
                  />
                  <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setShowApiKey(!showApiKey)}>
                    {showApiKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                </div>
                {!apiKeyInput && llmData?.config.apiKey && (
                  <p className="text-xs text-muted-foreground">
                    Current: {llmData.config.apiKey}
                  </p>
                )}
              </div>

              {/* Custom Base URL (only for custom provider) */}
              {selectedProvider === 'custom' && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Base URL</Label>
                  <Input
                    placeholder="https://your-api.example.com/v1"
                    value={customBaseUrl}
                    onChange={(e) => setCustomBaseUrl(e.target.value)}
                    className="font-mono text-xs"
                  />
                  <p className="text-xs text-muted-foreground">The base URL of your OpenAI-compatible API.</p>
                </div>
              )}

              {/* Model Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Model</Label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {modelCategories.map((cat) => (
                      <SelectGroup key={cat}>
                        <SelectLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {cat}
                        </SelectLabel>
                        {filteredModels
                          .filter((m) => m.category === cat)
                          .map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              <div className="flex flex-col gap-0.5">
                                <span className="text-sm">{m.name}</span>
                                <span className="text-[10px] text-muted-foreground">
                                  {m.description} · {formatContextLength(m.contextLength)} ctx
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
                {selectedModel && (
                  <p className="text-xs text-muted-foreground">
                    {filteredModels.find((m) => m.id === selectedModel)?.description}
                  </p>
                )}
              </div>

              {/* Parameters */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Max Tokens</Label>
                  <Select value={String(maxTokens)} onValueChange={(v) => setMaxTokens(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1024">1,024</SelectItem>
                      <SelectItem value="2048">2,048</SelectItem>
                      <SelectItem value="4096">4,096</SelectItem>
                      <SelectItem value="8192">8,192</SelectItem>
                      <SelectItem value="16384">16,384</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Max output tokens</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Temperature</Label>
                  <Select value={String(temperature)} onValueChange={(v) => setTemperature(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0 (Precise)</SelectItem>
                      <SelectItem value="0.3">0.3 (Focused)</SelectItem>
                      <SelectItem value="0.7">0.7 (Balanced)</SelectItem>
                      <SelectItem value="1">1.0 (Creative)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Response randomness</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" size="sm" onClick={handleResetLlm} className="text-muted-foreground">
                  <RefreshCw className="size-3.5 mr-1.5" />
                  Reset to Default
                </Button>
                <Button onClick={handleSaveLlm} disabled={savingLlm} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                  {savingLlm ? (
                    <>Saving...</>
                  ) : (
                    <>
                      <Save className="size-4" />
                      Save Model Config
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ===== Channel API Keys ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="size-4 text-emerald-500" />
            Channel API Keys
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {apiKeys.map(renderField)}
        </CardContent>
      </Card>

      {/* ===== Channel Cookies ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="size-4 text-amber-500" />
            Channel Cookies
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Cookies are stored locally in your browser. Never share your cookies publicly.
          </p>
          {cookieFields.map(renderField)}
        </CardContent>
      </Card>

      {/* ===== Global Settings ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="size-4 text-violet-500" />
            Global Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Default Max Turns</p>
              <p className="text-xs text-muted-foreground">Maximum agent iterations per browse task</p>
            </div>
            <Select value={String(globalSettings.maxTurns)} onValueChange={(v) => setGlobalSettings(s => ({ ...s, maxTurns: Number(v) }))}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="15">15</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="30">30</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Content Max Length</p>
              <p className="text-xs text-muted-foreground">Maximum characters to process per page</p>
            </div>
            <Select value={String(globalSettings.contentMaxLength)} onValueChange={(v) => setGlobalSettings(s => ({ ...s, contentMaxLength: Number(v) }))}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="10000">10,000</SelectItem>
                <SelectItem value="30000">30,000</SelectItem>
                <SelectItem value="50000">50,000</SelectItem>
                <SelectItem value="100000">100,000</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Auto-save Reports</p>
              <p className="text-xs text-muted-foreground">Automatically save browse results as reports</p>
            </div>
            <Select value={globalSettings.autoSaveReports ? 'enabled' : 'disabled'} onValueChange={(v) => setGlobalSettings(s => ({ ...s, autoSaveReports: v === 'enabled' }))}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="enabled">Enabled</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={handleSaveGlobalSettings} disabled={savingGlobal} size="sm" className="gap-2">
              <Save className="size-3.5" />
              {savingGlobal ? 'Saving...' : 'Save Global Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ===== Save Channel Settings ===== */}
      <div className="flex justify-end">
        <Button onClick={handleSaveChannelSettings} disabled={savingChannelSettings} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          <Save className="size-4" />
          {savingChannelSettings ? 'Saving...' : 'Save Channel Settings'}
        </Button>
      </div>
    </div>
  );
}
