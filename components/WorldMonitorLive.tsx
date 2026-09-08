'use client';

import { useEffect, useState } from 'react';
import { TrendUp as TrendingUp, TrendDown as TrendingDown, Warning as AlertTriangle, ArrowsClockwise as RefreshCw, CurrencyDollar as DollarSign, CurrencyBtc as Bitcoin, Fire as Flame, Newspaper, ChatCircle as MessageCircle, ArrowUp, PlayCircle, YoutubeLogo as Youtube } from '@phosphor-icons/react';
import { Pulse as Activity } from '@phosphor-icons/react';

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
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Activity size={14} color="#24c88a" />
        <h2 style={{ margin: 0, fontFamily: 'var(--display)', fontWeight: 700, fontSize: 12, letterSpacing: '.04em', color: 'var(--text)' }}>
          LIVE DATA
        </h2>
        {data && (
          <span style={{ fontSize: 11.5, color: 'var(--muted-2)' }}>
            · updated {timeAgo(new Date(data.fetchedAt).getTime())}
          </span>
        )}
        <button
          onClick={load}
          disabled={busy}
          className="btn-g"
          style={{ marginLeft: 'auto', height: 32, padding: '0 16px', fontWeight: 700, fontSize: 12.5, opacity: busy ? 0.5 : 1 }}
        >
          <RefreshCw size={12} className={busy ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && (
        <div
          className="card"
          style={{ marginTop: 16, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: 'var(--amber)' }}
        >
          <span className="accent" style={{ width: 44, background: 'var(--amber)' }} />
          <AlertTriangle size={14} /> {error} — sources may be rate-limiting.
        </div>
      )}

      {!data && busy && (
        <div className="tickgrid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', marginTop: 20 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="tick animate-pulse"
              style={{ height: 82, background: 'var(--panel-2)' }}
            />
          ))}
        </div>
      )}

      {data && (
        <>
          {/* Indices */}
          <Section title="MAJOR INDICES" icon={<TrendingUp size={13} color="#d99405" />}>
            <div className="tickgrid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))' }}>
              {data.indices.map(q => <Tile key={q.symbol} q={q} />)}
            </div>
          </Section>

          {/* Commodities */}
          <Section title="COMMODITIES" icon={<Flame size={13} color="#d99405" />}>
            <div className="tickgrid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))' }}>
              {data.commodities.map(q => <Tile key={q.symbol} q={q} />)}
            </div>
          </Section>

          {/* Crypto */}
          <Section title="CRYPTO" icon={<Bitcoin size={13} color="#d99405" />}>
            <div className="tickgrid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))' }}>
              {data.crypto.map(q => <Tile key={q.symbol} q={q} />)}
            </div>
          </Section>

          {/* World News */}
          {data.news && data.news.length > 0 && (
            <Section title="TOP HEADLINES" icon={<Newspaper size={13} color="#d99405" />}>
              <div className="card" style={{ padding: '6px 22px 10px' }}>
                {data.news.map((n, i) => (
                  <div
                    key={i}
                    className="mrow"
                    style={{ alignItems: 'flex-start', gap: 16, padding: '13px 0' }}
                  >
                    <span
                      style={{
                        flex: 'none',
                        width: 38,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 2,
                        paddingTop: 2,
                      }}
                    >
                      <ArrowUp size={11} color="#d99405" />
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--text)' }}>
                        {n.score >= 1000 ? `${(n.score / 1000).toFixed(1)}k` : n.score}
                      </span>
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        {n.flair && (
                          <span
                            style={{
                              height: 18,
                              padding: '0 9px',
                              border: '1px solid rgba(217,148,5,.45)',
                              borderRadius: 2,
                              background: 'var(--panel-2)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              fontWeight: 700,
                              fontSize: 9,
                              letterSpacing: '.04em',
                              textTransform: 'uppercase',
                              color: '#d99405',
                            }}
                          >
                            {n.flair}
                          </span>
                        )}
                        <span style={{ fontSize: 10.5, color: 'var(--muted-2)' }}>{n.source}</span>
                        <span style={{ fontSize: 10.5, color: 'var(--muted-2)' }}>· {timeAgo(n.publishedAt)}</span>
                        <span
                          style={{
                            marginLeft: 'auto',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 10.5,
                            color: 'var(--muted-2)',
                          }}
                        >
                          <MessageCircle size={10} />
                          <span style={{ fontFamily: 'var(--mono)' }}>{n.comments}</span>
                        </span>
                      </span>
                      <span
                        style={{
                          display: 'block',
                          marginTop: 7,
                          fontSize: 12.5,
                          lineHeight: '18px',
                          color: 'var(--text)',
                        }}
                      >
                        {n.title}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Latest video coverage — top of each major news network's YouTube */}
          {data.videos && data.videos.length > 0 && (
            <Section title="LATEST VIDEO COVERAGE" icon={<PlayCircle size={13} color="#ff4d5e" />}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 16 }}>
                {data.videos.slice(0, 12).map(v => (
                  <div
                    key={v.videoId}
                    style={{
                      border: '1px solid var(--line)',
                      borderRadius: 2,
                      background: 'var(--panel)',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div style={{ height: 110, background: '#070c13', overflow: 'hidden', flex: 'none' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={v.thumbnail}
                        alt={v.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    </div>
                    <h5
                      style={{
                        margin: 0,
                        padding: '16px 16px 0',
                        fontWeight: 700,
                        fontSize: 11.5,
                        lineHeight: '17px',
                        color: 'var(--text)',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {v.title}
                    </h5>
                    <div
                      style={{
                        marginTop: 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '12px 16px 16px',
                        fontSize: 11,
                        color: 'var(--muted-2)',
                      }}
                    >
                      <Youtube size={11} color="#ff4d5e" />
                      <span style={{ fontWeight: 700, color: '#c0ccda' }}>{v.source}</span>
                      <span>· {timeAgo(new Date(v.publishedAt).getTime())}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <div className="split" style={{ marginTop: 32 }}>
            {/* Forex */}
            {data.forex && (
              <div className="card" style={{ padding: '20px 20px 30px' }}>
                <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 10, color: 'var(--amber)', letterSpacing: '.04em' }}>
                  <DollarSign size={13} color="#d99405" /> FOREX (USD)
                </p>
                <div className="fxrow">
                  {data.forex.map(f => (
                    <div key={f.pair}>
                      {f.pair}
                      <em>{f.rate}</em>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Earthquakes */}
            <div className="card" style={{ padding: '20px 20px 30px' }}>
              <p style={{ margin: '0 0 18px', display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 10, color: 'var(--amber)', letterSpacing: '.04em' }}>
                <AlertTriangle size={13} color="#d99405" /> RECENT EARTHQUAKES (M ≥ 4.5, 24H)
              </p>
              {data.earthquakes.length === 0 ? (
                <p className="empty-line" style={{ padding: '24px 0' }}>No significant events in the last 24h.</p>
              ) : (
                data.earthquakes.map((eq, i) => (
                  <div key={i} className="quake">
                    <b style={{ color: eq.mag >= 6 ? 'var(--red)' : eq.mag >= 5 ? 'var(--amber)' : 'var(--text)' }}>
                      M{eq.mag.toFixed(1)}
                    </b>
                    <span style={{ marginLeft: 0, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#c0ccda', fontSize: 11.5 }}>
                      {eq.place}
                    </span>
                    <span>{timeAgo(eq.time)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <p className="footnote" style={{ marginTop: 22, fontSize: 11 }}>
            Sources: Yahoo Finance · USGS · open.er-api.com · Reddit r/worldnews · YouTube RSS (CNN, BBC, Reuters, Al Jazeera, Bloomberg). Refreshed every 60s.
          </p>
        </>
      )}
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <p className="sect" style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text)' }}>
        {icon} {title}
      </p>
      {children}
    </div>
  );
}

function Tile({ q }: { q: Quote }) {
  const up = q.changePct >= 0;
  return (
    <div className="tick">
      <b style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textTransform: 'uppercase' }}>{q.name}</b>
      <em>
        {q.currency === 'USD' && '$'}{q.price.toLocaleString(undefined, { maximumFractionDigits: q.price < 10 ? 4 : 2 })}
      </em>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: up ? 'var(--green)' : 'var(--red)' }}>
        {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
        {up ? '+' : ''}{q.changePct.toFixed(2)}%
      </span>
    </div>
  );
}
