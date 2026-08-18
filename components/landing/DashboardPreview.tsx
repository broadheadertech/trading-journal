import Link from 'next/link';

export default function DashboardPreview() {
  return (
    <div className="sec01" style={{ borderTop: '1px solid var(--line)' }}>
      <div className="wrap">
        <div className="sechead">
          <div>
            <p className="eyebrow">CAPABILITY MAP</p>
            <h2 className="h2" style={{ marginTop: '13px' }}>Everything You Need To<br />Become A Better Trader</h2>
          </div>
          <div className="right"><p className="lede">Atlas combines education, performance analytics, journaling, discipline tracking, and community support into one powerful platform.</p></div>
        </div>

        <div className="grid">
          <div className="card leakcard">
            <i className="accent"></i>
            <h3>Find Your Leaks</h3>
            <p className="kicker">LEAKS RANKED BY $ IMPACT</p>
            <div className="leakrow"><span>Overtrading</span><span className="v" style={{ color: 'var(--red)' }}>−$1,420</span></div>
            <div className="leakbar"><i style={{ width: '100%', background: 'var(--amber)' }}></i></div>
            <div className="leakrow"><span>Poor Risk Management</span><span className="v" style={{ color: 'var(--red)' }}>−$890</span></div>
            <div className="leakbar"><i style={{ width: '63%', background: 'var(--amber)' }}></i></div>
            <div className="leakrow"><span>Emotional Decision Making</span><span className="v" style={{ color: 'var(--text-3)' }}>−$540</span></div>
            <div className="leakbar"><i style={{ width: '38%', background: 'var(--amber-dim)' }}></i></div>
            <div className="leakrow"><span>FOMO Entries</span><span className="v" style={{ color: 'var(--text-3)' }}>−$280</span></div>
            <div className="leakbar"><i style={{ width: '20%', background: 'var(--amber-dim)' }}></i></div>
            <div className="leakrow"><span>No Stop Loss</span><span className="v" style={{ color: 'var(--text-3)' }}>−$140</span></div>
            <div className="leakbar"><i style={{ width: '10%', background: 'var(--amber-dim)' }}></i></div>
            <p>Every costly pattern ranked by dollar impact. Revenge trading, overtrading, FOMO — each measured in real money lost.</p>
          </div>

          <div className="sidecards">
            <div>
              <div className="card minicard" style={{ height: '162px' }}>
                <h4>Track Your Discipline</h4>
                <p className="kicker">30-DAY DISCIPLINE SCORE</p>
                <div className="disc">
                  <div className="dial">
                    <svg viewBox="0 0 64 64" width="64" height="64" fill="none">
                      <circle cx="32" cy="32" r="29" stroke="#16202c" strokeWidth="6" />
                      <circle cx="32" cy="32" r="30.5" stroke="#24c88a" strokeWidth="3" strokeLinecap="round"
                        strokeDasharray="191.6" strokeDashoffset="42.2" transform="rotate(-90 32 32)" />
                    </svg>
                    <div className="score"><b>78</b><i>/100</i></div>
                  </div>
                  <div className="week">
                    <div><i style={{ height: '16px' }}></i><span>M</span></div>
                    <div><i style={{ height: '10px' }}></i><span>T</span></div>
                    <div><i style={{ height: '20px' }}></i><span>W</span></div>
                    <div><i style={{ height: '26px' }}></i><span>T</span></div>
                    <div><i style={{ height: '12px' }}></i><span>F</span></div>
                    <div><i style={{ height: '24px' }}></i><span>S</span></div>
                    <div><i style={{ height: '22px' }}></i><span>S</span></div>
                  </div>
                </div>
              </div>
              <p className="note" style={{ fontSize: '13px', lineHeight: '18px', color: 'var(--atlas-muted)', margin: '14px 0 0' }}>Your behavioral health score, emotional pressure tracking, and session-by-session discipline monitoring.</p>
            </div>

            <div>
              <div className="card minicard" style={{ height: '156px' }}>
                <h4>Measure Your Edge</h4>
                <p className="kicker">EQUITY CURVE · 30D</p>
                <div className="edge">
                  <div className="kpi"><b style={{ color: 'var(--green)' }}>93%</b><span>WIN RATE</span></div>
                  <div className="kpi"><b>2.14</b><span>PROFIT FACTOR</span></div>
                  <div className="spark">
                    <svg viewBox="0 0 180 50" width="100%" height="50" fill="none" preserveAspectRatio="none">
                      <defs><linearGradient id="sparkfill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#24c88a" stopOpacity=".28" /><stop offset="1" stopColor="#24c88a" stopOpacity="0" />
                      </linearGradient></defs>
                      <path d="M0 38 L18 32 L36 35 L54 26 L72 28 L90 18 L108 22 L126 10 L144 14 L162 4 L180 0 L180 50 L0 50 Z" fill="url(#sparkfill)" />
                      <path d="M0 38 L18 32 L36 35 L54 26 L72 28 L90 18 L108 22 L126 10 L144 14 L162 4 L180 0" stroke="#24c88a" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
                <div className="edgefoot"><span>Sharpe 1.84</span><span>Max DD 8.2%</span><span className="neg">−$4,230</span></div>
              </div>
              <p className="note" style={{ fontSize: '13px', lineHeight: '18px', color: 'var(--atlas-muted)', margin: '16px 0 0' }}>Win rate, profit factor, equity curve, symbol breakdown — all the metrics that matter, computed automatically.</p>
            </div>
          </div>
        </div>

        <Link className="btn btn-amber" style={{ marginTop: '60px' }} href="/pricing">{'Start Free  · See Your Own Dashboard'}
          <svg className="arrow-r" viewBox="0 0 12 9" fill="none"><path d="M0 4.5 H12 M12 4.5 L7 0 M12 4.5 L7 9" stroke="#0a0a0a" strokeWidth="1.7" strokeLinecap="round" /></svg>
        </Link>
      </div>
    </div>
  );
}
