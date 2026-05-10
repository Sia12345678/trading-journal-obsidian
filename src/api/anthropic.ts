import { ChatClient, ChatOptions, ChatResult, Message, Tool, ToolCall } from './types';

const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

export class AnthropicClient implements ChatClient {
  constructor(
    private apiKey: string,
    private model: string,
  ) {}

  async chat(options: ChatOptions): Promise<ChatResult> {
    const { messages, tools, onChunk, signal } = options;
    const stream = !!onChunk;

    const systemMsg = messages.find(m => m.role === 'system');
    const chatMessages = messages.filter(m => m.role !== 'system').map(toAnthropicMessage);

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: 8192,
      system: systemMsg?.content,
      messages: chatMessages,
      stream,
    };
    if (tools?.length) body.tools = tools.map(toAnthropicTool);

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': API_VERSION,
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      throw new Error(`Anthropic API ${response.status}: ${await response.text()}`);
    }

    if (!stream) {
      const data = await response.json();
      return fromAnthropicResponse(data);
    }

    return this.consumeStream(response, onChunk!);
  }

  private async consumeStream(
    response: Response,
    onChunk: (text: string) => void,
  ): Promise<ChatResult> {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let content = '';
    const toolUseBlocks: Record<string, { id: string; name: string; input: string }> = {};

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      for (const line of decoder.decode(value).split('\n')) {
        if (!line.startsWith('data: ')) continue;

        let parsed: Record<string, unknown>;
        try { parsed = JSON.parse(line.slice(6)); } catch { continue; }

        const type = parsed.type as string;

        if (type === 'content_block_start') {
          const block = parsed.content_block as { type: string; id?: string; name?: string };
          if (block.type === 'tool_use' && block.id) {
            toolUseBlocks[block.id] = { id: block.id, name: block.name ?? '', input: '' };
          }
        }

        if (type === 'content_block_delta') {
          const delta = parsed.delta as { type: string; text?: string; partial_json?: string };
          if (delta.type === 'text_delta' && delta.text) {
            content += delta.text;
            onChunk(delta.text);
          }
          if (delta.type === 'input_json_delta' && delta.partial_json) {
            // Find the current tool block (last started one)
            const lastId = Object.keys(toolUseBlocks).at(-1);
            if (lastId) toolUseBlocks[lastId].input += delta.partial_json;
          }
        }
      }
    }

    const toolCalls: ToolCall[] = Object.values(toolUseBlocks).map(b => ({
      id: b.id,
      name: b.name,
      arguments: JSON.parse(b.input || '{}'),
    }));

    return { content, toolCalls: toolCalls.length ? toolCalls : undefined };
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
