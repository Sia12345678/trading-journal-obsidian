import { requestUrl } from 'obsidian';
import { ChatClient, ChatOptions, ChatResult, Message, Tool, ToolCall } from './types';

export class OpenAIClient implements ChatClient {
  constructor(
    private baseUrl: string,
    private apiKey: string,
    private model: string,
  ) {}

  async chat(options: ChatOptions): Promise<ChatResult> {
    const { messages, tools } = options;

    const body: Record<string, unknown> = {
      model: this.model,
      messages: messages.map(toOpenAIMessage),
      stream: false,
    };
    if (tools?.length) body.tools = tools.map(toOpenAITool);

    const response = await requestUrl({
      url: `${this.baseUrl}/chat/completions`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      throw: false,
    });

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`OpenAI API ${response.status}: ${response.text}`);
    }

    const data = response.json as {
      choices: { message: { content: string | null; tool_calls?: { id: string; function: { name: string; arguments: string } }[] } }[]
    };
    const choice = data.choices[0];
    return {
      content: choice.message.content ?? '',
      toolCalls: choice.message.tool_calls?.map(fromOpenAIToolCall),
    };
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
