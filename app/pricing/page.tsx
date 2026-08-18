'use client';

import type { CSSProperties } from 'react';
import { useState } from 'react';
import Link from 'next/link';
import LandingNav from '@/components/landing/LandingNav';
import Footer from '@/components/landing/Footer';

const PLAN_PRICES = {
  core: { m: '$29', a: '$24' },
  pro: { m: '$39', a: '$32' },
  elite: { m: '$59', a: '$49' },
} as const;

const BILLED = { m: 'Billed monthly', a: 'Billed annually' } as const;

const FAQ: { q: string; a?: string }[] = [
  {
    q: 'Do I need a credit card to start the trial?',
    a: 'No. The 15-day free trial is genuinely no-card. You only enter payment details if you decide to continue after the trial ends.',
  },
  { q: 'What happens after my trial?' },
  { q: 'Can I cancel anytime?' },
  { q: 'Do you support my broker?' },
  { q: 'Is my trade data safe?' },
  { q: 'Do you offer refunds?' },
];

export default function PricingPage() {
  // the reference build's #ptoggle script rewrites `.price b` and `.billed` text
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('monthly');
  // the reference build opens the first answer-bearing item and toggles on click
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const k = cycle === 'annual' ? 'a' : 'm';

  return (
    <div className="atlas-site">
      <LandingNav />

      <div className="phero" style={{ '--band': '420px', padding: '118px 0 0' } as CSSProperties}>
        <div className="panelgrid"></div>
        <div className="wrap">
          <h1>Plans for solo traders<em style={{ fontWeight: 500 }}>and teams</em></h1>
          <p className="sub" style={{ marginTop: '30px' }}>15-day free trial on every plan. No credit card to start.</p>
          <div className="toggle2" id="ptoggle" style={{ marginTop: '26px' }}>
            <button className={cycle === 'monthly' ? 'on' : undefined} data-cycle="monthly" onClick={() => setCycle('monthly')}>Monthly</button>
            <button className={cycle === 'annual' ? 'on' : undefined} data-cycle="annual" onClick={() => setCycle('annual')}>Annual</button>
            <span className="save">SAVE 17%</span>
          </div>
          <div className="pricelist">
            <div className="r"><b>CORE</b><span>$29</span></div>
            <div className="r"><b className="amber">PRO</b><span>$39</span></div>
            <div className="r"><b>ELITE</b><span>$59</span></div>
          </div>
        </div>
      </div>

      <div className="wrap" style={{ marginTop: '112px' }}>
        <div className="plans" style={{ marginTop: 0 }}>
          <div className="plan">
            <h3>Atlas Core</h3>
            <p className="who">For beginner to intermediate solo traders</p>
            <div className="price"><b>{PLAN_PRICES.core[k]}</b><span>/month</span></div>
            <p className="billed">{BILLED[k]}</p>
            <ul>
              <li><svg width="12" height="9" viewBox="0 0 11.5 9" fill="none"><path d="M0 4.5 L4 9 L11.5 0" stroke="#2fd3c4" strokeWidth="1.6"/></svg><span>Unlimited trade journaling</span></li>
              <li><svg width="12" height="9" viewBox="0 0 11.5 9" fill="none"><path d="M0 4.5 L4 9 L11.5 0" stroke="#2fd3c4" strokeWidth="1.6"/></svg><span>Basic performance analytics (PnL, win rate, equity curve)</span></li>
              <li><svg width="12" height="9" viewBox="0 0 11.5 9" fill="none"><path d="M0 4.5 L4 9 L11.5 0" stroke="#2fd3c4" strokeWidth="1.6"/></svg><span>Trading journal + notes system</span></li>
              <li><svg width="12" height="9" viewBox="0 0 11.5 9" fill="none"><path d="M0 4.5 L4 9 L11.5 0" stroke="#2fd3c4" strokeWidth="1.6"/></svg><span>Basic playbook rules</span></li>
              <li><svg width="12" height="9" viewBox="0 0 11.5 9" fill="none"><path d="M0 4.5 L4 9 L11.5 0" stroke="#2fd3c4" strokeWidth="1.6"/></svg><span>Manual trade entry</span></li>
              <li><svg width="12" height="9" viewBox="0 0 11.5 9" fill="none"><path d="M0 4.5 L4 9 L11.5 0" stroke="#2fd3c4" strokeWidth="1.6"/></svg><span>Dashboard insights (Net PnL, trades, win rate)</span></li>
              <li><svg width="12" height="9" viewBox="0 0 11.5 9" fill="none"><path d="M0 4.5 L4 9 L11.5 0" stroke="#2fd3c4" strokeWidth="1.6"/></svg><span>Access to trading tools (calculator, session tracker)</span></li>
              <li><svg width="12" height="9" viewBox="0 0 11.5 9" fill="none"><path d="M0 4.5 L4 9 L11.5 0" stroke="#2fd3c4" strokeWidth="1.6"/></svg><span>Economic calendar access</span></li>
            </ul>
            <div className="foot">
              <div className="goal" style={{ marginTop: 0, paddingTop: 0, border: 0 }}><i></i><span><b>Goal:</b> Get traders consistent &amp; disciplined</span></div>
              <Link className="buy" href="/pricing">Start 15-Day Free Trial
                <svg width="5" height="10" viewBox="0 0 5 10" fill="none" style={{ marginLeft: '10px' }}><path d="M0 0 L5 5 L0 10" stroke="#edf2f7" strokeWidth="1.6"/></svg></Link>
              <p className="nocard">No credit card required</p>
            </div>
          </div>

          <div className="plan pro">
            <span className="badge">MOST POPULAR</span>
            <h3>Atlas Pro</h3>
            <p className="who">For serious traders leveling up performance</p>
            <div className="price"><b>{PLAN_PRICES.pro[k]}</b><span>/month</span></div>
            <p className="billed">{BILLED[k]}</p>
            <ul>
              <li><svg width="12" height="9" viewBox="0 0 11.5 9" fill="none"><path d="M0 4.5 L4 9 L11.5 0" stroke="#d99405" strokeWidth="1.6"/></svg><span>Everything in Core</span></li>
              <li><svg width="12" height="9" viewBox="0 0 11.5 9" fill="none"><path d="M0 4.5 L4 9 L11.5 0" stroke="#d99405" strokeWidth="1.6"/></svg><span>Advanced analytics (50+ metrics)</span></li>
              <li><svg width="12" height="9" viewBox="0 0 11.5 9" fill="none"><path d="M0 4.5 L4 9 L11.5 0" stroke="#d99405" strokeWidth="1.6"/></svg><span>AI trade insights / mistake detection</span></li>
              <li><svg width="12" height="9" viewBox="0 0 11.5 9" fill="none"><path d="M0 4.5 L4 9 L11.5 0" stroke="#d99405" strokeWidth="1.6"/></svg><span>Playbook automation &amp; rule tracking</span></li>
              <li><svg width="12" height="9" viewBox="0 0 11.5 9" fill="none"><path d="M0 4.5 L4 9 L11.5 0" stroke="#d99405" strokeWidth="1.6"/></svg><span>Trade tagging &amp; strategy breakdown</span></li>
              <li><svg width="12" height="9" viewBox="0 0 11.5 9" fill="none"><path d="M0 4.5 L4 9 L11.5 0" stroke="#d99405" strokeWidth="1.6"/></svg><span>Equity curve + drawdown analytics</span></li>
              <li><svg width="12" height="9" viewBox="0 0 11.5 9" fill="none"><path d="M0 4.5 L4 9 L11.5 0" stroke="#d99405" strokeWidth="1.6"/></svg><span>Session &amp; activity heatmap</span></li>
              <li><svg width="12" height="9" viewBox="0 0 11.5 9" fill="none"><path d="M0 4.5 L4 9 L11.5 0" stroke="#d99405" strokeWidth="1.6"/></svg><span>API sync (MT4/MT5 / supported brokers)</span></li>
              <li><svg width="12" height="9" viewBox="0 0 11.5 9" fill="none"><path d="M0 4.5 L4 9 L11.5 0" stroke="#d99405" strokeWidth="1.6"/></svg><span>Performance reports &amp; export</span></li>
              <li><svg width="12" height="9" viewBox="0 0 11.5 9" fill="none"><path d="M0 4.5 L4 9 L11.5 0" stroke="#d99405" strokeWidth="1.6"/></svg><span>Priority support</span></li>
            </ul>
            <div className="foot">
              <div className="goal" style={{ marginTop: 0, paddingTop: 0, border: 0 }}><i></i><span><b>Goal:</b> Turn traders into data-driven performers</span></div>
              <Link className="buy" href="/pricing">Start 15-Day Free Trial
                <svg width="5" height="10" viewBox="0 0 5 10" fill="none" style={{ marginLeft: '10px' }}><path d="M0 0 L5 5 L0 10" stroke="#0a0a0a" strokeWidth="1.6"/></svg></Link>
              <p className="nocard">No credit card required</p>
            </div>
          </div>

          <div className="plan">
            <h3>Atlas Elite</h3>
            <p className="who">For mentors, funded traders, and trading communities</p>
            <div className="price"><b>{PLAN_PRICES.elite[k]}</b><span>/month</span></div>
            <p className="billed">{BILLED[k]}</p>
            <ul>
              <li><svg width="12" height="9" viewBox="0 0 11.5 9" fill="none"><path d="M0 4.5 L4 9 L11.5 0" stroke="#2fd3c4" strokeWidth="1.6"/></svg><span>Everything in Pro</span></li>
              <li><svg width="12" height="9" viewBox="0 0 11.5 9" fill="none"><path d="M0 4.5 L4 9 L11.5 0" stroke="#2fd3c4" strokeWidth="1.6"/></svg><span>Team / student management system</span></li>
              <li><svg width="12" height="9" viewBox="0 0 11.5 9" fill="none"><path d="M0 4.5 L4 9 L11.5 0" stroke="#2fd3c4" strokeWidth="1.6"/></svg><span>Shared workspace (Discord / community integration)</span></li>
              <li><svg width="12" height="9" viewBox="0 0 11.5 9" fill="none"><path d="M0 4.5 L4 9 L11.5 0" stroke="#2fd3c4" strokeWidth="1.6"/></svg><span>Cohort analytics (track students or members)</span></li>
              <li><svg width="12" height="9" viewBox="0 0 11.5 9" fill="none"><path d="M0 4.5 L4 9 L11.5 0" stroke="#2fd3c4" strokeWidth="1.6"/></svg><span>Trade review &amp; coaching tools</span></li>
              <li><svg width="12" height="9" viewBox="0 0 11.5 9" fill="none"><path d="M0 4.5 L4 9 L11.5 0" stroke="#2fd3c4" strokeWidth="1.6"/></svg><span>Leaderboards &amp; performance rankings</span></li>
              <li><svg width="12" height="9" viewBox="0 0 11.5 9" fill="none"><path d="M0 4.5 L4 9 L11.5 0" stroke="#2fd3c4" strokeWidth="1.6"/></svg><span>Audit logs (track member activity)</span></li>
              <li><svg width="12" height="9" viewBox="0 0 11.5 9" fill="none"><path d="M0 4.5 L4 9 L11.5 0" stroke="#2fd3c4" strokeWidth="1.6"/></svg><span>Aggregated reports (group performance)</span></li>
              <li><svg width="12" height="9" viewBox="0 0 11.5 9" fill="none"><path d="M0 4.5 L4 9 L11.5 0" stroke="#2fd3c4" strokeWidth="1.6"/></svg><span>Invite system (build your academy inside Atlas)</span></li>
              <li><svg width="12" height="9" viewBox="0 0 11.5 9" fill="none"><path d="M0 4.5 L4 9 L11.5 0" stroke="#2fd3c4" strokeWidth="1.6"/></svg><span>Early access to new features</span></li>
              <li><svg width="12" height="9" viewBox="0 0 11.5 9" fill="none"><path d="M0 4.5 L4 9 L11.5 0" stroke="#2fd3c4" strokeWidth="1.6"/></svg><span>VIP support</span></li>
            </ul>
            <div className="foot">
              <div className="goal" style={{ marginTop: 0, paddingTop: 0, border: 0 }}><i></i><span><b>Goal:</b> Build your Atlas Trading Academy ecosystem</span></div>
              <Link className="buy" href="/pricing">Start 15-Day Free Trial
                <svg width="5" height="10" viewBox="0 0 5 10" fill="none" style={{ marginLeft: '10px' }}><path d="M0 0 L5 5 L0 10" stroke="#edf2f7" strokeWidth="1.6"/></svg></Link>
              <p className="nocard">No credit card required</p>
            </div>
          </div>
        </div>

        <div className="pricenotes" style={{ gap: '90px', marginTop: '57px' }}>
          <div><svg width="12" height="9" viewBox="0 0 11.5 9" fill="none"><path d="M0 4.5 L4 9 L11.5 0" stroke="#2fd3c4" strokeWidth="1.6"/></svg>No credit card required</div>
          <div><svg width="12" height="9" viewBox="0 0 11.5 9" fill="none"><path d="M0 4.5 L4 9 L11.5 0" stroke="#2fd3c4" strokeWidth="1.6"/></svg>Cancel anytime</div>
          <div><svg width="12" height="9" viewBox="0 0 11.5 9" fill="none"><path d="M0 4.5 L4 9 L11.5 0" stroke="#2fd3c4" strokeWidth="1.6"/></svg>Full access during trial</div>
        </div>
      </div>

      {/* compare */}
      <div style={{ borderTop: '1px solid var(--line)', marginTop: '88px', paddingTop: '75px' }}>
        <div className="wrap">
          <p style={{ margin: 0, fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--teal)', letterSpacing: '.03em' }}>COMPARE</p>
          <h2 style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: '48px', lineHeight: '52px', margin: '22px 0 0' }}>What&rsquo;s included on each tier</h2>
          <div className="cmpwrap">
            <table className="cmp">
              <thead><tr><th>FEATURE</th><th>FREE</th><th className="pro">PRO</th><th>TEAM</th><th>ELITE</th></tr></thead>
              <tbody>
                <tr className="grp"><td colSpan={5}>CORE</td></tr>
                <tr><td>Trade imports</td><td>50 / mo</td><td className="pro">Unlimited</td><td>Unlimited</td><td>Unlimited</td></tr>
                <tr><td>Broker support</td><td>CSV only</td><td className="pro">67+ brokers</td><td>67+ brokers</td><td>67+ brokers</td></tr>
                <tr><td>Strategies</td><td>3</td><td className="pro">Unlimited</td><td>Unlimited</td><td>Unlimited</td></tr>
                <tr className="grp"><td colSpan={5}>ANALYTICS</td></tr>
                <tr><td>Verdict detectors</td><td>5</td><td className="pro">28+</td><td>28+</td><td>28+</td></tr>
                <tr><td>Performance metrics</td><td>10</td><td className="pro">50+</td><td>50+</td><td>50+</td></tr>
                <tr><td>What-if simulator</td><td data-cell="no"></td><td className="pro" data-cell="yes-pro"></td><td data-cell="yes"></td><td data-cell="yes"></td></tr>
                <tr className="grp"><td colSpan={5}>DISCIPLINE</td></tr>
                <tr><td>Discipline score</td><td data-cell="no"></td><td className="pro" data-cell="yes-pro"></td><td data-cell="yes"></td><td data-cell="yes"></td></tr>
                <tr><td>Custom playbook rules</td><td data-cell="no"></td><td className="pro" data-cell="yes-pro"></td><td data-cell="yes"></td><td data-cell="yes"></td></tr>
                <tr><td>Behavior analysis</td><td data-cell="no"></td><td className="pro" data-cell="yes-pro"></td><td data-cell="yes"></td><td data-cell="yes"></td></tr>
                <tr className="grp"><td colSpan={5}>TEAM</td></tr>
                <tr><td>Multi-trader workspace</td><td data-cell="no"></td><td className="pro" data-cell="no"></td><td data-cell="yes"></td><td data-cell="yes"></td></tr>
                <tr><td>Coach review tools</td><td data-cell="no"></td><td className="pro" data-cell="no"></td><td data-cell="yes"></td><td data-cell="yes"></td></tr>
                <tr className="grp"><td colSpan={5}>SUPPORT</td></tr>
                <tr><td>Priority support</td><td data-cell="no"></td><td className="pro" data-cell="no"></td><td data-cell="yes"></td><td data-cell="yes"></td></tr>
                <tr><td>Dedicated CSM</td><td data-cell="no"></td><td className="pro" data-cell="no"></td><td data-cell="no"></td><td data-cell="yes"></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* first week */}
      <div className="wrap" style={{ marginTop: '126px' }}>
        <p style={{ margin: 0, fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--teal)', letterSpacing: '.03em' }}>YOUR FIRST WEEK</p>
        <h2 style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: '48px', lineHeight: '52px', margin: '27px 0 0' }}>From signup to measurable improvement</h2>
        <p className="lede-lg" style={{ marginTop: '22px' }}>The fastest path from &ldquo;I just signed up&rdquo; to &ldquo;I know exactly what&rsquo;s costing me money.&rdquo;</p>
        <div className="week3">
          <div className="day">
            <div className="dl">DAY 1</div>
            <h4>Upload your first trades</h4>
            <p>Connect any of 67+ brokers via CSV or API. Auto-detected and normalized in under 60 seconds.</p>
            <div className="panel">
              <div className="drop" style={{ left: '22px', right: '22px', top: '22px', height: '66px', borderColor: 'var(--teal)', opacity: .6 }}>
                <svg width="12" height="14" viewBox="0 0 12 14" fill="none"><path d="M6 0 V14 M6 0 L0 6 M6 0 L12 6" stroke="#2fd3c4" strokeWidth="1.6" strokeLinecap="round"/></svg>
                <small>trades_q4.csv</small>
              </div>
              <div className="tick-list" style={{ top: '102px' }}>
                <div><svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M0 3.5 L3 7 L9 0" stroke="#24c88a" strokeWidth="1.4"/></svg>Broker detected</div>
                <div><svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M0 3.5 L3 7 L9 0" stroke="#24c88a" strokeWidth="1.4"/></svg>Normalizing 482 fills</div>
                <div><svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M0 3.5 L3 7 L9 0" stroke="#24c88a" strokeWidth="1.4"/></svg>Computing metrics</div>
                <div><svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M0 3.5 L3 7 L9 0" stroke="#24c88a" strokeWidth="1.4"/></svg>Ready in 48s</div>
              </div>
            </div>
          </div>
          <div className="day">
            <div className="dl">DAY 3</div>
            <h4>See your costliest leaks</h4>
            <p>The verdict engine has now ranked every costly pattern by dollar impact. Bleeding patterns surfaced.</p>
            <div className="panel">
              <div className="leaklist" style={{ top: '21px' }}>
                <div className="hd" style={{ color: 'var(--amber)' }}>VERDICTS · BY $ IMPACT</div>
                <div className="r"><span>revenge trading</span><span style={{ fontFamily: 'var(--body)', fontWeight: 700, color: 'var(--red)' }}>−$1,420</span></div>
                <div className="b"><i style={{ width: '100%', background: 'var(--red)' }}></i></div>
                <div className="r"><span>oversized position</span><span style={{ fontFamily: 'var(--body)', fontWeight: 700, color: 'var(--red)' }}>−$890</span></div>
                <div className="b"><i style={{ width: '62%', background: 'var(--red)' }}></i></div>
                <div className="r"><span>FOMO entries</span><span style={{ fontFamily: 'var(--body)', fontWeight: 700, color: 'var(--amber)' }}>−$540</span></div>
                <div className="b"><i style={{ width: '38%', background: 'var(--amber)' }}></i></div>
                <div className="r"><span>late session</span><span style={{ fontFamily: 'var(--body)', fontWeight: 700, color: 'var(--amber)' }}>−$280</span></div>
                <div className="b"><i style={{ width: '20%', background: 'var(--amber)' }}></i></div>
              </div>
            </div>
          </div>
          <div className="day">
            <div className="dl">DAY 7</div>
            <h4>Set rules, track compliance</h4>
            <p>Define a personal playbook. Compliance auto-tracked on every new trade. Discipline is now measurable.</p>
            <div className="panel">
              <div className="bars" style={{ top: '21px' }}>
                <div className="hd">DISCIPLINE · 4 WEEKS</div>
                <div className="set">
                  <div><i style={{ height: '34px' }}></i><b>W1</b><span>62%</span></div>
                  <div><i style={{ height: '44px' }}></i><b>W2</b><span>71%</span></div>
                  <div><i style={{ height: '54px' }}></i><b>W3</b><span>78%</span></div>
                  <div><i style={{ height: '62px' }}></i><b>W4</b><span>86%</span></div>
                </div>
                <div className="base"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* pricing faq */}
      <div style={{ borderTop: '1px solid var(--line)', marginTop: '82px', paddingTop: '76px' }}>
        <div className="wrap">
          <p style={{ margin: 0, fontFamily: 'var(--mono)', fontSize: '13px', color: 'var(--teal)', letterSpacing: '.03em' }}>FAQ</p>
          <h2 style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: '48px', lineHeight: '52px', margin: '22px 0 0' }}>Pricing questions</h2>
          <div className="faq">
            {FAQ.map((item, i) => {
              const open = item.a !== undefined && openIdx === i;
              return (
                <div
                  key={item.q}
                  className={open ? 'faq-item open' : 'faq-item'}
                  onClick={() => { if (item.a !== undefined) setOpenIdx(open ? null : i); }}
                >
                  <h4>{item.q}</h4>
                  <svg className="chev" viewBox="0 0 16 8" fill="none">
                    <path d={open ? 'M0 8 L8 0 L16 8' : 'M0 0 L8 8 L16 0'} stroke={open ? '#d99405' : '#7f8ea3'} strokeWidth="1.6"/>
                  </svg>
                  {open && <p>{item.a}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="pcta" style={{ marginTop: '100px', paddingBottom: '120px' }}>
        <div className="gridwash"></div><div className="glow"></div>
        <div className="wrap">
          <p className="kicker" style={{ justifyContent: 'center', color: 'var(--teal)', fontWeight: 700, fontSize: '12px', marginBottom: '12px' }}>EVERY PLAN</p>
          <h2>14-day free trial on every plan</h2>
          <div style={{ display: 'flex', gap: '52px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '26px', fontSize: '14px', color: 'var(--muted-5)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '9px' }}><svg width="12" height="9" viewBox="0 0 11.5 9" fill="none"><path d="M0 4.5 L4 9 L11.5 0" stroke="#2fd3c4" strokeWidth="1.7"/></svg>No credit card required</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '9px' }}><svg width="12" height="9" viewBox="0 0 11.5 9" fill="none"><path d="M0 4.5 L4 9 L11.5 0" stroke="#2fd3c4" strokeWidth="1.7"/></svg>Full Pro access for 14 days</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '9px' }}><svg width="12" height="9" viewBox="0 0 11.5 9" fill="none"><path d="M0 4.5 L4 9 L11.5 0" stroke="#2fd3c4" strokeWidth="1.7"/></svg>Cancel anytime — one click</span>
          </div>
          <div className="row" style={{ marginTop: '26px' }}><Link className="btn btn-amber" href="/pricing">Start Free Trial<svg className="arrow-r" viewBox="0 0 12 9" fill="none"><path d="M0 4.5 H12 M12 4.5 L7 0 M12 4.5 L7 9" stroke="#0a0a0a" strokeWidth="1.7" strokeLinecap="round"/></svg></Link></div>
          <p style={{ margin: '44px 0 0', fontSize: '12.5px', color: 'var(--muted-2)' }}>15-day free trial · No credit card · Cancel in one click</p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
