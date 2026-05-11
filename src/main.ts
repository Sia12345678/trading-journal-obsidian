import { Plugin, WorkspaceLeaf } from 'obsidian';
import { TradingJournalSettingTab, TradingJournalSettings, DEFAULT_SETTINGS } from './settings';
import { TradingJournalView, VIEW_TYPE } from './view';

export default class TradingJournalPlugin extends Plugin {
  settings!: TradingJournalSettings;

  async onload() {
    await this.loadSettings();

    this.registerView(VIEW_TYPE, leaf => new TradingJournalView(leaf, () => this.settings));

    this.addCommand({
      id: 'open',
      name: '开始今日交易日志',
      callback: () => { void this.openJournal(); },
    });

    this.addRibbonIcon('notebook-pen', '交易日志', () => { void this.openJournal(); });
    this.addSettingTab(new TradingJournalSettingTab(this.app, this));
  }

  onunload() {
    // no-op: Obsidian handles leaf cleanup
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
