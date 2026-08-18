'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import {
  Radio, BookOpen, TrendingUp, ArrowLeft, Pencil, Loader2, Lock, Globe,
  UserPlus, UserCheck, Twitter, Instagram, Youtube, Send, Music2, X,
} from 'lucide-react';
import EditProfileModal from '@/components/EditProfileModal';
import SignalSocialBar from '@/components/SignalSocialBar';
import SignalRationale from '@/components/SignalRationale';

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
  const stats = useQuery(
    api.profile.getPublicStats,
    profile?.userId ? { userId: profile.userId } : 'skip',
  );
  const followCounts = useQuery(
    api.follows.counts,
    profile?.userId ? { userId: profile.userId } : 'skip',
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
  const [followList, setFollowList] = useState<'followers' | 'following' | null>(null);

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
          No Atlas user matches <span className="font-mono">/u/{slug}</span>.
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
            <ArrowLeft size={14} /> {currentUser ? 'Back to app' : 'Atlas home'}
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
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-5">
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
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="text-2xl font-bold text-[var(--foreground)] truncate">{displayName}</h1>
                  <div className="text-sm text-[var(--muted-foreground)] truncate">
                    @{displayHandle}
                    {profile.memberSince && (
                      <span> · since {new Date(profile.memberSince).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
                    )}
                  </div>
                </div>
                {!isOwnProfile && currentUser && <FollowButton targetUserId={profile.userId} />}
              </div>

              {profile.bio && (
                <p className="text-sm text-[var(--muted-foreground)] mt-2 leading-relaxed whitespace-pre-line">
                  {profile.bio}
                </p>
              )}

              <SocialRow socials={profile.socials} />

              {isOwnProfile && !profile.username && (
                <div className="mt-3 text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 inline-flex items-center gap-2">
                  Pick a custom username so your profile gets a pretty URL.
                  <button onClick={() => setEditing(true)} className="underline font-semibold">
                    Set it now
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Performance + social lanes */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Trading */}
            <StatLane label="Trading" accent="emerald">
              {stats?.trading ? (
                <>
                  <WinLoss wins={stats.trading.wins} losses={stats.trading.losses} />
                  <LaneRow
                    left={`${stats.trading.winRate}% win`}
                    right={`${stats.trading.totalPnL >= 0 ? '+' : ''}$${stats.trading.totalPnL.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                    rightClass={stats.trading.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}
                  />
                </>
              ) : isOwnProfile ? (
                <button onClick={() => setEditing(true)} className="text-xs text-[var(--muted-foreground)] hover:text-pink-300 text-left leading-relaxed">
                  Private — enable “Share overall stats” to show W/L and net P&amp;L here.
                </button>
              ) : (
                <div className="text-xs text-[var(--muted-foreground)]">Not shared publicly.</div>
              )}
            </StatLane>

            {/* Signals */}
            <StatLane label="Signals" accent="pink">
              {stats && stats.signals.total > 0 ? (
                <>
                  <WinLoss wins={stats.signals.wins} losses={stats.signals.losses} />
                  <LaneRow
                    left={`${stats.signals.hitRate}% hit`}
                    right={`${stats.signals.totalR >= 0 ? '+' : ''}${stats.signals.totalR}R`}
                    rightClass={stats.signals.totalR >= 0 ? 'text-emerald-400' : 'text-red-400'}
                  />
                  <LaneRow
                    left="net pips"
                    right={`${stats.signals.totalPips >= 0 ? '+' : ''}${stats.signals.totalPips.toLocaleString()} pips`}
                    rightClass={stats.signals.totalPips >= 0 ? 'text-emerald-400' : 'text-red-400'}
                  />
                </>
              ) : (
                <div className="text-xs text-[var(--muted-foreground)]">No signals yet.</div>
              )}
            </StatLane>

            {/* Social */}
            <StatLane label="Social" accent="sky">
              <div className="flex items-baseline gap-5">
                <button onClick={() => setFollowList('followers')} className="text-left hover:opacity-75 transition-opacity">
                  <div className="text-xl font-extrabold tabular-nums">{followCounts?.followers ?? 0}</div>
                  <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">Followers</div>
                </button>
                <button onClick={() => setFollowList('following')} className="text-left hover:opacity-75 transition-opacity">
                  <div className="text-xl font-extrabold tabular-nums">{followCounts?.following ?? 0}</div>
                  <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">Following</div>
                </button>
              </div>
            </StatLane>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-1 border-b border-[var(--border)]">
          {([
            { key: 'trades', label: 'Public trades', icon: <TrendingUp size={14} />, count: tradeStats.totalPublic },
            { key: 'signals', label: 'Signals', icon: <Radio size={14} />, count: signals?.length ?? 0 },
            { key: 'articles', label: 'Blog', icon: <BookOpen size={14} />, count: articles?.length ?? 0 },
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
          initialShareStats={profile.shareStats}
          initialSocials={{
            x: profile.socials.x ?? '',
            instagram: profile.socials.instagram ?? '',
            youtube: profile.socials.youtube ?? '',
            telegram: profile.socials.telegram ?? '',
            tiktok: profile.socials.tiktok ?? '',
            website: profile.socials.website ?? '',
          }}
          onClose={() => setEditing(false)}
        />
      )}

      {followList && (
        <FollowListModal kind={followList} userId={profile.userId} onClose={() => setFollowList(null)} />
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
        <div key={s._id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden flex flex-col">
          <div className="p-4 flex-1">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="font-mono font-bold">{s.symbol}</div>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                s.status === 'won' ? 'bg-emerald-500/15 text-emerald-300' :
                s.status === 'lost' ? 'bg-red-500/15 text-red-300' :
                s.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' :
                'bg-[var(--muted)]/30 text-[var(--muted-foreground)]'
              }`}>{s.status}</span>
            </div>
            <div className="text-[11px] text-[var(--muted-foreground)] tabular-nums">
              {s.direction.toUpperCase()} · entry {s.entryLow}{s.entryHigh !== s.entryLow ? `–${s.entryHigh}` : ''} · SL {s.stopLoss} · {s.takeProfits.length} target{s.takeProfits.length > 1 ? 's' : ''}
            </div>
            {s.rationale && (
              <SignalRationale text={s.rationale} symbol={s.symbol} className="text-xs text-[var(--muted-foreground)] mt-2 leading-relaxed line-clamp-3 block" />
            )}
          </div>
          <SignalSocialBar signalId={s._id} />
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

// ─── Hero helpers ────────────────────────────────────────────────────

function FollowButton({ targetUserId }: { targetUserId: string }) {
  const following = useQuery(api.follows.isFollowing, { targetUserId });
  const follow = useMutation(api.follows.follow);
  const unfollow = useMutation(api.follows.unfollow);
  const [busy, setBusy] = useState(false);
  const isFollowing = following === true;

  const toggle = async () => {
    setBusy(true);
    try {
      if (isFollowing) await unfollow({ targetUserId });
      else await follow({ targetUserId });
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={busy || following === undefined}
      className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all disabled:opacity-50 ${
        isFollowing
          ? 'border border-[var(--border)] text-[var(--foreground)] hover:border-red-500/40 hover:text-red-300'
          : 'text-slate-900 bg-gradient-to-r from-pink-400 to-fuchsia-400 hover:from-pink-300 hover:to-fuchsia-300'
      }`}
    >
      {isFollowing ? <><UserCheck size={13} /> Following</> : <><UserPlus size={13} /> Follow</>}
    </button>
  );
}

type ProfileSocialLinks = {
  x: string | null; instagram: string | null; youtube: string | null;
  telegram: string | null; tiktok: string | null; website: string | null;
};

function SocialRow({ socials }: { socials: ProfileSocialLinks }) {
  const withScheme = (u: string) => (/^https?:\/\//i.test(u) ? u : `https://${u}`);
  const links = [
    { url: socials.x, Icon: Twitter, label: 'X' },
    { url: socials.instagram, Icon: Instagram, label: 'Instagram' },
    { url: socials.youtube, Icon: Youtube, label: 'YouTube' },
    { url: socials.telegram, Icon: Send, label: 'Telegram' },
    { url: socials.tiktok, Icon: Music2, label: 'TikTok' },
    { url: socials.website, Icon: Globe, label: 'Website' },
  ].filter((l) => !!l.url && l.url.trim().length > 0);

  if (links.length === 0) return null;
  return (
    <div className="flex items-center gap-2 mt-3">
      {links.map(({ url, Icon, label }) => (
        <a
          key={label}
          href={withScheme(url as string)}
          target="_blank"
          rel="noopener noreferrer"
          title={label}
          className="w-8 h-8 rounded-lg border border-[var(--border)] bg-[var(--background)] flex items-center justify-center text-[var(--muted-foreground)] hover:text-pink-300 hover:border-pink-500/30 transition-colors"
        >
          <Icon size={15} />
        </a>
      ))}
    </div>
  );
}

function StatLane({ label, accent, children }: { label: string; accent: 'emerald' | 'pink' | 'sky'; children: React.ReactNode }) {
  const dot = accent === 'emerald' ? 'bg-emerald-400' : accent === 'pink' ? 'bg-pink-400' : 'bg-sky-400';
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/40 p-3.5">
      <div className="flex items-center gap-1.5 mb-2">
        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">{label}</span>
      </div>
      {children}
    </div>
  );
}

function WinLoss({ wins, losses }: { wins: number; losses: number }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-xl font-extrabold tabular-nums text-emerald-400">
        {wins}<span className="text-xs font-semibold text-[var(--muted-foreground)]">W</span>
      </span>
      <span className="text-[var(--muted-foreground)]">/</span>
      <span className="text-xl font-extrabold tabular-nums text-red-400">
        {losses}<span className="text-xs font-semibold text-[var(--muted-foreground)]">L</span>
      </span>
    </div>
  );
}

function LaneRow({ left, right, rightClass }: { left: string; right: string; rightClass?: string }) {
  return (
    <div className="flex items-center justify-between mt-1.5 text-xs">
      <span className="text-[var(--muted-foreground)]">{left}</span>
      <span className={`font-bold tabular-nums ${rightClass ?? ''}`}>{right}</span>
    </div>
  );
}

function FollowListModal({ kind, userId, onClose }: { kind: 'followers' | 'following'; userId: string; onClose: () => void }) {
  const followers = useQuery(api.follows.listFollowers, kind === 'followers' ? { userId } : 'skip');
  const following = useQuery(api.follows.listFollowing, kind === 'following' ? { userId } : 'skip');
  const users = kind === 'followers' ? followers : following;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm max-h-[80vh] flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl"
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)] shrink-0">
          <h2 className="text-sm font-bold capitalize">{kind}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--muted)]/50 transition-colors">
            <X size={16} className="text-[var(--muted-foreground)]" />
          </button>
        </div>
        <div className="overflow-y-auto p-2">
          {users === undefined ? (
            <div className="text-center py-8"><Loader2 size={18} className="animate-spin inline text-pink-400" /></div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-sm text-[var(--muted-foreground)]">
              {kind === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
            </div>
          ) : (
            users.map(u => (
              <Link
                key={u.userId}
                href={`/u/${u.handle}`}
                onClick={onClose}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--muted)]/40 transition-colors"
              >
                {u.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u.avatarUrl} alt={u.displayName} className="w-9 h-9 rounded-full object-cover border border-[var(--border)] shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-500 flex items-center justify-center text-sm font-bold text-white shrink-0">
                    {u.displayName.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[var(--foreground)] truncate">{u.displayName}</div>
                  <div className="text-[11px] text-[var(--muted-foreground)] truncate">@{u.handle}</div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
