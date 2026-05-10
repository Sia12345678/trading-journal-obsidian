# Trading Journal — Obsidian Plugin

[中文说明](README_CN.md)

AI-powered trading journal for Obsidian. Opens a sidebar chat that walks you through the end-of-day review: market data auto-fetch, portfolio snapshot parsing, trade log, and behavioral finance reflection.

## Features

- **Multi-provider AI**: Claude, GPT, DeepSeek, Qwen (通义千问), Doubao (豆包), Kimi, GLM (智谱), or any OpenAI-compatible endpoint
- **Auto market data**: Fetches Shanghai/Shenzhen/ChiNext indices and total volume from eastmoney at session start
- **Screenshot parsing**: Send your broker app screenshot; the AI extracts holdings and trade records
- **Structured output**: Markdown journal + CSV portfolio history, written directly to your vault
- **Behavioral audit**: Randomized questions across emotion awareness, discipline audit, cognitive bias check, and big-picture review
- **Friday weekly review**: Automatically triggered on Fridays
- **A-share holiday aware**: Detects mainland China trading holidays

## Installation

### Community Plugin Store (recommended)

1. Open Obsidian → Settings → Community plugins → Browse
2. Search for **Trading Journal**
3. Install & enable

### Manual

1. Download `main.js`, `manifest.json`, `styles.css` from the [latest release](https://github.com/Sia12345678/trading-journal-obsidian/releases/latest)
2. Copy them to `YOUR_VAULT/.obsidian/plugins/trading-journal/`
3. Reload Obsidian → Settings → Community plugins → Enable **Trading Journal**

### BRAT (beta)

1. Install [BRAT](https://github.com/TfTHacker/obsidian42-brat)
2. BRAT → Add Beta Plugin → `Sia12345678/trading-journal-obsidian`

## Setup

1. Settings → Trading Journal
2. Select **AI Provider** and enter your **API Key**
3. Set **交易日记文件夹** to the vault-relative path where journal files should be saved (e.g. `日记/交易日记`)

## Usage

Click the notebook icon in the ribbon, or run the command **开始今日交易日志**.

The AI guides you through:

1. Market environment (auto-fetched indices + you fill in sentiment data)
2. Portfolio snapshot (send a screenshot or say "没变")
3. Today's trades (screenshot or free text, always include *why*)
4. Trades considered but not made
5. Three behavioral reflection questions
6. One-line takeaway

Files written at the end of each session:

| File | Contents |
|------|----------|
| `YYYY-MM-DD.md` | Full journal entry (Obsidian-linked) |
| `_交易日记.md` | Index of all entries |
| `持仓记录.csv` | A-share portfolio history (CNY) |
| `持仓记录_港股.csv` | HK-share portfolio history (HKD) |

## External Services

This plugin makes network requests to the following third-party services to fetch market data. No personal data is sent — only public market symbol lookups.

| Service | Purpose | Privacy Policy |
|---------|---------|----------------|
| [East Money](https://www.eastmoney.com) (东方财富) | A-share index data (Shanghai, Shenzhen, ChiNext) | [link](https://www.eastmoney.com/about/html/privacy.html) |
| [Yahoo Finance](https://finance.yahoo.com) | US / HK stock and index quotes | [link](https://legal.yahoo.com/us/en/yahoo/privacy/index.html) |
| [CoinGecko](https://www.coingecko.com) | Cryptocurrency prices | [link](https://www.coingecko.com/en/privacy) |

All AI inference calls go directly from your device to the AI provider you configure (Anthropic, OpenAI, etc.). Conversation data is not routed through any intermediate server.

## Supported Providers

| Provider | API Docs |
|----------|----------|
| Anthropic (Claude) | platform.anthropic.com |
| OpenAI | platform.openai.com |
| DeepSeek | platform.deepseek.com |
| 通义千问 (Qwen) | dashscope.aliyuncs.com |
| 豆包 (Doubao) | console.volcengine.com |
| Moonshot (Kimi) | platform.moonshot.cn |
| 智谱 (GLM) | open.bigmodel.cn |
| Custom (any OpenAI-compatible) | — |

## Development

```bash
git clone https://github.com/Sia12345678/trading-journal-obsidian
cd trading-journal-obsidian
npm install
npm run dev        # watch mode — rebuilds main.js on save
```

Symlink into your vault for live testing:

```bash
VAULT="$HOME/path/to/your/vault"
PLUGIN="$VAULT/.obsidian/plugins/trading-journal"
mkdir -p "$PLUGIN"
ln -sf "$(pwd)/main.js" "$PLUGIN/main.js"
cp manifest.json styles.css "$PLUGIN/"
```

Then in Obsidian: Settings → Community plugins → reload & enable Trading Journal.

## Releasing

Tag a commit with the version number (must match `manifest.json`):

```bash
# 1. Bump version in manifest.json and versions.json
# 2. Commit
git add manifest.json versions.json
git commit -m "chore: bump to 0.2.0"

# 3. Tag and push — GitHub Actions handles the rest
git tag 0.2.0
git push && git push --tags
```

The workflow builds the plugin and attaches `main.js`, `manifest.json`, `styles.css` to the GitHub Release automatically.

## Submitting to Obsidian Community Plugins

1. Make sure your plugin has at least one public release
2. Fork [obsidian-releases](https://github.com/obsidianmd/obsidian-releases)
3. Add an entry to `community-plugins.json`:
   ```json
   {
     "id": "trading-journal",
     "name": "Trading Journal",
     "author": "Your Name",
     "description": "AI-powered A-share trading journal with market data auto-fetch and behavioral reflection.",
     "repo": "Sia12345678/trading-journal-obsidian"
   }
   ```
4. Open a PR — review typically takes 2–6 weeks

## License

MIT
