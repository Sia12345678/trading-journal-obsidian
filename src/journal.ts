import { App, normalizePath, TFile } from 'obsidian';

export interface SaveJournalArgs {
  date: string;           // YYYY-MM-DD
  markdownContent: string;
  aSharesRows: string[];  // CSV rows (no header), CNY
  hkSharesRows: string[]; // CSV rows (no header), HKD
}

const CSV_HEADER = '日期,代码,名称,市场,方向,数量,均成本,货币,当日收盘,市值,持仓盈亏,盈亏%,当日盈亏';

export class JournalManager {
  constructor(private app: App, private journalPath: string) {}

  async saveJournal(args: SaveJournalArgs): Promise<void> {
    await Promise.all([
      this.writeMarkdown(args.date, args.markdownContent),
      this.appendCsv('持仓记录.csv', args.aSharesRows),
      this.appendCsv('持仓记录_港股.csv', args.hkSharesRows),
      this.updateIndex(args.date, args.markdownContent),
    ]);
  }

  async readLastPortfolio(): Promise<{ aShares: string; hkShares: string }> {
    const [aShares, hkShares] = await Promise.all([
      this.readCsv('持仓记录.csv'),
      this.readCsv('持仓记录_港股.csv'),
    ]);
    return { aShares, hkShares };
  }

  private path(filename: string): string {
    return normalizePath(`${this.journalPath}/${filename}`);
  }

  private async readCsv(filename: string): Promise<string> {
    const file = this.app.vault.getAbstractFileByPath(this.path(filename));
    if (!(file instanceof TFile)) return '';
    return this.app.vault.read(file);
  }

  private async appendCsv(filename: string, rows: string[]): Promise<void> {
    if (!rows.length) return;
    const filePath = this.path(filename);
    const file = this.app.vault.getAbstractFileByPath(filePath);

    if (!(file instanceof TFile)) {
      await this.app.vault.create(filePath, CSV_HEADER + '\n' + rows.join('\n') + '\n');
    } else {
      const existing = await this.app.vault.read(file);
      const needsNewline = existing.length > 0 && !existing.endsWith('\n');
      await this.app.vault.modify(file, existing + (needsNewline ? '\n' : '') + rows.join('\n') + '\n');
    }
  }

  private async writeMarkdown(date: string, content: string): Promise<void> {
    const filePath = this.path(`${date}.md`);
    const file = this.app.vault.getAbstractFileByPath(filePath);

    if (file instanceof TFile) {
      await this.app.vault.modify(file, content);
    } else {
      await this.app.vault.create(filePath, content);
    }
  }

  private async updateIndex(date: string, mdContent: string): Promise<void> {
    const takeaway = extractTakeaway(mdContent);
    const opsCount = extractOpsCount(mdContent);
    const newRow = `| [[${date}]] | ${opsCount} | ${takeaway} |`;

    const indexPath = this.path('_交易日记.md');
    const file = this.app.vault.getAbstractFileByPath(indexPath);

    const header = `---\ntags:\n  - MOC\n  - 交易日记\n---\n\n# 交易日记\n\n按时间倒序排列的交易日志索引。\n\n## 日志列表\n\n| 日期 | 操作数 | Takeaway |\n|------|--------|----------|\n`;

    if (!(file instanceof TFile)) {
      await this.app.vault.create(indexPath, header + newRow + '\n');
    } else {
      const existing = await this.app.vault.read(file);
      const tableHeaderEnd = existing.indexOf('|------|');
      if (tableHeaderEnd === -1) {
        await this.app.vault.modify(file, existing + newRow + '\n');
      } else {
        const insertAt = existing.indexOf('\n', tableHeaderEnd) + 1;
        const updated = existing.slice(0, insertAt) + newRow + '\n' + existing.slice(insertAt);
        await this.app.vault.modify(file, updated);
      }
    }
  }
}

function extractTakeaway(md: string): string {
  const match = md.match(/^## Takeaway\s*\n+>\s*(.+)/m);
  return match ? match[1].trim() : '—';
}

function extractOpsCount(md: string): number {
  const matches = md.match(/^### \d+\./gm);
  return matches ? matches.length : 0;
}

export function lastPortfolioRows(csvContent: string): string {
  if (!csvContent.trim()) return '';
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) return '';

  // Find the latest date
  let latestDate = '';
  for (const line of lines.slice(1)) {
    const date = line.split(',')[0];
    if (date > latestDate) latestDate = date;
  }

  return lines
    .slice(1)
    .filter(l => l.startsWith(latestDate))
    .join('\n');
}
