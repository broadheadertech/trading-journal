'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { useUser } from '@clerk/nextjs';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Heart, MessageCircle, Loader2, Send, Trash2 } from 'lucide-react';

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d`;
  return new Date(iso).toLocaleDateString();
}

export default function SignalSocialBar({ signalId }: { signalId: Id<'signals'> }) {
  const { isSignedIn } = useUser();
  const summary = useQuery(api.signalSocial.getSignalSummary, { signalId });
  const toggleLike = useMutation(api.signalSocial.toggleLike);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const liked = summary?.likedByMe ?? false;
  const likeCount = summary?.likeCount ?? 0;
  const commentCount = summary?.commentCount ?? 0;

  const onLike = async () => {
    if (!isSignedIn || busy) return;
    setBusy(true);
    try {
      await toggleLike({ signalId });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-t border-[var(--border)]">
      <div className="px-5 py-2 flex items-center gap-1">
        <button
          onClick={onLike}
          disabled={busy || summary === undefined || !isSignedIn}
          title={isSignedIn ? (liked ? 'Unlike' : 'Like') : 'Sign in to like'}
          aria-pressed={liked}
          className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-colors disabled:cursor-not-allowed ${
            liked
              ? 'text-pink-400 hover:bg-pink-500/10'
              : 'text-[var(--muted-foreground)] hover:text-pink-300 hover:bg-[var(--muted)]/30 disabled:hover:bg-transparent disabled:hover:text-[var(--muted-foreground)]'
          }`}
        >
          <Heart size={14} className={liked ? 'fill-pink-400' : ''} />
          <span className="tabular-nums">{likeCount}</span>
        </button>
        <button
          onClick={() => setOpen(o => !o)}
          title={open ? 'Hide comments' : 'Show comments'}
          aria-expanded={open}
          className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-colors hover:bg-[var(--muted)]/30 ${
            open ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          <MessageCircle size={14} />
          <span className="tabular-nums">{commentCount}</span>
          <span className="hidden sm:inline text-[var(--muted-foreground)]">{commentCount === 1 ? 'comment' : 'comments'}</span>
        </button>
      </div>
      {open && <CommentsPanel signalId={signalId} canInteract={!!isSignedIn} />}
    </div>
  );
}

function CommentsPanel({ signalId, canInteract }: { signalId: Id<'signals'>; canInteract: boolean }) {
  const comments = useQuery(api.signalSocial.listComments, { signalId });
  const addComment = useMutation(api.signalSocial.addComment);
  const deleteComment = useMutation(api.signalSocial.deleteComment);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    try {
      await addComment({ signalId, body });
      setText('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-5 pb-3 space-y-2 bg-black/10">
      {comments === undefined ? (
        <div className="py-3 text-center"><Loader2 size={14} className="animate-spin inline text-pink-400" /></div>
      ) : comments.length === 0 ? (
        <p className="text-[11px] text-[var(--muted-foreground)] py-2">No comments yet. Start the conversation.</p>
      ) : (
        comments.map(c => (
          <div key={c._id} className="flex items-start gap-2 py-1.5">
            {c.authorImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.authorImage} alt={c.authorName} className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5">
                {c.authorName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-[11px]">
                <span className="font-semibold text-[var(--foreground)]">{c.authorName}</span>
                <span className="text-[var(--muted-foreground)] ml-1.5">{timeAgo(c.createdAt)}</span>
              </div>
              <p className="text-xs text-[var(--foreground)]/90 leading-relaxed break-words">{c.body}</p>
            </div>
            {c.isMine && (
              <button
                onClick={() => deleteComment({ commentId: c._id })}
                className="text-[var(--muted-foreground)] hover:text-red-400 shrink-0"
                title="Delete comment"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))
      )}
      {canInteract ? (
        <form onSubmit={submit} className="flex items-center gap-2 pt-1">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            maxLength={500}
            placeholder="Add a comment…"
            className="flex-1 min-w-0 rounded-lg border border-[var(--border)] bg-black/20 px-2.5 py-1.5 text-xs outline-none focus:border-pink-500/40 placeholder:text-[var(--muted-foreground)]/60"
          />
          <button
            type="submit"
            disabled={busy || !text.trim()}
            title="Post comment"
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-r from-pink-400 to-fuchsia-400 text-slate-900 disabled:opacity-40 shrink-0"
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          </button>
        </form>
      ) : (
        <p className="text-[11px] text-[var(--muted-foreground)] pt-1">
          <a href="/sign-in" className="text-pink-300 hover:underline font-medium">Sign in</a> to join the conversation.
        </p>
      )}
    </div>
  );
}
