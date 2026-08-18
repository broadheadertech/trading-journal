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

  const disabled = busy || summary === undefined || !isSignedIn;

  return (
    <div style={{ borderTop: '1px solid var(--line)' }}>
      <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={onLike}
          disabled={disabled}
          title={isSignedIn ? (liked ? 'Unlike' : 'Like') : 'Sign in to like'}
          aria-pressed={liked}
          className={liked ? 'chip on' : 'chip'}
          style={{ gap: 7, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1 }}
        >
          <Heart size={13} style={liked ? { fill: 'currentColor' } : undefined} />
          <span style={{ fontFamily: 'var(--mono)', fontWeight: 500 }}>{likeCount}</span>
        </button>
        <button
          onClick={() => setOpen(o => !o)}
          title={open ? 'Hide comments' : 'Show comments'}
          aria-expanded={open}
          className="chip"
          style={{
            gap: 7,
            cursor: 'pointer',
            ...(open ? { borderColor: 'var(--line-2)', color: 'var(--text)' } : {}),
          }}
        >
          <MessageCircle size={13} />
          <span style={{ fontFamily: 'var(--mono)', fontWeight: 500 }}>{commentCount}</span>
          <span style={{ color: 'var(--muted-2)' }}>{commentCount === 1 ? 'comment' : 'comments'}</span>
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
    <div style={{ padding: '4px 20px 16px', background: 'var(--panel-2)', borderTop: '1px solid var(--line)' }}>
      {comments === undefined ? (
        <div style={{ padding: '16px 0', textAlign: 'center' }}>
          <Loader2 size={14} className="animate-spin inline" style={{ color: 'var(--amber)' }} />
        </div>
      ) : comments.length === 0 ? (
        <p style={{ margin: 0, padding: '14px 0', fontSize: 12, color: 'var(--muted-2)' }}>
          No comments yet. Start the conversation.
        </p>
      ) : (
        <div style={{ paddingTop: 8 }}>
          {comments.map(c => (
            <div
              key={c._id}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--line)' }}
            >
              <span
                style={{
                  width: 26,
                  height: 26,
                  flex: 'none',
                  marginTop: 1,
                  borderRadius: 3,
                  background: '#0f1620',
                  border: '1px solid var(--amber)',
                  color: 'var(--amber)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {c.authorImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.authorImage} alt={c.authorName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 11 }}>
                    {c.authorName.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 12, color: 'var(--text)' }}>
                    {c.authorName}
                  </span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--muted-2)' }}>
                    {timeAgo(c.createdAt)}
                  </span>
                </div>
                <p style={{ margin: '5px 0 0', fontSize: 12.5, lineHeight: '19px', color: 'var(--muted)', wordBreak: 'break-word' }}>
                  {c.body}
                </p>
              </div>
              {c.isMine && (
                <button
                  onClick={() => deleteComment({ commentId: c._id })}
                  className="hover:text-[var(--red)]"
                  style={{ flex: 'none', color: 'var(--muted-3)', cursor: 'pointer' }}
                  title="Delete comment"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {canInteract ? (
        <form onSubmit={submit} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            maxLength={500}
            placeholder="Add a comment…"
            style={{
              flex: 1,
              minWidth: 0,
              height: 34,
              padding: '0 12px',
              border: '1px solid var(--line)',
              borderRadius: 2,
              background: 'var(--panel)',
              color: 'var(--text)',
              fontSize: 12.5,
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={busy || !text.trim()}
            title="Post comment"
            style={{
              flex: 'none',
              width: 34,
              height: 34,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 2,
              background: 'var(--amber)',
              color: 'var(--ink)',
              opacity: busy || !text.trim() ? 0.4 : 1,
              cursor: busy || !text.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          </button>
        </form>
      ) : (
        <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--muted-2)' }}>
          <a href="/sign-in" style={{ color: 'var(--amber)', fontWeight: 700 }}>Sign in</a> to join the conversation.
        </p>
      )}
    </div>
  );
}
