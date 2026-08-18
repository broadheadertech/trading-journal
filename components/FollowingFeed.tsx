'use client';

import Link from 'next/link';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { TabId } from '@/lib/types';
import {
  Users, Radio, TrendingUp, BookOpen, Loader2, Trophy, ArrowRight,
} from 'lucide-react';
import TopAnalysts from '@/components/TopAnalysts';
import SignalSocialBar from '@/components/SignalSocialBar';
import SignalRationale from '@/components/SignalRationale';

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

type FeedItem = {
  id: string;
  kind: 'signal' | 'trade' | 'article';
  ts: string;
  posterId: string;
  posterName: string;
  posterHandle: string;
  posterAvatar: string | null;
  // signal
  signalId?: Id<'signals'>;
  symbol?: string;
  market?: string;
  direction?: string;
  status?: string;
  tpHit?: number | null;
  entryLow?: number;
  entryHigh?: number;
  stopLoss?: number;
  rrRatio?: number;
  rationale?: string;
  takeProfit?: number | null;
  // trade
  coin?: string;
  actualPnL?: number | null;
  entryPrice?: number;
  exitPrice?: number | null;
  isOpen?: boolean;
  // article
  slug?: string;
  title?: string;
  excerpt?: string;
  category?: string;
};

export default function FollowingFeed({ onOpenTab }: { onOpenTab: (tab: TabId) => void }) {
  const data = useQuery(api.feed.getFollowingFeed, { limit: 60 });

  return (
    <div style={{ position: 'relative' }}>
      <div className="phead">
        <p className="eyebrow" style={{ fontWeight: 500 }}><Users size={13} /> Following</p>
        <h2>Your feed</h2>
        <p className="sub">
          Latest signals, public trades, and posts from the traders you follow.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,320px)', gap: 32, alignItems: 'start' }}>
        {/* Main column — the feed itself */}
        <main style={{ minWidth: 0 }}>
          {data === undefined ? (
            <p className="empty-line"><Loader2 size={20} className="animate-spin" style={{ display: 'inline' }} /></p>
          ) : data.following === 0 ? (
            <EmptyState
              title="You're not following anyone yet"
              body="Follow traders and analysts from the panel to fill your feed with their signals and trades."
            />
          ) : data.items.length === 0 ? (
            <EmptyState
              title="No recent activity"
              body="The people you follow haven't posted lately. Check back soon, or discover more analysts to follow."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {(data.items as FeedItem[]).map(item => (
                <FeedCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </main>

        {/* Right rail — who to follow */}
        <aside style={{ position: 'sticky', top: 16, alignSelf: 'start' }}>
          <DiscoverSection onOpenTab={onOpenTab} />
        </aside>
      </div>
    </div>
  );
}

function PosterRow({ item, verb }: { item: FeedItem; verb: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
      <Link href={`/u/${item.posterHandle}`} style={{ flex: 'none' }}>
        {item.posterAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.posterAvatar}
            alt={item.posterName}
            style={{ width: 30, height: 30, borderRadius: 3, objectFit: 'cover', border: '1px solid var(--line-2)' }}
          />
        ) : (
          <div
            style={{
              width: 30, height: 30, borderRadius: 3, background: '#0f1620',
              border: '1px solid var(--pink)', color: 'var(--pink)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--display)', fontWeight: 700, fontSize: 12,
            }}
          >
            {item.posterName.slice(0, 1).toUpperCase()}
          </div>
        )}
      </Link>
      <div style={{ minWidth: 0, fontSize: 12.5, color: 'var(--muted-2)' }}>
        <Link href={`/u/${item.posterHandle}`} style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>
          {item.posterName}
        </Link>
        <span> {verb}</span>
      </div>
      <span style={{ marginLeft: 'auto', flex: 'none', fontSize: 11, color: 'var(--muted-2)' }}>{timeAgo(item.ts)}</span>
    </div>
  );
}

function Level({ label, value, tone }: { label: string; value: string; tone?: 'red' | 'emerald' }) {
  const color = tone === 'red' ? 'var(--red)' : tone === 'emerald' ? 'var(--green)' : 'var(--text)';
  return (
    <div className="inset" style={{ padding: '9px 6px', textAlign: 'center' }}>
      <p className="lbl">{label.toUpperCase()}</p>
      <em style={{ display: 'block', fontStyle: 'normal', fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 14, lineHeight: '20px', marginTop: 4, color }}>
        {value}
      </em>
    </div>
  );
}

function FeedCard({ item }: { item: FeedItem }) {
  if (item.kind === 'signal') {
    const won = item.status === 'won';
    const lost = item.status === 'lost';
    const isShort = item.direction === 'short';
    const entry = item.entryHigh !== item.entryLow ? `${item.entryLow}–${item.entryHigh}` : `${item.entryLow}`;
    return (
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <span className="accent" style={{ width: 56, background: 'var(--pink)' }} />
        <div style={{ padding: '20px 22px 22px' }}>
          <PosterRow item={item} verb="posted a signal" />

          {item.rationale && (
            <SignalRationale
              text={item.rationale}
              symbol={item.symbol}
              className="sub"
            />
          )}

          {/* Embedded signal ticket */}
          <div className="inset" style={{ marginTop: 16, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <Radio size={14} color="#ff3d87" />
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 15, color: 'var(--text)' }}>{item.symbol}</span>
              <span
                className="chip"
                style={{ height: 20, padding: '0 10px', fontSize: 9, fontWeight: 700, letterSpacing: '.04em', color: isShort ? 'var(--red)' : 'var(--green)' }}
              >
                {isShort ? 'SELL' : 'BUY'}
              </span>
              <span
                className="chip"
                style={{
                  height: 20, padding: '0 10px', fontSize: 9, fontWeight: 700, letterSpacing: '.04em',
                  textTransform: 'uppercase',
                  color: won ? 'var(--green)' : lost ? 'var(--red)' : 'var(--muted-2)',
                }}
              >
                {item.status}
              </span>
              <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--pink)' }}>
                R:R {(item.rrRatio ?? 0).toFixed(1)}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 7, marginTop: 12 }}>
              <Level label="Entry" value={entry} />
              <Level label="Stop loss" value={`${item.stopLoss}`} tone="red" />
              <Level label="Target" value={item.takeProfit != null ? `${item.takeProfit}` : '—'} tone="emerald" />
            </div>
          </div>
        </div>
        {item.signalId && <SignalSocialBar signalId={item.signalId} />}
      </div>
    );
  }

  if (item.kind === 'trade') {
    const pnl = item.actualPnL ?? null;
    return (
      <div className="card" style={{ padding: '20px 22px 22px' }}>
        <span className="accent" style={{ width: 56, background: 'var(--green)' }} />
        <PosterRow item={item} verb={item.isOpen ? 'opened a trade' : 'shared a trade'} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <TrendingUp size={14} color="#24c88a" />
          <span style={{ fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 14, color: 'var(--text)' }}>{item.coin}</span>
          <span
            className="chip"
            style={{
              height: 20, padding: '0 10px', fontSize: 9, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase',
              color: item.direction === 'short' ? 'var(--red)' : 'var(--green)',
            }}
          >
            {item.direction}
          </span>
          <span
            style={{
              marginLeft: 'auto', fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 14,
              color: pnl !== null && pnl > 0 ? 'var(--green)' : pnl !== null && pnl < 0 ? 'var(--red)' : 'var(--muted-2)',
            }}
          >
            {pnl !== null ? `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}` : 'Open'}
          </span>
        </div>
        <p className="qrow" style={{ marginTop: 12, fontFamily: 'var(--mono)' }}>
          {item.entryPrice} → {item.exitPrice ?? '—'}
        </p>
      </div>
    );
  }

  // article
  return (
    <Link href={`/blog/${item.slug}`} className="card" style={{ display: 'block', padding: '20px 22px 22px' }}>
      <span className="accent" style={{ width: 56, background: 'var(--teal)' }} />
      <PosterRow item={item} verb="published a post" />
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <BookOpen size={14} color="#2fd3c4" style={{ flex: 'none', marginTop: 3 }} />
        <div style={{ minWidth: 0 }}>
          <h4>{item.title}</h4>
          {item.excerpt && <p className="sub">{item.excerpt}</p>}
          {item.category && (
            <p className="lbl" style={{ marginTop: 12, textTransform: 'uppercase' }}>{item.category}</p>
          )}
        </div>
      </div>
    </Link>
  );
}

function DiscoverSection({ onOpenTab, compact }: { onOpenTab: (tab: TabId) => void; compact?: boolean }) {
  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <Trophy size={13} color="#d99405" />
        <p className="lbl">TOP ANALYSTS TO FOLLOW</p>
        <button onClick={() => onOpenTab('signals')} className="viewall" type="button" style={{ fontSize: 11.5 }}>
          All signals <ArrowRight size={12} />
        </button>
      </div>
      <div style={{ borderTop: '1px solid var(--line-2)', paddingTop: 22 }}>
        <TopAnalysts limit={compact ? 5 : 10} />
      </div>
    </section>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="blank" style={{ minHeight: 280 }}>
      <span className="corner" style={{ left: 0, top: 0, borderRight: 0, borderBottom: 0 }} />
      <span className="corner" style={{ right: 0, top: 0, borderLeft: 0, borderBottom: 0 }} />
      <span className="corner" style={{ left: 0, bottom: 0, borderRight: 0, borderTop: 0 }} />
      <span className="corner" style={{ right: 0, bottom: 0, borderLeft: 0, borderTop: 0 }} />
      <span className="badge" style={{ border: '1px solid rgba(255,61,135,.5)' }}>
        <Users size={24} color="#ff3d87" />
      </span>
      <h4>{title}</h4>
      <p style={{ maxWidth: 420 }}>{body}</p>
    </div>
  );
}
