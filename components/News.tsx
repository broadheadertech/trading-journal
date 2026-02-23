'use client';

import { useState, useEffect } from 'react';
import { ExternalLink, RefreshCw, Newspaper, AlertCircle } from 'lucide-react';
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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold">Market News</h2>
          <p className="text-sm text-[var(--muted-foreground)]">Live financial news to keep you informed</p>
        </div>
        <button
          onClick={() => setRefreshKey(k => k + 1)}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors disabled:opacity-40"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
              category === cat.id
                ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--accent)]/40 hover:text-[var(--foreground)]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* API Key Missing State */}
      {isApiKeyMissing && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium mb-1">News API key not configured</h3>
              <p className="text-sm text-[var(--muted-foreground)] mb-3">
                To display live news, you need a free API key from NewsAPI.org.
              </p>
              <ol className="text-sm text-[var(--muted-foreground)] space-y-1.5 list-decimal list-inside">
                <li>Go to <a href="https://newsapi.org/register" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">newsapi.org/register</a> and create a free account</li>
                <li>Copy your API key from the dashboard</li>
                <li>Open <code className="px-1.5 py-0.5 bg-[var(--muted)] rounded text-xs font-mono">.env.local</code> in your project root</li>
                <li>Replace <code className="px-1.5 py-0.5 bg-[var(--muted)] rounded text-xs font-mono">NEWS_API_KEY=your_key_here</code> with your actual key</li>
                <li>Restart the dev server</li>
              </ol>
              <p className="text-xs text-[var(--muted-foreground)] mt-3 p-2 bg-[var(--muted)] rounded-lg">
                Free tier: 100 requests/day · Developer use only · For production, upgrade at newsapi.org
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Generic Error */}
      {error && !isApiKeyMissing && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 text-center">
          <AlertCircle size={24} className="text-[var(--red)] mx-auto mb-2" />
          <p className="text-sm text-[var(--muted-foreground)]">{error}</p>
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="mt-3 text-sm text-[var(--accent)] hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 space-y-3 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="h-3 w-24 bg-[var(--muted)] rounded" />
                <div className="h-3 w-16 bg-[var(--muted)] rounded" />
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-[var(--muted)] rounded w-full" />
                <div className="h-4 bg-[var(--muted)] rounded w-4/5" />
              </div>
              <div className="space-y-1">
                <div className="h-3 bg-[var(--muted)] rounded w-full" />
                <div className="h-3 bg-[var(--muted)] rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && articles.length === 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-12 text-center">
          <Newspaper size={32} className="text-[var(--muted-foreground)] mx-auto mb-3" />
          <p className="text-[var(--muted-foreground)]">No articles found for this category</p>
        </div>
      )}

      {/* Articles Grid */}
      {!loading && articles.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {articles.map((article, i) => (
            <a
              key={i}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 space-y-2 hover:border-[var(--accent)]/40 transition-colors group block"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-[var(--accent)] truncate">{article.source.name}</span>
                <span className="text-xs text-[var(--muted-foreground)] shrink-0">
                  {formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-[var(--foreground)] leading-snug group-hover:text-[var(--accent)] transition-colors line-clamp-2">
                {article.title}
                <ExternalLink size={11} className="inline ml-1 opacity-50 group-hover:opacity-100 transition-opacity" />
              </h3>
              {article.description && (
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed line-clamp-2">
                  {article.description}
                </p>
              )}
            </a>
          ))}
        </div>
      )}

      <p className="text-xs text-[var(--muted-foreground)] text-center pb-2">
        News sourced from NewsAPI.org · Updates every 5 minutes · For informational purposes only
      </p>
    </div>
  );
}
