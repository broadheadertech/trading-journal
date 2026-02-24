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
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[var(--muted)] flex items-center justify-center mb-5">
        <Lock size={28} className="text-[var(--muted-foreground)]" />
      </div>
      <h2 className="text-xl font-bold text-[var(--foreground)] mb-2">
        {tierLabel} Plan Required
      </h2>
      <p className="text-sm text-[var(--muted-foreground)] mb-6 max-w-sm">
        This feature is available on the {tierLabel} plan and above. Upgrade to unlock it.
      </p>
      <button
        onClick={() => setPricingOpen(true)}
        className="px-6 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl text-sm font-medium transition-colors"
      >
        View Plans
      </button>
      <PricingPlans open={pricingOpen} onClose={() => setPricingOpen(false)} />
    </div>
  );
}
