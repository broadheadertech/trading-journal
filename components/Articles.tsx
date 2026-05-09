'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { BookOpen, ArrowLeft, Search, Eye, Tag, Calendar, ArrowRight, Lock } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';

type View = 'list' | 'detail';

const CATEGORIES = ['all', 'Strategy', 'Psychology', 'Market Analysis', 'Education', 'News'];

function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)}m`;
  if (s < 86400) return `${Math.round(s / 3600)}h`;
  if (s < 2592000) return `${Math.round(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function Articles() {
  const [view, setView] = useState<View>('list');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState<string | null>(null);

  const articles = useQuery(api.articles.listPublished, {
    category: category === 'all' ? undefined : category,
    tag: tag ?? undefined,
  }) ?? [];
  const tags = useQuery(api.articles.listTags) ?? [];

  if (view === 'detail' && activeId) {
    return <ArticleDetail id={activeId} onBack={() => { setActiveId(null); setView('list'); }} />;
  }

  const filtered = search.trim()
    ? articles.filter((a: any) =>
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.excerpt.toLowerCase().includes(search.toLowerCase())
      )
    : articles;

  return (
    <div className="relative space-y-10">
      <div className="hero-glow" />

      <header className="space-y-3 anim-fade-up">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-medium text-[var(--muted-foreground)]">
          <BookOpen size={12} /> Articles & insights
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[var(--foreground)]">
          Read, learn, <span className="gradient-text">level up</span>
        </h1>
        <p className="text-base text-[var(--muted-foreground)] max-w-xl">
          Long-form articles from senior traders and coaches — strategy breakdowns, psychology deep-dives, and market analysis.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
        {/* Sidebar — categories + tags */}
        <aside className="glass rounded-2xl p-4 space-y-4 h-fit anim-fade-up" style={{ animationDelay: '60ms' }}>
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search articles..."
              className="w-full pl-7 pr-2 py-1.5 bg-[var(--background)] border border-[var(--border)] rounded-lg text-xs"
            />
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5">Categories</div>
            <div className="space-y-0.5">
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  onClick={() => { setCategory(c); setTag(null); }}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs ${
                    category === c
                      ? 'bg-pink-500/15 text-pink-400 font-medium'
                      : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]/40'
                  }`}
                >
                  {c === 'all' ? 'All Categories' : c}
                </button>
              ))}
            </div>
          </div>

          {tags.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5">Popular Tags</div>
              <div className="flex flex-wrap gap-1">
                {tags.slice(0, 12).map((t: any) => (
                  <button
                    key={t.name}
                    onClick={() => setTag(tag === t.name ? null : t.name)}
                    className={`text-[10px] px-2 py-0.5 rounded-full ${
                      tag === t.name
                        ? 'bg-pink-500 text-white'
                        : 'bg-[var(--muted)]/30 text-[var(--muted-foreground)] hover:bg-[var(--muted)]/60'
                    }`}
                  >
                    #{t.label} <span className="opacity-60">{t.count}</span>
                  </button>
                ))}
              </div>
              {tag && (
                <button onClick={() => setTag(null)} className="mt-2 text-[10px] text-pink-400 hover:underline">
                  Clear tag filter
                </button>
              )}
            </div>
          )}
        </aside>

        {/* Article grid */}
        <div className="space-y-4">
          {filtered.length === 0 ? (
            <div className="relative overflow-hidden rounded-3xl border border-dashed border-[var(--border)] bg-[var(--card)]/40 backdrop-blur p-16 text-center">
              <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/20 to-emerald-500/10 flex items-center justify-center">
                <BookOpen size={28} className="text-pink-400" />
              </div>
              <p className="text-[var(--foreground)] font-medium">No articles yet</p>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">New content drops weekly. Stay tuned.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {filtered.map((a: any, idx: number) => (
                <ArticleCard
                  key={a.id}
                  article={a}
                  idx={idx}
                  onOpen={() => { setActiveId(a.id); setView('detail'); }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ArticleCard({ article: a, idx, onOpen }: { article: any; idx: number; onOpen: () => void }) {
  return (
    <article
      onClick={onOpen}
      style={{ animationDelay: `${idx * 60}ms` }}
      className="group glass rounded-3xl overflow-hidden card-lift anim-fade-up cursor-pointer flex flex-col"
    >
      <div className="relative h-40 overflow-hidden">
        {a.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.coverImage} alt={a.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-pink-500/30 via-emerald-500/20 to-pink-700/10 flex items-center justify-center">
            <BookOpen size={40} className="text-white/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />
        <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur text-[10px] font-bold uppercase tracking-wider text-white">
          {a.category}
        </div>
        {a.accessTier !== 'public' && (
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/90 backdrop-blur text-[10px] font-bold uppercase tracking-wider text-white">
            <Lock size={9} /> {a.accessTier === 'paid' ? 'Pro' : 'Subscriber'}
          </div>
        )}
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="font-bold text-lg text-[var(--foreground)] tracking-tight leading-snug line-clamp-2">{a.title}</h3>
        <p className="text-sm text-[var(--muted-foreground)] line-clamp-2 mt-1 flex-1">{a.excerpt}</p>
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border)] text-xs text-[var(--muted-foreground)]">
          <span className="flex items-center gap-1.5">
            <Calendar size={11} /> {timeAgo(a.publishedAt ?? a.createdAt)}
          </span>
          <span className="flex items-center gap-1.5">
            <Eye size={11} /> {a.viewCount}
          </span>
        </div>
      </div>
    </article>
  );
}

function ArticleDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const article = useQuery(api.articles.getById, { id });
  const recordView = useMutation(api.articles.recordView);
  const { tierName } = useSubscription();

  useEffect(() => {
    if (article?.id) recordView({ articleId: article.id }).catch(() => {});
  }, [article?.id, recordView]);

  const canRead = useMemo(() => {
    if (!article) return false;
    if (article.accessTier === 'public') return true;
    if (article.accessTier === 'subscribers') return tierName !== 'free';
    if (article.accessTier === 'paid') return tierName === 'pro' || tierName === 'elite' || tierName === 'legend';
    return true;
  }, [article, tierName]);

  if (!article) {
    return <div className="text-[var(--muted-foreground)] text-sm">Loading…</div>;
  }

  return (
    <article className="relative max-w-3xl mx-auto space-y-6 anim-fade-up">
      <div className="hero-glow" />

      <button onClick={onBack} className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
        <ArrowLeft size={16} /> Back to articles
      </button>

      {article.coverImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={article.coverImage} alt={article.title} className="w-full h-72 object-cover rounded-3xl" />
      )}

      <header className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap text-xs text-[var(--muted-foreground)]">
          <span className="px-2 py-0.5 rounded-full bg-pink-500/15 text-pink-400 font-bold uppercase tracking-wider">{article.category}</span>
          <span>·</span>
          <span>by {article.authorName}</span>
          <span>·</span>
          <span>{timeAgo(article.publishedAt ?? article.createdAt)}</span>
          <span>·</span>
          <span className="flex items-center gap-1"><Eye size={11} /> {article.viewCount} views</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--foreground)] leading-tight">{article.title}</h1>
        <p className="text-lg text-[var(--muted-foreground)]">{article.excerpt}</p>
      </header>

      {!canRead ? (
        <div className="glass rounded-3xl p-10 text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/30 to-orange-500/10 flex items-center justify-center">
            <Lock size={26} className="text-amber-400" />
          </div>
          <h3 className="text-lg font-bold text-[var(--foreground)]">This is a {article.accessTier === 'paid' ? 'Pro' : 'subscriber'} article</h3>
          <p className="text-sm text-[var(--muted-foreground)] max-w-md mx-auto">
            Upgrade to read the full piece plus everything else in our archive.
          </p>
          <button className="px-5 py-2.5 rounded-xl bg-gradient-to-br from-pink-500 to-pink-700 text-white text-sm font-semibold flex items-center gap-2 mx-auto">
            See plans <ArrowRight size={14} />
          </button>
        </div>
      ) : (
        <div className="prose prose-invert max-w-none text-[var(--foreground)] whitespace-pre-wrap leading-relaxed">
          {article.body}
        </div>
      )}

      {article.tags && article.tags.length > 0 && (
        <div className="pt-6 border-t border-[var(--border)] flex items-center gap-2 flex-wrap">
          <Tag size={12} className="text-[var(--muted-foreground)]" />
          {article.tags.map((t: string) => (
            <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--muted)]/30 text-[var(--muted-foreground)]">
              #{t}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
