'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useToast } from '@/components/ui/Toast';
import { Check, X, Trash2, Upload, Loader2, Plus, ExternalLink } from 'lucide-react';
import type { Id } from '@/convex/_generated/dataModel';

const STATUS: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-400',
  approved: 'bg-emerald-500/15 text-emerald-400',
  rejected: 'bg-[var(--red)]/15 text-[var(--red)]',
};

export default function AdminPaymentsPage() {
  const methods = useQuery(api.qrPayments.listMethods) ?? [];
  const submissions = useQuery(api.qrPayments.listSubmissions) ?? [];
  const approve = useMutation(api.qrPayments.approveSubmission);
  const reject = useMutation(api.qrPayments.rejectSubmission);
  const { showToast } = useToast();

  const pending = submissions.filter((s) => s.status === 'pending');
  const resolved = submissions.filter((s) => s.status !== 'pending');

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">QR Payments</h1>

      {/* ── QR method management ─────────────────────────────── */}
      <MethodManager methods={methods} />

      {/* ── Pending submissions ──────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          Pending review ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">No pending payments to verify. 🎉</p>
        ) : (
          pending.map((s) => (
            <SubmissionCard
              key={s._id}
              s={s}
              onApprove={async () => {
                await approve({ id: s._id as Id<'qrPaymentSubmissions'> });
                showToast('Approved — subscription activated', 'success');
              }}
              onReject={async () => {
                const reason = window.prompt('Reason for rejection (shown to the user, optional):') ?? undefined;
                await reject({ id: s._id as Id<'qrPaymentSubmissions'>, reason: reason || undefined });
                showToast('Rejected', 'success');
              }}
            />
          ))
        )}
      </section>

      {/* ── History ──────────────────────────────────────────── */}
      {resolved.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            History ({resolved.length})
          </h2>
          <div className="glass rounded-2xl divide-y divide-[var(--border)]">
            {resolved.map((s) => (
              <div key={s._id} className="p-3 flex items-center gap-3 text-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.screenshotUrl} alt="proof" className="w-10 h-10 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[var(--foreground)] truncate">
                    {s.userName ?? s.userId} · {s.planName ?? s.planId} ({s.interval})
                  </div>
                  <div className="text-xs text-[var(--muted-foreground)] truncate">
                    Ref: {s.referenceId} · {new Date(s.createdAt).toLocaleString()}
                  </div>
                </div>
                <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${STATUS[s.status]}`}>
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Submission review card ───────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SubmissionCard({ s, onApprove, onReject }: { s: any; onApprove: () => Promise<void>; onReject: () => Promise<void> }) {
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const run = (which: 'approve' | 'reject', fn: () => Promise<void>) => async () => {
    setBusy(which);
    try { await fn(); } finally { setBusy(null); }
  };

  return (
    <div className="glass rounded-2xl p-4 flex flex-col sm:flex-row gap-4">
      <a href={s.screenshotUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 group relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={s.screenshotUrl} alt="payment proof" className="w-28 h-28 rounded-xl object-cover border border-[var(--border)]" />
        <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity">
          <ExternalLink size={18} className="text-white" />
        </span>
      </a>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="font-semibold text-[var(--foreground)]">
          {s.userName ?? 'User'} <span className="text-xs font-normal text-[var(--muted-foreground)]">{s.userEmail}</span>
        </div>
        <div className="text-sm text-[var(--foreground)]">
          {s.planName ?? s.planId} · <span className="capitalize">{s.interval}ly</span>
          {s.amount != null && <> · {s.currency ?? '$'}{s.amount}</>}
          {s.methodLabel && <> · via {s.methodLabel}</>}
        </div>
        <div className="text-sm">
          <span className="text-[var(--muted-foreground)]">Reference ID: </span>
          <span className="font-mono font-semibold text-[var(--foreground)] break-all">{s.referenceId}</span>
        </div>
        {s.note && <div className="text-xs text-[var(--muted-foreground)]">Note: {s.note}</div>}
        <div className="text-[11px] text-[var(--muted-foreground)]">{new Date(s.createdAt).toLocaleString()}</div>
      </div>
      <div className="flex sm:flex-col items-center justify-center gap-2">
        <button
          onClick={run('approve', onApprove)}
          disabled={busy !== null}
          className="px-3 py-2 rounded-lg text-sm font-semibold bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 disabled:opacity-50 inline-flex items-center gap-1.5"
        >
          {busy === 'approve' ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Approve
        </button>
        <button
          onClick={run('reject', onReject)}
          disabled={busy !== null}
          className="px-3 py-2 rounded-lg text-sm font-semibold bg-[var(--red)]/15 text-[var(--red)] hover:bg-[var(--red)]/25 disabled:opacity-50 inline-flex items-center gap-1.5"
        >
          {busy === 'reject' ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />} Reject
        </button>
      </div>
    </div>
  );
}

// ─── QR method manager (upload / toggle / delete) ─────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MethodManager({ methods }: { methods: any[] }) {
  const generateUploadUrl = useMutation(api.qrPayments.generateUploadUrl);
  const resolveUpload = useMutation(api.qrPayments.resolveUpload);
  const createMethod = useMutation(api.qrPayments.createMethod);
  const updateMethod = useMutation(api.qrPayments.updateMethod);
  const deleteMethod = useMutation(api.qrPayments.deleteMethod);
  const { showToast } = useToast();

  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState('');
  const [currency, setCurrency] = useState('');
  const [accountDetails, setAccountDetails] = useState('');
  const [instructions, setInstructions] = useState('');
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': file.type }, body: file });
      if (!res.ok) throw new Error('Upload failed');
      const { storageId } = await res.json();
      const url = await resolveUpload({ storageId });
      if (!url) throw new Error('Could not resolve upload');
      setQrImageUrl(url);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setLabel(''); setCurrency(''); setAccountDetails(''); setInstructions(''); setQrImageUrl(null); setAdding(false);
  };

  const save = async () => {
    if (!label.trim()) return showToast('Enter a label (e.g. GCash)', 'error');
    if (!qrImageUrl) return showToast('Upload a QR image', 'error');
    setSaving(true);
    try {
      await createMethod({
        label: label.trim(),
        qrImageUrl,
        currency: currency.trim() || undefined,
        accountDetails: accountDetails.trim() || undefined,
        instructions: instructions.trim() || undefined,
      });
      showToast('QR method added', 'success');
      reset();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          Payment QR codes ({methods.length})
        </h2>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] inline-flex items-center gap-1.5"
          >
            <Plus size={14} /> Add QR
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {methods.map((m) => (
          <div key={m._id} className="glass rounded-2xl p-4 flex flex-col items-center text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={m.qrImageUrl} alt={m.label} className="w-32 h-32 rounded-lg object-contain bg-white p-1.5" />
            <div className="mt-2 font-semibold text-[var(--foreground)]">{m.label}</div>
            {m.currency && <div className="text-[11px] text-[var(--muted-foreground)]">{m.currency}</div>}
            {m.accountDetails && <div className="text-[11px] font-mono text-[var(--muted-foreground)] break-all mt-0.5">{m.accountDetails}</div>}
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={async () => {
                  await updateMethod({ id: m._id, isActive: !m.isActive });
                  showToast(m.isActive ? 'Hidden from users' : 'Now visible to users', 'success');
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                  m.isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-[var(--muted)]/40 text-[var(--muted-foreground)]'
                }`}
              >
                {m.isActive ? 'Active' : 'Hidden'}
              </button>
              <button
                onClick={async () => {
                  if (!window.confirm(`Delete "${m.label}" QR?`)) return;
                  await deleteMethod({ id: m._id });
                  showToast('Deleted', 'success');
                }}
                className="p-1.5 rounded-lg text-[var(--red)] hover:bg-[var(--red)]/10"
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}

        {adding && (
          <div className="glass rounded-2xl p-4 space-y-2 sm:col-span-2 lg:col-span-1">
            {qrImageUrl ? (
              <div className="relative mx-auto w-fit">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrImageUrl} alt="new QR" className="w-32 h-32 rounded-lg object-contain bg-white p-1.5" />
                <button onClick={() => setQrImageUrl(null)} className="absolute -top-1.5 -right-1.5 bg-[var(--red)] text-white rounded-full p-1">
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="w-full h-24 flex flex-col items-center justify-center gap-1 border border-dashed border-[var(--border)] rounded-lg text-xs text-[var(--muted-foreground)] hover:bg-[var(--muted)] disabled:opacity-50"
              >
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                {uploading ? 'Uploading' : 'Upload QR image'}
              </button>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) upload(e.target.files[0]); e.target.value = ''; }}
            />
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (e.g. GCash, USDT TRC-20)"
              className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--input-bg)] border border-[var(--border)] text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]" />
            <input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="Currency (PHP / USD / USDT)"
              className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--input-bg)] border border-[var(--border)] text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]" />
            <input value={accountDetails} onChange={(e) => setAccountDetails(e.target.value)} placeholder="Account / wallet address (optional)"
              className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--input-bg)] border border-[var(--border)] text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]" />
            <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={2} placeholder="Instructions (optional)"
              className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--input-bg)] border border-[var(--border)] text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] resize-none" />
            <div className="flex items-center gap-2">
              <button onClick={save} disabled={saving} className="flex-1 py-1.5 rounded-lg text-sm font-semibold bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] disabled:opacity-50 inline-flex items-center justify-center gap-1.5">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save
              </button>
              <button onClick={reset} className="px-3 py-1.5 rounded-lg text-sm font-medium border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
