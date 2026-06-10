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
    <div className="relative max-w-6xl mx-auto">
      <header className="space-y-2 mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-medium text-[var(--muted-foreground)]">
          <Users size={13} className="text-pink-400" /> Following
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">Your feed</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Latest signals, public trades, and posts from the traders you follow.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        {/* Main column — the feed itself */}
        <main className="min-w-0">
          {data === undefined ? (
            <div className="text-center py-16"><Loader2 size={22} className="animate-spin inline text-pink-400" /></div>
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
            <div className="space-y-3">
              {(data.items as FeedItem[]).map(item => (
                <FeedCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </main>

        {/* Right rail — who to follow */}
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <DiscoverSection onOpenTab={onOpenTab} />
        </aside>
      </div>
    </div>
  );
}

function PosterRow({ item, verb }: { item: FeedItem; verb: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-2">
      <Link href={`/u/${item.posterHandle}`} className="shrink-0">
        {item.posterAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.posterAvatar} alt={item.posterName} className="w-8 h-8 rounded-full object-cover border border-[var(--border)]" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-500 flex items-center justify-center text-xs font-bold text-white">
            {item.posterName.slice(0, 1).toUpperCase()}
          </div>
        )}
      </Link>
      <div className="min-w-0 text-sm">
        <Link href={`/u/${item.posterHandle}`} className="font-semibold text-[var(--foreground)] hover:text-pink-300 transition-colors">
          {item.posterName}
        </Link>
        <span className="text-[var(--muted-foreground)]"> {verb}</span>
      </div>
      <span className="ml-auto text-[10px] text-[var(--muted-foreground)] shrink-0">{timeAgo(item.ts)}</span>
    </div>
  );
}

function Level({ label, value, tone }: { label: string; value: string; tone?: 'red' | 'emerald' }) {
  const color = tone === 'red' ? 'text-red-300' : tone === 'emerald' ? 'text-emerald-300' : 'text-[var(--foreground)]';
  return (
    <div className="rounded-md bg-[var(--card)] border border-[var(--border)] px-2 py-1.5 text-center">
      <div className="text-[9px] uppercase tracking-wide text-[var(--muted-foreground)]">{label}</div>
      <div className={`text-sm font-bold tabular-nums mt-0.5 ${color}`}>{value}</div>
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
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        <div className="p-4 space-y-3">
          <PosterRow item={item} verb="posted a signal" />

          {item.rationale && (
            <p className="text-sm text-[var(--foreground)]/90 leading-relaxed">{item.rationale}</p>
          )}

          {/* Embedded signal ticket */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--background)]/40 p-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Radio size={15} className="text-pink-400" />
              <span className="font-mono font-bold text-base">{item.symbol}</span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${isShort ? 'bg-red-500/15 text-red-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
                {isShort ? 'SELL' : 'BUY'}
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                won ? 'bg-emerald-500/15 text-emerald-300' :
                lost ? 'bg-red-500/15 text-red-300' :
                'bg-[var(--muted)]/30 text-[var(--muted-foreground)]'
              }`}>{item.status}</span>
              <span className="ml-auto text-[11px] font-bold tabular-nums text-pink-300">R:R {(item.rrRatio ?? 0).toFixed(1)}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
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
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
        <PosterRow item={item} verb={item.isOpen ? 'opened a trade' : 'shared a trade'} />
        <div className="flex items-center gap-2 flex-wrap">
          <TrendingUp size={14} className="text-emerald-400" />
          <span className="font-mono font-bold">{item.coin}</span>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${item.direction === 'short' ? 'bg-red-500/15 text-red-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
            {item.direction}
          </span>
          <span className={`ml-auto text-sm font-bold tabular-nums ${pnl !== null && pnl > 0 ? 'text-emerald-400' : pnl !== null && pnl < 0 ? 'text-red-400' : 'text-[var(--muted-foreground)]'}`}>
            {pnl !== null ? `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}` : 'Open'}
          </span>
        </div>
        <div className="text-[11px] text-[var(--muted-foreground)] tabular-nums mt-1.5">
          {item.entryPrice} → {item.exitPrice ?? '—'}
        </div>
      </div>
    );
  }

  // article
  return (
    <Link href={`/blog/${item.slug}`} className="block rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 hover:border-pink-500/30 transition-colors">
      <PosterRow item={item} verb="published a post" />
      <div className="flex items-start gap-2">
        <BookOpen size={14} className="text-purple-400 mt-0.5 shrink-0" />
        <div className="min-w-0">
          <h3 className="text-base font-bold text-[var(--foreground)] leading-snug">{item.title}</h3>
          {item.excerpt && <p className="text-xs text-[var(--muted-foreground)] mt-1 line-clamp-2">{item.excerpt}</p>}
          {item.category && <span className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] mt-1.5 inline-block">{item.category}</span>}
        </div>
      </div>
    </Link>
  );
}

function DiscoverSection({ onOpenTab, compact }: { onOpenTab: (tab: TabId) => void; compact?: boolean }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Trophy size={15} className="text-amber-400" />
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Top analysts to follow</h2>
        <button
          onClick={() => onOpenTab('signals')}
          className="ml-auto text-[11px] font-semibold text-pink-300 hover:text-pink-200 inline-flex items-center gap-1"
        >
          All signals <ArrowRight size={12} />
        </button>
      </div>
      <TopAnalysts limit={compact ? 5 : 10} />
    </section>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="text-center py-12 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)]/50">
      <Users size={28} className="mx-auto text-[var(--muted-foreground)] mb-3" />
      <p className="text-base font-semibold text-[var(--foreground)]">{title}</p>
      <p className="text-sm text-[var(--muted-foreground)] mt-1 max-w-sm mx-auto">{body}</p>
    </div>
  );
}
