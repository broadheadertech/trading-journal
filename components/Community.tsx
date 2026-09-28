'use client';

import { useState, useMemo, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
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

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function Community() {
  const { user } = useUser();
  const [view, setView] = useState<View>('list');
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [sort, setSort] = useState<SortMode>('hot');
  const [showNew, setShowNew] = useState(false);
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
  const myVotes = useQuery(api.forum.myVotesForPosts, { postIds }) ?? {};
  const vote = useMutation(api.forum.vote);

  if (view === 'detail' && activePostId) {
    return <PostDetail postId={activePostId} onBack={() => { setActivePostId(null); setView('list'); }} />;
  }

  return (
    <div>
      <div className="phead pwrap">
        <p className="eyebrow">Live discussions</p>
        <h2>Join the conversation</h2>
        <p className="sub">
          Discuss trades, share insights, ask questions. Read freely, post when logged in.
        </p>
        {user && (
          <div className="actions" style={{ top: 34 }}>
            <button onClick={() => setShowNew(true)} className="btn-a" style={{ height: 44 }}>
              <Plus size={14} /> New Post
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
        {/* Categories sidebar */}
        <div className="listnav">
          {/* Search across the loaded posts. .listnav .search has been styled in
              atlas-dashboard.css all along with no input wired to it, so the
              forum had no way to find an old thread. Client-side over the same
              rows the list already holds — no extra query. */}
          <label className="search" style={{ cursor: 'text' }}>
            <MagnifyingGlass size={14} style={{ flex: 'none' }} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search posts…"
              aria-label="Search posts"
              style={{ flex: 1, minWidth: 0, background: 'none', border: 0, outline: 'none', font: 'inherit', color: 'var(--text)', padding: 0 }}
            />
            {query && (
              <button onClick={() => setQuery('')} aria-label="Clear search" style={{ background: 'none', cursor: 'pointer', color: 'var(--muted-2)', display: 'flex' }}>
                <X size={12} />
              </button>
            )}
          </label>

          <h6>CATEGORIES</h6>
          <a
            onClick={() => setActiveCategoryId(null)}
            className={activeCategoryId === null ? 'on' : undefined}
            style={{ cursor: 'pointer' }}
          >
            All Posts
            <em>{postsLoading ? '' : allPosts.length}</em>
          </a>
          {categories.map((c: any) => (
            <a
              key={c.id}
              onClick={() => setActiveCategoryId(c.id)}
              className={activeCategoryId === c.id ? 'on' : undefined}
              style={{ cursor: 'pointer' }}
              /* each category carries a description that was never rendered
                 anywhere; as a tooltip it costs no layout */
              title={c.description || undefined}
            >
              {c.color && <i style={{ background: c.color }} />}
              {c.name}
              {/* how busy each category is, before clicking into it */}
              <em>{postsLoading ? '' : (countByCategory.get(c.id) ?? 0)}</em>
            </a>
          ))}
          {categoriesResult !== undefined && categories.length === 0 && (
            <p style={{ margin: '4px 14px', fontSize: 12, color: 'var(--muted-2)' }}>No categories yet.</p>
          )}
        </div>

        {/* Posts list */}
        <div>
          <div className="tabs line" style={{ marginBottom: 20 }}>
            {(['hot', 'new', 'top'] as SortMode[]).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={sort === s ? 'on' : undefined}
                style={{ textTransform: 'capitalize' }}
              >
                {s}
              </button>
            ))}

            {/* Which slice of the forum is on screen. The sidebar highlights the
                active category, but the list itself gave no confirmation that it
                had been filtered — so a quiet category looked like a quiet forum. */}
            <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 10, fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--muted-2)' }}>
              {postsLoading
                ? 'loading…'
                : `${posts.length} post${posts.length === 1 ? '' : 's'}${activeCategory ? ' in ' + activeCategory.name : ''}`}
              {activeCategory && !postsLoading && (
                <button
                  onClick={() => setActiveCategoryId(null)}
                  style={{ background: 'none', cursor: 'pointer', color: 'var(--amber)', fontWeight: 700 }}
                >
                  Clear
                </button>
              )}
            </span>
          </div>

          {postsLoading ? (
            <div className="blank" style={{ minHeight: 300, color: 'var(--amber)' }}>
              <Loader2 size={22} className="animate-spin" />
            </div>
          ) : posts.length === 0 ? (
            <div className="blank" style={{ minHeight: 300 }}>
              <span className="corner" style={{ left: 0, top: 0, borderRight: 0, borderBottom: 0 }} />
              <span className="corner" style={{ right: 0, top: 0, borderLeft: 0, borderBottom: 0 }} />
              <span className="corner" style={{ left: 0, bottom: 0, borderRight: 0, borderTop: 0 }} />
              <span className="corner" style={{ right: 0, bottom: 0, borderLeft: 0, borderTop: 0 }} />
              <span className="badge" style={{ border: '1px solid rgba(217,148,5,.5)' }}>
                <MessagesSquare size={24} style={{ color: 'var(--amber)' }} />
              </span>
              {/* an empty category is not an empty forum, and telling someone to
                  "be the first" when they have simply filtered themselves into a
                  quiet corner sends them to the wrong conclusion */}
              {/* Three different reasons the list can be empty, and they call for
                  three different messages. Telling someone whose search missed
                  to "be the first to start the conversation" is the same mistake
                  as telling it to someone who just filtered into a quiet
                  category — the forum is not empty, their view is. */}
              {query.trim() ? (
                <>
                  <h4>No posts match “{query.trim()}”</h4>
                  <p>
                    <button
                      onClick={() => setQuery('')}
                      style={{ background: 'none', cursor: 'pointer', color: 'var(--amber)', fontWeight: 700, textDecoration: 'underline' }}
                    >
                      Clear search
                    </button>
                  </p>
                </>
              ) : activeCategory ? (
                <>
                  <h4>No posts in {activeCategory.name} yet</h4>
                  <p>
                    <button
                      onClick={() => setActiveCategoryId(null)}
                      style={{ background: 'none', cursor: 'pointer', color: 'var(--amber)', fontWeight: 700, textDecoration: 'underline' }}
                    >
                      View all posts
                    </button>
                  </p>
                </>
              ) : (
                <>
                  <h4>No posts yet</h4>
                  <p>Be the first to start the conversation.</p>
                </>
              )}
            </div>
          ) : (
            posts.map((p: any) => {
              const myVote = (myVotes as any)[p.id];
              const cat = categories.find((c: any) => c.id === p.categoryId);
              return (
                <div
                  key={p.id}
                  className="post"
                  /* height/padding used to be overridden here because .post
                     hardcoded a 104px row; the stylesheet now sizes to content,
                     so only the per-category rail colour stays inline */
                  style={{ borderLeftColor: cat?.color ?? 'var(--amber)' }}
                >
                  {/* Vote column */}
                  <div className="vote">
                    <button
                      onClick={() => vote({ targetType: 'post', targetId: p.id, value: myVote === 1 ? 0 : 1 })}
                      style={{ display: 'flex', color: myVote === 1 ? 'var(--amber)' : 'inherit' }}
                    >
                      <ChevronUp size={16} />
                    </button>
                    <b>{p.score}</b>
                    <button
                      onClick={() => vote({ targetType: 'post', targetId: p.id, value: myVote === -1 ? 0 : -1 })}
                      style={{ display: 'flex', color: myVote === -1 ? 'var(--red)' : 'inherit' }}
                    >
                      <ChevronDown size={16} />
                    </button>
                  </div>

                  {/* Body */}
                  <div
                    style={{ minWidth: 0, cursor: 'pointer' }}
                    onClick={() => { setActivePostId(p.id); setView('detail'); }}
                  >
                    {/* Category sits on its own line as a colour dot + name.
                        It used to lead the meta row as a pill pinned to a
                        104px min-width — that width existed purely so "by
                        <author>" would start at the same x on every row, i.e.
                        a fixed gap was paying for alignment. Lifting it out
                        removes both the gap and the alignment problem, and
                        lets the title become the first thing read. */}
                    <div className="toprow">
                      {cat && (
                        <span className="cat" style={{ color: cat.color ?? 'var(--amber)' }}>
                          <i style={{ background: cat.color ?? 'var(--amber)' }} />
                          {cat.name}
                        </span>
                      )}
                      {p.isPinned && <span className="flag on"><Pin size={10} /> Pinned</span>}
                      {p.isLocked && <span className="flag"><Lock size={10} /> Locked</span>}
                    </div>

                    <h5>{p.title}</h5>
                    <p className="body line-clamp-2">{p.body}</p>

                    {/* Author and engagement collapsed into one line — they were
                        two rows saying very little, which is what made every
                        card tall and mostly empty. */}
                    <div className="foot">
                      <span className="who">
                        {p.authorName}
                        <TierBadge tier={p.authorTier} />
                      </span>
                      <span>{timeAgo(p.createdAt)}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <MessageCircle size={12} /> {p.commentCount}
                      </span>
                      {p.images && p.images.length > 0 && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <ImageIcon size={12} /> {p.images.length}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {showNew && user && (
        <NewPostModal
          categories={categories}
          defaultCategoryId={activeCategoryId ?? categories[0]?.id}
          onClose={() => setShowNew(false)}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
function NewPostModal({
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
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="card max-w-2xl w-full space-y-4 max-h-[90vh] overflow-y-auto">
        <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
        <h3>New Post</h3>

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
          <p className="whitespace-pre-wrap mb-2" style={{ fontSize: 13, lineHeight: '19px', color: '#c0ccda' }}>{c.body}</p>
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
            <p className="whitespace-pre-wrap mb-4" style={{ fontSize: 13.5, lineHeight: '20px', color: '#c0ccda' }}>{post.body}</p>

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
