'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, Tag, ArrowRight, Star } from 'lucide-react';
import LandingNav from '@/components/landing/LandingNav';
import Footer from '@/components/landing/Footer';
import { BLOG_ARTICLES, POPULAR_SLUGS } from '@/lib/blog-articles';

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

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <LandingNav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-teal-500 opacity-[0.07] rounded-full blur-[120px]" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-10 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight"
          >
            Trading <span className="bg-gradient-to-r from-teal-400 to-teal-600 bg-clip-text text-transparent">Blog</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-5 text-base sm:text-lg text-[var(--muted-foreground)] max-w-2xl mx-auto"
          >
            Expert articles on trading psychology, mistake patterns, and data-driven performance improvement.
          </motion.p>
        </div>
      </section>

      {/* Popular */}
      <section className="py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-2 mb-5">
            <Star size={14} className="text-amber-400 fill-amber-400" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)]">Popular Articles</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {popular.map((a, i) => (
              <ArticleCard key={a.slug} article={a} idx={i} highlighted />
            ))}
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-4">
          <div className="relative max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search articles..."
              className="w-full pl-9 pr-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {categories.map(c => (
              <button
                key={c}
                onClick={() => setActiveCategory(c)}
                className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                  activeCategory === c
                    ? 'bg-teal-500 text-white'
                    : 'bg-[var(--muted)]/30 text-[var(--muted-foreground)] hover:bg-[var(--muted)]/60'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <p className="text-xs text-[var(--muted-foreground)]">
            Showing <span className="font-bold text-[var(--foreground)]">{filtered.length}</span> of {BLOG_ARTICLES.length} articles
          </p>
        </div>
      </section>

      {/* All articles */}
      <section className="pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
      </section>

      <Footer />
    </div>
  );
}

function ArticleCard({
  article,
  idx,
  highlighted,
}: {
  article: { slug: string; title: string; excerpt: string; category: string };
  idx: number;
  highlighted?: boolean;
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
        className={`group block rounded-2xl border bg-[var(--card)] p-5 hover:border-teal-500/30 transition-colors h-full ${
          highlighted ? 'border-teal-500/30' : 'border-[var(--border)]'
        }`}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-400">
            {article.category}
          </span>
        </div>
        <h3 className="text-base font-bold text-[var(--foreground)] leading-tight mb-2 line-clamp-2 group-hover:text-teal-400 transition-colors">
          {article.title}
        </h3>
        <p className="text-xs text-[var(--muted-foreground)] line-clamp-3 leading-relaxed">{article.excerpt}</p>
        <div className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-teal-400 group-hover:gap-2 transition-all">
          Read article <ArrowRight size={12} />
        </div>
      </Link>
    </motion.div>
  );
}
