import { Plugin, WorkspaceLeaf } from 'obsidian';
import { TradingJournalSettingTab, TradingJournalSettings, DEFAULT_SETTINGS } from './settings';
import { TradingJournalView, VIEW_TYPE } from './view';

export default class TradingJournalPlugin extends Plugin {
  settings!: TradingJournalSettings;

  async onload() {
    await this.loadSettings();

    this.registerView(VIEW_TYPE, leaf => new TradingJournalView(leaf, () => this.settings));

    this.addCommand({
      id: 'open-trading-journal',
      name: '开始今日交易日志',
      callback: () => this.openJournal(),
    });

    this.addRibbonIcon('notebook-pen', '交易日志', () => this.openJournal());
    this.addSettingTab(new TradingJournalSettingTab(this.app, this));
  }

  async onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE);
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  private async openJournal() {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE);
    if (existing.length) {
      this.app.workspace.revealLeaf(existing[0]);
      return;
    }
    const leaf = this.app.workspace.getRightLeaf(false);
    if (!leaf) return;
    await leaf.setViewState({ type: VIEW_TYPE, active: true });
    this.app.workspace.revealLeaf(leaf);
  }
}
