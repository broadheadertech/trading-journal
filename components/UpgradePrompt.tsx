'use client';

import { Lock } from 'lucide-react';
import { useState } from 'react';
import { TierName, TIERS } from '@/lib/features';
import PricingPlans from '@/components/PricingPlans';

interface UpgradePromptProps {
  requiredTier: TierName;
}

export default function UpgradePrompt({ requiredTier }: UpgradePromptProps) {
  const [pricingOpen, setPricingOpen] = useState(false);
  const tierLabel = TIERS[requiredTier].label;

  return (
    <div className="blank" style={{ minHeight: 380 }}>
      <span className="corner" style={{ left: 0, top: 0, borderRight: 0, borderBottom: 0 }} />
      <span className="corner" style={{ right: 0, top: 0, borderLeft: 0, borderBottom: 0 }} />
      <span className="corner" style={{ left: 0, bottom: 0, borderRight: 0, borderTop: 0 }} />
      <span className="corner" style={{ right: 0, bottom: 0, borderLeft: 0, borderTop: 0 }} />

      <span className="badge" style={{ border: '1px solid rgba(217,148,5,.5)' }}>
        <Lock size={24} style={{ color: 'var(--amber)' }} />
      </span>

      <h4>{tierLabel} Plan Required</h4>
      <p style={{ maxWidth: 380 }}>
        This feature is available on the {tierLabel} plan and above. Upgrade to unlock it.
      </p>

      <button
        onClick={() => setPricingOpen(true)}
        className="btn-a"
        style={{ marginTop: 28 }}
      >
        View Plans
      </button>

      <PricingPlans open={pricingOpen} onClose={() => setPricingOpen(false)} />
    </div>
  );
}
