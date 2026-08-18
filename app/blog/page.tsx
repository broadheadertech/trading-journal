'use client';

import type { CSSProperties } from 'react';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import LandingNav from '@/components/landing/LandingNav';
import Footer from '@/components/landing/Footer';
import { BLOG_ARTICLES, POPULAR_SLUGS, type BlogArticle } from '@/lib/blog-articles';

const SPARK = [
  'M0 130 L19 120 L38 108 L56 91 L75 94 L94 86 L131 74 L169 60 L206 52 L244 38 L281 30 L319 18 L356 12 L394 4',
  'M0 130 L19 111 L38 96 L56 100 L75 84 L94 75 L131 68 L169 54 L206 48 L244 36 L281 28 L319 20 L356 10 L394 2',
  'M0 117 L19 120 L38 130 L56 121 L75 125 L94 112 L131 104 L169 96 L206 84 L244 78 L281 62 L319 54 L356 40 L394 30',
];

const SIDE_PATHS = [
  'M0 49 L5 60 L10 44 L15 60 L20 51 L25 50 L30 40 L40 44 L52 30 L64 34 L76 20 L88 24 L104 8',
  'M0 94 L5 94 L10 104 L15 81 L20 97 L25 91 L34 78 L46 84 L58 62 L70 68 L82 44 L94 50 L104 26',
  'M0 63 L5 53 L10 43 L15 50 L20 62 L25 61 L34 48 L46 52 L58 36 L70 40 L82 24 L94 28 L104 10',
];

function ClockIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
      <circle cx="4.5" cy="4.5" r="4" stroke="#5c6b7e" />
      <path d="M4.5 2.4v2.4" stroke="#5c6b7e" />
    </svg>
  );
}

function ReadArrow() {
  return (
    <svg width="8" height="10" viewBox="0 0 8 10" fill="none">
      <path d="M3 0 L8 5 M8 5 L3 10 M8 5 H0" stroke="#d99405" strokeWidth="1.5" />
    </svg>
  );
}

function ArticleCard({ article, idx }: { article: BlogArticle; idx: number }) {
  const c = idx === 0 ? '#d99405' : '#2fd3c4';
  const d = SPARK[idx % SPARK.length];
  const cat = article.category.toUpperCase();
  return (
    <Link className="art" href={`/blog/${article.slug}`}>
      <div className="thumb">
        <span className="corner" style={{ left: 0, top: 0, borderRight: 0, borderBottom: 0 }}></span>
        <span className="corner" style={{ right: 0, top: 0, borderLeft: 0, borderBottom: 0 }}></span>
        <span className="corner" style={{ left: 0, bottom: 0, borderRight: 0, borderTop: 0 }}></span>
        <span className="corner" style={{ right: 0, bottom: 0, borderLeft: 0, borderTop: 0 }}></span>
        <span className="chip" style={{ color: c }}>{cat}</span>
        <svg viewBox="0 0 394 130" preserveAspectRatio="none" style={{ position: 'absolute', left: '18px', top: '28px', width: '394px', maxWidth: 'calc(100% - 36px)', height: '130px' }} fill="none">
          <path d={`${d} L394 130 L0 130 Z`} fill={c} fillOpacity=".14" />
          <path d={d} stroke={c} strokeWidth="1.8" />
        </svg>
        <span className="slug">/{article.slug}</span>
      </div>
      <div className="meta"><b>{cat}</b><span><ClockIcon />5 min</span></div>
      <h3>{article.title}</h3>
      {article.excerpt ? <p>{article.excerpt}</p> : null}
      <span className="readlink">Read article<ReadArrow /></span>
    </Link>
  );
}

export default function BlogPage() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const categories = useMemo(() => {
    const set = new Set<string>();
    BLOG_ARTICLES.forEach((a) => set.add(a.category));
    return Array.from(set);
  }, []);

  const filtered = useMemo(() => {
    let list = BLOG_ARTICLES;
    if (activeCategory !== 'All') list = list.filter((a) => a.category === activeCategory);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (a) => a.title.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q),
      );
    }
    return list;
  }, [search, activeCategory]);

  const popular = POPULAR_SLUGS
    .map((s) => BLOG_ARTICLES.find((a) => a.slug === s))
    .filter(Boolean) as BlogArticle[];

  const featured = popular[0];
  const secondary = popular.slice(1, 4);
  const trending = popular.slice(0, 5);

  const colA = filtered.filter((_, i) => i % 2 === 0);
  const colB = filtered.filter((_, i) => i % 2 === 1);

  return (
    <div className="atlas-site">
      <LandingNav />

      <div className="phero" style={{ '--band': '380px', padding: '87px 0 0' } as CSSProperties}>
        <div className="panelgrid" style={{ width: '520px' }}></div>
        <div className="wrap">
          <p className="kicker" style={{ color: '#fff', fontSize: '12.5px', marginBottom: '19px' }}>TRADING BLOG</p>
          <h1>Real research on<em style={{ fontWeight: 400 }}>trading psychology</em></h1>
          <p className="sub" style={{ marginTop: '41px' }}>Expert articles on mistake patterns, behavioral analytics, and data-driven performance improvement.</p>
        </div>
      </div>

      {/* featured */}
      {featured && (
        <div className="wrap" style={{ marginTop: '67px' }}>
          <hr className="inset-rule" />
          <div className="feat">
            <div>
              <Link href={`/blog/${featured.slug}`}>
                <div className="thumb" style={{ height: '300px' }}>
                  <span className="corner" style={{ left: 0, top: 0, borderRight: 0, borderBottom: 0 }}></span>
                  <span className="corner" style={{ right: 0, top: 0, borderLeft: 0, borderBottom: 0 }}></span>
                  <span className="corner" style={{ left: 0, bottom: 0, borderRight: 0, borderTop: 0 }}></span>
                  <span className="corner" style={{ right: 0, bottom: 0, borderLeft: 0, borderTop: 0 }}></span>
                  <span className="kicker" style={{ left: '50%', transform: 'translateX(-50%)', top: '19px', whiteSpace: 'nowrap' }}>{featured.category.toUpperCase()}</span>
                  <span className="badge">FEATURED</span>
                  <svg viewBox="0 0 724 254" preserveAspectRatio="none" style={{ position: 'absolute', left: '18px', top: '28px', width: '724px', maxWidth: 'calc(100% - 36px)', height: '254px' }} fill="none">
                    <defs><linearGradient id="bf1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d99405" stopOpacity=".22" /><stop offset="1" stopColor="#d99405" stopOpacity="0" /></linearGradient></defs>
                    <path d="M0 254 L34 240 L69 239 L103 221 L138 201 L172 208 L207 186 L241 190 L276 168 L310 174 L345 150 L379 158 L414 132 L448 140 L483 112 L517 122 L552 96 L586 104 L621 74 L655 84 L690 52 L724 48 L724 254 Z" fill="url(#bf1)" />
                    <path d="M0 254 L34 240 L69 239 L103 221 L138 201 L172 208 L207 186 L241 190 L276 168 L310 174 L345 150 L379 158 L414 132 L448 140 L483 112 L517 122 L552 96 L586 104 L621 74 L655 84 L690 52 L724 48" stroke="#d99405" strokeWidth="1.8" />
                  </svg>
                  <span className="slug">/{featured.slug}</span>
                </div>
                <div className="meta"><b>{featured.category.toUpperCase()}</b><span><ClockIcon />8 min read</span></div>
                <h2>{featured.title}</h2>
                <p className="dek">{featured.excerpt}</p>
                <span className="readlink">Read article<ReadArrow /></span>
              </Link>
            </div>

            <div className="side3">
              {secondary.map((a, i) => (
                <Link
                  key={a.slug}
                  href={`/blog/${a.slug}`}
                  style={i === 2 ? { borderTop: '1px solid var(--line)', paddingTop: '24px' } : undefined}
                >
                  <div className="thumb" style={i === 2 ? { height: '110px' } : undefined}>
                    <svg
                      viewBox={i === 2 ? '0 0 104 64' : '0 0 104 104'}
                      preserveAspectRatio="none"
                      style={{ position: 'absolute', left: '18px', top: '28px', width: '104px', height: i === 2 ? '64px' : '104px' }}
                      fill="none"
                    >
                      <path d={`${SIDE_PATHS[i]} ${i === 2 ? 'L104 64 L0 64 Z' : 'L104 104 L0 104 Z'}`} fill="#2fd3c4" fillOpacity=".12" />
                      <path d={SIDE_PATHS[i]} stroke="#2fd3c4" strokeWidth="1.8" />
                    </svg>
                  </div>
                  <div><b>{a.category.toUpperCase()}</b><h4>{a.title}</h4><span>5 min read</span></div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* browse */}
      <div style={{ borderTop: '1px solid var(--line)', marginTop: '158px', paddingTop: '75px' }}>
        <div className="wrap">
          <hr className="inset-rule" />
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginTop: '35px', flexWrap: 'wrap' }}>
            <div className="searchbar" style={{ flex: 1 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="5.2" stroke="#5c6b7e" strokeWidth="1.5" /><path d="M10 10 L14 14" stroke="#5c6b7e" strokeWidth="1.5" /></svg>
              <input
                type="search"
                placeholder="Search articles..."
                aria-label="Search articles"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <p className="count">Showing <b>{filtered.length} of {BLOG_ARTICLES.length}</b></p>
          </div>
          <div className="chips">
            <button className={activeCategory === 'All' ? 'on' : undefined} onClick={() => setActiveCategory('All')}>All</button>
            {categories.map((c) => (
              <button key={c} className={activeCategory === c ? 'on' : undefined} onClick={() => setActiveCategory(c)}>{c}</button>
            ))}
          </div>
        </div>
      </div>

      {/* articles */}
      <div style={{ borderTop: '1px solid var(--line)', marginTop: '67px', paddingTop: '55px' }}>
        <div className="wrap">
          <hr className="inset-rule" />
          <div className="artgrid">
            <div className="artcol" id="artcolA">
              {colA.map((a, i) => <ArticleCard key={a.slug} article={a} idx={i * 2} />)}
            </div>
            <div className="artcol" id="artcolB">
              {colB.map((a, i) => <ArticleCard key={a.slug} article={a} idx={i * 2 + 1} />)}
            </div>
            <div className="blogside">
              <h4>TRENDING NOW</h4>
              <div className="trend">
                {trending.map((a) => (
                  <Link key={a.slug} href={`/blog/${a.slug}`}>{a.title}</Link>
                ))}
              </div>
              <div className="cats">
                <h4>BY CATEGORY</h4>
                {categories.map((c) => (
                  <a
                    key={c}
                    role="button"
                    tabIndex={0}
                    onClick={() => setActiveCategory(c)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveCategory(c); } }}
                  >{c}<span>{BLOG_ARTICLES.filter((a) => a.category === c).length}</span></a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
