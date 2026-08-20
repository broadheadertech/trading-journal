import Link from 'next/link';
import { notFound } from 'next/navigation';
// This is a Server Component (SSG via generateStaticParams, no 'use client').
// @phosphor-icons/react's default export uses React Context (IconContext) for
// shared default props, which breaks during the RSC/server bundle build with
// "createContext is not a function" — lucide-react never had this problem.
// The /dist/ssr subpath is Phosphor's dedicated server-component-safe entry.
import { ArrowLeft, ArrowRight, Tag, Clock, BookOpen } from '@phosphor-icons/react/dist/ssr';
import LandingNav from '@/components/landing/LandingNav';
import Footer from '@/components/landing/Footer';
import { BLOG_ARTICLES } from '@/lib/blog-articles';

// Cover gradients. Kept in the amber family on purpose — the pink / fuchsia /
// violet / cyan mixes these used to carry were the only place those hues
// appeared in the product, and the palette is now amber + green + red only.
const CATEGORY_GRADIENTS: Record<string, string> = {
  'Psychology':  'from-amber-600 via-amber-500 to-yellow-500',
  'Mistakes':    'from-orange-600 via-amber-500 to-orange-400',
  'Performance': 'from-amber-500 via-yellow-500 to-amber-400',
  'Tools':       'from-amber-700 via-amber-500 to-orange-400',
  'Comparison':  'from-amber-500 via-yellow-500 to-orange-500',
  'Education':   'from-yellow-600 via-amber-500 to-amber-400',
  'default':     'from-amber-600 via-amber-500 to-orange-400',
};

export function generateStaticParams() {
  return BLOG_ARTICLES.map(a => ({ slug: a.slug }));
}

export default async function BlogArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = BLOG_ARTICLES.find(a => a.slug === slug);
  if (!article) notFound();

  const idx = BLOG_ARTICLES.findIndex(a => a.slug === slug);
  const prev = idx > 0 ? BLOG_ARTICLES[idx - 1] : null;
  const next = idx < BLOG_ARTICLES.length - 1 ? BLOG_ARTICLES[idx + 1] : null;
  const related = BLOG_ARTICLES
    .filter(a => a.category === article.category && a.slug !== article.slug)
    .slice(0, 3);
  const grad = CATEGORY_GRADIENTS[article.category] ?? CATEGORY_GRADIENTS.default;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <LandingNav />

      {/* Cover */}
      <div className={`relative h-56 sm:h-72 bg-gradient-to-br ${grad} overflow-hidden`}>
        <div className="absolute inset-0 opacity-[0.08]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
        <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 200 100" preserveAspectRatio="none">
          <polyline fill="none" stroke="white" strokeWidth="1.5" points="0,80 25,72 50,75 75,60 100,65 125,48 150,52 175,32 200,28" />
        </svg>
        <div className="absolute -bottom-12 -right-12 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 h-full flex items-end pb-6">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-white/90 bg-black/30 px-2.5 py-1 rounded-full backdrop-blur-sm">
            <BookOpen size={10} /> {article.category}
          </span>
        </div>
      </div>

      <article className="relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-amber-500 opacity-[0.05] rounded-full blur-[120px]" />
        </div>

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 pt-10 pb-16">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-xs text-[var(--muted-foreground)] hover:text-amber-400 transition-colors mb-8"
          >
            <ArrowLeft size={12} /> Back to all articles
          </Link>

          <div className="mb-4 flex items-center gap-3">
            <span className="text-[10px] text-[var(--muted-foreground)] flex items-center gap-1"><Clock size={11} /> 8 min read</span>
            <span className="text-[10px] text-[var(--muted-foreground)]">·</span>
            <span className="text-[10px] text-[var(--muted-foreground)]">Updated 2026</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight mb-5">
            {article.title}
          </h1>

          <p className="text-lg text-[var(--muted-foreground)] mb-10">
            {article.excerpt}
          </p>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 mb-10">
            <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
              <strong className="text-[var(--foreground)]">In this article</strong> — we cover the data behind {article.title.toLowerCase()},
              with real numbers, charts, and concrete recommendations you can apply to your own trading immediately.
              The full editorial draft for this piece is being finalized; sign up to be notified when it goes live, or browse the related articles below to start now.
            </p>

            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl text-sm font-medium transition-colors"
            >
              Notify me when it’s ready
              <ArrowRight size={14} />
            </Link>
          </div>

          {related.length > 0 && (
            <div className="border-t border-[var(--border)] pt-8 mb-10">
              <div className="flex items-center gap-2 mb-4">
                <Tag size={12} className="text-amber-400" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)]">
                  More on {article.category}
                </h2>
              </div>
              <div className="space-y-2">
                {related.map(r => (
                  <Link
                    key={r.slug}
                    href={`/blog/${r.slug}`}
                    className="block rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 hover:border-amber-500/30 transition-colors group"
                  >
                    <div className="text-sm font-bold text-[var(--foreground)] group-hover:text-amber-400 transition-colors">{r.title}</div>
                    <div className="text-xs text-[var(--muted-foreground)] line-clamp-1 mt-1">{r.excerpt}</div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-[var(--border)] pt-6 grid grid-cols-2 gap-3">
            {prev ? (
              <Link
                href={`/blog/${prev.slug}`}
                className="group rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 hover:border-amber-500/30 transition-colors"
              >
                <div className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)] flex items-center gap-1 mb-1">
                  <ArrowLeft size={10} /> Previous
                </div>
                <div className="text-sm font-bold text-[var(--foreground)] line-clamp-2 group-hover:text-amber-400 transition-colors">
                  {prev.title}
                </div>
              </Link>
            ) : <div />}
            {next ? (
              <Link
                href={`/blog/${next.slug}`}
                className="group rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 hover:border-amber-500/30 transition-colors text-right"
              >
                <div className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)] flex items-center justify-end gap-1 mb-1">
                  Next <ArrowRight size={10} />
                </div>
                <div className="text-sm font-bold text-[var(--foreground)] line-clamp-2 group-hover:text-amber-400 transition-colors">
                  {next.title}
                </div>
              </Link>
            ) : <div />}
          </div>
        </div>
      </article>

      <Footer />
    </div>
  );
}
