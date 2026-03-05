'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useSubscription } from '@/hooks/useSubscription';
import { X, Check, Loader2, Crown } from 'lucide-react';

interface PricingPlansProps {
  open: boolean;
  onClose: () => void;
}

export default function PricingPlans({ open, onClose }: PricingPlansProps) {
  const plans = useQuery(api.subscriptions.getActivePlans);
  const { planId: currentPlanId, isActive, subscription } = useSubscription();
  const [interval, setInterval] = useState<'month' | 'year'>('month');
  const [loading, setLoading] = useState<string | null>(null);

  if (!open) return null;

  type Plan = NonNullable<typeof plans>[number];

  const handleSubscribe = async (plan: Plan) => {
    setLoading(plan.planId);
    try {
      const res = await fetch('/api/paymongo/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.planId, interval }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setLoading(null);
    }
  };

  const handleManage = async () => {
    // PayMongo doesn't have a billing portal — use Stripe portal if available,
    // otherwise show that management is via support
    setLoading('portal');
    try {
      const provider = subscription?.paymentProvider;
      if (provider === 'paymongo') {
        // For PayMongo subscriptions, there's no self-service portal
        // Open a mailto or support link instead
        window.open('mailto:support@tradia.app?subject=Subscription%20Management', '_blank');
        setLoading(null);
        return;
      }
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setLoading(null);
    }
  };

  const sorted = plans ? [...plans].sort((a: Plan, b: Plan) => a.sortOrder - b.sortOrder) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl mx-4 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-[var(--muted)] transition-colors"
        >
          <X size={18} className="text-[var(--muted-foreground)]" />
        </button>

        <div className="text-center mb-6">
          <h2 className="text-lg font-bold text-[var(--foreground)]">Choose Your Plan</h2>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Unlock premium features for your trading journal
          </p>

          {/* Interval toggle */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              onClick={() => setInterval('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                interval === 'month'
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setInterval('year')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                interval === 'year'
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
              }`}
            >
              Yearly
              <span className="ml-1 text-[10px] opacity-75">Save ~17%</span>
            </button>
          </div>
        </div>

        {!plans ? (
          <div className="flex justify-center py-8">
            <Loader2 size={24} className="animate-spin text-[var(--muted-foreground)]" />
          </div>
        ) : sorted.length === 0 ? (
          <p className="text-center text-sm text-[var(--muted-foreground)] py-8">
            No plans available yet. Check back soon!
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Free tier card */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 flex flex-col">
              <h3 className="text-sm font-bold text-[var(--foreground)]">Free</h3>
              <p className="text-2xl font-bold text-[var(--foreground)] mt-2">
                $0<span className="text-xs font-normal text-[var(--muted-foreground)]">/mo</span>
              </p>
              <ul className="mt-4 space-y-2 flex-1">
                <li className="flex items-start gap-2 text-xs text-[var(--muted-foreground)]">
                  <Check size={14} className="mt-0.5 text-[var(--green)] shrink-0" />
                  Basic trade journal
                </li>
                <li className="flex items-start gap-2 text-xs text-[var(--muted-foreground)]">
                  <Check size={14} className="mt-0.5 text-[var(--green)] shrink-0" />
                  Up to 50 trades
                </li>
              </ul>
              {currentPlanId === 'free' && (
                <div className="mt-4 py-2 text-center text-xs font-medium text-[var(--muted-foreground)] border border-[var(--border)] rounded-lg">
                  Current Plan
                </div>
              )}
            </div>

            {/* Paid plan cards */}
            {sorted.map((plan: Plan) => {
              const price = interval === 'year' ? plan.priceYearly : plan.priceMonthly;
              const priceLabel = interval === 'year' ? '/yr' : '/mo';
              const isCurrent = currentPlanId === plan.planId && isActive;
              const canSubscribe = price > 0;
              const isLegend = plan.planId === 'legend';

              return (
                <div
                  key={plan._id}
                  className={`rounded-xl border p-5 flex flex-col ${
                    isLegend
                      ? 'border-amber-500/40 bg-gradient-to-b from-amber-500/5 to-[var(--card)] ring-1 ring-amber-500/20'
                      : 'border-[var(--border)] bg-[var(--card)]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isLegend && <Crown size={16} className="text-amber-400" />}
                    <h3 className={`text-sm font-bold ${isLegend ? 'text-amber-400' : 'text-[var(--foreground)]'}`}>
                      {plan.name}
                    </h3>
                  </div>
                  <p className="text-2xl font-bold text-[var(--foreground)] mt-2">
                    ${price}<span className="text-xs font-normal text-[var(--muted-foreground)]">{priceLabel}</span>
                  </p>
                  <ul className="mt-4 space-y-2 flex-1">
                    {plan.features.map((f: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-[var(--muted-foreground)]">
                        <Check size={14} className={`mt-0.5 shrink-0 ${isLegend ? 'text-amber-400' : 'text-[var(--green)]'}`} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {isCurrent ? (
                    <button
                      onClick={handleManage}
                      disabled={loading === 'portal'}
                      className="mt-4 w-full py-2 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading === 'portal' && <Loader2 size={14} className="animate-spin" />}
                      Manage Subscription
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSubscribe(plan)}
                      disabled={loading === plan.planId || !canSubscribe}
                      className={`mt-4 w-full py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                        isLegend
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600'
                          : 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]'
                      }`}
                    >
                      {loading === plan.planId && <Loader2 size={14} className="animate-spin" />}
                      {canSubscribe ? 'Subscribe' : 'Coming Soon'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Manage existing subscription */}
        {isActive && subscription?.stripeCustomerId && (
          <div className="mt-6 text-center">
            <button
              onClick={handleManage}
              disabled={loading === 'portal'}
              className="text-xs text-[var(--accent)] hover:underline"
            >
              Manage billing & invoices
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
