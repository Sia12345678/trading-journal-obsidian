import { ItemView, MarkdownRenderer, Notice, WorkspaceLeaf } from 'obsidian';
import { createClient, Message } from './api';
import { SAVE_JOURNAL_TOOL, buildSystemPrompt } from './prompt';
import { JournalManager, SaveJournalArgs, lastPortfolioRows } from './journal';
import { fetchMarketSnapshot } from './market';
import { TradingJournalSettings } from './settings';

export const VIEW_TYPE = 'trading-journal';

export class TradingJournalView extends ItemView {
  private messages: Message[] = [];
  private chatEl!: HTMLElement;
  private inputEl!: HTMLTextAreaElement;
  private sendBtn!: HTMLButtonElement;
  private abortController: AbortController | null = null;
  private isStreaming = false;
  private journalManager!: JournalManager;

  constructor(
    leaf: WorkspaceLeaf,
    private getSettings: () => TradingJournalSettings,
  ) {
    super(leaf);
  }

  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return '交易日志'; }
  getIcon() { return 'notebook-pen'; }

  async onOpen() {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    container.addClass('tj-container');

    // Header
    const header = container.createDiv('tj-header');
    header.createEl('span', { text: '📈 交易日志', cls: 'tj-title' });
    const clearBtn = header.createEl('button', { text: '新对话', cls: 'tj-clear-btn' });
    clearBtn.onclick = () => this.reset();

    // Chat area
    this.chatEl = container.createDiv('tj-chat');

    // Input area
    const inputArea = container.createDiv('tj-input-area');
    this.inputEl = inputArea.createEl('textarea', {
      cls: 'tj-input',
      attr: { placeholder: '说"写交易日志"开始，或直接回答问题…', rows: '3' },
    });
    this.inputEl.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.send();
      }
    });

    this.sendBtn = inputArea.createEl('button', { text: '发送', cls: 'tj-send-btn' });
    this.sendBtn.onclick = () => this.send();
  }

  async onClose() {
    this.abortController?.abort();
  }

  private reset() {
    this.abortController?.abort();
    this.messages = [];
    this.chatEl.empty();
    this.inputEl.value = '';
    this.setStreaming(false);
  }

  private async send() {
    const text = this.inputEl.value.trim();
    if (!text || this.isStreaming) return;

    this.inputEl.value = '';
    this.appendMessage('user', text);
    this.messages.push({ role: 'user', content: text });

    // Lazy-initialize: first user message triggers system prompt setup
    if (this.messages.filter(m => m.role === 'user').length === 1) {
      await this.initialize();
    } else {
      await this.callLLM();
    }
  }

  private async initialize() {
    this.setStreaming(true);
    const settings = this.getSettings();

    if (!settings.apiKey) {
      new Notice('请先在设置中填写 API Key');
      this.setStreaming(false);
      return;
    }
    if (!settings.journalPath) {
      new Notice('请先在设置中填写交易日记文件夹路径');
      this.setStreaming(false);
      return;
    }

    this.journalManager = new JournalManager(this.app, settings.journalPath);

    const today = new Date().toISOString().slice(0, 10);
    const weekday = ['周日','周一','周二','周三','周四','周五','周六'][new Date().getDay()];

    // Fetch market data and last portfolio in parallel
    const [marketSnapshot, portfolio] = await Promise.all([
      fetchMarketSnapshot().catch(() => '（市场数据获取失败）'),
      this.journalManager.readLastPortfolio().catch(() => ({ aShares: '', hkShares: '' })),
    ]);

    const lastPortfolio = [
      lastPortfolioRows(portfolio.aShares),
      lastPortfolioRows(portfolio.hkShares),
    ].filter(Boolean).join('\n');

    const systemPrompt = buildSystemPrompt(marketSnapshot, lastPortfolio, today, weekday);
    this.messages.unshift({ role: 'system', content: systemPrompt });

    await this.callLLM();
  }

  private async callLLM() {
    this.setStreaming(true);
    const settings = this.getSettings();

    const client = createClient(
      settings.provider,
      settings.apiKey,
      settings.model,
      settings.customBaseUrl,
    );

    this.abortController = new AbortController();
    const assistantEl = this.appendMessage('assistant', '');

    try {
      const result = await client.chat({
        messages: this.messages,
        tools: [SAVE_JOURNAL_TOOL],
        signal: this.abortController.signal,
        onChunk: (chunk) => {
          assistantEl.querySelector('.tj-message-content')!.textContent += chunk;
          this.chatEl.scrollTop = this.chatEl.scrollHeight;
        },
      });

      // Store assistant message
      const assistantMsg: Message = {
        role: 'assistant',
        content: result.content,
        toolCalls: result.toolCalls,
      };
      this.messages.push(assistantMsg);

      // Re-render markdown
      const contentEl = assistantEl.querySelector('.tj-message-content') as HTMLElement;
      contentEl.empty();
      await MarkdownRenderer.render(this.app, result.content, contentEl, '', this);

      // Handle tool calls
      if (result.toolCalls?.length) {
        await this.handleToolCalls(result.toolCalls);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        const msg = `错误：${(err as Error).message}`;
        assistantEl.querySelector('.tj-message-content')!.textContent = msg;
        new Notice(msg);
      }
    } finally {
      this.setStreaming(false);
    }
  }

  private async handleToolCalls(
    toolCalls: NonNullable<Message & { role: 'assistant' }>['toolCalls'],
  ) {
    if (!toolCalls) return;

    for (const tc of toolCalls) {
      if (tc.name !== 'save_journal') continue;

      const args = tc.arguments as unknown as SaveJournalArgs;
      try {
        await this.journalManager.saveJournal(args);
        const toolResult: Message = {
          role: 'tool',
          toolCallId: tc.id,
          toolName: tc.name,
          content: '✅ 日志已保存',
        };
        this.messages.push(toolResult);
        new Notice('✅ 交易日志已保存');
        // Get confirmation from LLM
        await this.callLLM();
      } catch (err) {
        new Notice(`保存失败：${(err as Error).message}`);
      }
    }
  }

  private appendMessage(role: 'user' | 'assistant', text: string): HTMLElement {
    const el = this.chatEl.createDiv(`tj-message tj-${role}`);
    const label = el.createEl('span', {
      cls: 'tj-label',
      text: role === 'user' ? '你' : 'AI',
    });
    const content = el.createEl('div', { cls: 'tj-message-content', text });
    el.appendChild(label);
    el.appendChild(content);
    this.chatEl.scrollTop = this.chatEl.scrollHeight;
    return el;
  }

  private setStreaming(on: boolean) {
    this.isStreaming = on;
    this.sendBtn.disabled = on;
    this.sendBtn.textContent = on ? '…' : '发送';
  }
}
