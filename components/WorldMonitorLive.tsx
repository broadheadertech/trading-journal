'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Activity, AlertTriangle, RefreshCw, DollarSign, Bitcoin, Flame, Newspaper, MessageCircle, ArrowUp, ExternalLink, PlayCircle, Youtube } from 'lucide-react';

interface Quote {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  currency: string;
}

interface Earthquake {
  mag: number;
  place: string;
  time: number;
  lat: number;
  lon: number;
  url: string;
}

interface ForexPair {
  pair: string;
  rate: number;
}

interface NewsItem {
  title: string;
  url: string;
  source: string;
  flair: string | null;
  score: number;
  comments: number;
  publishedAt: number;
}

interface VideoItem {
  source: string;
  videoId: string;
  title: string;
  publishedAt: string;
  thumbnail: string;
  url: string;
}

interface WorldData {
  fetchedAt: string;
  indices: Quote[];
  commodities: Quote[];
  crypto: Quote[];
  forex: ForexPair[] | null;
  earthquakes: Earthquake[];
  news: NewsItem[];
  videos: VideoItem[];
}

// Channels we deep-link to from each headline. user= form lets YT pick the canonical channel.
const NEWS_CHANNELS = [
  { name: 'CNN',        user: 'CNN',                color: 'text-red-400' },
  { name: 'BBC',        user: 'BBCNews',            color: 'text-orange-400' },
  { name: 'Reuters',    user: 'Reuters',            color: 'text-amber-400' },
  { name: 'Al Jazeera', user: 'aljazeeraenglish',   color: 'text-emerald-400' },
];

function ytSearchUrl(query: string, channel: string) {
  const q = encodeURIComponent(`${query} ${channel}`);
  return `https://www.youtube.com/results?search_query=${q}`;
}

function timeAgo(ts: number) {
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return `${Math.round(s)}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

export default function WorldMonitorLive() {
  const [data, setData] = useState<WorldData | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch('/api/world-monitor', { cache: 'no-store' });
      if (!r.ok) throw new Error('Failed to fetch');
      setData(await r.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--muted-foreground)] flex items-center gap-2">
          <Activity size={14} className="text-emerald-400 animate-pulse" />
          Live Data
          {data && <span className="font-normal normal-case text-[10px]">· updated {timeAgo(new Date(data.fetchedAt).getTime())}</span>}
        </h2>
        <button
          onClick={load}
          disabled={busy}
          className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg border border-[var(--border)] hover:bg-[var(--muted)]/40 disabled:opacity-50"
        >
          <RefreshCw size={12} className={busy ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && (
        <div className="glass rounded-2xl p-4 text-sm text-amber-400 flex items-center gap-2">
          <AlertTriangle size={14} /> {error} — sources may be rate-limiting.
        </div>
      )}

      {!data && busy && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass rounded-2xl h-20 animate-pulse" />
          ))}
        </div>
      )}

      {data && (
        <>
          {/* Indices */}
          <Section title="Major Indices" icon={<TrendingUp size={14} className="text-blue-400" />}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {data.indices.map(q => <Tile key={q.symbol} q={q} />)}
            </div>
          </Section>

          {/* Commodities */}
          <Section title="Commodities" icon={<Flame size={14} className="text-orange-400" />}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {data.commodities.map(q => <Tile key={q.symbol} q={q} />)}
            </div>
          </Section>

          {/* Crypto */}
          <Section title="Crypto" icon={<Bitcoin size={14} className="text-amber-400" />}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {data.crypto.map(q => <Tile key={q.symbol} q={q} />)}
            </div>
          </Section>

          {/* World News */}
          {data.news && data.news.length > 0 && (
            <Section title="World News (live)" icon={<Newspaper size={14} className="text-cyan-400" />}>
              <div className="glass rounded-2xl divide-y divide-[var(--border)] overflow-hidden">
                {data.news.map((n, i) => (
                  <a
                    key={i}
                    href={n.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 p-3 hover:bg-[var(--muted)]/40 transition-colors group"
                  >
                    <div className="shrink-0 flex flex-col items-center gap-0.5 w-10 pt-0.5">
                      <ArrowUp size={12} className="text-orange-400" />
                      <span className="text-[10px] font-bold text-[var(--foreground)] tabular-nums">
                        {n.score >= 1000 ? `${(n.score / 1000).toFixed(1)}k` : n.score}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        {n.flair && (
                          <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 font-bold">
                            {n.flair}
                          </span>
                        )}
                        <span className="text-[10px] text-[var(--muted-foreground)]">{n.source}</span>
                        <span className="text-[10px] text-[var(--muted-foreground)]">· {timeAgo(n.publishedAt)}</span>
                      </div>
                      <div className="text-sm text-[var(--foreground)] group-hover:text-cyan-400 transition-colors line-clamp-2">
                        {n.title}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="flex items-center gap-1 text-[10px] text-[var(--muted-foreground)]">
                          <MessageCircle size={10} /> {n.comments}
                        </span>
                        <span className="text-[10px] text-[var(--muted-foreground)]">·</span>
                        <span className="text-[10px] text-[var(--muted-foreground)] flex items-center gap-1">
                          <Youtube size={10} className="text-red-500" /> Watch on
                        </span>
                        {NEWS_CHANNELS.map(c => (
                          <button
                            key={c.name}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              window.open(ytSearchUrl(n.title, c.name), '_blank', 'noopener,noreferrer');
                            }}
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded border border-[var(--border)] hover:bg-[var(--muted)]/40 transition-colors ${c.color}`}
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </Section>
          )}

          {/* Latest video coverage — top of each major news network's YouTube */}
          {data.videos && data.videos.length > 0 && (
            <Section title="Latest Video Coverage" icon={<PlayCircle size={14} className="text-red-500" />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {data.videos.slice(0, 12).map(v => (
                  <a
                    key={v.videoId}
                    href={v.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="glass rounded-2xl overflow-hidden card-lift group"
                  >
                    <div className="relative aspect-video bg-black overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={v.thumbnail}
                        alt={v.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur text-[10px] font-bold text-white">
                        <Youtube size={11} className="text-red-500" /> {v.source}
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-red-500/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <PlayCircle size={28} className="text-white" fill="white" stroke="rgb(239,68,68)" />
                        </div>
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="text-xs font-medium text-[var(--foreground)] line-clamp-2 group-hover:text-red-400 transition-colors">
                        {v.title}
                      </div>
                      <div className="text-[10px] text-[var(--muted-foreground)] mt-1">
                        {timeAgo(new Date(v.publishedAt).getTime())}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </Section>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Forex */}
            {data.forex && (
              <Section title="Forex (USD)" icon={<DollarSign size={14} className="text-emerald-400" />}>
                <div className="glass rounded-2xl p-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {data.forex.map(f => (
                    <div key={f.pair} className="flex items-center justify-between text-sm border-b border-[var(--border)] last:border-0 py-1">
                      <span className="font-mono text-[var(--muted-foreground)]">{f.pair}</span>
                      <span className="font-mono font-bold text-[var(--foreground)]">{f.rate}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Earthquakes */}
            <Section title="Recent Earthquakes (M ≥ 4.5, 24h)" icon={<AlertTriangle size={14} className="text-amber-400" />}>
              <div className="glass rounded-2xl p-3">
                {data.earthquakes.length === 0 ? (
                  <p className="text-sm text-[var(--muted-foreground)] text-center py-3">No significant events in the last 24h.</p>
                ) : (
                  <div className="space-y-1.5">
                    {data.earthquakes.map((eq, i) => (
                      <a key={i} href={eq.url} target="_blank" rel="noopener noreferrer"
                         className="flex items-center gap-3 py-1.5 text-sm hover:bg-[var(--muted)]/40 rounded-lg px-2 transition-colors">
                        <span className={`font-mono font-bold ${eq.mag >= 6 ? 'text-red-400' : eq.mag >= 5 ? 'text-amber-400' : 'text-[var(--foreground)]'}`}>
                          M{eq.mag.toFixed(1)}
                        </span>
                        <span className="flex-1 truncate text-[var(--foreground)]">{eq.place}</span>
                        <span className="text-xs text-[var(--muted-foreground)]">{timeAgo(eq.time)}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </Section>
          </div>

          <p className="text-[10px] text-[var(--muted-foreground)] text-center">
            Sources: Yahoo Finance · USGS · open.er-api.com · Reddit r/worldnews · YouTube RSS (CNN, BBC, Reuters, Al Jazeera, Bloomberg). Refreshed every 60s.
          </p>
        </>
      )}
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
        {icon} {title}
      </div>
      {children}
    </div>
  );
}

function Tile({ q }: { q: Quote }) {
  const up = q.changePct >= 0;
  return (
    <div className="glass rounded-2xl p-3 card-lift">
      <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] truncate">{q.name}</div>
      <div className="text-base font-bold text-[var(--foreground)] tabular-nums">
        {q.currency === 'USD' && '$'}{q.price.toLocaleString(undefined, { maximumFractionDigits: q.price < 10 ? 4 : 2 })}
      </div>
      <div className={`flex items-center gap-1 text-xs font-bold ${up ? 'text-emerald-400' : 'text-red-400'}`}>
        {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
        {up ? '+' : ''}{q.changePct.toFixed(2)}%
      </div>
    </div>
  );
}
