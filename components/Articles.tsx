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
    <div>
      <div className="phead">
        <p className="eyebrow"><BookOpen size={13} /> Articles &amp; insights</p>
        <h2>Read, learn, level up</h2>
        <p className="sub">
          Long-form articles from senior traders and coaches — strategy breakdowns, psychology deep-dives, and market analysis.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,300px) minmax(0,1fr)', gap: 24, alignItems: 'start' }}>
        {/* Sidebar — categories + tags */}
        <div className="listnav">
          <div className="search">
            <Search size={12} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search articles..."
              style={{
                flex: 1,
                minWidth: 0,
                background: 'none',
                border: 0,
                outline: 'none',
                font: 'inherit',
                fontSize: 13,
                color: 'var(--text)',
              }}
            />
          </div>

          <h6>CATEGORIES</h6>
          {CATEGORIES.map(c => (
            <a
              key={c}
              onClick={() => { setCategory(c); setTag(null); }}
              className={category === c ? 'on' : undefined}
              style={{ cursor: 'pointer' }}
            >
              {c === 'all' ? 'All Categories' : c}
            </a>
          ))}

          {tags.length > 0 && (
            <>
              <h6 style={{ marginTop: 26 }}>POPULAR TAGS</h6>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {tags.slice(0, 12).map((t: any) => (
                  <button
                    key={t.name}
                    onClick={() => setTag(tag === t.name ? null : t.name)}
                    className={tag === t.name ? 'chip on' : 'chip'}
                    style={{ height: 24, padding: '0 10px', fontSize: 11 }}
                  >
                    #{t.label} <em style={{ fontStyle: 'normal', opacity: 0.6 }}>{t.count}</em>
                  </button>
                ))}
              </div>
              {tag && (
                <button
                  onClick={() => setTag(null)}
                  style={{ marginTop: 12, fontSize: 11, fontWeight: 700, color: 'var(--amber)' }}
                >
                  Clear tag filter
                </button>
              )}
            </>
          )}
        </div>

        {/* Article grid */}
        <div>
          {filtered.length === 0 ? (
            <div className="blank" style={{ minHeight: 320 }}>
              <span className="corner" style={{ left: 0, top: 0, borderRight: 0, borderBottom: 0 }} />
              <span className="corner" style={{ right: 0, top: 0, borderLeft: 0, borderBottom: 0 }} />
              <span className="corner" style={{ left: 0, bottom: 0, borderRight: 0, borderTop: 0 }} />
              <span className="corner" style={{ right: 0, bottom: 0, borderLeft: 0, borderTop: 0 }} />
              <span className="badge" style={{ border: '1px solid rgba(47,211,196,.5)' }}>
                <BookOpen size={24} color="#2fd3c4" />
              </span>
              <h4>No articles yet</h4>
              <p>New content drops weekly. Stay tuned.</p>
            </div>
          ) : (
            <div className="news">
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
  const metaStyle = {
    fontStyle: 'normal',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  } as const;
  return (
    <a
      onClick={onOpen}
      style={{ animationDelay: `${idx * 60}ms`, cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
    >
      <div className="art" style={{ position: 'relative', overflow: 'hidden', flex: 'none' }}>
        {a.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.coverImage} alt={a.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <i style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={16} color="#2fd3c4" />
          </i>
        )}
        <b
          className="chip"
          style={{
            position: 'absolute',
            left: 10,
            top: 10,
            height: 20,
            padding: '0 10px',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '.04em',
            textTransform: 'uppercase',
          }}
        >
          {a.category}
        </b>
        {a.accessTier !== 'public' && (
          <b
            className="chip on"
            style={{
              position: 'absolute',
              right: 10,
              top: 10,
              height: 20,
              padding: '0 10px',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '.04em',
              textTransform: 'uppercase',
            }}
          >
            <Lock size={9} /> {a.accessTier === 'paid' ? 'Pro' : 'Subscriber'}
          </b>
        )}
      </div>
      <h5>{a.title}</h5>
      <span style={{ flex: 1, paddingBottom: 12 }}>{a.excerpt}</span>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          margin: '0 16px 16px',
          paddingTop: 12,
          borderTop: '1px solid var(--line)',
          fontSize: 10.5,
          color: 'var(--muted-2)',
        }}
      >
        <em style={metaStyle}>
          <Calendar size={10} /> {timeAgo(a.publishedAt ?? a.createdAt)}
        </em>
        <em style={{ ...metaStyle, marginLeft: 'auto' }}>
          <Eye size={10} /> {a.viewCount}
        </em>
      </div>
    </a>
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
    if (article.accessTier === 'paid') return tierName === 'pro' || tierName === 'elite';
    return true;
  }, [article, tierName]);

  if (!article) {
    return <p className="empty-line">Loading…</p>;
  }

  return (
    <div style={{ maxWidth: 820 }}>
      <button onClick={onBack} className="btn-g" style={{ height: 34, padding: '0 16px', marginBottom: 26 }}>
        <ArrowLeft size={14} /> Back to articles
      </button>

      {article.coverImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.coverImage}
          alt={article.title}
          style={{
            width: '100%',
            height: 280,
            objectFit: 'cover',
            border: '1px solid var(--line)',
            borderRadius: 2,
            display: 'block',
            marginBottom: 26,
          }}
        />
      )}

      <div className="phead">
        <p className="eyebrow" style={{ flexWrap: 'wrap', gap: 12 }}>
          <b className="chip on" style={{ height: 20, padding: '0 10px', fontSize: 9, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase' }}>
            {article.category}
          </b>
          <span>by {article.authorName}</span>
          <span style={{ color: 'var(--muted-2)' }}>·</span>
          <span>{timeAgo(article.publishedAt ?? article.createdAt)}</span>
          <span style={{ color: 'var(--muted-2)' }}>·</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Eye size={11} /> {article.viewCount} views</span>
        </p>
        <h2>{article.title}</h2>
        <p className="sub">{article.excerpt}</p>
      </div>

      {!canRead ? (
        <div className="blank">
          <span className="corner" style={{ left: 0, top: 0, borderRight: 0, borderBottom: 0 }} />
          <span className="corner" style={{ right: 0, top: 0, borderLeft: 0, borderBottom: 0 }} />
          <span className="corner" style={{ left: 0, bottom: 0, borderRight: 0, borderTop: 0 }} />
          <span className="corner" style={{ right: 0, bottom: 0, borderLeft: 0, borderTop: 0 }} />
          <span className="badge" style={{ border: '1px solid rgba(217,148,5,.5)' }}>
            <Lock size={22} color="#d99405" />
          </span>
          <h4>This is a {article.accessTier === 'paid' ? 'Pro' : 'subscriber'} article</h4>
          <p style={{ maxWidth: 420 }}>Upgrade to read the full piece plus everything else in our archive.</p>
          <button className="btn-a" style={{ marginTop: 24 }}>
            See plans <ArrowRight size={14} />
          </button>
        </div>
      ) : (
        <div
          className="card"
          style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: '24px', color: 'var(--text-2)', padding: '28px' }}
        >
          {article.body}
        </div>
      )}

      {article.tags && article.tags.length > 0 && (
        <div
          style={{
            marginTop: 26,
            paddingTop: 22,
            borderTop: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <Tag size={12} color="#5c6b7e" />
          {article.tags.map((t: string) => (
            <span key={t} className="chip" style={{ height: 24, padding: '0 10px', fontSize: 11 }}>
              #{t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
