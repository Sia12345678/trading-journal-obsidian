import { ChatClient, ProviderId } from './types';
import { OpenAIClient } from './openai';
import { AnthropicClient } from './anthropic';

export function createClient(
  provider: ProviderId,
  apiKey: string,
  model: string,
  customBaseUrl?: string,
): ChatClient {
  if (provider === 'anthropic') {
    return new AnthropicClient(apiKey, model);
  }
  const baseUrl = provider === 'custom' ? (customBaseUrl ?? '') : getBaseUrl(provider);
  return new OpenAIClient(baseUrl, apiKey, model);
}

function getBaseUrl(provider: ProviderId): string {
  const urls: Partial<Record<ProviderId, string>> = {
    openai: 'https://api.openai.com/v1',
    deepseek: 'https://api.deepseek.com/v1',
    qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    doubao: 'https://ark.cn-beijing.volces.com/api/v3',
    kimi: 'https://api.moonshot.cn/v1',
    glm: 'https://open.bigmodel.cn/api/paas/v4',
  };
  return urls[provider] ?? '';
}

export * from './types';
