import { PrimaryMarket } from './settings';

export async function fetchMarketSnapshot(market: PrimaryMarket): Promise<string> {
  switch (market) {
    case 'a_share': return fetchAShare();
    case 'us':      return fetchUS();
    case 'hk':      return fetchHK();
    case 'crypto':  return fetchCrypto();
    default:        return '（其他市场，请手动补充指数数据）';
  }
}

// ── A股：东方财富 API ─────────────────────────────────────────────────────────

interface EastMoneyData { f43?: number; f170?: number; f48?: number }

async function eastMoney(secid: string): Promise<{ price: number; changePct: number; volume: number } | null> {
  try {
    const res = await fetch(
      `https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=f43,f170,f48&fltt=2&invt=2`
    );
    const d: { data?: EastMoneyData } = await res.json();
    if (!d.data?.f43) return null;
    return { price: d.data.f43, changePct: d.data.f170 ?? 0, volume: d.data.f48 ?? 0 };
  } catch { return null; }
}

async function fetchAShare(): Promise<string> {
  const [sh, sz, cy] = await Promise.all([
    eastMoney('1.000001'),
    eastMoney('0.399001'),
    eastMoney('0.399006'),
  ]);
  const fmt = (d: typeof sh, name: string) => {
    if (!d) return `${name}: —`;
    return `${name}: ${d.price.toFixed(2)} (${sign(d.changePct)}${d.changePct.toFixed(2)}%)`;
  };
  let vol = '沪深成交额: —';
  if (sh && sz) vol = `沪深成交额: ${((sh.volume + sz.volume) / 1e12).toFixed(2)} 万亿`;
  return [fmt(sh, '上证综指'), fmt(sz, '深证成指'), fmt(cy, '创业板指'), vol].join('\n');
}

// ── 港股：东方财富恒指 + Yahoo Finance 补充 ──────────────────────────────────

async function fetchHK(): Promise<string> {
  const [hsi, hscei, hst] = await Promise.all([
    yahooQuote('^HSI'),
    yahooQuote('^HSCEI'),
    yahooQuote('^HSTECH'),
  ]);
  const fmt = (d: typeof hsi, name: string) => {
    if (!d) return `${name}: —`;
    return `${name}: ${d.price.toFixed(0)} (${sign(d.changePct)}${d.changePct.toFixed(2)}%)`;
  };
  return [fmt(hsi, '恒生指数'), fmt(hscei, '恒生国企'), fmt(hst, '恒生科技')].join('\n');
}

// ── 美股：Yahoo Finance ───────────────────────────────────────────────────────

async function fetchUS(): Promise<string> {
  const [sp, nq, dj, vix] = await Promise.all([
    yahooQuote('^GSPC'),
    yahooQuote('^IXIC'),
    yahooQuote('^DJI'),
    yahooQuote('^VIX'),
  ]);
  const fmtIdx = (d: typeof sp, name: string) => {
    if (!d) return `${name}: —`;
    return `${name}: ${d.price.toFixed(2)} (${sign(d.changePct)}${d.changePct.toFixed(2)}%)`;
  };
  const lines = [
    fmtIdx(sp, 'S&P 500'),
    fmtIdx(nq, 'NASDAQ'),
    fmtIdx(dj, 'Dow Jones'),
    vix ? `VIX: ${vix.price.toFixed(2)}` : 'VIX: —',
  ];
  return lines.join('\n');
}

// ── 加密货币：CoinGecko ───────────────────────────────────────────────────────

async function fetchCrypto(): Promise<string> {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true'
    );
    const data: Record<string, { usd: number; usd_24h_change: number }> = await res.json();
    const fmt = (id: string, symbol: string) => {
      const d = data[id];
      if (!d) return `${symbol}: —`;
      return `${symbol}: $${d.usd.toLocaleString()} (${sign(d.usd_24h_change)}${d.usd_24h_change.toFixed(2)}%)`;
    };
    return [fmt('bitcoin', 'BTC'), fmt('ethereum', 'ETH'), fmt('solana', 'SOL')].join('\n');
  } catch { return 'BTC: —\nETH: —\nSOL: —'; }
}

// ── Yahoo Finance 通用 ────────────────────────────────────────────────────────

async function yahooQuote(symbol: string): Promise<{ price: number; changePct: number } | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice) return null;
    return {
      price: meta.regularMarketPrice,
      changePct: meta.regularMarketChangePercent ?? 0,
    };
  } catch { return null; }
}

function sign(n: number) { return n >= 0 ? '+' : ''; }
