'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import {
  Radio, BookOpen, TrendUp as TrendingUp, Pencil, CircleNotch as Loader2, Lock, Globe,
  UserPlus, UserCheck, YoutubeLogo as Youtube, PaperPlaneTilt as Send, X,
} from '@phosphor-icons/react';
import { TwitterLogo as Twitter, InstagramLogo as Instagram, MusicNotes as Music2 } from '@phosphor-icons/react';
import EditProfileModal from '@/components/EditProfileModal';
import SignalSocialBar from '@/components/SignalSocialBar';
import SignalRationale from '@/components/SignalRationale';

type TabKey = 'trades' | 'signals' | 'articles';

// ATLAS page chrome for the public profile. Presentation only.
const PROFILE_CSS = `
.pp-top{border-bottom:1px solid var(--line)}
.pp-top-in{height:72px;display:flex;align-items:center;justify-content:space-between;gap:16px}
.pp-link{display:inline-flex;align-items:center;gap:9px;font-size:13px;color:var(--atlas-muted)}
.pp-link:hover{color:var(--text)}
.pp-chip{display:inline-flex;align-items:center;gap:8px;height:34px;padding:0 14px;border:1px solid var(--line-2);border-radius:2px;font-size:12px;font-weight:700;color:var(--text)}
.pp-chip:hover{border-color:var(--rule-soft)}
.pp-shell{padding:44px 0 96px}
.pp-hero{padding:28px 32px 0}
.pp-id{display:flex;gap:22px;align-items:flex-start}
.pp-avatar{width:78px;height:78px;border-radius:3px;object-fit:cover;border:1px solid var(--line-2);flex:none}
.pp-avatar-fb{width:78px;height:78px;border-radius:3px;border:1px solid var(--amber);background:rgba(217,148,5,.1);display:flex;align-items:center;justify-content:center;font-family:var(--display);font-weight:700;font-size:30px;color:var(--amber);flex:none}
.pp-name{font-family:var(--display);font-weight:600;font-size:30px;line-height:34px;color:var(--text);margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pp-handle{font-family:var(--mono);font-size:12.5px;color:var(--muted-2);margin:8px 0 0}
.pp-bio{margin:15px 0 0;font-size:14px;line-height:22px;color:var(--atlas-muted);white-space:pre-line}
.pp-follow{display:inline-flex;align-items:center;gap:7px;height:34px;padding:0 16px;border-radius:2px;font-weight:700;font-size:12px;flex:none}
.pp-follow.is-following{border:1px solid var(--line-2);color:var(--text)}
.pp-follow.is-following:hover{border-color:var(--red);color:var(--red)}
.pp-follow.is-not{background:var(--amber);color:var(--ink)}
.pp-follow.is-not:hover{background:#f0a409}
.pp-follow:disabled{opacity:.5}
.pp-socials{display:flex;gap:8px;margin-top:16px;flex-wrap:wrap}
.pp-social{width:32px;height:32px;border:1px solid var(--line);border-radius:2px;display:flex;align-items:center;justify-content:center;color:var(--atlas-muted)}
.pp-social:hover{color:var(--amber);border-color:var(--amber-dim)}
.pp-hint{display:inline-flex;align-items:center;gap:9px;margin-top:16px;padding:7px 12px;border:1px solid rgba(217,148,5,.28);background:rgba(217,148,5,.07);border-radius:2px;font-size:12px;color:var(--amber)}
.pp-hint button{font-weight:700;text-decoration:underline}
.pp-lanes{display:grid;grid-template-columns:repeat(3,1fr);margin-top:30px;border-top:1px solid var(--line)}
.pp-lane{padding:20px 24px 24px}
.pp-lane + .pp-lane{border-left:1px solid var(--line)}
.pp-lane-hd{display:flex;align-items:center;gap:8px;font-family:var(--micro);font-size:10px;letter-spacing:.06em;color:var(--muted-2);margin-bottom:14px}
.pp-lane-hd i{width:5px;height:5px;flex:none}
.pp-muted{font-size:12.5px;line-height:19px;color:var(--muted-2);text-align:left}
.pp-wl{display:flex;align-items:baseline;gap:9px;font-family:var(--mono)}
.pp-wl b{font-weight:400;font-size:26px;line-height:1}
.pp-wl b i{font-style:normal;font-size:11px;color:var(--muted-2);margin-left:2px}
.pp-wl .sep{color:var(--muted-2)}
.pp-row{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-top:10px;font-size:12px;color:var(--atlas-muted)}
.pp-row b{font-family:var(--mono);font-weight:500;font-size:12px;color:var(--text)}
.pp-count{text-align:left}
.pp-count b{display:block;font-family:var(--mono);font-weight:400;font-size:24px;line-height:1;color:var(--text)}
.pp-count span{display:block;font-family:var(--micro);font-size:9.5px;letter-spacing:.06em;color:var(--muted-2);margin-top:7px}
.pp-count:hover b{color:var(--amber)}
.pp-tabs{display:flex;margin-top:48px;border-bottom:1px solid var(--line)}
.pp-tab{display:inline-flex;align-items:center;gap:9px;padding:0 20px;height:50px;font-size:13.5px;font-weight:700;color:var(--atlas-muted);border-bottom:2px solid transparent;margin-bottom:-1px}
.pp-tab:hover{color:var(--text)}
.pp-tab.is-on{color:var(--text);border-bottom-color:var(--amber)}
.pp-tab em{font-style:normal;font-family:var(--mono);font-size:11px;color:var(--muted-2)}
.pp-body{margin-top:30px}
.pp-empty{border:1px dashed var(--line-2);border-radius:3px;padding:56px 24px;text-align:center;font-size:13.5px;line-height:21px;color:var(--atlas-muted)}
.pp-loading{padding:48px 0;text-align:center;color:var(--amber)}
.pp-list{display:flex;flex-direction:column;gap:12px}
.pp-grid2{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
.pp-item{border:1px solid var(--line);border-radius:3px;background:var(--card);padding:17px 20px;display:block}
.pp-item:hover{border-color:var(--line-2)}
.pp-summary{border:1px solid var(--line);border-radius:3px;background:var(--card);padding:12px 20px;font-family:var(--mono);font-size:11.5px;color:var(--muted-2)}
.pp-sym{font-family:var(--mono);font-size:14px;font-weight:500;color:var(--text)}
.pp-tag{display:inline-flex;align-items:center;height:18px;padding:0 7px;border-radius:2px;font-family:var(--micro);font-size:9px;letter-spacing:.05em;text-transform:uppercase}
.pp-tag.up{background:rgba(36,200,138,.12);color:var(--green)}
.pp-tag.down{background:rgba(243,36,56,.12);color:var(--red)}
.pp-tag.flat{background:rgba(124,140,160,.12);color:var(--atlas-muted)}
.pp-strat{font-family:var(--micro);font-size:10px;letter-spacing:.04em;text-transform:uppercase;color:var(--muted-2)}
.pp-pnl{font-family:var(--mono);font-size:14px;font-weight:500}
.pp-meta{font-family:var(--mono);font-size:11px;color:var(--muted-2);margin-top:8px}
.pp-note{margin:12px 0 0;font-size:13px;line-height:20px;color:var(--atlas-muted)}
.pp-clamp{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.pp-clamp2{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.pp-art-title{font-family:var(--display);font-weight:600;font-size:18px;line-height:22px;color:var(--text);margin:0}
.pp-art-meta{display:flex;align-items:center;gap:9px;margin-top:12px;font-family:var(--micro);font-size:10px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted-2)}
.pp-modal{position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.72)}
.pp-modal-in{width:100%;max-width:380px;max-height:80vh;display:flex;flex-direction:column;border:1px solid var(--line-2);border-radius:3px;background:var(--card)}
.pp-modal-hd{display:flex;align-items:center;justify-content:space-between;padding:15px 20px;border-bottom:1px solid var(--line);flex:none}
.pp-modal-hd h2{font-family:var(--display);font-weight:600;font-size:16px;margin:0;text-transform:capitalize;color:var(--text)}
.pp-modal-body{overflow-y:auto;padding:8px}
.pp-urow{display:flex;align-items:center;gap:12px;padding:9px 12px;border-radius:2px}
.pp-urow:hover{background:rgba(217,148,5,.06)}
.pp-uav{width:34px;height:34px;border-radius:2px;object-fit:cover;border:1px solid var(--line);flex:none}
.pp-uav-fb{width:34px;height:34px;border-radius:2px;border:1px solid var(--amber);background:rgba(217,148,5,.1);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;color:var(--amber);flex:none}
.pp-center{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px;text-align:center}
@media(max-width:860px){
  .pp-lanes{grid-template-columns:1fr}
  .pp-lane + .pp-lane{border-left:0;border-top:1px solid var(--line)}
  .pp-grid2{grid-template-columns:1fr}
  .pp-hero{padding:22px 20px 0}
  .pp-id{flex-wrap:wrap}
}
`;

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
      <div className="atlas-site">
        <style>{PROFILE_CSS}</style>
        <div className="pp-center">
          <Loader2 size={26} className="animate-spin" style={{ color: 'var(--amber)' }} />
        </div>
      </div>
    );
  }

  if (profile === null) {
    return (
      <div className="atlas-site">
        <style>{PROFILE_CSS}</style>
        <div className="pp-center">
          <p className="eyebrow" style={{ margin: '0 0 14px' }}>404 — NOT FOUND</p>
          <h1 style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: '34px', lineHeight: '38px', color: 'var(--text)', margin: 0 }}>
            No such profile
          </h1>
          <p className="lede" style={{ marginTop: '14px' }}>
            No Atlas user matches <span style={{ fontFamily: 'var(--mono)', color: 'var(--text-3)' }}>/u/{slug}</span>.
          </p>
          <button onClick={() => router.push('/app')} className="btn btn-ghost" style={{ marginTop: '30px' }}>
            <svg width="12" height="9" viewBox="0 0 12 9" fill="none" aria-hidden="true"><path d="M12 4.5 H0 M0 4.5 L5 0 M0 4.5 L5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            Back to the app
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="atlas-site" style={{ minHeight: '100vh' }}>
      <style>{PROFILE_CSS}</style>

      {/* Top bar — link back into the app or to landing */}
      <header className="pp-top">
        <div className="wrap pp-top-in">
          <Link href={currentUser ? '/app' : '/'} className="pp-link">
            <svg width="12" height="9" viewBox="0 0 12 9" fill="none" aria-hidden="true"><path d="M12 4.5 H0 M0 4.5 L5 0 M0 4.5 L5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            {currentUser ? 'Back to app' : 'Atlas home'}
          </Link>
          {isOwnProfile && (
            <button onClick={() => setEditing(true)} className="pp-chip">
              <Pencil size={12} /> Edit profile
            </button>
          )}
        </div>
      </header>

      <div className="wrap pp-shell" style={{ maxWidth: 'min(1040px, calc(100% - 40px))' }}>
        {/* Hero card */}
        <div className="card-solid pp-hero">
          <div className="pp-id">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatarUrl} alt={displayName} className="pp-avatar" />
            ) : (
              <div className="pp-avatar-fb">{displayName.slice(0, 1).toUpperCase()}</div>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px' }}>
                <div style={{ minWidth: 0 }}>
                  <h1 className="pp-name">{displayName}</h1>
                  <div className="pp-handle">
                    @{displayHandle}
                    {profile.memberSince && (
                      <span> · since {new Date(profile.memberSince).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
                    )}
                  </div>
                </div>
                {!isOwnProfile && currentUser && <FollowButton targetUserId={profile.userId} />}
              </div>

              {profile.bio && <p className="pp-bio">{profile.bio}</p>}

              <SocialRow socials={profile.socials} />

              {isOwnProfile && !profile.username && (
                <div className="pp-hint">
                  Pick a custom username so your profile gets a pretty URL.
                  <button onClick={() => setEditing(true)}>Set it now</button>
                </div>
              )}
            </div>
          </div>

          {/* Performance + social lanes */}
          <div className="pp-lanes">
            {/* Trading */}
            <StatLane label="TRADING" accent="var(--green)">
              {stats?.trading ? (
                <>
                  <WinLoss wins={stats.trading.wins} losses={stats.trading.losses} />
                  <LaneRow
                    left={`${stats.trading.winRate}% win`}
                    right={`${stats.trading.totalPnL >= 0 ? '+' : ''}$${stats.trading.totalPnL.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                    rightColor={stats.trading.totalPnL >= 0 ? 'var(--green)' : 'var(--red)'}
                  />
                </>
              ) : isOwnProfile ? (
                <button onClick={() => setEditing(true)} className="pp-muted">
                  Private — enable “Share overall stats” to show W/L and net P&amp;L here.
                </button>
              ) : (
                <div className="pp-muted">Not shared publicly.</div>
              )}
            </StatLane>

            {/* Signals */}
            <StatLane label="SIGNALS" accent="var(--amber)">
              {stats && stats.signals.total > 0 ? (
                <>
                  <WinLoss wins={stats.signals.wins} losses={stats.signals.losses} />
                  <LaneRow
                    left={`${stats.signals.hitRate}% hit`}
                    right={`${stats.signals.totalR >= 0 ? '+' : ''}${stats.signals.totalR}R`}
                    rightColor={stats.signals.totalR >= 0 ? 'var(--green)' : 'var(--red)'}
                  />
                  <LaneRow
                    left="net pips"
                    right={`${stats.signals.totalPips >= 0 ? '+' : ''}${stats.signals.totalPips.toLocaleString()} pips`}
                    rightColor={stats.signals.totalPips >= 0 ? 'var(--green)' : 'var(--red)'}
                  />
                </>
              ) : (
                <div className="pp-muted">No signals yet.</div>
              )}
            </StatLane>

            {/* Social */}
            <StatLane label="SOCIAL" accent="var(--amber)">
              <div style={{ display: 'flex', gap: '34px' }}>
                <button onClick={() => setFollowList('followers')} className="pp-count">
                  <b>{followCounts?.followers ?? 0}</b>
                  <span>FOLLOWERS</span>
                </button>
                <button onClick={() => setFollowList('following')} className="pp-count">
                  <b>{followCounts?.following ?? 0}</b>
                  <span>FOLLOWING</span>
                </button>
              </div>
            </StatLane>
          </div>
        </div>

        {/* Tabs */}
        <div className="pp-tabs">
          {([
            { key: 'trades', label: 'Public trades', icon: <TrendingUp size={14} />, count: tradeStats.totalPublic },
            { key: 'signals', label: 'Signals', icon: <Radio size={14} />, count: signals?.length ?? 0 },
            { key: 'articles', label: 'Blog', icon: <BookOpen size={14} />, count: articles?.length ?? 0 },
          ] as { key: TabKey; label: string; icon: React.ReactNode; count: number }[]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`pp-tab${tab === t.key ? ' is-on' : ''}`}
            >
              {t.icon}
              {t.label}
              <em>{t.count}</em>
            </button>
          ))}
        </div>

        {/* Tab body */}
        <div className="pp-body">
          {tab === 'trades' && (
            <PublicTradesPanel trades={publicTrades} isOwnProfile={isOwnProfile} winRate={tradeStats.winRate} closed={tradeStats.closed} />
          )}
          {tab === 'signals' && (
            <SignalsPanel signals={signals} />
          )}
          {tab === 'articles' && (
            <ArticlesPanel articles={articles} />
          )}
        </div>
      </div>

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

function PanelLoading() {
  return <div className="pp-loading"><Loader2 size={20} className="animate-spin" style={{ display: 'inline-block' }} /></div>;
}

function PublicTradesPanel({ trades, isOwnProfile, winRate, closed }: { trades: PublicTrade[] | undefined; isOwnProfile: boolean; winRate: number; closed: number }) {
  if (trades === undefined) {
    return <PanelLoading />;
  }
  if (trades.length === 0) {
    return (
      <div className="pp-empty">
        {isOwnProfile
          ? 'No public trades yet. Open the trades log and toggle a trade to public to share it here.'
          : 'This trader hasn\'t shared any trades publicly yet.'}
      </div>
    );
  }
  return (
    <div className="pp-list">
      {closed > 0 && (
        <div className="pp-summary">{closed} closed · {winRate}% win-rate (from public trades)</div>
      )}
      {trades.map(t => (
        <div key={t._id} className="pp-item">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <span className="pp-sym">{t.coin}</span>
              <span className={`pp-tag ${t.direction === 'short' ? 'down' : 'up'}`}>
                {t.direction ?? 'long'}
              </span>
              {t.strategy && <span className="pp-strat">· {t.strategy}</span>}
            </div>
            <div
              className="pp-pnl"
              style={{ color: (t.actualPnL ?? 0) > 0 ? 'var(--green)' : (t.actualPnL ?? 0) < 0 ? 'var(--red)' : 'var(--muted-2)' }}
            >
              {t.actualPnL !== null
                ? `${t.actualPnL >= 0 ? '+' : ''}$${t.actualPnL.toFixed(2)}`
                : 'Open'}
            </div>
          </div>
          <div className="pp-meta">
            {t.entryPrice} → {t.exitPrice ?? '—'} · {new Date(t.entryDate).toLocaleDateString()}
          </div>
          {(t.lessonNotes || t.reasoning) && (
            <p className="pp-note pp-clamp">
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
    return <PanelLoading />;
  }
  if (signals.length === 0) {
    return <div className="pp-empty">No signals posted yet.</div>;
  }
  return (
    <div className="pp-grid2">
      {signals.map(s => (
        <div key={s._id} className="pp-item" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '17px 20px', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <div className="pp-sym">{s.symbol}</div>
              <span className={`pp-tag ${s.status === 'won' || s.status === 'active' ? 'up' : s.status === 'lost' ? 'down' : 'flat'}`}>{s.status}</span>
            </div>
            <div className="pp-meta">
              {s.direction.toUpperCase()} · entry {s.entryLow}{s.entryHigh !== s.entryLow ? `–${s.entryHigh}` : ''} · SL {s.stopLoss} · {s.takeProfits.length} target{s.takeProfits.length > 1 ? 's' : ''}
            </div>
            {s.rationale && (
              <SignalRationale text={s.rationale} symbol={s.symbol} className="pp-note pp-clamp" />
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
    return <PanelLoading />;
  }
  if (articles.length === 0) {
    return <div className="pp-empty">No published articles yet.</div>;
  }
  return (
    <div className="pp-list">
      {articles.map(a => (
        <Link key={a._id} href={`/blog/${a.slug}`} className="pp-item">
          <h3 className="pp-art-title">{a.title}</h3>
          <p className="pp-note pp-clamp2" style={{ marginTop: '9px' }}>{a.excerpt}</p>
          <div className="pp-art-meta">
            <span>{a.category}</span>
            <span>·</span>
            <span>{new Date(a.publishedAt ?? a.createdAt).toLocaleDateString()}</span>
            <span>·</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
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
      className={`pp-follow ${isFollowing ? 'is-following' : 'is-not'}`}
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
    <div className="pp-socials">
      {links.map(({ url, Icon, label }) => (
        <a
          key={label}
          href={withScheme(url as string)}
          target="_blank"
          rel="noopener noreferrer"
          title={label}
          className="pp-social"
        >
          <Icon size={15} />
        </a>
      ))}
    </div>
  );
}

function StatLane({ label, accent, children }: { label: string; accent: string; children: React.ReactNode }) {
  return (
    <div className="pp-lane">
      <div className="pp-lane-hd">
        <i style={{ background: accent }} />
        {label}
      </div>
      {children}
    </div>
  );
}

function WinLoss({ wins, losses }: { wins: number; losses: number }) {
  return (
    <div className="pp-wl">
      <b style={{ color: 'var(--green)' }}>{wins}<i>W</i></b>
      <span className="sep">/</span>
      <b style={{ color: 'var(--red)' }}>{losses}<i>L</i></b>
    </div>
  );
}

function LaneRow({ left, right, rightColor }: { left: string; right: string; rightColor?: string }) {
  return (
    <div className="pp-row">
      <span>{left}</span>
      <b style={rightColor ? { color: rightColor } : undefined}>{right}</b>
    </div>
  );
}

function FollowListModal({ kind, userId, onClose }: { kind: 'followers' | 'following'; userId: string; onClose: () => void }) {
  const followers = useQuery(api.follows.listFollowers, kind === 'followers' ? { userId } : 'skip');
  const following = useQuery(api.follows.listFollowing, kind === 'following' ? { userId } : 'skip');
  const users = kind === 'followers' ? followers : following;

  return (
    <div className="pp-modal" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="pp-modal-in">
        <div className="pp-modal-hd">
          <h2>{kind}</h2>
          <button onClick={onClose} style={{ color: 'var(--atlas-muted)', display: 'inline-flex' }} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="pp-modal-body">
          {users === undefined ? (
            <div className="pp-loading"><Loader2 size={18} className="animate-spin" style={{ display: 'inline-block' }} /></div>
          ) : users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', fontSize: '13px', color: 'var(--muted-2)' }}>
              {kind === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
            </div>
          ) : (
            users.map(u => (
              <Link key={u.userId} href={`/u/${u.handle}`} onClick={onClose} className="pp-urow">
                {u.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u.avatarUrl} alt={u.displayName} className="pp-uav" />
                ) : (
                  <div className="pp-uav-fb">{u.displayName.slice(0, 1).toUpperCase()}</div>
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.displayName}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--muted-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{u.handle}</div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
