# Trading Journal — Obsidian 插件

AI 驱动的交易日志插件。每天收盘后，通过侧边栏对话完成当日复盘：自动抓取市场数据、解析持仓截图、记录操作决策、审计交易心态。

[English README](README.md)

## 功能

- **多市场支持**：A 股（沪深）、美股、港股、加密货币
- **多 AI 提供商**：Claude、GPT、DeepSeek、通义千问、豆包、Kimi、智谱，或任意 OpenAI 兼容接口
- **自动抓取市场数据**：
  - A 股：东方财富 API（上证/深证/创业板指数、成交额）
  - 美股：Yahoo Finance（S&P500、NASDAQ、Dow、VIX）
  - 港股：Yahoo Finance（恒生、国企、恒生科技）
  - 加密货币：CoinGecko（BTC、ETH、SOL）
- **截图解析**：发送同花顺/东方财富/华泰等券商 App 截图，AI 自动提取持仓数据
- **结构化输出**：Markdown 日志 + 持仓 CSV，直接写入你的 Vault
- **交易心理审计**：情绪觉察、纪律审计、认知偏差检查、全局视角，四类随机提问
- **周五周复盘**：周五自动触发本周复盘问答
- **假期感知**：识别 A 股法定节假日（支持其他市场手动确认）

## 安装

### 社区插件市场（推荐）

Obsidian → 设置 → 第三方插件 → 浏览 → 搜索 **Trading Journal** → 安装并启用

### 手动安装

1. 从 [最新 Release](https://github.com/Sia12345678/trading-journal-obsidian/releases/latest) 下载 `main.js`、`manifest.json`、`styles.css`
2. 复制到 `你的Vault/.obsidian/plugins/trading-journal/`
3. 重启 Obsidian → 设置 → 第三方插件 → 启用 **Trading Journal**

### BRAT（测试版）

1. 安装 [BRAT 插件](https://github.com/TfTHacker/obsidian42-brat)
2. BRAT → 添加 Beta 插件 → 输入 `Sia12345678/trading-journal-obsidian`

## 配置

1. 设置 → Trading Journal
2. 选择 **主要交易市场**（A股 / 美股 / 港股 / 加密货币）
3. 选择 **AI 提供商**，填入你的 **API Key**
4. 填写 **交易日记文件夹**（Vault 内的相对路径，例如：`日记/交易日记`）

## 使用方法

点击左侧边栏的笔记本图标，或运行命令 **开始今日交易日志**。

AI 将引导你完成：

1. 市场环境（自动获取指数 + 你补充其他数据）
2. 持仓快照（发截图，或说"没变"沿用上次）
3. 今日操作（买卖 / 做T / 不动，以及为什么）
4. 考虑过但没做的（不动的决策同样重要）
5. 三个心态反思问题
6. 一句话 Takeaway

对话结束后，日志和 CSV 自动写入 Vault。

## 数据文件

| 文件 | 内容 |
|------|------|
| `YYYY-MM-DD.md` | 每日交易日志（Obsidian 双向链接） |
| `_交易日记.md` | 所有日志的索引 |
| `持仓记录.csv` | 主要持仓历史（A股用 CNY，美股用 USD） |
| `持仓记录_港股.csv` | 港股持仓历史（HKD） |

## 外部服务说明

插件仅向以下公开 API 发请求获取行情数据，不发送任何个人信息：

| 服务 | 用途 |
|------|------|
| 东方财富（eastmoney） | A 股指数数据 |
| Yahoo Finance | 美股 / 港股行情 |
| CoinGecko | 加密货币价格 |

AI 推理请求直接从你的设备发往你配置的 AI 提供商，不经过任何中间服务器。

## 支持的 AI 提供商

| 提供商 | API 文档 |
|--------|---------|
| Anthropic (Claude) | platform.anthropic.com |
| OpenAI | platform.openai.com |
| DeepSeek | platform.deepseek.com |
| 通义千问 (Qwen) | dashscope.aliyuncs.com |
| 豆包 (Doubao) | console.volcengine.com |
| Moonshot (Kimi) | platform.moonshot.cn |
| 智谱 (GLM) | open.bigmodel.cn |
| 自定义（任意 OpenAI 兼容接口） | — |

## License

[MIT](LICENSE)
