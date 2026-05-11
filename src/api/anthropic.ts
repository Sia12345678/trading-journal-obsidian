import { requestUrl } from 'obsidian';
import { ChatClient, ChatOptions, ChatResult, Message, Tool, ToolCall } from './types';

const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

export class AnthropicClient implements ChatClient {
  constructor(
    private apiKey: string,
    private model: string,
  ) {}

  async chat(options: ChatOptions): Promise<ChatResult> {
    const { messages, tools } = options;

    const systemMsg = messages.find(m => m.role === 'system');
    const chatMessages = messages.filter(m => m.role !== 'system').map(toAnthropicMessage);

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: 8192,
      system: systemMsg?.content,
      messages: chatMessages,
      stream: false,
    };
    if (tools?.length) body.tools = tools.map(toAnthropicTool);

    const response = await requestUrl({
      url: API_URL,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': API_VERSION,
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
      throw: false,
    });

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Anthropic API ${response.status}: ${response.text}`);
    }

    return fromAnthropicResponse(response.json as {
      content: { type: string; text?: string; id?: string; name?: string; input?: unknown }[];
    });
  }
}

function toAnthropicMessage(msg: Message): Record<string, unknown> {
  if (msg.role === 'tool') {
    return {
      role: 'user',
      content: [{ type: 'tool_result', tool_use_id: msg.toolCallId, content: msg.content }],
    };
  }
  if (msg.role === 'assistant' && msg.toolCalls?.length) {
    const content: unknown[] = [];
    if (msg.content) content.push({ type: 'text', text: msg.content });
    for (const tc of msg.toolCalls) {
      content.push({ type: 'tool_use', id: tc.id, name: tc.name, input: tc.arguments });
    }
    return { role: 'assistant', content };
  }
  return { role: msg.role, content: msg.content };
}

function toAnthropicTool(tool: Tool): Record<string, unknown> {
  return {
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters,
  };
}

function fromAnthropicResponse(data: {
  content: { type: string; text?: string; id?: string; name?: string; input?: unknown }[];
}): ChatResult {
  let content = '';
  const toolCalls: ToolCall[] = [];

  for (const block of data.content) {
    if (block.type === 'text') content += block.text ?? '';
    if (block.type === 'tool_use' && block.id) {
      toolCalls.push({
        id: block.id,
        name: block.name ?? '',
        arguments: (block.input ?? {}) as Record<string, unknown>,
      });
    }
  }

  return { content, toolCalls: toolCalls.length ? toolCalls : undefined };
}
