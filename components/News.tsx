'use client';

import { useState, useEffect } from 'react';
import { ArrowSquareOut, ArrowsClockwise, Newspaper, WarningCircle } from '@phosphor-icons/react';
import { formatDistanceToNow } from 'date-fns';

interface Article {
  source: { name: string };
  title: string;
  description: string | null;
  url: string;
  publishedAt: string;
  urlToImage: string | null;
}

type Category = 'all' | 'crypto' | 'stocks' | 'markets' | 'regulation' | 'macro';

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'crypto', label: '🪙 Crypto' },
  { id: 'stocks', label: '📈 Stocks' },
  { id: 'markets', label: '🌍 Markets' },
  { id: 'regulation', label: '⚖️ Regulation' },
  { id: 'macro', label: '🏦 Macro' },
];

export default function News() {
  const [category, setCategory] = useState<Category>('all');
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(`/api/news?category=${category}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
          setArticles([]);
        } else {
          setArticles((data.articles ?? []).filter((a: Article) => a.title && a.title !== '[Removed]'));
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load news. Check your connection.');
        setLoading(false);
      });
  }, [category, refreshKey]);

  const isApiKeyMissing = error === 'API key not configured';

  return (
    <div style={{ position: 'relative' }}>
      {/* Header */}
      <div className="phead pwrap">
        <p className="eyebrow"><Newspaper size={13} /> Live wire</p>
        <h2>Market news</h2>
        <p className="sub">
          Live financial news to keep you informed — filtered by the desks that move your markets.
        </p>
        <div className="actions">
          <button className="btn-g" type="button" onClick={() => setRefreshKey(k => k + 1)} disabled={loading}
            style={loading ? { opacity: 0.4 } : undefined}>
            <ArrowsClockwise size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,260px) minmax(0,1fr)', gap: 24, alignItems: 'start' }}>
        {/* Sidebar — categories */}
        <div className="listnav">
          <h6>CATEGORIES</h6>
          {CATEGORIES.map(cat => (
            <a
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={category === cat.id ? 'on' : undefined}
              style={{ cursor: 'pointer' }}
            >
              {cat.label}
            </a>
          ))}
        </div>

        <div>
          {/* API Key Missing State */}
          {isApiKeyMissing && (
            <div className="card">
              <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <WarningCircle size={18} color="#d99405" style={{ flex: 'none', marginTop: 2 }} />
                <div style={{ minWidth: 0 }}>
                  <h3>News API key not configured</h3>
                  <p className="sub">To display live news, you need a free API key from NewsAPI.org.</p>
                  <div className="klist num">
                    <div><b>1</b><span>Go to <a href="https://newsapi.org/register" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--amber)', fontWeight: 700 }}>newsapi.org/register</a> and create a free account</span></div>
                    <div><b>2</b><span>Copy your API key from the dashboard</span></div>
                    <div><b>3</b><span>Open <code style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text)' }}>.env.local</code> in your project root</span></div>
                    <div><b>4</b><span>Replace <code style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text)' }}>NEWS_API_KEY=your_key_here</code> with your actual key</span></div>
                    <div><b>5</b><span>Restart the dev server</span></div>
                  </div>
                  <div className="warn">
                    <b>Free tier:</b> 100 requests/day · Developer use only · For production, upgrade at newsapi.org
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Generic Error */}
          {error && !isApiKeyMissing && (
            <div className="card" style={{ textAlign: 'center', padding: '34px 28px' }}>
              <span className="accent" style={{ width: 56, background: 'var(--red)' }} />
              <WarningCircle size={22} color="#ff4d5e" style={{ display: 'inline-block' }} />
              <p className="empty-line" style={{ padding: '14px 0 0' }}>{error}</p>
              <button
                onClick={() => setRefreshKey(k => k + 1)}
                style={{ marginTop: 16, fontWeight: 700, fontSize: 13, color: 'var(--amber)' }}
              >
                Try again
              </button>
            </div>
          )}

          {/* Loading Skeleton */}
          {loading && !error && (
            <div className="news">
              {Array.from({ length: 8 }).map((_, i) => (
                <a key={i} className="animate-pulse" style={{ cursor: 'default' }}>
                  <div className="art" />
                  <h5>
                    <span style={{ display: 'block', height: 10, background: 'var(--line)', marginBottom: 7 }} />
                    <span style={{ display: 'block', height: 10, width: '75%', background: 'var(--line)' }} />
                  </h5>
                  <span>
                    <span style={{ display: 'block', height: 8, background: 'var(--hair)', marginBottom: 6 }} />
                    <span style={{ display: 'block', height: 8, width: '60%', background: 'var(--hair)' }} />
                  </span>
                </a>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && articles.length === 0 && (
            <div className="blank" style={{ minHeight: 320 }}>
              <span className="corner" style={{ left: 0, top: 0, borderRight: 0, borderBottom: 0 }} />
              <span className="corner" style={{ right: 0, top: 0, borderLeft: 0, borderBottom: 0 }} />
              <span className="corner" style={{ left: 0, bottom: 0, borderRight: 0, borderTop: 0 }} />
              <span className="corner" style={{ right: 0, bottom: 0, borderLeft: 0, borderTop: 0 }} />
              <span className="badge" style={{ border: '1px solid rgba(217,148,5,.5)' }}>
                <Newspaper size={24} color="#d99405" />
              </span>
              <h4>No articles found</h4>
              <p>Nothing on the wire for this category right now.</p>
            </div>
          )}

          {/* Articles Grid */}
          {!loading && articles.length > 0 && (
            <div className="news">
              {articles.map((article, i) => (
                <a
                  key={i}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'flex', flexDirection: 'column' }}
                >
                  <div className="art" style={{ position: 'relative', overflow: 'hidden', flex: 'none' }}>
                    {article.urlToImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={article.urlToImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <i style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Newspaper size={16} color="#d99405" />
                      </i>
                    )}
                    <b
                      className="chip"
                      style={{
                        position: 'absolute', left: 10, top: 10, height: 20, padding: '0 10px',
                        fontSize: 9, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase',
                        maxWidth: 'calc(100% - 20px)', overflow: 'hidden', whiteSpace: 'nowrap',
                      }}
                    >
                      {article.source.name}
                    </b>
                  </div>
                  <h5>
                    {article.title}
                    <ArrowSquareOut size={10} style={{ display: 'inline', marginLeft: 5, opacity: 0.55 }} />
                  </h5>
                  {article.description && <span style={{ flex: 1 }}>{article.description}</span>}
                  <span
                    style={{
                      margin: '0 16px 16px', padding: '12px 0 0', borderTop: '1px solid var(--line)',
                      fontSize: 10.5, color: 'var(--muted-2)',
                    }}
                  >
                    {formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="footnote">
        News sourced from NewsAPI.org · Updates every 5 minutes · For informational purposes only
      </p>
    </div>
  );
}
