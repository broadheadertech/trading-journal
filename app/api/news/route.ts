import { NextRequest, NextResponse } from 'next/server';

const CATEGORY_QUERIES: Record<string, string> = {
  crypto: 'bitcoin OR ethereum OR cryptocurrency OR altcoin OR DeFi OR NFT OR blockchain',
  stocks: 'stock market OR NYSE OR NASDAQ OR "S&P 500" OR earnings OR IPO OR equities',
  markets: 'financial markets OR trading OR "interest rates" OR inflation OR "central bank"',
  regulation: 'SEC OR "financial regulation" OR "crypto regulation" OR CFTC OR MiCA',
  macro: 'GDP OR unemployment OR CPI OR "Federal Reserve" OR "monetary policy" OR recession',
};

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get('category') ?? 'all';
  const apiKey = process.env.NEWS_API_KEY;

  if (!apiKey || apiKey === 'your_key_here') {
    return NextResponse.json({ error: 'API key not configured' }, { status: 503 });
  }

  const q = CATEGORY_QUERIES[category] ??
    'bitcoin OR ethereum OR "stock market" OR crypto OR trading OR "Federal Reserve"';

  try {
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&sortBy=publishedAt&pageSize=30&language=en&apiKey=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: data.message ?? 'NewsAPI error' }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
  }
}
