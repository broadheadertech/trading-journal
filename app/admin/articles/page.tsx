'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useUser } from '@clerk/nextjs';
import { useToast } from '@/components/ui/Toast';
import { Plus, PencilSimple, Trash, Eye, FileText, CheckCircle, Clock, XCircle, BookOpen, PaperPlaneTilt, EnvelopeSimple } from '@phosphor-icons/react';

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const STATUS_FILTERS = ['all', 'draft', 'in_review', 'published', 'archived'] as const;
const CATEGORIES = ['Strategy', 'Psychology', 'Market Analysis', 'Education', 'News'];
const ACCESS_TIERS: Array<'public' | 'subscribers' | 'paid'> = ['public', 'subscribers', 'paid'];

// shared ATLAS chrome (markup-level styling only)
const inputBox: React.CSSProperties = {
  width: '100%', minHeight: 42, padding: '11px 14px', borderRadius: 2,
  border: '1px solid var(--line)', background: 'var(--panel-2)',
  fontSize: 13, color: 'var(--text)', outline: 'none',
};
const iconBtn = (color: string): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 30, height: 30, borderRadius: 2,
  border: '1px solid var(--line)', background: 'var(--panel-2)', color,
});

export default function AdminArticlesPage() {
  const { showToast } = useToast();
  const [filter, setFilter] = useState<typeof STATUS_FILTERS[number]>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const articles = useQuery(
    api.articles.adminListAll,
    filter === 'all' ? {} : { status: filter as any }
  ) ?? [];
  const analytics = useQuery(api.articles.adminAnalytics);
  const subscribers = useQuery(api.newsletter.adminList) ?? [];
  const removeSubscriber = useMutation(api.newsletter.adminRemove);
  const deleteArticle = useMutation(api.articles.deleteArticle);
  const approveArticle = useMutation(api.articles.approveAndPublish);
  const rejectArticle = useMutation(api.articles.rejectArticle);

  const editing = articles.find((a: any) => a.id === editingId);

  if (creating) return <ArticleEditor onBack={() => setCreating(false)} />;
  if (editing) return <ArticleEditor article={editing} onBack={() => setEditingId(null)} />;

  const STATUS_META: Record<string, { label: string; color: string; icon: any }> = {
    draft:       { label: 'Draft',     color: 'var(--muted-2)', icon: FileText },
    in_review:   { label: 'In Review', color: 'var(--amber)',   icon: Clock },
    published:   { label: 'Published', color: 'var(--green)',   icon: CheckCircle },
    archived:    { label: 'Archived',  color: 'var(--muted-3)', icon: XCircle },
  };

  return (
    <div>
      <div className="phead pwrap">
        <p className="eyebrow"><BookOpen size={13} style={{ color: 'var(--amber)' }} /> Content</p>
        <h2>Manage Articles</h2>
        <p className="sub">Draft, review, publish and archive editorial content.</p>
        <div className="actions">
          <button onClick={() => setCreating(true)} className="btn-a">
            <Plus size={14} /> New Article
          </button>
        </div>
      </div>

      {/* Analytics dashboard */}
      {analytics && (
        <div className="stats" style={{ marginTop: 0 }}>
          <Stat label="Articles"         value={analytics.totalArticles} icon={BookOpen} accent="var(--amber)" />
          <Stat label="Published"        value={analytics.published}     icon={CheckCircle} accent="var(--green)" />
          <Stat label="Total views"      value={analytics.totalViews}    icon={Eye} accent="var(--teal)" />
          <Stat label="Newsletter subs"  value={analytics.newsletterConfirmed} icon={EnvelopeSimple} accent="var(--pink)" />
        </div>
      )}

      {/* Top articles */}
      {analytics && analytics.top.length > 0 && (
        <div className="card" style={{ marginTop: 24 }}>
          <span className="accent" style={{ width: 56, background: 'var(--teal)' }} />
          <h3>Top Articles by Views</h3>
          <p className="sub">Ranked by lifetime reads</p>
          <div style={{ marginTop: 18 }}>
            {analytics.top.map((t: any) => (
              <div key={t.id} className="mrow">
                <Eye size={14} className="ic" />
                <span className="lb truncate">{t.title}</span>
                <span className="val">{t.viewCount}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status filter */}
      <div className="tabs line" style={{ marginTop: 32, marginBottom: 24 }}>
        {STATUS_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={filter === f ? 'on' : ''}
          >
            {f.replace('_', ' ').toUpperCase()}
          </button>
        ))}
      </div>

      {/* Articles list */}
      <div>
        {articles.length === 0 ? (
          <div className="blank">
            <span className="corner" style={{ left: -1, top: -1, borderRight: 0, borderBottom: 0 }} />
            <span className="corner" style={{ right: -1, bottom: -1, borderLeft: 0, borderTop: 0 }} />
            <div className="badge" style={{ border: '1px solid rgba(217,148,5,.4)', background: 'var(--panel-2)' }}>
              <BookOpen size={22} style={{ color: 'var(--amber)' }} />
            </div>
            <h4>No articles found</h4>
            <p>Nothing matches this status filter yet.</p>
          </div>
        ) : (
          articles.map((a: any) => {
            const meta = STATUS_META[a.status];
            const Icon = meta.icon;
            return (
              <div key={a.id} className="card flex items-start gap-4" style={{ marginBottom: 12 }}>
                <span className="accent" style={{ width: 56, background: meta.color }} />
                <div
                  className="flex items-center justify-center shrink-0"
                  style={{ width: 40, height: 40, borderRadius: 3, border: '1px solid var(--line)', background: 'var(--panel-2)' }}
                >
                  <BookOpen size={16} style={{ color: 'var(--amber)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="chip" style={{ height: 20, padding: '0 10px', fontSize: 9.5, fontWeight: 700, letterSpacing: '.04em', color: meta.color, borderColor: 'var(--line-2)' }}>
                      <Icon size={10} /> {meta.label.toUpperCase()}
                    </span>
                    <span style={{ fontSize: 10.5, color: 'var(--muted-2)' }}>{a.category} · {a.accessTier}</span>
                  </div>
                  <div style={{ marginTop: 8, fontFamily: 'var(--display)', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{a.title}</div>
                  <div className="line-clamp-1" style={{ marginTop: 4, fontSize: 12.5, color: 'var(--muted)' }}>{a.excerpt}</div>
                  <div className="flex items-center gap-3" style={{ marginTop: 8, fontSize: 10.5, color: 'var(--muted-2)' }}>
                    <span>by {a.authorName}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><Eye size={10} /> {a.viewCount}</span>
                  </div>
                  {a.reviewNotes && (
                    <div className="note" style={{ marginTop: 12, color: 'var(--amber)' }}>Review: {a.reviewNotes}</div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {a.status === 'in_review' && (
                    <>
                      <button
                        onClick={async () => {
                          await approveArticle({ id: a.id });
                          showToast('Published', 'success');
                        }}
                        style={iconBtn('var(--green)')}
                        title="Approve & publish"
                      >
                        <CheckCircle size={14} />
                      </button>
                      <button
                        onClick={async () => {
                          const reason = prompt('Rejection reason / notes:');
                          if (!reason) return;
                          await rejectArticle({ id: a.id, notes: reason });
                          showToast('Sent back to draft', 'success');
                        }}
                        style={iconBtn('var(--amber)')}
                        title="Reject"
                      >
                        <XCircle size={14} />
                      </button>
                    </>
                  )}
                  <button onClick={() => setEditingId(a.id)} style={iconBtn('var(--text-2)')} title="Edit"><PencilSimple size={14} /></button>
                  <button
                    onClick={async () => {
                      if (!confirm(`Delete "${a.title}"?`)) return;
                      await deleteArticle({ id: a.id });
                      showToast('Deleted', 'success');
                    }}
                    style={iconBtn('var(--red)')}
                    title="Delete"
                  >
                    <Trash size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Newsletter subscribers section */}
      <section className="card" style={{ marginTop: 24 }}>
        <span className="accent" style={{ width: 56, background: 'var(--pink)' }} />
        <div className="cardhead">
          <div>
            <h3>Newsletter</h3>
            <p className="sub">Confirmed and pending subscribers</p>
          </div>
          <span className="chip" style={{ marginLeft: 'auto', height: 26, padding: '0 10px', fontSize: 11 }}>
            {subscribers.length}
          </span>
        </div>
        {subscribers.length === 0 ? (
          <p className="empty-line" style={{ padding: '34px 0 8px' }}>No subscribers yet.</p>
        ) : (
          <div className="max-h-80 overflow-y-auto" style={{ marginTop: 18 }}>
            {subscribers.map((s: any) => (
              <div key={s._id} className="mrow">
                <EnvelopeSimple size={14} className="ic" style={{ color: 'var(--pink)' }} />
                <span className="lb truncate flex-1">{s.email}</span>
                <span className="chip" style={{ height: 20, padding: '0 10px', fontSize: 9, fontWeight: 700, letterSpacing: '.04em', marginLeft: 12 }}>
                  {String(s.status).toUpperCase()}
                </span>
                <button
                  onClick={async () => {
                    if (!confirm(`Remove ${s.email}?`)) return;
                    await removeSubscriber({ email: s.email });
                  }}
                  style={{ ...iconBtn('var(--red)'), marginLeft: 8 }}
                  title="Remove"
                >
                  <Trash size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, icon: Icon, accent }: { label: string; value: number; icon: any; accent?: string }) {
  return (
    <div className="stat">
      <span className="accent" style={{ background: accent ?? 'var(--amber)' }} />
      <b className="flex items-center gap-1.5"><Icon size={11} /> {label.toUpperCase()}</b>
      <em style={{ color: accent ?? 'var(--text)' }}>{value.toLocaleString()}</em>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
function ArticleEditor({ article, onBack }: { article?: any; onBack: () => void }) {
  const { user } = useUser();
  const { showToast } = useToast();
  const create = useMutation(api.articles.createArticle);
  const update = useMutation(api.articles.updateArticle);

  const [title, setTitle] = useState(article?.title ?? '');
  const [slug, setSlug] = useState(article?.slug ?? '');
  const [excerpt, setExcerpt] = useState(article?.excerpt ?? '');
  const [body, setBody] = useState(article?.body ?? '');
  const [coverImage, setCoverImage] = useState(article?.coverImage ?? '');
  const [tags, setTags] = useState((article?.tags ?? []).join(', '));
  const [category, setCategory] = useState(article?.category ?? 'Strategy');
  const [accessTier, setAccessTier] = useState<'public' | 'subscribers' | 'paid'>(article?.accessTier ?? 'public');
  const [status, setStatus] = useState<'draft' | 'in_review' | 'published'>(article?.status ?? 'draft');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title || !slug || !excerpt || !body) {
      showToast('Title, slug, excerpt, and body are required', 'error');
      return;
    }
    setBusy(true);
    const tagList = tags.split(',').map((t: string) => t.trim()).filter(Boolean);
    try {
      if (article) {
        await update({
          id: article.id,
          title, slug, excerpt, body,
          coverImage: coverImage || undefined,
          tags: tagList, category, accessTier, status,
        });
        showToast('Saved', 'success');
      } else {
        await create({
          id: `art-${Date.now().toString(36)}`,
          slug, title, excerpt, body,
          coverImage: coverImage || undefined,
          tags: tagList, category, accessTier, status,
          authorName: user?.fullName || user?.username || 'Admin',
          authorImage: user?.imageUrl ?? undefined,
        });
        showToast('Article created', 'success');
      }
      onBack();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <button onClick={onBack} className="doclink" style={{ marginTop: 0 }}>← Back</button>

      <div className="phead" style={{ marginTop: 18, marginBottom: 24 }}>
        <p className="eyebrow" style={{ margin: '0 0 12px' }}>Editor</p>
        <h2 style={{ fontSize: 34, lineHeight: '38px' }}>{article ? 'Edit' : 'New'} Article</h2>
      </div>

      <div className="card">
        <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
        <div className="space-y-4" style={{ marginTop: 4 }}>
          <Field label="Title" value={title} onChange={setTitle} />
          <Field label="Slug" value={slug} onChange={setSlug} placeholder="my-article-url-slug" />
          <Field label="Excerpt" value={excerpt} onChange={setExcerpt} multiline rows={2} />
          <Field label="Cover image URL" value={coverImage} onChange={setCoverImage} />
          <Field label="Body (Markdown supported)" value={body} onChange={setBody} multiline rows={14} mono />
          <Field label="Tags (comma separated)" value={tags} onChange={setTags} />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select label="Category" value={category} onChange={setCategory} options={CATEGORIES} />
            <Select label="Access Tier" value={accessTier} onChange={(v) => setAccessTier(v as any)} options={ACCESS_TIERS} />
            <Select label="Status" value={status} onChange={(v) => setStatus(v as any)} options={['draft', 'in_review', 'published']} />
          </div>

          <div className="flex gap-3" style={{ paddingTop: 6 }}>
            <button onClick={onBack} className="btn-g flex-1">Cancel</button>
            <button
              disabled={busy}
              onClick={submit}
              className="btn-a flex-1 disabled:opacity-50"
            >
              {busy ? 'Saving…' : <><PaperPlaneTilt size={14} /> {article ? 'Save changes' : 'Create article'}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, multiline, rows = 3, placeholder, mono }: any) {
  return (
    <div className="field">
      <label>{label.toUpperCase()}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          style={{ ...inputBox, fontFamily: mono ? 'var(--mono)' : 'inherit', lineHeight: '19px', resize: 'vertical' }}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ ...inputBox, height: 42, padding: '0 14px' }}
        />
      )}
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="field">
      <label>{label.toUpperCase()}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inputBox, height: 42, padding: '0 14px', cursor: 'pointer' }}
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
