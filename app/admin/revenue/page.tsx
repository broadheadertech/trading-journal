'use client';

import { DollarSign, CreditCard, AlertCircle, Users, XCircle } from 'lucide-react';
import AdminStatCard from '@/components/admin/AdminStatCard';
import AdminBarChart from '@/components/admin/AdminBarChart';
import AdminPercentageBar from '@/components/admin/AdminPercentageBar';
import { useAdminPlans, useAdminRevenueStats, useAdminSubscriberGrowth, useAdminPlanDistribution } from '@/hooks/useAdminStore';

const paymentProviders = [
  { name: 'Stripe', description: 'Credit card & bank payments worldwide', color: 'var(--purple)', connected: true },
  { name: 'PayPal', description: 'Digital wallet & buyer protection', color: 'var(--blue)', connected: false },
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
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-xl font-bold text-[var(--foreground)]">Revenue & Billing</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Subscription revenue and payment provider status</p>
      </div>

      {/* Revenue stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Subscriber Growth */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <h2 className="text-sm font-semibold text-[var(--foreground)] mb-4">Subscriber Growth</h2>
          {!growth ? (
            <div className="h-40 bg-[var(--muted)] rounded animate-pulse" />
          ) : growth.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)] text-center py-8">No paid subscription data yet.</p>
          ) : (
            <AdminBarChart
              data={growth.map((g) => ({ label: g.month.slice(5), value: g.count }))}
              color="var(--accent)"
              height={160}
            />
          )}
        </div>

        {/* Plan Distribution */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <h2 className="text-sm font-semibold text-[var(--foreground)] mb-4">Plan Distribution</h2>
          {!distribution ? (
            <div className="h-24 bg-[var(--muted)] rounded animate-pulse" />
          ) : distribution.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)] text-center py-8">No subscribers yet.</p>
          ) : (
            <AdminPercentageBar
              items={distribution.map((d, i) => ({
                label: d.planName,
                value: d.count,
                percentage: d.percentage,
                color: ['var(--accent)', 'var(--green)', 'var(--purple)', 'var(--blue)'][i % 4],
              }))}
            />
          )}
        </div>
      </div>

      {/* Payment providers */}
      <div>
        <h2 className="text-sm font-semibold text-[var(--foreground)] mb-3">Payment Providers</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {paymentProviders.map((p) => (
            <div key={p.name} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-[var(--foreground)]">{p.name}</h3>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    p.connected
                      ? 'bg-[var(--green)]/10 text-[var(--green)]'
                      : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
                  }`}
                >
                  {p.connected ? 'Connected' : 'Not connected'}
                </span>
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">{p.description}</p>
              {!p.connected && (
                <button
                  disabled
                  className="mt-3 w-full py-1.5 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--muted-foreground)] opacity-50 cursor-not-allowed"
                >
                  Connect (Coming Soon)
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Subscription plans */}
      <div>
        <h2 className="text-sm font-semibold text-[var(--foreground)] mb-3">Subscription Plans</h2>
        {plansLoading ? (
          <div className="h-24 bg-[var(--muted)] rounded-xl animate-pulse" />
        ) : !plans || plans.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] p-8 text-center">
            <p className="text-sm text-[var(--muted-foreground)]">No subscription plans configured yet.</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">Create plans in the Settings tab.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[...plans]
              .sort((a: Plan, b: Plan) => a.sortOrder - b.sortOrder)
              .map((plan: Plan) => (
                <div key={plan._id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-bold text-[var(--foreground)]">{plan.name}</h3>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        plan.isActive
                          ? 'bg-[var(--green)]/10 text-[var(--green)]'
                          : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
                      }`}
                    >
                      {plan.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-lg font-bold text-[var(--foreground)]">
                    ${plan.priceMonthly}<span className="text-xs font-normal text-[var(--muted-foreground)]">/mo</span>
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    ${plan.priceYearly}/yr
                  </p>
                  <ul className="mt-2 space-y-1">
                    {plan.features.map((f: string, i: number) => (
                      <li key={i} className="text-xs text-[var(--muted-foreground)]">
                        &bull; {f}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[11px] text-[var(--muted-foreground)]">
                    {stats?.subscribersByPlan?.[plan.planId] ?? 0} subscribers
                  </p>
                  {plan.stripePriceIdMonthly && (
                    <p className="mt-1 text-[10px] text-[var(--muted-foreground)] font-mono truncate">
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
