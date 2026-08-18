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

type Provider = 'stripe' | 'paymongo';

export default function PricingPlans({ open, onClose }: PricingPlansProps) {
  const plans = useQuery(api.subscriptions.getActivePlans);
  const { planId: currentPlanId, isActive, subscription } = useSubscription();
  const [interval, setInterval] = useState<'month' | 'year'>('month');
  const [provider, setProvider] = useState<Provider>('stripe');
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  type Plan = NonNullable<typeof plans>[number];

  const handleSubscribe = async (plan: Plan) => {
    setLoading(plan.planId);
    setError(null);
    try {
      const endpoint = provider === 'stripe' ? '/api/stripe/checkout' : '/api/paymongo/checkout';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.planId, interval }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data?.error === 'string' ? data.error : 'Checkout failed. Try again.');
        setLoading(null);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError('Checkout did not return a redirect URL.');
      setLoading(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed.');
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
        window.open('mailto:support@atlas.app?subject=Subscription%20Management', '_blank');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div
        className="modal w-full max-w-6xl"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        <span className="accent" />
        <span className="corner" style={{ left: 0, top: 0, borderRight: 0, borderBottom: 0 }} />
        <span className="corner" style={{ right: 0, top: 0, borderLeft: 0, borderBottom: 0 }} />
        <span className="corner" style={{ left: 0, bottom: 0, borderRight: 0, borderTop: 0 }} />
        <span className="corner" style={{ right: 0, bottom: 0, borderLeft: 0, borderTop: 0 }} />

        <button
          onClick={onClose}
          className="absolute"
          style={{ top: 16, right: 16, color: 'var(--muted)', zIndex: 2 }}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <h2>Choose Your Plan</h2>
        <p className="sub">Unlock premium features for your trading journal</p>

        {/* Interval toggle */}
        <div className="switches">
          <button
            onClick={() => setInterval('month')}
            className={interval === 'month' ? 'on' : undefined}
          >
            Monthly
          </button>
          <button
            onClick={() => setInterval('year')}
            className={interval === 'year' ? 'on' : undefined}
          >
            Yearly <small>Save ~17%</small>
          </button>
        </div>

        {/* Payment provider toggle — Stripe for international cards, PayMongo for PH local methods */}
        <div className="switches" style={{ marginTop: 10 }}>
          <button
            onClick={() => setProvider('stripe')}
            className={provider === 'stripe' ? 'out' : undefined}
          >
            Card (Stripe)
          </button>
          <button
            onClick={() => setProvider('paymongo')}
            className={provider === 'paymongo' ? 'out' : undefined}
          >
            GCash / GrabPay (PH)
          </button>
        </div>

        {error && (
          <div className="warn" style={{ textAlign: 'left' }}>
            <span>{error}</span>
          </div>
        )}

        {!plans ? (
          <div className="flex justify-center py-8">
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--muted)' }} />
          </div>
        ) : sorted.length === 0 ? (
          <p className="empty-line">No plans available yet. Check back soon!</p>
        ) : (
          <div className="plans4">
            {/* Free tier card */}
            <div className="plan4">
              <h4>Free</h4>
              <div className="price">
                <b>$0</b><span>/mo</span>
              </div>
              <ul>
                <li>
                  <Check size={12} style={{ color: 'var(--green)' }} />
                  <span>Basic trade journal</span>
                </li>
                <li>
                  <Check size={12} style={{ color: 'var(--green)' }} />
                  <span>Up to 50 trades</span>
                </li>
              </ul>
              {currentPlanId === 'free' && <span className="cta ghost">Current Plan</span>}
            </div>

            {/* Paid plan cards */}
            {sorted.map((plan: Plan) => {
              const price = interval === 'year' ? plan.priceYearly : plan.priceMonthly;
              const priceLabel = interval === 'year' ? '/yr' : '/mo';
              const isCurrent = currentPlanId === plan.planId && isActive;
              const canSubscribe = price > 0;
              const isElite = plan.planId === 'elite';
              // Presentation only: the reference highlights the Pro column and
              // tints both Pro and Elite headings amber.
              const isFeatured = plan.planId === 'pro';

              return (
                <div key={plan._id} className={`plan4${isFeatured ? ' hot' : ''}`}>
                  <h4 className={isFeatured || isElite ? 'amber' : undefined}>
                    {isElite && <Crown size={16} />}
                    {plan.name}
                  </h4>
                  <div className="price">
                    <b>${price}</b><span>{priceLabel}</span>
                  </div>
                  <ul>
                    {plan.features.map((f: string, i: number) => (
                      <li key={i}>
                        <Check size={12} style={{ color: 'var(--green)' }} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  {isCurrent ? (
                    <button
                      onClick={handleManage}
                      disabled={loading === 'portal'}
                      className="cta ghost disabled:opacity-50"
                    >
                      {loading === 'portal' && <Loader2 size={14} className="animate-spin" style={{ marginRight: 8 }} />}
                      Manage Subscription
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSubscribe(plan)}
                      disabled={loading === plan.planId || !canSubscribe}
                      className="cta amber disabled:opacity-50"
                    >
                      {loading === plan.planId && <Loader2 size={14} className="animate-spin" style={{ marginRight: 8 }} />}
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
          <p className="footnote">
            <button
              onClick={handleManage}
              disabled={loading === 'portal'}
              style={{ color: 'var(--amber)', fontWeight: 700, fontSize: 12.5 }}
            >
              Manage billing &amp; invoices
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
