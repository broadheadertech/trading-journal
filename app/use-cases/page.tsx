import Link from 'next/link';
import LandingNav from '@/components/landing/LandingNav';
import Footer from '@/components/landing/Footer';

export default function UseCasesPage() {
  return (
    <div className="atlas-site">
      <LandingNav />

      <div className="phero" style={{ '--band': '400px', padding: '132px 0 0' } as React.CSSProperties}>
        <div className="panelgrid"></div>
        <div className="wrap">
          <h1 className="light">Use<em>cases</em></h1>
          <p className="sub" style={{ marginTop: '50px' }}>How traders, prop firms, and coaches use Atlas to improve execution discipline.</p>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--line)', marginTop: '72px', paddingTop: '55px' }}>
        <div className="wrap">
          <div className="ucrow">
            <div><p className="eb">SOLO TRADER SELF-REVIEW</p><h3>Find what’s costing you and<br />fix it week-by-week</h3></div>
            <div className="body">
              <p>Import your trades, get behavioral feedback per session, surface costly errors, and watch your discipline score climb week-over-week. The journal you wish you had been keeping.</p>
              <ul><li><i></i>Daily and weekly performance summaries</li><li><i></i>Pattern detectors ranked by dollar impact</li><li><i></i>Discipline streak tracker</li></ul>
            </div>
          </div>
          <div className="ucrow">
            <div><p className="eb">PROP FIRM &amp; TEAM COACHING</p><h3>Review every trader on one<br />shared dashboard</h3></div>
            <div className="body">
              <p>Coaches and team managers review trader profiles side-by-side, surface common desk problems, and verify playbook adherence — especially critical for funded traders working under firm rules.</p>
              <ul><li><i></i>Multi-trader dashboards with role-based access</li><li><i></i>Per-trader playbook compliance scoring</li><li><i></i>Risk-rule violation alerts surfaced to managers</li></ul>
            </div>
          </div>
          <div className="ucrow">
            <div><p className="eb">STRATEGY VALIDATION</p><h3>Test what removing a leak<br />would have done</h3></div>
            <div className="body">
              <p>Use the What-If simulation lab to remove specific behavior patterns from your historical trades and see how performance would have changed. Quantify the upside before committing to a fix.</p>
              <ul><li><i></i>What-if scenarios across rule sets</li><li><i></i>Counterfactual P&amp;L with confidence intervals</li><li><i></i>Side-by-side strategy comparisons</li></ul>
            </div>
          </div>
          <div className="ucrow" style={{ borderBottom: '1px solid var(--line)' }}>
            <div><p className="eb">RISK MANAGEMENT AUDITING</p><h3>Position sizing, stops, and<br />exposure under one roof</h3></div>
            <div className="body">
              <p>Monitor position sizing, stop-loss adherence, drawdown limits, and per-session exposure thresholds. Flag breaches automatically and review the trades that caused them.</p>
              <ul><li><i></i>Configurable risk-rule library</li><li><i></i>Drawdown and exposure heatmaps</li><li><i></i>Audit trail for every breach</li></ul>
            </div>
          </div>
        </div>
      </div>

      <div className="pcta" style={{ marginTop: '111px' }}>
        <div className="gridwash"></div><div className="glow"></div>
        <div className="wrap">
          <h2>Find your use case in 60 seconds</h2>
          <p className="sub">Upload your CSV. See your version of the dashboards above.</p>
          <div className="row">
            <Link className="btn btn-amber" href="/pricing">Start Free Trial<svg className="arrow-r" viewBox="0 0 12 9" fill="none"><path d="M0 4.5 H12 M12 4.5 L7 0 M12 4.5 L7 9" stroke="#0a0a0a" strokeWidth="1.7" strokeLinecap="round" /></svg></Link>
            <Link className="btn btn-ghost" href="/demo">See Demo</Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
