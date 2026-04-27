import { NextResponse } from 'next/server';

// Public, no-auth data sources used by World Monitor (open-source upstream feeds).
// Cached at the edge for 60s so we don't hammer them.

export const revalidate = 60;

const YAHOO = (sym: string) =>
  `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=2d`;

interface YahooQuote {
  symbol: string;
  name: string;
  price: number;
  prevClose: number;
  changePct: number;
  currency: string;
}

const SYMBOLS: Array<{ symbol: string; name: string; group: 'index' | 'commodity' | 'crypto' }> = [
  { symbol: '^GSPC', name: 'S&P 500',     group: 'index' },
  { symbol: '^DJI',  name: 'Dow Jones',   group: 'index' },
  { symbol: '^IXIC', name: 'NASDAQ',      group: 'index' },
  { symbol: '^FTSE', name: 'FTSE 100',    group: 'index' },
  { symbol: '^N225', name: 'Nikkei 225',  group: 'index' },
  { symbol: '^HSI',  name: 'Hang Seng',   group: 'index' },
  { symbol: 'CL=F',  name: 'Crude Oil',   group: 'commodity' },
  { symbol: 'BZ=F',  name: 'Brent Oil',   group: 'commodity' },
  { symbol: 'GC=F',  name: 'Gold',        group: 'commodity' },
  { symbol: 'SI=F',  name: 'Silver',      group: 'commodity' },
  { symbol: 'NG=F',  name: 'Nat Gas',     group: 'commodity' },
  { symbol: 'BTC-USD', name: 'Bitcoin',   group: 'crypto' },
  { symbol: 'ETH-USD', name: 'Ethereum',  group: 'crypto' },
];

async function fetchYahoo(symbol: string, name: string): Promise<YahooQuote | null> {
  try {
    const r = await fetch(YAHOO(symbol), {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TradiaBot/1.0)' },
      next: { revalidate: 60 },
    });
    if (!r.ok) return null;
    const j = await r.json();
    const m = j?.chart?.result?.[0]?.meta;
    if (!m) return null;
    const price = m.regularMarketPrice ?? m.previousClose ?? 0;
    const prev = m.chartPreviousClose ?? m.previousClose ?? price;
    const changePct = prev > 0 ? ((price - prev) / prev) * 100 : 0;
    return {
      symbol,
      name,
      price,
      prevClose: prev,
      changePct,
      currency: m.currency ?? 'USD',
    };
  } catch {
    return null;
  }
}

async function fetchNews() {
  // Reddit r/worldnews — public JSON, no auth. Returns top of the day.
  try {
    const r = await fetch(
      'https://www.reddit.com/r/worldnews/top.json?limit=12&t=day',
      {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TradiaBot/1.0)' },
        next: { revalidate: 300 }, // 5 min — news doesn't move that fast
      }
    );
    if (!r.ok) return [];
    const j = await r.json();
    return (j?.data?.children ?? [])
      .map((c: any) => c.data)
      .filter((d: any) => d && !d.over_18 && d.title)
      .slice(0, 10)
      .map((d: any) => ({
        title: d.title as string,
        url: (d.url_overridden_by_dest as string) || `https://reddit.com${d.permalink}`,
        source: extractDomain(d.url_overridden_by_dest || ''),
        flair: (d.link_flair_text as string | null) ?? null,
        score: d.score as number,
        comments: d.num_comments as number,
        publishedAt: d.created_utc * 1000,
      }));
  } catch {
    return [];
  }
}

function extractDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return 'reddit.com';
  }
}

// ─── YouTube news channels (RSS, no key) ───────────────────────────
const YT_CHANNELS = [
  { id: 'UCupvZG-5ko_eiXAupbDfxWw', name: 'CNN' },
  { id: 'UC16niRr50-MSBwiO3YDb3RA', name: 'BBC News' },
  { id: 'UChqUTb7kYRX8-EiaN3XFrSQ', name: 'Reuters' },
  { id: 'UCNye-wNBqNL5ZzHSJj3l8Bg', name: 'Al Jazeera' },
  { id: 'UCIALMKvObZNtJ6AmdCLP7Lg', name: 'Bloomberg' },
];

interface YouTubeVideo {
  source: string;
  videoId: string;
  title: string;
  publishedAt: string;
  thumbnail: string;
  url: string;
}

async function fetchYouTubeChannel(channelId: string, name: string): Promise<YouTubeVideo[]> {
  try {
    const r = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`,
      { next: { revalidate: 600 } } // 10 min — videos don't update second-by-second
    );
    if (!r.ok) return [];
    const xml = await r.text();
    // Lightweight regex parse — RSS atom is predictable enough
    const entries = xml.split('<entry>').slice(1, 5); // top 4 latest videos
    return entries.map((e) => {
      const videoId = (e.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1] ?? '';
      const title   = (e.match(/<title>([^<]+)<\/title>/) || [])[1] ?? '';
      const published = (e.match(/<published>([^<]+)<\/published>/) || [])[1] ?? '';
      return {
        source: name,
        videoId,
        title: decodeXml(title),
        publishedAt: published,
        thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${videoId}`,
      };
    }).filter(v => v.videoId);
  } catch {
    return [];
  }
}

function decodeXml(s: string) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

async function fetchAllYouTubeNews(): Promise<YouTubeVideo[]> {
  const results = await Promise.all(YT_CHANNELS.map(c => fetchYouTubeChannel(c.id, c.name)));
  // Flatten + sort by recency
  return results.flat().sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

async function fetchEarthquakes() {
  try {
    const r = await fetch(
      'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson',
      { next: { revalidate: 60 } }
    );
    if (!r.ok) return [];
    const j = await r.json();
    return (j.features ?? []).slice(0, 8).map((f: any) => ({
      mag: f.properties.mag,
      place: f.properties.place,
      time: f.properties.time,
      lon: f.geometry.coordinates[0],
      lat: f.geometry.coordinates[1],
      url: f.properties.url,
    }));
  } catch {
    return [];
  }
}

async function fetchForex() {
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/USD', { next: { revalidate: 60 } });
    if (!r.ok) return null;
    const j = await r.json();
    if (j.result !== 'success') return null;
    const rates = j.rates as Record<string, number>;
    return [
      { pair: 'EUR/USD', rate: 1 / rates.EUR },
      { pair: 'GBP/USD', rate: 1 / rates.GBP },
      { pair: 'USD/JPY', rate: rates.JPY },
      { pair: 'USD/CHF', rate: rates.CHF },
      { pair: 'AUD/USD', rate: 1 / rates.AUD },
      { pair: 'USD/CAD', rate: rates.CAD },
      { pair: 'USD/CNY', rate: rates.CNY },
      { pair: 'USD/PHP', rate: rates.PHP },
    ].map(x => ({ ...x, rate: +x.rate.toFixed(4) }));
  } catch {
    return null;
  }
}

export async function GET() {
  const [quotes, earthquakes, forex, news, videos] = await Promise.all([
    Promise.all(SYMBOLS.map(s => fetchYahoo(s.symbol, s.name))),
    fetchEarthquakes(),
    fetchForex(),
    fetchNews(),
    fetchAllYouTubeNews(),
  ]);

  const valid = quotes.filter((q): q is YahooQuote => !!q);
  const indices    = valid.filter(q => SYMBOLS.find(s => s.symbol === q.symbol)?.group === 'index');
  const commodities= valid.filter(q => SYMBOLS.find(s => s.symbol === q.symbol)?.group === 'commodity');
  const crypto     = valid.filter(q => SYMBOLS.find(s => s.symbol === q.symbol)?.group === 'crypto');

  return NextResponse.json({
    fetchedAt: new Date().toISOString(),
    indices,
    commodities,
    crypto,
    forex,
    earthquakes,
    news,
    videos,
  });
}
