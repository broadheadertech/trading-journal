'use client';

import { useState } from 'react';
import { FloppyDisk, Plus, Trash } from '@phosphor-icons/react';
import { useAdminSettings, useAdminPlans } from '@/hooks/useAdminStore';

// shared ATLAS input chrome (markup-level styling only)
const inputBox: React.CSSProperties = {
  width: '100%', height: 42, padding: '0 14px', borderRadius: 2,
  border: '1px solid var(--line)', background: 'var(--panel-2)',
  fontSize: 13, color: 'var(--text)', outline: 'none',
};

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
        <div style={{ height: 32, width: 128, background: 'var(--panel-2)', borderRadius: 2 }} />
        <div style={{ height: 160, background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: 2 }} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="phead" style={{ marginBottom: 24 }}>
        <p className="eyebrow" style={{ margin: '0 0 12px' }}>Configuration</p>
        <h2 style={{ fontSize: 34, lineHeight: '38px' }}>Settings</h2>
        <p className="sub" style={{ marginTop: 14, fontSize: 14.5 }}>Platform configuration and subscription plans</p>
      </div>

      {/* Platform settings */}
      <section className="card">
        <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
        <h3>Platform Settings</h3>
        <p className="sub">Identity and availability for the whole platform</p>

        <div className="field" style={{ marginTop: 20 }}>
          <label>PLATFORM NAME</label>
          <div className="flex gap-3">
            <input
              type="text"
              value={effectiveName}
              onChange={(e) => setPlatformName(e.target.value)}
              style={{ ...inputBox, flex: 1 }}
            />
            <button onClick={savePlatformName} className="btn-a shrink-0" style={{ height: 42 }}>
              <FloppyDisk size={14} />
              Save
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4" style={{ marginTop: 20 }}>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Maintenance Mode</p>
            <p style={{ margin: '4px 0 0', fontSize: 11.5, color: 'var(--muted-2)' }}>When enabled, users see a maintenance page</p>
          </div>
          <button
            onClick={toggleMaintenance}
            className="flex items-center shrink-0"
            style={{
              width: 42, height: 22, padding: 2, borderRadius: 2,
              border: '1px solid var(--line-2)',
              background: effectiveMaintenance === 'true' ? 'var(--amber)' : 'var(--panel-2)',
            }}
          >
            <span
              style={{
                width: 16, height: 16, borderRadius: 1,
                background: effectiveMaintenance === 'true' ? 'var(--ink)' : 'var(--muted)',
                transform: effectiveMaintenance === 'true' ? 'translateX(20px)' : 'translateX(0)',
                transition: 'transform .18s',
              }}
            />
          </button>
        </div>
      </section>

      {/* Admin access info */}
      <section className="card" style={{ marginTop: 24 }}>
        <span className="accent" style={{ width: 56, background: 'var(--teal)' }} />
        <h3>Admin Access</h3>
        <div className="warn" style={{ marginTop: 16 }}>
          <div>
            <p style={{ margin: 0 }}>
              Admin access is controlled via the <b style={{ fontFamily: 'var(--mono)' }}>NEXT_PUBLIC_ADMIN_USER_ID</b> environment variable
              and the Convex <b style={{ fontFamily: 'var(--mono)' }}>ADMIN_USER_ID</b> env var.
            </p>
            <p style={{ margin: '10px 0 0' }}>
              To add additional admins, implement role-based access control in a future update.
            </p>
          </div>
        </div>
      </section>

      {/* Subscription plans CRUD */}
      <section className="card" style={{ marginTop: 24 }}>
        <span className="accent" style={{ width: 56, background: 'var(--green)' }} />
        <div className="cardhead">
          <div>
            <h3>Subscription Plans</h3>
            <p className="sub">Pricing tiers exposed to customers</p>
          </div>
          <button
            onClick={() => setShowPlanForm(!showPlanForm)}
            className="btn-a shrink-0"
            style={{ marginLeft: 'auto', height: 32, padding: '0 16px', fontSize: 12 }}
          >
            <Plus size={14} />
            Add Plan
          </button>
        </div>

        {showPlanForm && (
          <div className="inset" style={{ marginTop: 20, padding: '18px 20px' }}>
            <div className="grid grid-cols-2 gap-4">
              <div className="field">
                <label>PLAN ID</label>
                <input
                  type="text"
                  value={planForm.planId}
                  onChange={(e) => setPlanForm({ ...planForm, planId: e.target.value })}
                  placeholder="e.g. pro"
                  style={{ ...inputBox, background: 'var(--panel)' }}
                />
              </div>
              <div className="field">
                <label>PLAN NAME</label>
                <input
                  type="text"
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  placeholder="e.g. Pro"
                  style={{ ...inputBox, background: 'var(--panel)' }}
                />
              </div>
              <div className="field">
                <label>MONTHLY PRICE ($)</label>
                <input
                  type="number"
                  value={planForm.priceMonthly}
                  onChange={(e) => setPlanForm({ ...planForm, priceMonthly: Number(e.target.value) })}
                  style={{ ...inputBox, background: 'var(--panel)', fontFamily: 'var(--mono)' }}
                />
              </div>
              <div className="field">
                <label>YEARLY PRICE ($)</label>
                <input
                  type="number"
                  value={planForm.priceYearly}
                  onChange={(e) => setPlanForm({ ...planForm, priceYearly: Number(e.target.value) })}
                  style={{ ...inputBox, background: 'var(--panel)', fontFamily: 'var(--mono)' }}
                />
              </div>
              <div className="field">
                <label>SORT ORDER</label>
                <input
                  type="number"
                  value={planForm.sortOrder}
                  onChange={(e) => setPlanForm({ ...planForm, sortOrder: Number(e.target.value) })}
                  style={{ ...inputBox, background: 'var(--panel)', fontFamily: 'var(--mono)' }}
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2" style={{ height: 42, fontSize: 13, color: 'var(--text)' }}>
                  <input
                    type="checkbox"
                    checked={planForm.isActive}
                    onChange={(e) => setPlanForm({ ...planForm, isActive: e.target.checked })}
                    style={{ accentColor: 'var(--amber)' }}
                  />
                  Active
                </label>
              </div>
            </div>
            {/* Stripe IDs */}
            <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px solid var(--line)' }}>
              <p className="lbl" style={{ marginBottom: 12 }}>STRIPE INTEGRATION (OPTIONAL)</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="field">
                  <label>STRIPE PRODUCT ID</label>
                  <input
                    type="text"
                    value={planForm.stripeProductId}
                    onChange={(e) => setPlanForm({ ...planForm, stripeProductId: e.target.value })}
                    placeholder="prod_xxx"
                    style={{ ...inputBox, background: 'var(--panel)', fontFamily: 'var(--mono)', fontSize: 12 }}
                  />
                </div>
                <div className="field">
                  <label>MONTHLY PRICE ID</label>
                  <input
                    type="text"
                    value={planForm.stripePriceIdMonthly}
                    onChange={(e) => setPlanForm({ ...planForm, stripePriceIdMonthly: e.target.value })}
                    placeholder="price_xxx"
                    style={{ ...inputBox, background: 'var(--panel)', fontFamily: 'var(--mono)', fontSize: 12 }}
                  />
                </div>
                <div className="field">
                  <label>YEARLY PRICE ID</label>
                  <input
                    type="text"
                    value={planForm.stripePriceIdYearly}
                    onChange={(e) => setPlanForm({ ...planForm, stripePriceIdYearly: e.target.value })}
                    placeholder="price_xxx"
                    style={{ ...inputBox, background: 'var(--panel)', fontFamily: 'var(--mono)', fontSize: 12 }}
                  />
                </div>
              </div>
            </div>
            <div className="field" style={{ marginTop: 18 }}>
              <label>FEATURES (ONE PER LINE)</label>
              <textarea
                value={planForm.features}
                onChange={(e) => setPlanForm({ ...planForm, features: e.target.value })}
                rows={4}
                placeholder={"Unlimited trades\nAdvanced analytics\nPriority support"}
                className="resize-none"
                style={{ ...inputBox, background: 'var(--panel)', height: 'auto', padding: '11px 14px', lineHeight: '19px' }}
              />
            </div>
            <div className="flex justify-end gap-3" style={{ marginTop: 18 }}>
              <button
                onClick={() => setShowPlanForm(false)}
                className="btn-g"
                style={{ height: 34, padding: '0 16px', fontSize: 12 }}
              >
                Cancel
              </button>
              <button
                onClick={handleSavePlan}
                disabled={!planForm.planId || !planForm.name}
                className="btn-a disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ height: 34, padding: '0 16px', fontSize: 12 }}
              >
                <FloppyDisk size={14} />
                Save Plan
              </button>
            </div>
          </div>
        )}

        {/* Existing plans list */}
        {plans && plans.length > 0 ? (
          <div style={{ marginTop: 18 }}>
            {[...plans]
              .sort((a: Plan, b: Plan) => a.sortOrder - b.sortOrder)
              .map((plan: Plan) => (
                <div key={plan._id} className="mrow">
                  <span className="ic" />
                  <span className="lb" style={{ marginLeft: 0 }}>
                    <span style={{ fontWeight: 700, color: 'var(--text)' }}>{plan.name}</span>
                    <span style={{ marginLeft: 10, fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--muted-2)' }}>
                      ${plan.priceMonthly}/mo &bull; ${plan.priceYearly}/yr
                    </span>
                  </span>
                  <span
                    className="chip"
                    style={{
                      marginLeft: 'auto', height: 20, padding: '0 10px',
                      fontSize: 9, fontWeight: 700, letterSpacing: '.04em',
                      color: plan.isActive ? 'var(--green)' : 'var(--muted-2)',
                    }}
                  >
                    {plan.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
              ))}
          </div>
        ) : (
          <p className="empty-line" style={{ padding: '34px 0 8px' }}>No plans yet. Add one above.</p>
        )}
      </section>
    </div>
  );
}
