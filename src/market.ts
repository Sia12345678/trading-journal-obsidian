interface IndexData {
  price: number;
  changePct: number;
  volume: number; // 元
}

async function fetchIndex(secid: string): Promise<IndexData | null> {
  try {
    const url = `https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=f43,f170,f48&fltt=2&invt=2`;
    const res = await fetch(url);
    const json = await res.json();
    const d = json?.data;
    if (!d?.f43) return null;
    return { price: d.f43, changePct: d.f170 ?? 0, volume: d.f48 ?? 0 };
  } catch {
    return null;
  }
}

export async function fetchMarketSnapshot(): Promise<string> {
  const [sh, sz, cy] = await Promise.all([
    fetchIndex('1.000001'),
    fetchIndex('0.399001'),
    fetchIndex('0.399006'),
  ]);

  const fmt = (d: IndexData | null, name: string) => {
    if (!d) return `${name}: —`;
    const sign = d.changePct >= 0 ? '+' : '';
    return `${name}: ${d.price.toFixed(2)} (${sign}${d.changePct.toFixed(2)}%)`;
  };

  let volumeStr = '沪深成交额: —';
  if (sh && sz) {
    const total = (sh.volume + sz.volume) / 1e12;
    volumeStr = `沪深成交额: ${total.toFixed(2)} 万亿`;
  }

  return [fmt(sh, '上证综指'), fmt(sz, '深证成指'), fmt(cy, '创业板指'), volumeStr].join('\n');
}
