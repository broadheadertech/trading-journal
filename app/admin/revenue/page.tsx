'use client';

import { DollarSign, CreditCard, AlertCircle, Users, XCircle } from 'lucide-react';
import AdminStatCard from '@/components/admin/AdminStatCard';
import AdminBarChart from '@/components/admin/AdminBarChart';
import AdminPercentageBar from '@/components/admin/AdminPercentageBar';
import { useAdminPlans, useAdminRevenueStats, useAdminSubscriberGrowth, useAdminPlanDistribution } from '@/hooks/useAdminStore';

const paymentProviders = [
  { name: 'Stripe', description: 'Credit card & bank payments worldwide', color: 'var(--pink)', connected: true },
  { name: 'PayPal', description: 'Digital wallet & buyer protection', color: 'var(--teal)', connected: false },
  { name: 'PayMongo', description: 'Philippine payment methods (GCash, Maya)', color: 'var(--green)', connected: false },
];

export default function AdminRevenuePage() {
  const { plans, isLoading: plansLoading } = useAdminPlans();
  const { stats, isLoading: statsLoading } = useAdminRevenueStats();
  const growth = useAdminSubscriberGrowth();
  const distribution = useAdminPlanDistribution();
  type Plan = NonNullable<typeof plans>[number];

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  return (
    <div style={{ maxWidth: 1180 }}>
      <div className="phead" style={{ marginBottom: 24 }}>
        <p className="eyebrow" style={{ margin: '0 0 12px' }}>Monetisation</p>
        <h2 style={{ fontSize: 34, lineHeight: '38px' }}>Revenue &amp; Billing</h2>
        <p className="sub" style={{ marginTop: 14, fontSize: 14.5 }}>Subscription revenue and payment provider status</p>
      </div>

      {/* Revenue stats */}
      <div className="stats" style={{ marginTop: 0 }}>
        <AdminStatCard
          icon={DollarSign}
          label="MRR"
          value={statsLoading ? '...' : fmt(stats?.mrr ?? 0)}
          subtitle="Monthly recurring revenue"
        />
        <AdminStatCard
          icon={DollarSign}
          label="ARR"
          value={statsLoading ? '...' : fmt(stats?.arr ?? 0)}
          subtitle="Annual recurring revenue"
        />
        <AdminStatCard
          icon={Users}
          label="Subscribers"
          value={statsLoading ? '...' : String(stats?.totalActiveSubscribers ?? 0)}
          subtitle="Active paid users"
        />
        <AdminStatCard
          icon={AlertCircle}
          label="Failed Payments"
          value={statsLoading ? '...' : String(stats?.pastDue ?? 0)}
          subtitle="Needs attention"
        />
      </div>

      {/* Additional metrics */}
      {stats && (
        <div className="split-3" style={{ marginTop: 24 }}>
          <AdminStatCard
            icon={Users}
            label="Free Users"
            value={String(stats.totalFree)}
            subtitle="On free tier"
          />
          <AdminStatCard
            icon={XCircle}
            label="Canceled"
            value={String(stats.canceled)}
            subtitle="Churned subscriptions"
          />
          <AdminStatCard
            icon={CreditCard}
            label="Churn Rate"
            value={
              stats.totalActiveSubscribers + stats.canceled > 0
                ? `${((stats.canceled / (stats.totalActiveSubscribers + stats.canceled)) * 100).toFixed(1)}%`
                : '0%'
            }
            subtitle="Logo churn"
          />
        </div>
      )}

      {/* Charts */}
      <div className="split" style={{ marginTop: 24 }}>
        {/* Subscriber Growth */}
        <div className="card">
          <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
          <h3>Subscriber Growth</h3>
          <p className="sub">New paid subscriptions per month</p>
          <div style={{ marginTop: 24 }}>
            {!growth ? (
              <div className="animate-pulse" style={{ height: 160, background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: 2 }} />
            ) : growth.length === 0 ? (
              <p className="empty-line">No paid subscription data yet.</p>
            ) : (
              <AdminBarChart
                data={growth.map((g) => ({ label: g.month.slice(5), value: g.count }))}
                color="var(--amber)"
                height={160}
              />
            )}
          </div>
        </div>

        {/* Plan Distribution */}
        <div className="card">
          <span className="accent" style={{ width: 56, background: 'var(--teal)' }} />
          <h3>Plan Distribution</h3>
          <p className="sub">Share of active subscribers by plan</p>
          <div style={{ marginTop: 24 }}>
            {!distribution ? (
              <div className="animate-pulse" style={{ height: 96, background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: 2 }} />
            ) : distribution.length === 0 ? (
              <p className="empty-line">No subscribers yet.</p>
            ) : (
              <AdminPercentageBar
                items={distribution.map((d, i) => ({
                  label: d.planName,
                  value: d.count,
                  percentage: d.percentage,
                  color: ['var(--amber)', 'var(--green)', 'var(--pink)', 'var(--teal)'][i % 4],
                }))}
              />
            )}
          </div>
        </div>
      </div>

      {/* Payment providers */}
      <div style={{ marginTop: 32 }}>
        <p className="lbl b10" style={{ marginBottom: 12 }}>PAYMENT PROVIDERS</p>
        <div className="split-3">
          {paymentProviders.map((p) => (
            <div key={p.name} className="card" style={{ padding: '19px 22px 22px' }}>
              <span className="accent" style={{ width: 44, background: p.color }} />
              <div className="flex items-center justify-between" style={{ gap: 12 }}>
                <h4>{p.name}</h4>
                <span
                  className="chip"
                  style={{
                    height: 22, padding: '0 10px', fontSize: 10.5,
                    color: p.connected ? 'var(--green)' : 'var(--muted-2)',
                  }}
                >
                  {p.connected ? 'Connected' : 'Not connected'}
                </span>
              </div>
              <p className="sub sm" style={{ marginTop: 10 }}>{p.description}</p>
              {!p.connected && (
                <button disabled className="btn-d" style={{ width: '100%', marginTop: 16, height: 34 }}>
                  Connect (Coming Soon)
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Subscription plans */}
      <div style={{ marginTop: 32 }}>
        <p className="lbl b10" style={{ marginBottom: 12 }}>SUBSCRIPTION PLANS</p>
        {plansLoading ? (
          <div className="animate-pulse" style={{ height: 96, background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: 2 }} />
        ) : !plans || plans.length === 0 ? (
          <div className="blank" style={{ padding: '44px 28px' }}>
            <span className="corner" style={{ left: -1, top: -1, borderRight: 0, borderBottom: 0 }} />
            <span className="corner" style={{ right: -1, bottom: -1, borderLeft: 0, borderTop: 0 }} />
            <div className="badge" style={{ border: '1px solid rgba(217,148,5,.4)', background: 'var(--panel-2)' }}>
              <CreditCard size={22} style={{ color: 'var(--amber)' }} />
            </div>
            <h4>No plans configured</h4>
            <p>Create plans in the Settings tab.</p>
          </div>
        ) : (
          <div className="split-3">
            {[...plans]
              .sort((a: Plan, b: Plan) => a.sortOrder - b.sortOrder)
              .map((plan: Plan) => (
                <div key={plan._id} className="card" style={{ padding: '19px 22px 22px' }}>
                  <span className="accent" style={{ width: 44, background: plan.isActive ? 'var(--amber)' : 'var(--line-2)' }} />
                  <div className="flex items-center justify-between" style={{ gap: 12 }}>
                    <h4>{plan.name}</h4>
                    <span
                      className="chip"
                      style={{
                        height: 22, padding: '0 10px', fontSize: 10.5,
                        color: plan.isActive ? 'var(--green)' : 'var(--muted-2)',
                      }}
                    >
                      {plan.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p style={{ margin: '16px 0 0', fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 24, lineHeight: '30px', color: 'var(--text)' }}>
                    ${plan.priceMonthly}<span style={{ fontSize: 12, color: 'var(--muted-2)' }}>/mo</span>
                  </p>
                  <p style={{ margin: '4px 0 0', fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--muted-2)' }}>
                    ${plan.priceYearly}/yr
                  </p>
                  <ul style={{ listStyle: 'none', margin: '16px 0 0', padding: '16px 0 0', borderTop: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {plan.features.map((f: string, i: number) => (
                      <li key={i} style={{ fontSize: 11.5, lineHeight: '16px', color: 'var(--text-2)' }}>
                        &bull; {f}
                      </li>
                    ))}
                  </ul>
                  <p className="note" style={{ marginTop: 16, fontFamily: 'var(--mono)' }}>
                    {stats?.subscribersByPlan?.[plan.planId] ?? 0} subscribers
                  </p>
                  {plan.stripePriceIdMonthly && (
                    <p className="truncate" style={{ margin: '8px 0 0', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted-3)' }}>
                      Stripe: {plan.stripePriceIdMonthly}
                    </p>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
