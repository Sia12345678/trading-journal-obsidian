import { App, PluginSettingTab, Setting } from 'obsidian';
import { PROVIDERS, ProviderId } from './api/types';
import TradingJournalPlugin from './main';

export type PrimaryMarket = 'a_share' | 'us' | 'hk' | 'crypto' | 'other';

export const MARKET_NAMES: Record<PrimaryMarket, string> = {
  a_share: 'A股（沪深）',
  us: '美股',
  hk: '港股',
  crypto: '加密货币',
  other: '其他 / 多市场',
};

export interface TradingJournalSettings {
  provider: ProviderId;
  apiKey: string;
  model: string;
  customBaseUrl: string;
  journalPath: string;
  primaryMarket: PrimaryMarket;
}

export const DEFAULT_SETTINGS: TradingJournalSettings = {
  provider: 'deepseek',
  apiKey: '',
  model: 'deepseek-chat',
  customBaseUrl: '',
  journalPath: '',
  primaryMarket: 'a_share',
};

export class TradingJournalSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: TradingJournalPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // Primary market
    new Setting(containerEl)
      .setName('主要交易市场')
      .setDesc('影响市场数据来源和对话内容')
      .addDropdown(drop => {
        for (const [id, name] of Object.entries(MARKET_NAMES)) {
          drop.addOption(id, name);
        }
        drop.setValue(this.plugin.settings.primaryMarket);
        drop.onChange(async (value) => {
          this.plugin.settings.primaryMarket = value as PrimaryMarket;
          await this.plugin.saveSettings();
        });
      });

    // Provider
    new Setting(containerEl)
      .setName('AI 提供商')
      .setDesc('选择要使用的大模型服务')
      .addDropdown(drop => {
        for (const [id, cfg] of Object.entries(PROVIDERS)) {
          drop.addOption(id, cfg.name);
        }
        drop.setValue(this.plugin.settings.provider);
        drop.onChange(async (value) => {
          this.plugin.settings.provider = value as ProviderId;
          const cfg = PROVIDERS[value as ProviderId];
          if (cfg.defaultModel) this.plugin.settings.model = cfg.defaultModel;
          await this.plugin.saveSettings();
          this.display();
        });
      });

    // Custom base URL
    if (this.plugin.settings.provider === 'custom') {
      new Setting(containerEl)
        .setName('API Base URL')
        .setDesc('OpenAI 兼容接口地址，例如 http://localhost:11434/v1（Ollama）')
        .addText(text => text
          .setPlaceholder('https://...')
          .setValue(this.plugin.settings.customBaseUrl)
          .onChange(async (value) => {
            this.plugin.settings.customBaseUrl = value.trim();
            await this.plugin.saveSettings();
          }));
    }

    // API Key
    new Setting(containerEl)
      .setName('API Key')
      .addText(text => {
        text.inputEl.type = 'password';
        text
          .setPlaceholder('sk-...')
          .setValue(this.plugin.settings.apiKey)
          .onChange(async (value) => {
            this.plugin.settings.apiKey = value.trim();
            await this.plugin.saveSettings();
          });
      });

    // Model
    const providerCfg = PROVIDERS[this.plugin.settings.provider];
    new Setting(containerEl)
      .setName('模型')
      .setDesc(providerCfg.models.length ? `推荐：${providerCfg.models.join('、')}` : '填写模型名称')
      .addText(text => text
        .setPlaceholder(providerCfg.defaultModel || 'model-name')
        .setValue(this.plugin.settings.model)
        .onChange(async (value) => {
          this.plugin.settings.model = value.trim();
          await this.plugin.saveSettings();
        }));

    // Journal path
    new Setting(containerEl)
      .setName('交易日记文件夹')
      .setDesc('Vault 内的相对路径，例如：日记/交易日记')
      .addText(text => text
        .setPlaceholder('日记/交易日记')
        .setValue(this.plugin.settings.journalPath)
        .onChange(async (value) => {
          this.plugin.settings.journalPath = value.trim();
          await this.plugin.saveSettings();
        }));
  }
}
