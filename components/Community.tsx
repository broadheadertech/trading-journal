'use client';

import { useState, useMemo, useRef, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { FunctionReturnType } from 'convex/server';
import {
  Chats as MessagesSquare, ArrowLeft, Plus, PencilSimple as Edit2, Trash as Trash2, Gear as Settings,
  CaretUp as ChevronUp, CaretDown as ChevronDown, Lock, ChatCircle as MessageCircle, Image as ImageIcon,
  CircleNotch as Loader2, UploadSimple as Upload, PaperPlaneTilt as Send,
  MagnifyingGlass, X,
} from '@phosphor-icons/react';
import { PushPin as Pin } from '@phosphor-icons/react';
import { useToast } from '@/components/ui/Toast';
import { useSubscription } from '@/hooks/useSubscription';
import TierBadge from '@/components/TierBadge';
import BrainMascot from '@/components/BrainMascot';

/* Derived from the Convex functions rather than hand-written, so the feed
   cannot drift from what the queries actually return. */
type ForumCategory = FunctionReturnType<typeof api.forum.listCategories>[number];
type ForumPost = FunctionReturnType<typeof api.forum.listPosts>[number];

type View = 'list' | 'detail' | 'admin';
type SortMode = 'hot' | 'new' | 'top';

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// ATLAS form-control chrome (matches .field .box / .codebox in app/atlas-dashboard.css)
const atlasInput: React.CSSProperties = {
  width: '100%',
  border: '1px solid var(--line)',
  borderRadius: 2,
  background: 'var(--panel-2)',
  color: 'var(--text)',
  padding: '10px 14px',
  fontSize: 13,
};
const atlasLabel: React.CSSProperties = {
  display: 'block',
  fontWeight: 700,
  fontSize: 9.5,
  color: 'var(--muted-2)',
  letterSpacing: '.04em',
  marginBottom: 9,
};

/* Category colours for the feed. The seeded rows already carry a colour, but
   Trade Reviews ships #10b981 where the feed design calls for #22C55E — so the
   palette is applied by slug at the presentation layer and the stored category
   data is left untouched. Anything not in the map keeps its own colour. */
const CAT_COLOR: Record<string, string> = {
  general: '#6366F1',
  'trade-reviews': '#22C55E',
  psychology: '#A855F7',
  strategy: '#F59E0B',
  qa: '#06B6D4',
  announcements: '#EF4444',
};
const catColor = (c?: { slug?: string; color?: string } | null) =>
  (c && (CAT_COLOR[c.slug ?? ''] ?? c.color)) || 'var(--amber)';

/* One or two letters for the round avatars. */
function initials(name?: string) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

/* The rail exists above 1024px and dissolves below it. Read through
   useSyncExternalStore rather than an effect so the first render already has
   the answer; the server snapshot is the wide layout. Same shape as
   lib/webgl.ts. */
const WIDE_Q = '(min-width: 1024px)';
function subscribeWide(cb: () => void) {
  const m = window.matchMedia(WIDE_Q);
  m.addEventListener('change', cb);
  return () => m.removeEventListener('change', cb);
}
const getWideSnapshot = () => window.matchMedia(WIDE_Q).matches;
const getWideServerSnapshot = () => true;

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function Community() {
  /* the signed-in identity now lives in Composer, which is the only thing on
     this screen that needed it once the top-right New Post button went away */
  const [view, setView] = useState<View>('list');
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [sort, setSort] = useState<SortMode>('hot');
  const [query, setQuery] = useState('');

  /* Convex returns undefined while a query is in flight. Collapsing that to []
     with ?? meant the list could not tell "still loading" from "there is
     nothing here" — so every visit flashed the "No posts yet — Be the first to
     start the conversation" empty state before the posts arrived, which reads
     as an empty forum. Keep the raw result and derive both states from it. */
  /* One unfiltered fetch, then filter in the client. listPosts already
     .collect()s the whole table for the no-category case, so this does not
     widen the worst-case read — and it buys three things the per-category
     round-trip could not: a real post count beside every category, instant
     switching with no refetch flash, and title/body search. If the forum ever
     outgrows a full collect, this and the server query need paging together. */
  const categoriesResult = useQuery(api.forum.listCategories);
  const postsResult = useQuery(api.forum.listPosts, { sort });
  const categories = categoriesResult ?? [];
  /* memoised so the `?? []` fallback does not mint a new array each render and
     invalidate every useMemo below it */
  const allPosts = useMemo(() => postsResult ?? [], [postsResult]);
  const postsLoading = postsResult === undefined;

  const countByCategory = useMemo(() => {
    const m = new Map<string, number>();
    allPosts.forEach(p => m.set(p.categoryId, (m.get(p.categoryId) ?? 0) + 1));
    return m;
  }, [allPosts]);

  const posts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allPosts.filter(p =>
      (!activeCategoryId || p.categoryId === activeCategoryId) &&
      (!q || p.title?.toLowerCase().includes(q) || p.body?.toLowerCase().includes(q)),
    );
  }, [allPosts, activeCategoryId, query]);

  const postIds = useMemo(() => posts.map((p: any) => p.id), [posts]);
  const activeCategory = categories.find((c) => c.id === activeCategoryId);
  const myVotes: Record<string, 1 | -1> = useQuery(api.forum.myVotesForPosts, { postIds }) ?? {};
  const vote = useMutation(api.forum.vote);

  /* Where search and the category list live is a markup decision, not just a
     CSS one: each exists exactly once and moves between the rail and the
     filter row, so there is never a second <input> bound to the same `query`.

     MUST stay above the detail-view early return below: React counts hooks
     per render, and having this one after it meant opening a post rendered
     one hook fewer than the list did — "Rendered fewer hooks than expected".
     Same constraint the comment tree in PostDetail is under. */
  const wide = useSyncExternalStore(subscribeWide, getWideSnapshot, getWideServerSnapshot);

  if (view === 'detail' && activePostId) {
    return <PostDetail postId={activePostId} onBack={() => { setActivePostId(null); setView('list'); }} />;
  }

  /* Cards fade up on mount. Keying the feed on the active filter remounts the
     list whenever sort / category / search changes, which is what restages the
     animation — there is no other reason to force a remount here. */
  const feedKey = `${sort}|${activeCategoryId ?? 'all'}|${query.trim()}`;


  const search = (
    <label className="cf-search">
      <MagnifyingGlass size={14} className="cf-sicon" />
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search posts…"
        aria-label="Search posts"
      />
      {query && (
        <button onClick={() => setQuery('')} aria-label="Clear search" className="cf-sclear">
          <X size={11} />
        </button>
      )}
    </label>
  );

  const categoryList = (
    <CategoryList
      variant={wide ? 'rail' : 'chips'}
      categories={categories}
      loaded={categoriesResult !== undefined}
      countByCategory={countByCategory}
      total={allPosts.length}
      loading={postsLoading}
      activeCategoryId={activeCategoryId}
      onPick={setActiveCategoryId}
    />
  );

  return (
    <div>
      <div className="cfeed">
        {/* outside the grid, so it lines up with the left column's left edge */}
        <div className="phead" style={{ paddingLeft: 0, paddingRight: 0 }}>
          <p className="eyebrow">Live discussions</p>
          <h2>Join the conversation</h2>
          <p className="sub">
            Discuss trades, share insights, ask questions. Read freely, post when logged in.
          </p>
        </div>

        <div className="cf-grid">
          <div className="cf-main">
            {/* The composer replaces the old top-right "New Post" button as the
                way in. Signed out it is still the same control, pointing at
                sign-in, so the primary action never disappears from the page. */}
            <Composer
              categories={categories}
              defaultCategoryId={activeCategoryId ?? categories[0]?.id}
            />

            <div className="cf-bar">
              <div className="cf-sorts">
                {(['hot', 'new', 'top'] as SortMode[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSort(s)}
                    className={`cf-sort${sort === s ? ' on' : ''}`}
                    aria-pressed={sort === s}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Which slice of the forum is on screen. The category list
                  highlights the active one, but the feed itself gave no
                  confirmation that it had been filtered — so a quiet category
                  looked like a quiet forum. */}
              <div className="cf-count">
                <span>
                  {postsLoading
                    ? 'loading…'
                    : `${posts.length} post${posts.length === 1 ? '' : 's'}${activeCategory ? ' in ' + activeCategory.name : ''}`}
                </span>
                {activeCategory && !postsLoading && (
                  <button onClick={() => setActiveCategoryId(null)} className="cf-clear">
                    Clear
                  </button>
                )}
              </div>

              {/* below the rail breakpoint the search rejoins the filter row */}
              {!wide && search}
            </div>

            {!wide && categoryList}

            {postsLoading ? (
              /* Three skeletons at the real card's dimensions, so the feed does
                 not jump when the query resolves. */
              <div aria-busy="true" aria-label="Loading posts">
                {[0, 1, 2].map(i => (
                  <div className="cf-skel" key={i}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 32, height: 32, borderRadius: '50%', flex: 'none' }} />
                      <div style={{ flex: 1 }}>
                        <span style={{ width: '32%', height: 9 }} />
                        <span style={{ width: '22%', height: 8, marginTop: 6 }} />
                      </div>
                    </div>
                    <span style={{ width: '70%', height: 12, marginTop: 14 }} />
                    <span style={{ width: '100%', height: 9, marginTop: 8 }} />
                    <span style={{ width: '88%', height: 9, marginTop: 6 }} />
                    <span style={{ width: 150, height: 28, borderRadius: 999, marginTop: 17 }} />
                  </div>
                ))}
              </div>
            ) : posts.length === 0 ? (
              /* Three different reasons the list can be empty, and they call for
                 three different messages. Telling someone whose search missed to
                 "be the first to start the conversation" is the same mistake as
                 telling it to someone who just filtered into a quiet category —
                 the forum is not empty, their view is. */
              <div style={{ textAlign: 'center', padding: '54px 20px', color: 'var(--muted-2)' }}>
                <MessagesSquare size={26} style={{ color: 'var(--muted-3)', margin: '0 auto 14px' }} />
                {query.trim() ? (
                  <>
                    <p style={{ fontSize: 13, color: 'var(--text-2)' }}>No posts match “{query.trim()}”</p>
                    <p style={{ marginTop: 8 }}>
                      <button
                        onClick={() => setQuery('')}
                        style={{ background: 'none', cursor: 'pointer', color: 'var(--amber)', fontWeight: 700, fontSize: 12.5 }}
                      >
                        Clear search
                      </button>
                    </p>
                  </>
                ) : activeCategory ? (
                  <>
                    <p style={{ fontSize: 13, color: 'var(--text-2)' }}>No posts in {activeCategory.name} yet</p>
                    <p style={{ marginTop: 8 }}>
                      <button
                        onClick={() => setActiveCategoryId(null)}
                        style={{ background: 'none', cursor: 'pointer', color: 'var(--amber)', fontWeight: 700, fontSize: 12.5 }}
                      >
                        View all posts
                      </button>
                    </p>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: 13, color: 'var(--text-2)' }}>No posts yet</p>
                    <p style={{ marginTop: 6, fontSize: 12.5 }}>Be the first to start the conversation.</p>
                  </>
                )}
              </div>
            ) : (
              <div key={feedKey}>
                {posts.map((p, i) => (
                  <PostCard
                    key={p.id}
                    post={p}
                    category={categories.find((c) => c.id === p.categoryId)}
                    myVote={myVotes[p.id]}
                    onVote={(value) => vote({ targetType: 'post', targetId: p.id, value })}
                    onOpen={() => { setActivePostId(p.id); setView('detail'); }}
                    /* capped so a long feed does not end up waiting a second and
                       a half before the last card appears */
                    delay={Math.min(i, 8) * 0.06}
                  />
                ))}
              </div>
            )}
          </div>

          {wide && (
            <aside className="cf-rail">
              {search}
              {categoryList}
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
/* One component, two shapes: a vertical list in the rail at ≥1024px, a single
   scrollable chip row below it. Same categories, counts, active and dimmed
   states either way — only the chrome differs. */
function CategoryList({
  variant, categories, loaded, countByCategory, total, loading, activeCategoryId, onPick,
}: {
  variant: 'rail' | 'chips';
  categories: ForumCategory[];
  loaded: boolean;
  countByCategory: Map<string, number>;
  total: number;
  loading: boolean;
  activeCategoryId: string | null;
  onPick: (id: string | null) => void;
}) {
  const chips = variant === 'chips';
  /* A chip that scrolls out of the strip is a filter you cannot see you have
     applied, so the selected one is always pulled back into view. */
  const reveal = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (chips) e.currentTarget.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  };

  return (
    <div className={chips ? 'cf-chips' : 'cf-cats'}>
      {!chips && <h6 className="cf-catshead">CATEGORIES</h6>}
      <button
        onClick={(e) => { onPick(null); reveal(e); }}
        className={`cf-chip${activeCategoryId === null ? ' on' : ''}`}
        aria-pressed={activeCategoryId === null}
        style={{ '--cat': 'var(--amber)' } as React.CSSProperties}
      >
        <i style={{ background: 'var(--amber)' }} />
        All Posts
        <em>{loading ? '' : total}</em>
      </button>
      {categories.map((c) => {
        const n = countByCategory.get(c.id) ?? 0;
        const col = catColor(c);
        const on = activeCategoryId === c.id;
        return (
          <button
            key={c.id}
            onClick={(e) => { onPick(c.id); reveal(e); }}
            /* a category nobody has posted in is still somewhere you can post —
               keep it reachable, just visibly quiet */
            className={`cf-chip${on ? ' on' : ''}${!loading && n === 0 ? ' empty' : ''}`}
            aria-pressed={on}
            /* each category carries a description that was never rendered
               anywhere; as a tooltip it costs no layout */
            title={c.description || undefined}
            style={{ '--cat': col } as React.CSSProperties}
          >
            <i style={{ background: col }} />
            {c.name}
            <em>{loading ? '' : n}</em>
          </button>
        );
      })}
      {loaded && categories.length === 0 && (
        <p style={{ margin: '4px 2px', fontSize: 12, color: 'var(--muted-2)' }}>No categories yet.</p>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
/* The composer is the only way into the post form now, so it carries the
   signed-out case too: same control, same position, pointing at sign-in. */
function Composer({ categories, defaultCategoryId }: { categories: ForumCategory[]; defaultCategoryId?: string }) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);

  if (!user) {
    return (
      <div className="cf-composer">
        <div className="cf-crow">
          <span className="cf-me" aria-hidden="true"><Lock size={13} /></span>
          <Link href="/sign-in" className="cf-stub" style={{ display: 'flex', alignItems: 'center' }}>
            Log in to post
          </Link>
          <Link href="/sign-in" className="cf-post">
            <Plus size={13} /><span className="cf-lbl">Post</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cf-composer">
      <div className="cf-crow">
        <span className="cf-me" aria-hidden="true">{initials(user.fullName || user.username || 'A')}</span>
        <button className="cf-stub" onClick={() => setOpen(true)}>
          Share a trade, insight, or question…
        </button>
        <button className="cf-post" onClick={() => setOpen(true)}>
          <Plus size={13} /><span className="cf-lbl">Post</span>
        </button>
      </div>

      {open && (
        <div className="cf-expand">
          <NewPostForm
            categories={categories}
            defaultCategoryId={defaultCategoryId}
            onClose={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
/* Pulled out of the map so the vote-count bump can hold a little state of its
   own without giving every card in the feed a re-render budget. */
function PostCard({
  post: p, category: cat, myVote, onVote, onOpen, delay,
}: {
  post: ForumPost;
  category?: ForumCategory;
  myVote?: 1 | -1;
  onVote: (value: 0 | 1 | -1) => void;
  onOpen: () => void;
  delay: number;
}) {
  const col = catColor(cat);
  const shot = p.images?.[0];

  return (
    <div
      className="cf-card"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      style={{ animationDelay: `${delay}s`, '--cat': col } as React.CSSProperties}
    >
      <div className="cf-head">
        {/* the category colour moved off the old left rail and into the avatar
            tint, the category label and the chip */}
        <span
          className="cf-av"
          aria-hidden="true"
          style={{ '--cat': col } as React.CSSProperties}
        >
          {initials(p.authorName)}
        </span>
        <div className="cf-who">
          <b>
            {p.authorName}
            <TierBadge tier={p.authorTier} />
          </b>
          <div className="cf-meta">
            <span className="cf-when">{timeAgo(p.createdAt)}</span>
            {cat && (
              <>
                <span className="cf-dot">·</span>
                <span className="cf-catname">{cat.name}</span>
              </>
            )}
            {p.isPinned && <span className="cf-flag on"><Pin size={10} /> Pinned</span>}
            {p.isLocked && <span className="cf-flag"><Lock size={10} /> Locked</span>}
          </div>
        </div>
      </div>

      <h5>{p.title}</h5>
      <p className="cf-body line-clamp-2">{p.body}</p>
      {shot && (
        <div className="cf-figure">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="cf-shot" src={shot} alt="" loading="lazy" />
        </div>
      )}

      <div className="cf-acts">
        {/* both directions, because the forum has always supported both */}
        <span className="cf-pill" onClick={e => e.stopPropagation()}>
          <button
            className={`cf-up${myVote === 1 ? ' on' : ''}`}
            aria-label="Upvote"
            onClick={() => onVote(myVote === 1 ? 0 : 1)}
          >
            <ChevronUp size={14} />
          </button>
          <VoteCount score={p.score} />
          <button
            className={`cf-down${myVote === -1 ? ' on' : ''}`}
            aria-label="Downvote"
            onClick={() => onVote(myVote === -1 ? 0 : -1)}
          >
            <ChevronDown size={14} />
          </button>
        </span>

        {/* the replies pill opens the thread itself rather than being a label
            that swallows the card's own click */}
        <button
          className="cf-pill"
          onClick={e => { e.stopPropagation(); onOpen(); }}
          aria-label={`${p.commentCount} replies`}
        >
          <MessageCircle size={13} /> {p.commentCount}
        </button>

        {p.images && p.images.length > 1 && (
          <span className="cf-pill" style={{ cursor: 'default' }} onClick={e => e.stopPropagation()}>
            <ImageIcon size={13} /> {p.images.length}
          </span>
        )}
      </div>
    </div>
  );
}

/* Bumps only when the number actually moves — the state update happens during
   render (React's supported derived-state pattern) rather than in an effect, so
   there is no extra paint at the old value and no set-state-in-effect. */
function VoteCount({ score }: { score: number }) {
  const [seen, setSeen] = useState(score);
  const [bump, setBump] = useState(false);
  if (seen !== score) { setSeen(score); setBump(true); }
  return (
    <b className={bump ? 'cf-bump' : undefined} onAnimationEnd={() => setBump(false)}>{score}</b>
  );
}

// ──────────────────────────────────────────────────────────────────────
/* Was NewPostModal — same fields, same mutation, same validation and toasts.
   Only the chrome changed: it renders inside the composer card instead of a
   fixed overlay, so "expand the composer" and "open the form" are one thing. */
function NewPostForm({
  categories, defaultCategoryId, onClose,
}: {
  categories: any[];
  defaultCategoryId?: string;
  onClose: () => void;
}) {
  const { user } = useUser();
  const { tierName } = useSubscription();
  const { showToast } = useToast();
  const createPost = useMutation(api.forum.createPost);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [categoryId, setCategoryId] = useState(defaultCategoryId ?? '');
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-4">
      <div className="space-y-4">

        <div className="field">
          <label style={atlasLabel}>Category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            style={atlasInput}
          >
            <option value="">Select category…</option>
            {categories.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label style={atlasLabel}>Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={atlasInput}
          />
        </div>

        <div className="field">
          <label style={atlasLabel}>Body</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            style={atlasInput}
          />
        </div>

        <ImageUploader images={images} onChange={setImages} />

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="btn-g flex-1">Cancel</button>
          <button
            disabled={busy || !title || !body || !categoryId}
            onClick={async () => {
              setBusy(true);
              try {
                await createPost({
                  id: uid(),
                  categoryId,
                  title,
                  body,
                  images: images.length ? images : undefined,
                  authorName: user?.fullName || user?.username || 'Anonymous',
                  authorImage: user?.imageUrl ?? undefined,
                  authorTier: tierName,
                });
                showToast('Posted!', 'success');
                onClose();
              } catch (err) {
                showToast(err instanceof Error ? err.message : 'Failed', 'error');
              } finally {
                setBusy(false);
              }
            }}
            className="btn-a flex-1 disabled:opacity-50"
          >
            {busy ? 'Posting…' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
function PostDetail({ postId, onBack }: { postId: string; onBack: () => void }) {
  const { user } = useUser();
  const { tierName } = useSubscription();
  const { showToast } = useToast();
  const isAdmin = user?.id === process.env.NEXT_PUBLIC_ADMIN_USER_ID;

  const post = useQuery(api.forum.getPost, { id: postId });
  /* Same query the list already subscribes to, so this resolves from cache —
     it is here only to name/colour the post's category in the context rail,
     which the detail view previously dropped entirely. */
  const detailCategories = useQuery(api.forum.listCategories) ?? [];
  const comments = useQuery(api.forum.listComments, { postId }) ?? [];
  const myPostVotes = useQuery(api.forum.myVotesForPosts, { postIds: [postId] }) ?? {};
  const commentIds = useMemo(() => comments.map((c: any) => c.id), [comments]);
  const myCommentVotes = useQuery(api.forum.myVotesForComments, { commentIds }) ?? {};

  const vote = useMutation(api.forum.vote);
  const createComment = useMutation(api.forum.createComment);
  const deleteComment = useMutation(api.forum.deleteComment);
  const deletePost = useMutation(api.forum.deletePost);
  const togglePin = useMutation(api.forum.togglePin);
  const toggleLock = useMutation(api.forum.toggleLock);

  const [replyBody, setReplyBody] = useState('');
  const [replyParent, setReplyParent] = useState<string | null>(null);

  // Build comment tree.
  // MUST stay above the `!post` early return: when the post resolves the
  // component would otherwise run one more hook than on the loading render,
  // and React throws "Rendered more hooks than during the previous render",
  // so PostDetail could never mount. Only depends on `comments`.
  const tree = useMemo(() => {
    const byParent: Record<string, any[]> = {};
    for (const c of comments) {
      const k = c.parentCommentId ?? 'root';
      (byParent[k] ??= []).push(c);
    }
    return byParent;
  }, [comments]);

  if (!post) return (
    <div className="flex items-center justify-center py-20">
      <BrainMascot size={48} glow beat />
    </div>
  );

  const myVote = (myPostVotes as any)[postId];
  const canMod = isAdmin || post.authorId === user?.id;

  const renderComments = (parentId: string, depth: number): React.ReactNode => {
    const list = tree[parentId] ?? [];
    return list.map((c: any) => {
      const cmVote = (myCommentVotes as any)[c.id];
      return (
        <div key={c.id} style={{ marginLeft: depth * 16, borderLeft: '1px solid var(--line)' }} className="pl-3 py-2">
          <div className="flex items-center gap-2 mb-1" style={{ fontSize: 11.5, color: 'var(--muted-2)' }}>
            <strong style={{ color: 'var(--text)', fontWeight: 700 }}>{c.authorName}</strong>
            <TierBadge tier={c.authorTier} />
            <span>·</span>
            <span>{timeAgo(c.createdAt)}</span>
          </div>
          <p className="whitespace-pre-wrap mb-2" style={{ fontSize: 13, lineHeight: '19px', color: 'var(--copy)' }}>{c.body}</p>
          <div className="flex items-center gap-3" style={{ fontSize: 11, color: 'var(--muted-2)' }}>
            <button
              onClick={() => vote({ targetType: 'comment', targetId: c.id, value: cmVote === 1 ? 0 : 1 })}
              className="flex items-center gap-1"
              style={{ color: cmVote === 1 ? 'var(--amber)' : 'inherit' }}
            >
              <ChevronUp size={14} /> {c.score}
            </button>
            <button
              onClick={() => vote({ targetType: 'comment', targetId: c.id, value: cmVote === -1 ? 0 : -1 })}
              className="flex items-center gap-1"
              style={{ color: cmVote === -1 ? 'var(--red)' : 'inherit' }}
            >
              <ChevronDown size={14} />
            </button>
            {!post.isLocked && user && (
              <button onClick={() => setReplyParent(c.id)}>Reply</button>
            )}
            {(isAdmin || c.authorId === user?.id) && (
              <button
                onClick={async () => {
                  if (!confirm('Delete this comment?')) return;
                  await deleteComment({ id: c.id });
                }}
                style={{ color: 'var(--red)' }}
              >
                Delete
              </button>
            )}
          </div>
          {renderComments(c.id, depth + 1)}
        </div>
      );
    });
  };

  const submitReply = async () => {
    if (!replyBody.trim() || !user) return;
    await createComment({
      id: uid(),
      postId,
      parentCommentId: replyParent ?? undefined,
      body: replyBody,
      authorName: user.fullName || user.username || 'Anonymous',
      authorImage: user.imageUrl ?? undefined,
      authorTier: tierName,
    });
    setReplyBody('');
    setReplyParent(null);
  };

  const postCat = detailCategories.find((c) => c.id === post.categoryId);

  return (
    /* Two columns, matching the list view's sidebar+content shape so the two
       screens read as one section. Capping the reading column alone fixed the
       alignment but dumped ~570px of empty space down the right of a wide
       screen; the rail turns that into the post's context, which the detail
       view was not showing at all (category, score, comment count, state). */
    <div>
      <button onClick={onBack} className="doclink" style={{ marginTop: 0 }}>
        <ArrowLeft size={14} /> Back to Community
      </button>

      <div
        className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-6 items-start"
        style={{ maxWidth: 1180, marginTop: 14 }}
      >
      <div className="space-y-4">

      <div className="card">
        <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
        {/* The vote control used to be a left rail, which pushed all the post's
            content in by ~56px while the comments card below started at its own
            padding edge — two stacked cards with two different left margins.
            It now sits inline in the action row at the bottom, so the title,
            body and comments all share one edge. */}
        <div>
          <div className="min-w-0">
            <div className="meta" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: 11.5, color: 'var(--muted-2)', marginBottom: 10 }}>
              <span>by <strong style={{ color: 'var(--text)', fontWeight: 700 }}>{post.authorName}</strong></span>
              <TierBadge tier={post.authorTier} />
              <span>·</span>
              <span>{timeAgo(post.createdAt)}</span>
              {post.isPinned && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--amber)' }}><Pin size={11} /> Pinned</span>}
              {post.isLocked && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Lock size={11} /> Locked</span>}
            </div>
            <h3 style={{ marginBottom: 12 }}>{post.title}</h3>
            {/* the 680px cap moved up to the column; the body now fills it */}
            <p className="whitespace-pre-wrap mb-4" style={{ fontSize: 13.5, lineHeight: '20px', color: 'var(--copy)' }}>{post.body}</p>

            {post.images && post.images.length > 0 && (
              post.images.length === 1 ? (
                /* A lone image is the post's subject, not a thumbnail. The
                   shared grid put it in a third-width cell at a fixed h-40 with
                   object-cover, which cropped a wide banner down to a strip and
                   stranded two empty columns beside it. object-contain on a
                   capped height shows the whole thing at the column's width. */
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.images[0]}
                  alt=""
                  className="mb-4"
                  style={{ display: 'block', width: '100%', maxHeight: 420, objectFit: 'contain',
                           background: '#0a0f17', border: '1px solid var(--line)', borderRadius: 2 }}
                />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                  {post.images.map((url: string, i: number) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={url} alt="" className="w-full h-40 object-cover" style={{ border: '1px solid var(--line)', borderRadius: 2 }} />
                  ))}
                </div>
              )
            )}

            {/* Vote + mod actions */}
            <div className="flex items-center gap-2 pt-3 flex-wrap" style={{ borderTop: '1px solid var(--line)' }}>
              <div
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginRight: 6,
                         border: '1px solid var(--line)', borderRadius: 2, padding: '0 8px', height: 28, color: 'var(--muted)' }}
              >
                <button
                  onClick={() => vote({ targetType: 'post', targetId: postId, value: myVote === 1 ? 0 : 1 })}
                  aria-label="Upvote"
                  style={{ display: 'flex', color: myVote === 1 ? 'var(--amber)' : 'inherit' }}
                >
                  <ChevronUp size={15} />
                </button>
                <b style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 13, color: 'var(--text)', minWidth: 14, textAlign: 'center' }}>{post.score}</b>
                <button
                  onClick={() => vote({ targetType: 'post', targetId: postId, value: myVote === -1 ? 0 : -1 })}
                  aria-label="Downvote"
                  style={{ display: 'flex', color: myVote === -1 ? 'var(--red)' : 'inherit' }}
                >
                  <ChevronDown size={15} />
                </button>
              </div>
              {isAdmin && (
                <>
                  <button onClick={() => togglePin({ id: postId })} className="chip">
                    <Pin size={12} /> {post.isPinned ? 'Unpin' : 'Pin'}
                  </button>
                  <button onClick={() => toggleLock({ id: postId })} className="chip">
                    <Lock size={12} /> {post.isLocked ? 'Unlock' : 'Lock'}
                  </button>
                </>
              )}
              {canMod && (
                <button
                  onClick={async () => {
                    if (!confirm('Delete this post and all its comments?')) return;
                    await deletePost({ id: postId });
                    showToast('Post deleted', 'success');
                    onBack();
                  }}
                  className="chip"
                  style={{ color: 'var(--red)' }}
                >
                  <Trash2 size={12} /> Delete
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Comments */}
      <div className="card space-y-4">
        <h4>{post.commentCount} Comments</h4>

        {!post.isLocked && user && replyParent === null && (
          <div className="space-y-2">
            <textarea
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="Write a comment…"
              rows={3}
              style={atlasInput}
            />
            <button
              onClick={submitReply}
              disabled={!replyBody.trim()}
              className="btn-a disabled:opacity-50"
            >
              <Send size={14} /> Comment
            </button>
          </div>
        )}

        {replyParent !== null && (
          <div className="space-y-2 pl-3" style={{ borderLeft: '2px solid var(--amber)' }}>
            <div style={{ fontSize: 11.5, color: 'var(--muted-2)' }}>Replying to comment</div>
            <textarea
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              rows={3}
              style={atlasInput}
            />
            <div className="flex gap-2">
              <button onClick={() => { setReplyParent(null); setReplyBody(''); }} className="btn-g">Cancel</button>
              <button onClick={submitReply} disabled={!replyBody.trim()} className="btn-a disabled:opacity-50">Reply</button>
            </div>
          </div>
        )}

        {post.isLocked && <p style={{ fontSize: 12.5, color: 'var(--muted)', fontStyle: 'italic' }}>This post is locked. New comments are disabled.</p>}

        <div className="space-y-1">
          {renderComments('root', 0)}
        </div>
      </div>
      </div>

      {/* Context rail — everything the detail view knew but never showed */}
      {/* .card, not .listnav: .listnav is the nav-list chrome (16px/18px gutter,
          styles keyed to <a>), so beside the post card's 28px/19px it sat on a
          different internal grid — the two boxes are side by side, and their
          contents started at different insets and 1px off vertically. .card is
          what every other box on this screen uses, and .lbl is its caption. */}
      <aside className="card">
        <p className="lbl">POST DETAILS</p>
        <dl style={{ margin: '14px 0 0', display: 'flex', flexDirection: 'column', gap: 13 }}>
          {postCat && (
            <DetailRow label="Category">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: postCat.color ?? 'var(--amber)', fontWeight: 700 }}>
                <i style={{ width: 7, height: 7, borderRadius: 1, background: postCat.color ?? 'var(--amber)', display: 'inline-block' }} />
                {postCat.name}
              </span>
            </DetailRow>
          )}
          <DetailRow label="Author">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              {post.authorName}
              <TierBadge tier={post.authorTier} />
            </span>
          </DetailRow>
          <DetailRow label="Posted">{new Date(post.createdAt).toLocaleDateString()}</DetailRow>
          <DetailRow label="Score">{post.score}</DetailRow>
          <DetailRow label="Comments">{post.commentCount}</DetailRow>
          {(post.isPinned || post.isLocked) && (
            <DetailRow label="State">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                {post.isPinned && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--amber)' }}><Pin size={11} /> Pinned</span>}
                {post.isLocked && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Lock size={11} /> Locked</span>}
              </span>
            </DetailRow>
          )}
        </dl>
      </aside>
      </div>
    </div>
  );
}

/** One label/value row in the post context rail. */
function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
      <dt style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.04em', color: 'var(--muted-2)', textTransform: 'uppercase', flex: 'none' }}>
        {label}
      </dt>
      <dd style={{ margin: 0, fontSize: 12.5, color: 'var(--text-2)', textAlign: 'right', minWidth: 0 }}>{children}</dd>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
export function AdminCommunity({ onBack }: { onBack?: () => void }) {
  const { showToast } = useToast();
  const categories = useQuery(api.forum.listCategories) ?? [];
  const createCategory = useMutation(api.forum.createCategory);
  const updateCategory = useMutation(api.forum.updateCategory);
  const deleteCategory = useMutation(api.forum.deleteCategory);
  const seedDefaults = useMutation(api.forum.seedDefaultCategories);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#10b981');

  return (
    <div className="space-y-6">
      {onBack && (
        <button onClick={onBack} className="doclink" style={{ marginTop: 0 }}>
          <ArrowLeft size={14} /> Back
        </button>
      )}

      <div className="phead pwrap" style={{ marginBottom: 0 }}>
        <h2>Manage Categories</h2>
        <div className="actions">
          <button
            onClick={async () => {
              const r = await seedDefaults();
              showToast(`Seeded ${r.inserted} default categories`, 'success');
            }}
            className="btn-g"
          >
            Seed default categories
          </button>
        </div>
      </div>

      <div className="card space-y-3">
        <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
        <h4>New Category</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" style={atlasInput} />
          <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="slug" style={atlasInput} />
        </div>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" rows={2} style={atlasInput} />
        <div className="flex items-center gap-2">
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-14" style={{ border: '1px solid var(--line)', borderRadius: 2, background: 'var(--panel-2)' }} />
          <button
            disabled={!name || !slug}
            onClick={async () => {
              await createCategory({
                id: uid(),
                slug, name, description, color,
                order: categories.length,
              });
              setName(''); setSlug(''); setDescription('');
              showToast('Category created', 'success');
            }}
            className="btn-a disabled:opacity-50"
          >
            Add Category
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {categories.map((c: any) => (
          <div key={c.id} className="inset flex items-center gap-3">
            <span style={{ width: 8, height: 8, borderRadius: 1, flex: 'none', background: c.color ?? '#888' }} />
            <div className="flex-1 min-w-0">
              <div className="truncate" style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{c.name}</div>
              <div className="truncate" style={{ fontSize: 11.5, color: 'var(--muted-2)' }}>{c.description}</div>
            </div>
            <button
              onClick={async () => {
                if (!confirm(`Delete category "${c.name}"? Posts will remain but lose category.`)) return;
                await deleteCategory({ id: c.id });
              }}
              className="p-2"
              style={{ color: 'var(--red)' }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
function ImageUploader({ images, onChange }: { images: string[]; onChange: (urls: string[]) => void }) {
  const generateUploadUrl = useMutation(api.forum.generateUploadUrl);
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList) => {
    setBusy(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const uploadUrl = await generateUploadUrl();
        const res = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': file.type }, body: file });
        if (!res.ok) throw new Error('Upload failed');
        const { storageId } = await res.json();
        const r = await fetch('/api/forum/resolve-storage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storageId }),
        });
        const { url } = await r.json();
        uploaded.push(url);
      }
      onChange([...images, ...uploaded]);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Upload failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="field">
      <label style={atlasLabel}>Images (optional)</label>
      <div className="flex flex-wrap gap-2">
        {images.map((url, i) => (
          <div key={i} className="relative group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-20 w-20 object-cover" style={{ border: '1px solid var(--line)', borderRadius: 2 }} />
            <button
              type="button"
              onClick={() => onChange(images.filter((_, j) => j !== i))}
              className="absolute -top-1 -right-1 rounded-full p-0.5 opacity-0 group-hover:opacity-100"
              style={{ background: 'var(--red)', color: 'var(--ink)' }}
            >
              <Trash2 size={10} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="h-20 w-20 flex flex-col items-center justify-center gap-1 disabled:opacity-50"
          style={{ border: '1px dashed var(--line-2)', borderRadius: 2, background: 'var(--panel-2)', fontSize: 11.5, color: 'var(--muted-2)' }}
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {busy ? 'Uploading' : 'Add'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}
