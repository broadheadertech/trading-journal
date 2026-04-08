'use client';

import { useState, useMemo, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import {
  MessagesSquare, ArrowLeft, Plus, Edit2, Trash2, Settings,
  ChevronUp, ChevronDown, Pin, Lock, MessageCircle, Image as ImageIcon,
  Loader2, Upload, Send,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useSubscription } from '@/hooks/useSubscription';
import TierBadge from '@/components/TierBadge';
import BrainMascot from '@/components/BrainMascot';

type View = 'list' | 'detail' | 'admin';
type SortMode = 'hot' | 'new' | 'top';

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

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

  const categories = useQuery(api.forum.listCategories) ?? [];
  const posts = useQuery(api.forum.listPosts, {
    categoryId: activeCategoryId ?? undefined,
    sort,
  }) ?? [];

  const postIds = useMemo(() => posts.map((p: any) => p.id), [posts]);
  const myVotes = useQuery(api.forum.myVotesForPosts, { postIds }) ?? {};
  const vote = useMutation(api.forum.vote);

  if (view === 'detail' && activePostId) {
    return <PostDetail postId={activePostId} onBack={() => { setActivePostId(null); setView('list'); }} />;
  }

  return (
    <div className="relative space-y-10">
      <div className="hero-glow" />

      <header className="flex items-end justify-between flex-wrap gap-4 anim-fade-up">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-medium text-[var(--muted-foreground)]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live discussions
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[var(--foreground)]">
            Join the <span className="gradient-text">conversation</span>
          </h1>
          <p className="text-base text-[var(--muted-foreground)] max-w-xl">
            Discuss trades, share insights, ask questions. Read freely, post when logged in.
          </p>
        </div>
        {user && (
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 text-white text-sm font-semibold shadow-lg shadow-teal-500/30 hover:shadow-teal-500/50 transition-all hover:-translate-y-0.5"
          >
            <Plus size={16} /> New Post
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
        {/* Categories sidebar */}
        <div className="glass rounded-2xl p-3 space-y-1 h-fit anim-fade-up" style={{ animationDelay: '80ms' }}>
          <button
            onClick={() => setActiveCategoryId(null)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
              activeCategoryId === null ? 'bg-[var(--accent)]/15 text-[var(--foreground)] font-medium' : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
            }`}
          >
            All Posts
          </button>
          {categories.map((c: any) => (
            <button
              key={c.id}
              onClick={() => setActiveCategoryId(c.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
                activeCategoryId === c.id ? 'bg-[var(--accent)]/15 text-[var(--foreground)] font-medium' : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
              }`}
            >
              {c.color && <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />}
              {c.name}
            </button>
          ))}
          {categories.length === 0 && (
            <p className="text-xs text-[var(--muted-foreground)] p-2">No categories yet.</p>
          )}
        </div>

        {/* Posts list */}
        <div className="space-y-3">
          <div className="flex items-center gap-1 border-b border-[var(--border)]">
            {(['hot', 'new', 'top'] as SortMode[]).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`px-4 py-2 text-sm font-medium border-b-2 capitalize ${
                  sort === s ? 'border-[var(--accent)] text-[var(--foreground)]' : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {posts.length === 0 ? (
            <div className="relative overflow-hidden rounded-3xl border border-dashed border-[var(--border)] bg-[var(--card)]/40 backdrop-blur p-16 text-center">
              <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500/20 to-teal-600/10 flex items-center justify-center">
                <MessagesSquare size={28} className="text-teal-400" />
              </div>
              <p className="text-[var(--foreground)] font-medium">No posts yet</p>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">Be the first to start the conversation.</p>
            </div>
          ) : (
            posts.map((p: any, idx: number) => {
              const myVote = (myVotes as any)[p.id];
              const cat = categories.find((c: any) => c.id === p.categoryId);
              return (
                <div
                  key={p.id}
                  style={{ animationDelay: `${idx * 40}ms` }}
                  className="glass rounded-2xl p-4 flex gap-3 card-lift anim-fade-up"
                >
                  {/* Vote column */}
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <button
                      onClick={() => vote({ targetType: 'post', targetId: p.id, value: myVote === 1 ? 0 : 1 })}
                      className={`p-1 rounded ${myVote === 1 ? 'text-[var(--accent)]' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}
                    >
                      <ChevronUp size={20} />
                    </button>
                    <span className="text-sm font-bold text-[var(--foreground)]">{p.score}</span>
                    <button
                      onClick={() => vote({ targetType: 'post', targetId: p.id, value: myVote === -1 ? 0 : -1 })}
                      className={`p-1 rounded ${myVote === -1 ? 'text-[var(--red)]' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}
                    >
                      <ChevronDown size={20} />
                    </button>
                  </div>

                  {/* Body */}
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => { setActivePostId(p.id); setView('detail'); }}
                  >
                    <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)] mb-1 flex-wrap">
                      {cat && (
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                          style={{ background: (cat.color ?? 'var(--accent)') + '22', color: cat.color ?? 'var(--accent)' }}
                        >
                          {cat.name}
                        </span>
                      )}
                      <span>by <span className="font-medium text-[var(--foreground)]">{p.authorName}</span></span>
                      <TierBadge tier={p.authorTier} />
                      <span>·</span>
                      <span>{timeAgo(p.createdAt)}</span>
                      {p.isPinned && <span className="flex items-center gap-1 text-amber-500"><Pin size={11} /> Pinned</span>}
                      {p.isLocked && <span className="flex items-center gap-1 text-[var(--muted-foreground)]"><Lock size={11} /> Locked</span>}
                    </div>
                    <h3 className="font-bold text-[var(--foreground)] mb-1">{p.title}</h3>
                    <p className="text-sm text-[var(--muted-foreground)] line-clamp-2">{p.body}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-[var(--muted-foreground)]">
                      <span className="flex items-center gap-1"><MessageCircle size={12} /> {p.commentCount} comments</span>
                      {p.images && p.images.length > 0 && (
                        <span className="flex items-center gap-1"><ImageIcon size={12} /> {p.images.length}</span>
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
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-[var(--foreground)]">New Post</h2>

        <div>
          <div className="text-xs font-medium text-[var(--muted-foreground)] mb-1">Category</div>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm"
          >
            <option value="">Select category…</option>
            {categories.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="text-xs font-medium text-[var(--muted-foreground)] mb-1">Title</div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm"
          />
        </div>

        <div>
          <div className="text-xs font-medium text-[var(--muted-foreground)] mb-1">Body</div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm"
          />
        </div>

        <ImageUploader images={images} onChange={setImages} />

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 py-2 border border-[var(--border)] rounded-xl text-sm">Cancel</button>
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
            className="flex-1 py-2 bg-[var(--accent)] text-white rounded-xl text-sm font-medium disabled:opacity-50"
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

  if (!post) return (
    <div className="flex items-center justify-center py-20">
      <BrainMascot size={48} glow beat />
    </div>
  );

  const myVote = (myPostVotes as any)[postId];
  const canMod = isAdmin || post.authorId === user?.id;

  // Build comment tree
  const tree = useMemo(() => {
    const byParent: Record<string, any[]> = {};
    for (const c of comments) {
      const k = c.parentCommentId ?? 'root';
      (byParent[k] ??= []).push(c);
    }
    return byParent;
  }, [comments]);

  const renderComments = (parentId: string, depth: number): React.ReactNode => {
    const list = tree[parentId] ?? [];
    return list.map((c: any) => {
      const cmVote = (myCommentVotes as any)[c.id];
      return (
        <div key={c.id} style={{ marginLeft: depth * 16 }} className="border-l border-[var(--border)] pl-3 py-2">
          <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)] mb-1">
            <span className="font-medium text-[var(--foreground)]">{c.authorName}</span>
            <TierBadge tier={c.authorTier} />
            <span>·</span>
            <span>{timeAgo(c.createdAt)}</span>
          </div>
          <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap mb-2">{c.body}</p>
          <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
            <button
              onClick={() => vote({ targetType: 'comment', targetId: c.id, value: cmVote === 1 ? 0 : 1 })}
              className={`flex items-center gap-1 ${cmVote === 1 ? 'text-[var(--accent)]' : 'hover:text-[var(--foreground)]'}`}
            >
              <ChevronUp size={14} /> {c.score}
            </button>
            <button
              onClick={() => vote({ targetType: 'comment', targetId: c.id, value: cmVote === -1 ? 0 : -1 })}
              className={`flex items-center gap-1 ${cmVote === -1 ? 'text-[var(--red)]' : 'hover:text-[var(--foreground)]'}`}
            >
              <ChevronDown size={14} />
            </button>
            {!post.isLocked && user && (
              <button onClick={() => setReplyParent(c.id)} className="hover:text-[var(--foreground)]">Reply</button>
            )}
            {(isAdmin || c.authorId === user?.id) && (
              <button
                onClick={async () => {
                  if (!confirm('Delete this comment?')) return;
                  await deleteComment({ id: c.id });
                }}
                className="text-[var(--red)] hover:opacity-80"
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

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
        <ArrowLeft size={16} /> Back to Community
      </button>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="flex flex-col items-center gap-1 shrink-0">
            <button
              onClick={() => vote({ targetType: 'post', targetId: postId, value: myVote === 1 ? 0 : 1 })}
              className={`p-1 ${myVote === 1 ? 'text-[var(--accent)]' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}
            >
              <ChevronUp size={22} />
            </button>
            <span className="text-base font-bold text-[var(--foreground)]">{post.score}</span>
            <button
              onClick={() => vote({ targetType: 'post', targetId: postId, value: myVote === -1 ? 0 : -1 })}
              className={`p-1 ${myVote === -1 ? 'text-[var(--red)]' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}
            >
              <ChevronDown size={22} />
            </button>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)] mb-2 flex-wrap">
              <span>by <span className="font-medium text-[var(--foreground)]">{post.authorName}</span></span>
              <TierBadge tier={post.authorTier} />
              <span>·</span>
              <span>{timeAgo(post.createdAt)}</span>
              {post.isPinned && <span className="flex items-center gap-1 text-amber-500"><Pin size={11} /> Pinned</span>}
              {post.isLocked && <span className="flex items-center gap-1"><Lock size={11} /> Locked</span>}
            </div>
            <h1 className="text-2xl font-bold text-[var(--foreground)] mb-3">{post.title}</h1>
            <p className="text-[var(--foreground)] whitespace-pre-wrap mb-4">{post.body}</p>

            {post.images && post.images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                {post.images.map((url: string, i: number) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={url} alt="" className="w-full h-40 object-cover rounded-lg border border-[var(--border)]" />
                ))}
              </div>
            )}

            {/* Mod actions */}
            <div className="flex items-center gap-2 pt-3 border-t border-[var(--border)]">
              {isAdmin && (
                <>
                  <button onClick={() => togglePin({ id: postId })} className="text-xs px-3 py-1 rounded-lg border border-[var(--border)] flex items-center gap-1">
                    <Pin size={12} /> {post.isPinned ? 'Unpin' : 'Pin'}
                  </button>
                  <button onClick={() => toggleLock({ id: postId })} className="text-xs px-3 py-1 rounded-lg border border-[var(--border)] flex items-center gap-1">
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
                  className="text-xs px-3 py-1 rounded-lg border border-[var(--border)] text-[var(--red)] flex items-center gap-1"
                >
                  <Trash2 size={12} /> Delete
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Comments */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
        <h2 className="font-bold text-[var(--foreground)]">{post.commentCount} Comments</h2>

        {!post.isLocked && user && replyParent === null && (
          <div className="space-y-2">
            <textarea
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="Write a comment…"
              rows={3}
              className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm"
            />
            <button
              onClick={submitReply}
              disabled={!replyBody.trim()}
              className="px-4 py-2 bg-[var(--accent)] text-white rounded-xl text-sm font-medium flex items-center gap-2 disabled:opacity-50"
            >
              <Send size={14} /> Comment
            </button>
          </div>
        )}

        {replyParent !== null && (
          <div className="space-y-2 border-l-2 border-[var(--accent)] pl-3">
            <div className="text-xs text-[var(--muted-foreground)]">Replying to comment</div>
            <textarea
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm"
            />
            <div className="flex gap-2">
              <button onClick={() => { setReplyParent(null); setReplyBody(''); }} className="px-3 py-1.5 border border-[var(--border)] rounded-lg text-sm">Cancel</button>
              <button onClick={submitReply} disabled={!replyBody.trim()} className="px-4 py-1.5 bg-[var(--accent)] text-white rounded-lg text-sm disabled:opacity-50">Reply</button>
            </div>
          </div>
        )}

        {post.isLocked && <p className="text-sm text-[var(--muted-foreground)] italic">This post is locked. New comments are disabled.</p>}

        <div className="space-y-1">
          {renderComments('root', 0)}
        </div>
      </div>
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
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
          <ArrowLeft size={16} /> Back
        </button>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Manage Categories</h1>
        <button
          onClick={async () => {
            const r = await seedDefaults();
            showToast(`Seeded ${r.inserted} default categories`, 'success');
          }}
          className="px-4 py-2 border border-[var(--border)] rounded-xl text-sm"
        >
          Seed default categories
        </button>
      </div>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 space-y-3">
        <h2 className="font-semibold text-[var(--foreground)]">New Category</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm" />
          <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="slug" className="px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm" />
        </div>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" rows={2} className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm" />
        <div className="flex items-center gap-2">
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-14 rounded border border-[var(--border)]" />
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
            className="px-4 py-2 bg-[var(--accent)] text-white rounded-xl text-sm font-medium disabled:opacity-50"
          >
            Add Category
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {categories.map((c: any) => (
          <div key={c.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 flex items-center gap-3">
            <span className="w-3 h-3 rounded-full" style={{ background: c.color ?? '#888' }} />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[var(--foreground)] truncate">{c.name}</div>
              <div className="text-xs text-[var(--muted-foreground)] truncate">{c.description}</div>
            </div>
            <button
              onClick={async () => {
                if (!confirm(`Delete category "${c.name}"? Posts will remain but lose category.`)) return;
                await deleteCategory({ id: c.id });
              }}
              className="p-2 rounded-lg text-[var(--red)] hover:bg-[var(--red)]/10"
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
    <div>
      <div className="text-xs font-medium text-[var(--muted-foreground)] mb-1">Images (optional)</div>
      <div className="flex flex-wrap gap-2">
        {images.map((url, i) => (
          <div key={i} className="relative group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-20 w-20 rounded-lg object-cover border border-[var(--border)]" />
            <button
              type="button"
              onClick={() => onChange(images.filter((_, j) => j !== i))}
              className="absolute -top-1 -right-1 bg-[var(--red)] text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100"
            >
              <Trash2 size={10} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="h-20 w-20 flex flex-col items-center justify-center gap-1 border border-dashed border-[var(--border)] rounded-lg text-xs text-[var(--muted-foreground)] hover:bg-[var(--muted)] disabled:opacity-50"
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
