'use client';

import Link from 'next/link';
import { useState } from 'react';

type Cycle = 'monthly' | 'annual';

const CORE_FEATURES = [
  'Unlimited trade journaling',
  'Basic performance analytics (win rate, avg win, equity curve)',
  'Trading journal + notes system',
  'Basic playbook rules',
  'Manual trade entry',
  'Behavioral insights (win rate, streaks, R:R data)',
  'Session-in-trading tools (best sessions, session tracker)',
  'Economic calendar access',
];

const PRO_FEATURES = [
  'Everything in Core',
  'Advanced analytics (AI scoring)',
  'AI trade insights / mistake detection',
  'Playbook automation & rule tracking',
  'Trade tagging & strategy breakdown',
  'Equity curve + drawdown analytics',
  'Sessions & setup heatmap',
  'Auto-sync (multi-broker / equipment brokers)',
  'Performance reports & export',
  'Priority support',
];

const ELITE_FEATURES = [
  'Everything in Pro',
  'Team / student management system',
  'Shared workspace (shared, community integrations)',
  'Cohort analytics (track students or members)',
  'Mentor review & marking mode',
  'Leaderboards & performance rankings',
  'Audit logs (track member activity)',
  'Aggregated reports (group performance)',
  'Rules system (build your academy / trade rules)',
  'Early access to new features',
  '1:1 support',
];

function Check({ stroke }: { stroke: string }) {
  return (
    <svg width="11.5" height="9" viewBox="0 0 11.5 9" fill="none"><path d="M0 4.5 L4 9 L11.5 0" stroke={stroke} strokeWidth="1.6" /></svg>
  );
}

function Features({ items, stroke }: { items: string[]; stroke: string }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item}><Check stroke={stroke} /><span>{item}</span></li>
      ))}
    </ul>
  );
}

export default function Pricing() {
  const [cycle, setCycle] = useState<Cycle>('monthly');
  const annual = cycle === 'annual';
  const price = (m: string, a: string) => (annual ? a : m);
  const billed = annual ? 'Billed annually' : 'Billed monthly';

  return (
    <div className="sec09">
      <div className="wrap">
        <div className="pricehead">
          <div>
            <p className="eyebrow">PRICING</p>
            <h2 className="h2" style={{ marginTop: '11px' }}>Plans for solo traders and teams</h2>
            <p className="lede-lg" style={{ marginTop: '23px' }}>30-day free trial on every plan. No credit card to start.</p>
          </div>
          <div className="right" style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '40px' }}>
            <div className="toggle">
              <button className={annual ? undefined : 'on'} data-cycle="monthly" onClick={() => setCycle('monthly')}>Monthly</button>
              <button className={annual ? 'on' : undefined} data-cycle="annual" onClick={() => setCycle('annual')}>Annual</button>
              <span className="save">SAVE 20%</span>
            </div>
          </div>
        </div>

        <div className="plans">
          <div className="plan">
            <h3>Atlas Core</h3>
            <p className="who">For beginners to intermediate traders</p>
            <div className="price"><b data-m="$29" data-a="$23">{price('$29', '$23')}</b><span>/month</span></div>
            <p className="billed" data-m="Billed monthly" data-a="Billed annually">{billed}</p>
            <Features items={CORE_FEATURES} stroke="#2fd3c4" />
            <div className="foot">
              <div className="best"><em>BEST</em><p>Best for traders who want to build a track record</p></div>
              <Link className="buy" href="/pricing">Start 30-Day Free Trial</Link>
              <p className="nocard">No credit card required</p>
            </div>
          </div>

          <div className="plan pro">
            <span className="badge">MOST POPULAR</span>
            <h3>Atlas Pro</h3>
            <p className="who">For serious traders scaling up performance</p>
            <div className="price"><b data-m="$39" data-a="$31">{price('$39', '$31')}</b><span>/month</span></div>
            <p className="billed" data-m="Billed monthly" data-a="Billed annually">{billed}</p>
            <Features items={PRO_FEATURES} stroke="#d99405" />
            <div className="foot">
              <div className="best"><em>BEST</em><p>Best for traders who want data-driven performance</p></div>
              <Link className="buy" href="/pricing">Start 30-Day Free Trial</Link>
              <p className="nocard">No credit card required</p>
            </div>
          </div>

          <div className="plan">
            <h3>Atlas Elite</h3>
            <p className="who">For mentors, funded traders and trading communities</p>
            <div className="price"><b data-m="$59" data-a="$47">{price('$59', '$47')}</b><span>/month</span></div>
            <p className="billed" data-m="Billed monthly" data-a="Billed annually">{billed}</p>
            <Features items={ELITE_FEATURES} stroke="#2fd3c4" />
            <div className="foot">
              <div className="best"><em>BEST</em><p>Best for communities that need visibility across every account</p></div>
              <Link className="buy" href="/pricing">Start 30-Day Free Trial</Link>
              <p className="nocard">No credit card required</p>
            </div>
          </div>
        </div>

        <div className="pricenotes">
          <div><i></i>No credit card required</div>
          <div><i></i>Cancel anytime</div>
          <div><i></i>Full access during trial</div>
        </div>
      </div>
    </div>
  );
}
