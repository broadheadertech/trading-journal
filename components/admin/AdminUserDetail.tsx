'use client';

import { useState } from 'react';
import { X, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useAdminUserDetail, useAdminUserSubscription, useAdminPlans } from '@/hooks/useAdminStore';

interface AdminUserDetailProps {
  userId: string;
  onClose: () => void;
  onBan: (userId: string, reason: string) => Promise<unknown>;
  onUnban: (userId: string) => Promise<unknown>;
  onOverridePlan: (userId: string, planId: string) => Promise<unknown>;
  onResetData: (userId: string) => Promise<unknown>;
}

export default function AdminUserDetail({
  userId, onClose, onBan, onUnban, onOverridePlan, onResetData,
}: AdminUserDetailProps) {
  const detail = useAdminUserDetail(userId);
  const subscription = useAdminUserSubscription(userId);
  const { plans } = useAdminPlans();

  const [banReason, setBanReason] = useState('');
  const [showBanInput, setShowBanInput] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [busy, setBusy] = useState(false);

  const handleBan = async () => {
    if (!banReason.trim()) return;
    setBusy(true);
    try {
      await onBan(userId, banReason.trim());
      setShowBanInput(false);
      setBanReason('');
    } finally {
      setBusy(false);
    }
  };

  const handleUnban = async () => {
    setBusy(true);
    try { await onUnban(userId); } finally { setBusy(false); }
  };

  const handleOverridePlan = async () => {
    if (!selectedPlan) return;
    setBusy(true);
    try {
      await onOverridePlan(userId, selectedPlan);
      setSelectedPlan('');
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    if (!confirm(`Delete ALL data for user ${userId.slice(0, 16)}...? This cannot be undone.`)) return;
    if (!confirm('SECOND CONFIRMATION: This will permanently delete all trades, journals, strategies, and other data for this user.')) return;
    setBusy(true);
    try { await onResetData(userId); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl w-full max-w-md mx-4 animate-in max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h3 className="text-sm font-bold text-[var(--foreground)]">User Detail</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)]">
            <X size={18} />
          </button>
        </div>

        {!detail ? (
          <div className="p-6 text-center text-sm text-[var(--muted-foreground)] animate-pulse">Loading...</div>
        ) : (
          <div className="p-4 space-y-3">
            {/* Basic info */}
            <Row label="User ID" value={detail.userId} mono />
            <Row label="Signed Up" value={detail.signedUp ? new Date(detail.signedUp).toLocaleDateString() : '—'} />
            <Row label="Capital" value={`${detail.currency} ${detail.initialCapital.toLocaleString()}`} />

            {/* Ban status */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--muted-foreground)]">Status</span>
              {detail.isBanned ? (
                <span className="flex items-center gap-1.5 text-[var(--red)]">
                  <ShieldAlert size={14} /> Banned
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-[var(--green)]">
                  <ShieldCheck size={14} /> Active
                </span>
              )}
            </div>
            {detail.isBanned && detail.bannedReason && (
              <div className="text-xs text-[var(--muted-foreground)] bg-[var(--red)]/5 px-3 py-2 rounded-lg">
                Reason: {detail.bannedReason}
              </div>
            )}

            {/* Trade stats */}
            <div className="border-t border-[var(--border)] pt-3 space-y-3">
              <Row label="Total Trades" value={String(detail.tradeCount)} />
              <Row label="Open / Closed" value={`${detail.openTrades} / ${detail.closedTrades}`} />
              <Row
                label="Total PnL"
                value={`$${detail.totalPnL.toFixed(2)}`}
                valueClass={detail.totalPnL >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}
              />
              <Row label="Win Rate" value={`${detail.winRate.toFixed(1)}%`} />
              <Row label="Strategies" value={String(detail.strategyCount)} />
              <Row label="Reflections" value={String(detail.reflectionCount)} />
            </div>

            {/* Subscription */}
            <div className="border-t border-[var(--border)] pt-3 space-y-3">
              <Row label="Current Plan" value={subscription?.planId ?? 'free'} />
              <Row label="Sub Status" value={subscription?.status ?? 'free'} />

              <div className="flex items-center gap-2">
                <select
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value)}
                  className="flex-1 px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--input-bg)] text-xs text-[var(--foreground)]"
                >
                  <option value="">Select plan...</option>
                  <option value="free">Free</option>
                  {plans?.map((p) => (
                    <option key={p.planId} value={p.planId}>{p.name}</option>
                  ))}
                </select>
                <button
                  onClick={handleOverridePlan}
                  disabled={busy || !selectedPlan}
                  className="px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-xs font-medium disabled:opacity-50 transition-colors"
                >
                  Override
                </button>
              </div>
            </div>

            {/* Ban / Unban actions */}
            <div className="border-t border-[var(--border)] pt-3 space-y-2">
              {detail.isBanned ? (
                <button
                  onClick={handleUnban}
                  disabled={busy}
                  className="w-full py-2 rounded-lg bg-[var(--green)]/10 text-[var(--green)] text-xs font-medium hover:bg-[var(--green)]/20 transition-colors disabled:opacity-50"
                >
                  Unban User
                </button>
              ) : showBanInput ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Ban reason..."
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--input-bg)] text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleBan}
                      disabled={busy || !banReason.trim()}
                      className="flex-1 py-2 rounded-lg bg-[var(--red)] text-white text-xs font-medium disabled:opacity-50 transition-colors"
                    >
                      Confirm Ban
                    </button>
                    <button
                      onClick={() => { setShowBanInput(false); setBanReason(''); }}
                      className="flex-1 py-2 rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] text-xs font-medium hover:bg-[var(--muted)] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowBanInput(true)}
                  disabled={busy}
                  className="w-full py-2 rounded-lg border border-[var(--red)]/30 text-[var(--red)] text-xs font-medium hover:bg-[var(--red)]/10 transition-colors disabled:opacity-50"
                >
                  Ban User
                </button>
              )}
            </div>

            {/* Danger zone */}
            <div className="border-t border-[var(--red)]/20 pt-3">
              <p className="text-[10px] font-medium text-[var(--red)] mb-2 uppercase tracking-wide">Danger Zone</p>
              <button
                onClick={handleReset}
                disabled={busy}
                className="w-full py-2 rounded-lg border border-[var(--red)]/30 text-[var(--red)] text-xs font-medium hover:bg-[var(--red)]/10 transition-colors disabled:opacity-50"
              >
                Reset All User Data
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, mono, valueClass }: { label: string; value: string; mono?: boolean; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-[var(--muted-foreground)]">{label}</span>
      <span className={`font-medium ${mono ? 'text-xs' : ''} ${valueClass ?? 'text-[var(--foreground)]'}`}>
        {value}
      </span>
    </div>
  );
}
