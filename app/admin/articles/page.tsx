'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useUser } from '@clerk/nextjs';
import { useToast } from '@/components/ui/Toast';
import { Plus, Edit2, Trash2, Eye, FileText, CheckCircle, Clock, XCircle, BookOpen, Send, Mail } from 'lucide-react';

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const STATUS_FILTERS = ['all', 'draft', 'in_review', 'published', 'archived'] as const;
const CATEGORIES = ['Strategy', 'Psychology', 'Market Analysis', 'Education', 'News'];
const ACCESS_TIERS: Array<'public' | 'subscribers' | 'paid'> = ['public', 'subscribers', 'paid'];

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
    draft:       { label: 'Draft',     color: 'bg-[var(--muted)]/40 text-[var(--muted-foreground)]', icon: FileText },
    in_review:   { label: 'In Review', color: 'bg-amber-500/15 text-amber-400',                       icon: Clock },
    published:   { label: 'Published', color: 'bg-emerald-500/15 text-emerald-400',                   icon: CheckCircle },
    archived:    { label: 'Archived',  color: 'bg-[var(--muted)]/40 text-[var(--muted-foreground)]', icon: XCircle },
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">Manage Articles</h1>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-teal-500 to-teal-700 text-white rounded-xl text-sm font-semibold"
        >
          <Plus size={16} /> New Article
        </button>
      </div>

      {/* Analytics dashboard */}
      {analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Articles"         value={analytics.totalArticles} icon={BookOpen} />
          <Stat label="Published"        value={analytics.published}     icon={CheckCircle} accent="text-emerald-400" />
          <Stat label="Total views"      value={analytics.totalViews}    icon={Eye} />
          <Stat label="Newsletter subs"  value={analytics.newsletterConfirmed} icon={Mail} accent="text-cyan-400" />
        </div>
      )}

      {/* Top articles */}
      {analytics && analytics.top.length > 0 && (
        <div className="glass rounded-2xl p-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-3">Top Articles by Views</h2>
          <div className="space-y-1.5">
            {analytics.top.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between text-sm border-b border-[var(--border)] last:border-0 py-1.5">
                <span className="text-[var(--foreground)] truncate flex-1">{t.title}</span>
                <span className="text-xs text-[var(--muted-foreground)] flex items-center gap-1 ml-3"><Eye size={11} /> {t.viewCount}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status filter */}
      <div className="flex gap-1 flex-wrap">
        {STATUS_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
              filter === f
                ? 'bg-teal-500 text-white'
                : 'bg-[var(--muted)]/30 text-[var(--muted-foreground)] hover:bg-[var(--muted)]/60'
            }`}
          >
            {f.replace('_', ' ').toUpperCase()}
          </button>
        ))}
      </div>

      {/* Articles list */}
      <div className="space-y-2">
        {articles.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)] text-center py-8">No articles found.</p>
        ) : (
          articles.map((a: any) => {
            const meta = STATUS_META[a.status];
            const Icon = meta.icon;
            return (
              <div key={a.id} className="glass rounded-2xl p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/20 to-emerald-500/10 flex items-center justify-center shrink-0">
                  <BookOpen size={16} className="text-teal-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${meta.color}`}>
                      <Icon size={10} /> {meta.label}
                    </span>
                    <span className="text-[10px] text-[var(--muted-foreground)]">{a.category} · {a.accessTier}</span>
                  </div>
                  <div className="font-semibold text-[var(--foreground)]">{a.title}</div>
                  <div className="text-xs text-[var(--muted-foreground)] line-clamp-1">{a.excerpt}</div>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-[var(--muted-foreground)]">
                    <span>by {a.authorName}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><Eye size={10} /> {a.viewCount}</span>
                  </div>
                  {a.reviewNotes && (
                    <div className="mt-2 text-[10px] text-amber-400 italic">Review: {a.reviewNotes}</div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {a.status === 'in_review' && (
                    <>
                      <button
                        onClick={async () => {
                          await approveArticle({ id: a.id });
                          showToast('Published', 'success');
                        }}
                        className="p-2 rounded-lg text-emerald-400 hover:bg-emerald-500/10"
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
                        className="p-2 rounded-lg text-amber-400 hover:bg-amber-500/10"
                        title="Reject"
                      >
                        <XCircle size={14} />
                      </button>
                    </>
                  )}
                  <button onClick={() => setEditingId(a.id)} className="p-2 rounded-lg hover:bg-[var(--muted)]"><Edit2 size={14} /></button>
                  <button
                    onClick={async () => {
                      if (!confirm(`Delete "${a.title}"?`)) return;
                      await deleteArticle({ id: a.id });
                      showToast('Deleted', 'success');
                    }}
                    className="p-2 rounded-lg hover:bg-[var(--red)]/10 text-[var(--red)]"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Newsletter subscribers section */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--muted-foreground)] flex items-center gap-2">
          <Mail size={14} className="text-cyan-400" /> Newsletter ({subscribers.length})
        </h2>
        {subscribers.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">No subscribers yet.</p>
        ) : (
          <div className="glass rounded-2xl divide-y divide-[var(--border)] max-h-80 overflow-y-auto">
            {subscribers.map((s: any) => (
              <div key={s._id} className="p-3 flex items-center gap-3 text-sm">
                <Mail size={12} className="text-cyan-400" />
                <span className="flex-1 text-[var(--foreground)] truncate">{s.email}</span>
                <span className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">{s.status}</span>
                <button
                  onClick={async () => {
                    if (!confirm(`Remove ${s.email}?`)) return;
                    await removeSubscriber({ email: s.email });
                  }}
                  className="p-1.5 rounded-lg text-[var(--red)] hover:bg-[var(--red)]/10"
                >
                  <Trash2 size={12} />
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
    <div className="glass rounded-2xl p-4">
      <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] flex items-center gap-1 mb-1">
        <Icon size={11} /> {label}
      </div>
      <div className={`text-2xl font-bold ${accent ?? 'text-[var(--foreground)]'}`}>{value.toLocaleString()}</div>
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
    <div className="max-w-3xl space-y-5">
      <button onClick={onBack} className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">← Back</button>

      <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">{article ? 'Edit' : 'New'} Article</h1>

      <div className="glass rounded-3xl p-6 space-y-4">
        <Field label="Title" value={title} onChange={setTitle} />
        <Field label="Slug" value={slug} onChange={setSlug} placeholder="my-article-url-slug" />
        <Field label="Excerpt" value={excerpt} onChange={setExcerpt} multiline rows={2} />
        <Field label="Cover image URL" value={coverImage} onChange={setCoverImage} />
        <Field label="Body (Markdown supported)" value={body} onChange={setBody} multiline rows={14} />
        <Field label="Tags (comma separated)" value={tags} onChange={setTags} />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select label="Category" value={category} onChange={setCategory} options={CATEGORIES} />
          <Select label="Access Tier" value={accessTier} onChange={(v) => setAccessTier(v as any)} options={ACCESS_TIERS} />
          <Select label="Status" value={status} onChange={(v) => setStatus(v as any)} options={['draft', 'in_review', 'published']} />
        </div>

        <div className="flex gap-2 pt-2">
          <button onClick={onBack} className="flex-1 py-2 border border-[var(--border)] rounded-xl text-sm">Cancel</button>
          <button
            disabled={busy}
            onClick={submit}
            className="flex-1 py-2 bg-gradient-to-br from-teal-500 to-teal-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {busy ? 'Saving…' : <><Send size={14} /> {article ? 'Save changes' : 'Create article'}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, multiline, rows = 3, placeholder }: any) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-[var(--muted-foreground)] mb-1">{label}</div>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm font-mono"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm"
        />
      )}
    </label>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-[var(--muted-foreground)] mb-1">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm"
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
