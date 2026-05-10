import { ChatClient, ChatOptions, ChatResult, Message, Tool, ToolCall } from './types';

export class OpenAIClient implements ChatClient {
  constructor(
    private baseUrl: string,
    private apiKey: string,
    private model: string,
  ) {}

  async chat(options: ChatOptions): Promise<ChatResult> {
    const { messages, tools, onChunk, signal } = options;
    const stream = !!onChunk;

    const body: Record<string, unknown> = {
      model: this.model,
      messages: messages.map(toOpenAIMessage),
      stream,
    };
    if (tools?.length) body.tools = tools.map(toOpenAITool);

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      throw new Error(`OpenAI API ${response.status}: ${await response.text()}`);
    }

    if (!stream) {
      const data = await response.json();
      const choice = data.choices[0];
      return {
        content: choice.message.content ?? '',
        toolCalls: choice.message.tool_calls?.map(fromOpenAIToolCall),
      };
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
    const toolCallBuffers: Record<number, { id: string; name: string; args: string }> = {};

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      for (const line of decoder.decode(value).split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6);
        if (data === '[DONE]') continue;

        let parsed: Record<string, unknown>;
        try { parsed = JSON.parse(data); } catch { continue; }

        const delta = (parsed.choices as { delta: Record<string, unknown> }[])?.[0]?.delta;
        if (!delta) continue;

        if (typeof delta.content === 'string') {
          content += delta.content;
          onChunk(delta.content);
        }

        // Accumulate streamed tool calls
        for (const tc of (delta.tool_calls as { index: number; id?: string; function?: { name?: string; arguments?: string } }[]) ?? []) {
          if (!toolCallBuffers[tc.index]) {
            toolCallBuffers[tc.index] = { id: tc.id ?? '', name: tc.function?.name ?? '', args: '' };
          }
          toolCallBuffers[tc.index].args += tc.function?.arguments ?? '';
          if (tc.id) toolCallBuffers[tc.index].id = tc.id;
          if (tc.function?.name) toolCallBuffers[tc.index].name = tc.function.name;
        }
      }
    }

    const toolCalls: ToolCall[] = Object.values(toolCallBuffers).map(tc => ({
      id: tc.id,
      name: tc.name,
      arguments: JSON.parse(tc.args || '{}'),
    }));

    return { content, toolCalls: toolCalls.length ? toolCalls : undefined };
  }
}

function toOpenAIMessage(msg: Message): Record<string, unknown> {
  if (msg.role === 'tool') {
    return { role: 'tool', tool_call_id: msg.toolCallId, content: msg.content };
  }
  if (msg.role === 'assistant' && msg.toolCalls?.length) {
    return {
      role: 'assistant',
      content: msg.content || null,
      tool_calls: msg.toolCalls.map(tc => ({
        id: tc.id,
        type: 'function',
        function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
      })),
    };
  }
  return { role: msg.role, content: msg.content };
}

function toOpenAITool(tool: Tool): Record<string, unknown> {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  };
}

function fromOpenAIToolCall(tc: { id: string; function: { name: string; arguments: string } }): ToolCall {
  return {
    id: tc.id,
    name: tc.function.name,
    arguments: JSON.parse(tc.function.arguments || '{}'),
  };
}
