'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, ArrowRight, Star, TrendingUp, Clock, BookOpen, Mail, CheckCircle, Sparkles } from 'lucide-react';
import LandingNav from '@/components/landing/LandingNav';
import Footer from '@/components/landing/Footer';
import { BLOG_ARTICLES, POPULAR_SLUGS } from '@/lib/blog-articles';

const CATEGORY_GRADIENTS: Record<string, string> = {
  'Psychology':       'from-violet-500 via-fuchsia-500 to-purple-500',
  'Mistakes':         'from-rose-500 via-orange-500 to-red-500',
  'Performance':      'from-emerald-500 via-teal-500 to-cyan-500',
  'Tools':            'from-cyan-500 via-blue-500 to-indigo-500',
  'Comparison':       'from-amber-500 via-yellow-500 to-orange-500',
  'Education':        'from-teal-500 via-emerald-500 to-green-500',
  'default':          'from-teal-500 via-cyan-500 to-emerald-500',
};

function gradientFor(category: string): string {
  return CATEGORY_GRADIENTS[category] ?? CATEGORY_GRADIENTS.default;
}

export default function BlogPage() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const categories = useMemo(() => {
    const set = new Set<string>(['All']);
    BLOG_ARTICLES.forEach(a => set.add(a.category));
    return Array.from(set);
  }, []);

  const filtered = useMemo(() => {
    let list = BLOG_ARTICLES;
    if (activeCategory !== 'All') list = list.filter(a => a.category === activeCategory);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(a =>
        a.title.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q)
      );
    }
    return list;
  }, [search, activeCategory]);

  const popular = POPULAR_SLUGS
    .map(s => BLOG_ARTICLES.find(a => a.slug === s))
    .filter(Boolean) as typeof BLOG_ARTICLES;

  const featured = popular[0];
  const secondary = popular.slice(1, 4);
  const trending = popular.slice(0, 5);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <LandingNav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-teal-500 opacity-[0.06] rounded-full blur-[140px]" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 mb-4"
          >
            <span className="text-[11px] font-bold tracking-[0.2em] uppercase bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
              Trading Blog
            </span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight"
          >
            Real research on{' '}
            <span className="bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">trading psychology</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-4 text-base text-[var(--muted-foreground)] max-w-2xl mx-auto"
          >
            Expert articles on mistake patterns, behavioral analytics, and data-driven performance improvement.
          </motion.p>
        </div>
      </section>

      {/* Featured + Secondary */}
      {featured && (
        <section className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Featured large card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="lg:col-span-2 lg:row-span-2"
              >
                <Link
                  href={`/blog/${featured.slug}`}
                  className="group relative block rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden hover:border-teal-500/40 transition-all h-full"
                >
                  <ArticleCover article={featured} large />
                  <div className="p-5 sm:p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">
                        <Star size={10} className="fill-amber-400" /> Featured
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-400">
                        {featured.category}
                      </span>
                      <span className="text-[10px] text-[var(--muted-foreground)] flex items-center gap-1"><Clock size={10} /> 8 min read</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight group-hover:text-teal-400 transition-colors">{featured.title}</h2>
                    <p className="mt-3 text-sm text-[var(--muted-foreground)] line-clamp-2 leading-relaxed">{featured.excerpt}</p>
                    <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-teal-400 group-hover:gap-2.5 transition-all">
                      Read article <ArrowRight size={14} />
                    </div>
                  </div>
                </Link>
              </motion.div>

              {/* Secondary stack */}
              {secondary.map((a, i) => (
                <motion.div
                  key={a.slug}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 + i * 0.05 }}
                >
                  <Link
                    href={`/blog/${a.slug}`}
                    className="group flex items-stretch gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden hover:border-teal-500/30 transition-all h-full"
                  >
                    <div className="w-24 sm:w-28 shrink-0">
                      <ArticleCover article={a} compact />
                    </div>
                    <div className="flex-1 min-w-0 p-3">
                      <div className="text-[9px] font-bold uppercase tracking-widest text-teal-400 mb-1">{a.category}</div>
                      <h3 className="text-sm font-bold leading-tight line-clamp-2 group-hover:text-teal-400 transition-colors">{a.title}</h3>
                      <div className="mt-1.5 flex items-center gap-2 text-[10px] text-[var(--muted-foreground)]">
                        <Clock size={9} /> 5 min read
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Filters */}
      <section className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search articles..."
                  className="w-full pl-9 pr-3 py-2.5 bg-black/30 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-teal-500/50 transition-colors"
                />
              </div>
              <p className="text-xs text-[var(--muted-foreground)] tabular-nums">
                Showing <span className="font-bold text-[var(--foreground)]">{filtered.length}</span> of {BLOG_ARTICLES.length}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {categories.map(c => (
                <button
                  key={c}
                  onClick={() => setActiveCategory(c)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                    activeCategory === c
                      ? 'bg-gradient-to-r from-teal-300 to-cyan-300 text-slate-900'
                      : 'bg-black/30 text-[var(--muted-foreground)] hover:bg-black/50 hover:text-[var(--foreground)]'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Main grid + sidebar */}
      <section className="pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
            {/* Article grid */}
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filtered.map((a, i) => (
                  <ArticleCard key={a.slug} article={a} idx={i} />
                ))}
              </div>
              {filtered.length === 0 && (
                <p className="text-center text-sm text-[var(--muted-foreground)] py-12">
                  No articles match your filters.
                </p>
              )}
            </div>

            {/* Sidebar */}
            <aside className="space-y-5 lg:sticky lg:top-20 self-start">
              {/* Trending */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={14} className="text-amber-400" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--foreground)]">Trending now</h3>
                </div>
                <div className="space-y-3">
                  {trending.map((a, i) => (
                    <Link
                      key={a.slug}
                      href={`/blog/${a.slug}`}
                      className="group flex items-start gap-2.5"
                    >
                      <span className="text-lg font-bold tabular-nums bg-gradient-to-br from-teal-300 to-cyan-300 bg-clip-text text-transparent shrink-0 leading-none">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="text-xs leading-snug line-clamp-2 group-hover:text-teal-400 transition-colors">{a.title}</span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Categories */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen size={14} className="text-teal-400" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--foreground)]">By Category</h3>
                </div>
                <div className="space-y-2">
                  {categories.filter(c => c !== 'All').map(c => {
                    const count = BLOG_ARTICLES.filter(a => a.category === c).length;
                    return (
                      <button
                        key={c}
                        onClick={() => setActiveCategory(c)}
                        className={`w-full flex items-center justify-between gap-2 text-xs px-3 py-2 rounded-lg transition-colors ${
                          activeCategory === c ? 'bg-teal-500/15 text-teal-300' : 'text-[var(--muted-foreground)] hover:bg-black/30 hover:text-[var(--foreground)]'
                        }`}
                      >
                        <span className="font-medium truncate">{c}</span>
                        <span className="text-[10px] tabular-nums opacity-70 shrink-0">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Newsletter */}
              <div className="relative rounded-2xl border border-teal-500/30 bg-gradient-to-br from-teal-500/10 via-emerald-500/5 to-cyan-500/10 p-5 overflow-hidden">
                <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-teal-400/10 blur-2xl" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={14} className="text-teal-400" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-teal-300">Weekly digest</h3>
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] leading-relaxed mb-3">
                    One email per week. Best new article + a hand-picked dataset insight from the platform.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/40 border border-[var(--border)] text-xs">
                      <Mail size={12} className="text-[var(--muted-foreground)]" />
                      <span className="text-[var(--muted-foreground)]">your@email.com</span>
                    </div>
                    <button className="w-full px-3 py-2 rounded-lg text-xs font-semibold text-slate-900 bg-gradient-to-r from-teal-300 to-cyan-300 hover:from-teal-200 hover:to-cyan-200 transition-colors">
                      Subscribe
                    </button>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-[10px] text-[var(--muted-foreground)]">
                    <CheckCircle size={10} className="text-emerald-400" /> No spam · Unsubscribe anytime
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function ArticleCover({ article, large, compact }: {
  article: { slug: string; title: string; category: string };
  large?: boolean; compact?: boolean;
}) {
  const grad = gradientFor(article.category);
  const h = large ? 'aspect-[16/8]' : compact ? 'h-full' : 'aspect-[16/9]';
  return (
    <div className={`relative ${h} bg-gradient-to-br ${grad} overflow-hidden`}>
      {/* Grid backdrop */}
      <div className="absolute inset-0 opacity-[0.08]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
        backgroundSize: large ? '40px 40px' : '20px 20px',
      }} />
      {/* Glow */}
      <div className="absolute -bottom-8 -right-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
      {/* Decoration: chart-like svg */}
      <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 200 100" preserveAspectRatio="none">
        <polyline fill="none" stroke="white" strokeWidth="1.5" points="0,80 25,72 50,75 75,60 100,65 125,48 150,52 175,32 200,28" />
      </svg>
      {/* Title block — only on large/non-compact */}
      {!compact && (
        <div className="absolute top-3 left-3">
          <span className="text-[9px] font-bold uppercase tracking-widest text-white/90 bg-black/30 px-2 py-0.5 rounded backdrop-blur-sm">
            {article.category}
          </span>
        </div>
      )}
      {/* Slug-derived monogram */}
      {!compact && (
        <div className="absolute bottom-3 right-3 text-white/40 font-mono text-[10px]">/{article.slug.slice(0, 24)}</div>
      )}
    </div>
  );
}

function ArticleCard({ article, idx }: {
  article: { slug: string; title: string; excerpt: string; category: string };
  idx: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.35, delay: Math.min(idx * 0.03, 0.3) }}
    >
      <Link
        href={`/blog/${article.slug}`}
        className="group block rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden hover:border-teal-500/30 transition-colors h-full"
      >
        <ArticleCover article={article} />
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-400">
              {article.category}
            </span>
            <span className="text-[9px] text-[var(--muted-foreground)] flex items-center gap-1"><Clock size={9} /> 5 min</span>
          </div>
          <h3 className="text-sm font-bold leading-tight line-clamp-2 group-hover:text-teal-400 transition-colors">{article.title}</h3>
          <p className="mt-2 text-xs text-[var(--muted-foreground)] line-clamp-2 leading-relaxed">{article.excerpt}</p>
          <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-teal-400 group-hover:gap-2 transition-all">
            Read article <ArrowRight size={12} />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
