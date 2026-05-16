'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Radio, BookOpen, TrendingUp, ArrowLeft, Pencil, Loader2, Lock, Globe } from 'lucide-react';
import EditProfileModal from '@/components/EditProfileModal';

type TabKey = 'trades' | 'signals' | 'articles';

export default function PublicProfilePage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? '';
  const { user: currentUser } = useUser();

  const profile = useQuery(api.profile.getPublicBySlug, { slug });
  const signals = useQuery(
    api.signals.byPoster,
    profile?.userId ? { posterId: profile.userId, limit: 100 } : 'skip',
  );
  const signalStats = useQuery(
    api.signals.posterStats,
    profile?.userId ? { posterId: profile.userId } : 'skip',
  );
  const publicTrades = useQuery(
    api.trades.listPublicByUser,
    profile?.userId ? { userId: profile.userId, limit: 50 } : 'skip',
  );
  const articles = useQuery(
    api.articles.listPublishedByAuthor,
    profile?.userId ? { authorUserId: profile.userId, limit: 20 } : 'skip',
  );

  const [tab, setTab] = useState<TabKey>('trades');
  const [editing, setEditing] = useState(false);

  const isOwnProfile = !!profile && !!currentUser && profile.userId === currentUser.id;
  const displayHandle = profile?.username ?? profile?.clerkUsername ?? (profile?.userId.slice(0, 8) ?? '');
  const displayName = profile?.displayName ?? displayHandle;

  // Aggregate stats from public trades for the headline numbers.
  const tradeStats = useMemo(() => {
    const list = publicTrades ?? [];
    const closed = list.filter(t => !t.isOpen && t.actualPnL !== null);
    const wins = closed.filter(t => (t.actualPnL ?? 0) > 0).length;
    const winRate = closed.length > 0 ? Math.round((wins / closed.length) * 100) : 0;
    return { totalPublic: list.length, closed: closed.length, winRate };
  }, [publicTrades]);

  // Loading / not-found states.
  if (profile === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <Loader2 size={28} className="text-pink-400 animate-spin" />
      </div>
    );
  }

  if (profile === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)] px-4 text-center">
        <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">No such profile</h1>
        <p className="text-sm text-[var(--muted-foreground)] mb-6">
          No Tradia user matches <span className="font-mono">/u/{slug}</span>.
        </p>
        <button
          onClick={() => router.push('/app')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)]/50 transition-colors"
        >
          <ArrowLeft size={14} /> Back to the app
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Top bar — link back into the app or to landing */}
      <header className="border-b border-[var(--border)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href={currentUser ? '/app' : '/'} className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
            <ArrowLeft size={14} /> {currentUser ? 'Back to app' : 'Tradia home'}
          </Link>
          {isOwnProfile && (
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)]/50 transition-colors"
            >
              <Pencil size={12} /> Edit profile
            </button>
          )}
        </div>
      </header>

      {/* Hero card */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 flex flex-col sm:flex-row sm:items-center gap-5">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatarUrl}
              alt={displayName}
              className="w-20 h-20 rounded-full object-cover border border-[var(--border)] shrink-0"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-500 flex items-center justify-center text-2xl font-bold text-white shrink-0">
              {displayName.slice(0, 1).toUpperCase()}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-[var(--foreground)] truncate">{displayName}</h1>
            <div className="text-sm text-[var(--muted-foreground)] truncate">@{displayHandle}</div>
            {profile.bio && (
              <p className="text-sm text-[var(--muted-foreground)] mt-2 leading-relaxed whitespace-pre-line">
                {profile.bio}
              </p>
            )}
            {isOwnProfile && !profile.username && (
              <div className="mt-3 text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 inline-flex items-center gap-2">
                Pick a custom username so your profile gets a pretty URL.
                <button onClick={() => setEditing(true)} className="underline font-semibold">
                  Set it now
                </button>
              </div>
            )}
          </div>

          {/* Top-right summary */}
          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold tabular-nums">
                {signalStats?.total ?? 0}
              </span>
              <span className="text-xs uppercase tracking-wider text-[var(--muted-foreground)]">signals</span>
            </div>
            {signalStats && signalStats.total > 0 && (
              <div className="text-xs text-pink-300 font-semibold tabular-nums">
                🎯 {Math.round(signalStats.hitRate * 100)}% hit-rate · {signalStats.won}/{signalStats.total}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-1 border-b border-[var(--border)]">
          {([
            { key: 'trades', label: 'Public trades', icon: <TrendingUp size={14} />, count: tradeStats.totalPublic },
            { key: 'signals', label: 'Signals', icon: <Radio size={14} />, count: signals?.length ?? 0 },
            { key: 'articles', label: 'Articles', icon: <BookOpen size={14} />, count: articles?.length ?? 0 },
          ] as { key: TabKey; label: string; icon: React.ReactNode; count: number }[]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-pink-400 text-[var(--foreground)]'
                  : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              {t.icon}
              {t.label}
              <span className="text-[10px] opacity-60 tabular-nums">{t.count}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Tab body */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {tab === 'trades' && (
          <PublicTradesPanel trades={publicTrades} isOwnProfile={isOwnProfile} winRate={tradeStats.winRate} closed={tradeStats.closed} />
        )}
        {tab === 'signals' && (
          <SignalsPanel signals={signals} />
        )}
        {tab === 'articles' && (
          <ArticlesPanel articles={articles} />
        )}
      </main>

      {editing && (
        <EditProfileModal
          initialUsername={profile.username ?? ''}
          initialBio={profile.bio ?? ''}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}

// ─── Tab panels ──────────────────────────────────────────────────────

type PublicTrade = NonNullable<ReturnType<typeof useQuery<typeof api.trades.listPublicByUser>>>[number];

function PublicTradesPanel({ trades, isOwnProfile, winRate, closed }: { trades: PublicTrade[] | undefined; isOwnProfile: boolean; winRate: number; closed: number }) {
  if (trades === undefined) {
    return <div className="text-center text-sm text-[var(--muted-foreground)] py-10"><Loader2 size={20} className="animate-spin inline" /></div>;
  }
  if (trades.length === 0) {
    return (
      <div className="text-center py-12 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)]/50">
        <p className="text-sm text-[var(--muted-foreground)]">
          {isOwnProfile
            ? 'No public trades yet. Open the trades log and toggle a trade to public to share it here.'
            : 'This trader hasn\'t shared any trades publicly yet.'}
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {closed > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 flex items-center justify-between text-xs">
          <span className="text-[var(--muted-foreground)]">{closed} closed · {winRate}% win-rate (from public trades)</span>
        </div>
      )}
      {trades.map(t => (
        <div key={t._id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold">{t.coin}</span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${t.direction === 'short' ? 'bg-red-500/15 text-red-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
                {t.direction ?? 'long'}
              </span>
              {t.strategy && <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider">· {t.strategy}</span>}
            </div>
            <div className={`text-sm font-bold tabular-nums ${(t.actualPnL ?? 0) > 0 ? 'text-emerald-400' : (t.actualPnL ?? 0) < 0 ? 'text-red-400' : 'text-[var(--muted-foreground)]'}`}>
              {t.actualPnL !== null
                ? `${t.actualPnL >= 0 ? '+' : ''}$${t.actualPnL.toFixed(2)}`
                : 'Open'}
            </div>
          </div>
          <div className="text-[11px] text-[var(--muted-foreground)] mt-1 tabular-nums">
            {t.entryPrice} → {t.exitPrice ?? '—'} · {new Date(t.entryDate).toLocaleDateString()}
          </div>
          {(t.lessonNotes || t.reasoning) && (
            <p className="text-xs text-[var(--muted-foreground)] mt-2 leading-relaxed line-clamp-3">
              {t.lessonNotes || t.reasoning}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

type ProfileSignal = NonNullable<ReturnType<typeof useQuery<typeof api.signals.byPoster>>>[number];

function SignalsPanel({ signals }: { signals: ProfileSignal[] | undefined }) {
  if (signals === undefined) {
    return <div className="text-center text-sm text-[var(--muted-foreground)] py-10"><Loader2 size={20} className="animate-spin inline" /></div>;
  }
  if (signals.length === 0) {
    return (
      <div className="text-center py-12 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)]/50">
        <p className="text-sm text-[var(--muted-foreground)]">No signals posted yet.</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {signals.map(s => (
        <div key={s._id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="font-mono font-bold">{s.symbol}</div>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
              s.status === 'won' ? 'bg-emerald-500/15 text-emerald-300' :
              s.status === 'lost' ? 'bg-red-500/15 text-red-300' :
              s.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' :
              'bg-[var(--muted)]/30 text-[var(--muted-foreground)]'
            }`}>{s.status}{s.tpHit ? ` · TP${s.tpHit}` : ''}</span>
          </div>
          <div className="text-[11px] text-[var(--muted-foreground)] tabular-nums">
            {s.direction.toUpperCase()} · entry {s.entryLow}{s.entryHigh !== s.entryLow ? `–${s.entryHigh}` : ''} · SL {s.stopLoss} · {s.takeProfits.length} TP{s.takeProfits.length > 1 ? 's' : ''}
          </div>
          {s.rationale && (
            <p className="text-xs text-[var(--muted-foreground)] mt-2 leading-relaxed line-clamp-3">{s.rationale}</p>
          )}
        </div>
      ))}
    </div>
  );
}

type ProfileArticle = NonNullable<ReturnType<typeof useQuery<typeof api.articles.listPublishedByAuthor>>>[number];

function ArticlesPanel({ articles }: { articles: ProfileArticle[] | undefined }) {
  if (articles === undefined) {
    return <div className="text-center text-sm text-[var(--muted-foreground)] py-10"><Loader2 size={20} className="animate-spin inline" /></div>;
  }
  if (articles.length === 0) {
    return (
      <div className="text-center py-12 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)]/50">
        <p className="text-sm text-[var(--muted-foreground)]">No published articles yet.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {articles.map(a => (
        <Link key={a._id} href={`/blog/${a.slug}`} className="block rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 hover:border-pink-500/30 transition-colors">
          <h3 className="text-base font-bold text-[var(--foreground)]">{a.title}</h3>
          <p className="text-xs text-[var(--muted-foreground)] mt-1 line-clamp-2">{a.excerpt}</p>
          <div className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider mt-2 flex items-center gap-2">
            <span>{a.category}</span>
            <span>·</span>
            <span>{new Date(a.publishedAt ?? a.createdAt).toLocaleDateString()}</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              {a.accessTier === 'public' ? <Globe size={10} /> : <Lock size={10} />}
              {a.accessTier}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
