'use client';

import { useState } from 'react';
import { Save, Plus, Trash2 } from 'lucide-react';
import { useAdminSettings, useAdminPlans } from '@/hooks/useAdminStore';

export default function AdminSettingsPage() {
  const { getSetting, setSetting, isLoading: settingsLoading } = useAdminSettings();
  const { plans, upsertPlan, isLoading: plansLoading } = useAdminPlans();
  type Plan = NonNullable<typeof plans>[number];

  // Platform settings local state
  const [platformName, setPlatformName] = useState<string | null>(null);
  const [maintenance, setMaintenance] = useState<string | null>(null);

  // Plan form
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [planForm, setPlanForm] = useState({
    planId: '',
    name: '',
    priceMonthly: 0,
    priceYearly: 0,
    stripePriceIdMonthly: '',
    stripePriceIdYearly: '',
    stripeProductId: '',
    features: '',
    isActive: true,
    sortOrder: 0,
  });

  const effectiveName = platformName ?? getSetting('platform_name', 'Trade Journal');
  const effectiveMaintenance = maintenance ?? getSetting('maintenance_mode', 'false');

  const savePlatformName = () => setSetting('platform_name', effectiveName);
  const toggleMaintenance = () => {
    const next = effectiveMaintenance === 'true' ? 'false' : 'true';
    setMaintenance(next);
    setSetting('maintenance_mode', next);
  };

  const handleSavePlan = async () => {
    if (!planForm.planId || !planForm.name) return;
    await upsertPlan({
      planId: planForm.planId,
      name: planForm.name,
      priceMonthly: planForm.priceMonthly,
      priceYearly: planForm.priceYearly,
      stripePriceIdMonthly: planForm.stripePriceIdMonthly || undefined,
      stripePriceIdYearly: planForm.stripePriceIdYearly || undefined,
      stripeProductId: planForm.stripeProductId || undefined,
      features: planForm.features.split('\n').filter(Boolean),
      isActive: planForm.isActive,
      sortOrder: planForm.sortOrder,
    });
    setPlanForm({ planId: '', name: '', priceMonthly: 0, priceYearly: 0, stripePriceIdMonthly: '', stripePriceIdYearly: '', stripeProductId: '', features: '', isActive: true, sortOrder: 0 });
    setShowPlanForm(false);
  };

  if (settingsLoading || plansLoading) {
    return (
      <div className="animate-pulse space-y-4 max-w-3xl">
        <div className="h-8 w-32 bg-[var(--muted)] rounded" />
        <div className="h-40 bg-[var(--muted)] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-[var(--foreground)]">Settings</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Platform configuration and subscription plans</p>
      </div>

      {/* Platform settings */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-4">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Platform Settings</h2>

        <div className="space-y-1.5">
          <label className="text-xs text-[var(--muted-foreground)]">Platform Name</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={effectiveName}
              onChange={(e) => setPlatformName(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--input-bg)] text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
            />
            <button
              onClick={savePlatformName}
              className="px-3 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors flex items-center gap-1.5"
            >
              <Save size={14} />
              Save
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--foreground)]">Maintenance Mode</p>
            <p className="text-xs text-[var(--muted-foreground)]">When enabled, users see a maintenance page</p>
          </div>
          <button
            onClick={toggleMaintenance}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              effectiveMaintenance === 'true' ? 'bg-[var(--accent)]' : 'bg-[var(--muted)]'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                effectiveMaintenance === 'true' ? 'translate-x-5' : ''
              }`}
            />
          </button>
        </div>
      </section>

      {/* Admin access info */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-2">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Admin Access</h2>
        <p className="text-xs text-[var(--muted-foreground)]">
          Admin access is controlled via the <code className="px-1 py-0.5 bg-[var(--muted)] rounded text-[var(--foreground)]">NEXT_PUBLIC_ADMIN_USER_ID</code> environment variable
          and the Convex <code className="px-1 py-0.5 bg-[var(--muted)] rounded text-[var(--foreground)]">ADMIN_USER_ID</code> env var.
        </p>
        <p className="text-xs text-[var(--muted-foreground)]">
          To add additional admins, implement role-based access control in a future update.
        </p>
      </section>

      {/* Subscription plans CRUD */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Subscription Plans</h2>
          <button
            onClick={() => setShowPlanForm(!showPlanForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-xs font-medium hover:bg-[var(--accent-hover)] transition-colors"
          >
            <Plus size={14} />
            Add Plan
          </button>
        </div>

        {showPlanForm && (
          <div className="border border-[var(--border)] rounded-lg p-4 space-y-3 bg-[var(--background)]">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[var(--muted-foreground)]">Plan ID</label>
                <input
                  type="text"
                  value={planForm.planId}
                  onChange={(e) => setPlanForm({ ...planForm, planId: e.target.value })}
                  placeholder="e.g. pro"
                  className="w-full mt-1 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--input-bg)] text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--muted-foreground)]">Plan Name</label>
                <input
                  type="text"
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  placeholder="e.g. Pro"
                  className="w-full mt-1 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--input-bg)] text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--muted-foreground)]">Monthly Price ($)</label>
                <input
                  type="number"
                  value={planForm.priceMonthly}
                  onChange={(e) => setPlanForm({ ...planForm, priceMonthly: Number(e.target.value) })}
                  className="w-full mt-1 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--input-bg)] text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--muted-foreground)]">Yearly Price ($)</label>
                <input
                  type="number"
                  value={planForm.priceYearly}
                  onChange={(e) => setPlanForm({ ...planForm, priceYearly: Number(e.target.value) })}
                  className="w-full mt-1 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--input-bg)] text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--muted-foreground)]">Sort Order</label>
                <input
                  type="number"
                  value={planForm.sortOrder}
                  onChange={(e) => setPlanForm({ ...planForm, sortOrder: Number(e.target.value) })}
                  className="w-full mt-1 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--input-bg)] text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                  <input
                    type="checkbox"
                    checked={planForm.isActive}
                    onChange={(e) => setPlanForm({ ...planForm, isActive: e.target.checked })}
                    className="rounded"
                  />
                  Active
                </label>
              </div>
            </div>
            {/* Stripe IDs */}
            <div className="col-span-2 border-t border-[var(--border)] pt-3 mt-1">
              <p className="text-xs font-medium text-[var(--muted-foreground)] mb-2">Stripe Integration (optional)</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-[var(--muted-foreground)]">Stripe Product ID</label>
                  <input
                    type="text"
                    value={planForm.stripeProductId}
                    onChange={(e) => setPlanForm({ ...planForm, stripeProductId: e.target.value })}
                    placeholder="prod_xxx"
                    className="w-full mt-1 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--input-bg)] text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--muted-foreground)]">Monthly Price ID</label>
                  <input
                    type="text"
                    value={planForm.stripePriceIdMonthly}
                    onChange={(e) => setPlanForm({ ...planForm, stripePriceIdMonthly: e.target.value })}
                    placeholder="price_xxx"
                    className="w-full mt-1 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--input-bg)] text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--muted-foreground)]">Yearly Price ID</label>
                  <input
                    type="text"
                    value={planForm.stripePriceIdYearly}
                    onChange={(e) => setPlanForm({ ...planForm, stripePriceIdYearly: e.target.value })}
                    placeholder="price_xxx"
                    className="w-full mt-1 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--input-bg)] text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs text-[var(--muted-foreground)]">Features (one per line)</label>
              <textarea
                value={planForm.features}
                onChange={(e) => setPlanForm({ ...planForm, features: e.target.value })}
                rows={4}
                placeholder={"Unlimited trades\nAdvanced analytics\nPriority support"}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--input-bg)] text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 resize-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowPlanForm(false)}
                className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePlan}
                disabled={!planForm.planId || !planForm.name}
                className="px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-xs font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <Save size={14} />
                Save Plan
              </button>
            </div>
          </div>
        )}

        {/* Existing plans list */}
        {plans && plans.length > 0 ? (
          <div className="space-y-2">
            {[...plans]
              .sort((a: Plan, b: Plan) => a.sortOrder - b.sortOrder)
              .map((plan: Plan) => (
                <div key={plan._id} className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-[var(--border)]">
                  <div>
                    <span className="text-sm font-medium text-[var(--foreground)]">{plan.name}</span>
                    <span className="text-xs text-[var(--muted-foreground)] ml-2">
                      ${plan.priceMonthly}/mo &bull; ${plan.priceYearly}/yr
                    </span>
                  </div>
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
              ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--muted-foreground)] text-center py-4">No plans yet. Add one above.</p>
        )}
      </section>
    </div>
  );
}
