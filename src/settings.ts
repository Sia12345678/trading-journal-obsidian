import { App, PluginSettingTab, Setting } from 'obsidian';
import { PROVIDERS, ProviderId } from './api/types';
import TradingJournalPlugin from './main';

export interface TradingJournalSettings {
  provider: ProviderId;
  apiKey: string;
  model: string;
  customBaseUrl: string;
  journalPath: string;
}

export const DEFAULT_SETTINGS: TradingJournalSettings = {
  provider: 'deepseek',
  apiKey: '',
  model: 'deepseek-chat',
  customBaseUrl: '',
  journalPath: '',
};

export class TradingJournalSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: TradingJournalPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

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
          if (cfg.defaultModel) {
            this.plugin.settings.model = cfg.defaultModel;
          }
          await this.plugin.saveSettings();
          this.display(); // re-render to show/hide custom URL
        });
      });

    // Custom base URL (only for 'custom' provider)
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
      .setDesc('留空则使用环境变量中的 key（如已配置）')
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
    const modelDesc = providerCfg.models.length
      ? `推荐：${providerCfg.models.join('、')}`
      : '填写模型名称';

    new Setting(containerEl)
      .setName('模型')
      .setDesc(modelDesc)
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
