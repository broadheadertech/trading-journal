'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { useUser } from '@clerk/nextjs';
import { api } from '@/convex/_generated/api';
import { useToast } from '@/components/ui/Toast';
import { X, Loader2, Upload, Check, Copy, QrCode, ShieldCheck } from 'lucide-react';
import type { Id } from '@/convex/_generated/dataModel';

interface QrPaymentModalProps {
  open: boolean;
  onClose: () => void;
  plan: { planId: string; name: string; price: number } | null;
  interval: 'month' | 'year';
}

export default function QrPaymentModal({ open, onClose, plan, interval }: QrPaymentModalProps) {
  const { user } = useUser();
  const { showToast } = useToast();
  const methods = useQuery(api.qrPayments.getActiveMethods);
  const generateUploadUrl = useMutation(api.qrPayments.generateUploadUrl);
  const resolveUpload = useMutation(api.qrPayments.resolveUpload);
  const submitPayment = useMutation(api.qrPayments.submitPayment);

  const [selectedMethodId, setSelectedMethodId] = useState<Id<'qrPaymentMethods'> | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [referenceId, setReferenceId] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!open || !plan) return null;

  const selectedMethod =
    methods?.find((m) => m._id === selectedMethodId) ?? methods?.[0] ?? null;

  // Amount label follows the selected QR's currency (the plan price is a bare
  // number reused across USD/PHP). Default to $ when no currency is set.
  const cur = selectedMethod?.currency?.trim().toUpperCase();
  const amountLabel = !cur || cur === 'USD' ? `$${plan.price}` : `${plan.price} ${cur}`;

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': file.type }, body: file });
      if (!res.ok) throw new Error('Upload failed');
      const { storageId } = await res.json();
      const url = await resolveUpload({ storageId });
      if (!url) throw new Error('Could not resolve uploaded file');
      setScreenshotUrl(url);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!referenceId.trim()) return showToast('Please enter the payment reference ID', 'error');
    if (!screenshotUrl) return showToast('Please upload your payment screenshot', 'error');
    setSubmitting(true);
    try {
      await submitPayment({
        planId: plan.planId,
        planName: plan.name,
        interval,
        methodId: selectedMethod?._id,
        methodLabel: selectedMethod?.label,
        amount: plan.price,
        currency: selectedMethod?.currency,
        referenceId: referenceId.trim(),
        screenshotUrl,
        note: note.trim() || undefined,
        userName: user?.fullName ?? user?.username ?? undefined,
        userEmail: user?.primaryEmailAddress?.emailAddress ?? undefined,
      });
      setSubmitted(true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Submission failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const close = () => {
    // reset so re-opening starts fresh
    setSelectedMethodId(null);
    setScreenshotUrl(null);
    setReferenceId('');
    setNote('');
    setSubmitted(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--background)] p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <button
          onClick={close}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-[var(--muted)] transition-colors"
        >
          <X size={18} className="text-[var(--muted-foreground)]" />
        </button>

        {submitted ? (
          <div className="text-center py-8">
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center mb-4">
              <ShieldCheck size={28} className="text-emerald-400" />
            </div>
            <h2 className="text-lg font-bold text-[var(--foreground)]">Payment submitted</h2>
            <p className="text-sm text-[var(--muted-foreground)] mt-2 max-w-sm mx-auto">
              Thanks! Our team will verify your reference ID against the payment and activate your{' '}
              <span className="font-semibold text-[var(--foreground)]">{plan.name}</span> plan — usually within a few
              hours. You&rsquo;ll get a notification once it&rsquo;s approved.
            </p>
            <button
              onClick={close}
              className="mt-6 px-5 py-2 rounded-lg text-sm font-medium bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="mb-5">
              <div className="flex items-center gap-2">
                <QrCode size={18} className="text-[var(--accent)]" />
                <h2 className="text-lg font-bold text-[var(--foreground)]">Pay via QR</h2>
              </div>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                {plan.name} · <span className="capitalize">{interval}ly</span> ·{' '}
                <span className="font-semibold text-[var(--foreground)]">{amountLabel}</span>
              </p>
            </div>

            {methods === undefined ? (
              <div className="flex justify-center py-8">
                <Loader2 size={22} className="animate-spin text-[var(--muted-foreground)]" />
              </div>
            ) : methods.length === 0 ? (
              <p className="text-center text-sm text-[var(--muted-foreground)] py-8">
                QR payment isn&rsquo;t available right now. Please use card / e-wallet checkout, or contact support.
              </p>
            ) : (
              <div className="space-y-5">
                {/* Method picker */}
                {methods.length > 1 && (
                  <div className="flex flex-wrap gap-2">
                    {methods.map((m) => {
                      const active = selectedMethod?._id === m._id;
                      return (
                        <button
                          key={m._id}
                          onClick={() => setSelectedMethodId(m._id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            active
                              ? 'bg-[var(--accent)] text-white'
                              : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                          }`}
                        >
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* QR + instructions */}
                {selectedMethod && (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 flex flex-col items-center text-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedMethod.qrImageUrl}
                      alt={`${selectedMethod.label} QR`}
                      className="w-44 h-44 rounded-lg object-contain bg-white p-2"
                    />
                    <div className="mt-3 text-sm font-semibold text-[var(--foreground)]">
                      Scan with {selectedMethod.label}
                    </div>
                    {selectedMethod.instructions && (
                      <p className="mt-1 text-xs text-[var(--muted-foreground)] whitespace-pre-line">
                        {selectedMethod.instructions}
                      </p>
                    )}
                    {selectedMethod.accountDetails && (
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(selectedMethod.accountDetails!);
                          showToast('Copied', 'success');
                        }}
                        className="mt-2 inline-flex items-center gap-1.5 text-xs font-mono text-[var(--accent)] hover:underline break-all"
                      >
                        <Copy size={12} /> {selectedMethod.accountDetails}
                      </button>
                    )}
                  </div>
                )}

                {/* Reference ID */}
                <div>
                  <label className="block text-xs font-medium text-[var(--foreground)] mb-1">
                    Payment reference ID <span className="text-[var(--red)]">*</span>
                  </label>
                  <input
                    value={referenceId}
                    onChange={(e) => setReferenceId(e.target.value)}
                    placeholder="e.g. GCash ref no. / bank ref / tx hash"
                    className="w-full px-3 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--border)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                {/* Screenshot upload */}
                <div>
                  <label className="block text-xs font-medium text-[var(--foreground)] mb-1">
                    Payment screenshot <span className="text-[var(--red)]">*</span>
                  </label>
                  {screenshotUrl ? (
                    <div className="relative inline-block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={screenshotUrl} alt="proof" className="h-28 rounded-lg border border-[var(--border)] object-cover" />
                      <button
                        onClick={() => setScreenshotUrl(null)}
                        className="absolute -top-1.5 -right-1.5 bg-[var(--red)] text-white rounded-full p-1"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-1.5 h-24 border border-dashed border-[var(--border)] rounded-lg text-xs text-[var(--muted-foreground)] hover:bg-[var(--muted)] cursor-pointer">
                      {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                      {uploading ? 'Uploading…' : 'Upload your proof of payment'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploading}
                        onChange={(e) => {
                          if (e.target.files?.[0]) handleUpload(e.target.files[0]);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  )}
                </div>

                {/* Optional note */}
                <div>
                  <label className="block text-xs font-medium text-[var(--foreground)] mb-1">Note (optional)</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    placeholder="Anything we should know?"
                    className="w-full px-3 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--border)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--accent)] resize-none"
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={submitting || uploading}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Submit for verification
                </button>
                <p className="text-[11px] text-[var(--muted-foreground)] text-center -mt-1">
                  Your plan activates once an admin verifies your payment.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
