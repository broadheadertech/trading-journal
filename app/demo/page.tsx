import Link from 'next/link';
import LandingNav from '@/components/landing/LandingNav';
import Footer from '@/components/landing/Footer';

/* Activity heatmap cells — verbatim from the reference build's inline script.
   Suffix 'g' = green at parseInt(v)/100 opacity, 'r' = red at .4, bare = idle. */
const HEAT_RAW =
  '0,70 1,40r 2,70 3,70 4,40r 5,70 6,77g 7,70g 8,68g 9,70 10,54g 11,70 12,70 13,40r 14,70 15,78g 16,72g 17,70g 18,70g 19,70 20,70 21,60g 22,66g 23,73g 24,75g 25,40r 26,58g 27,62g 28,52g 29,70 30,70 31,40r 32,78g 33,74g 34,55g 35,70 36,77g 37,56g 38,75g 39,73g 40,53g 41,70 42,58g 43,70 44,70 45,70 46,71g 47,40r 48,40r 49,60g 50,70 51,54g 52,70 53,70 54,82g 55,70';

const HEAT_CELLS = HEAT_RAW.split(' ').map((c) => {
  const v = c.split(',')[1];
  const last = v.slice(-1);
  if (last === 'g') return { background: '#24c88a', opacity: parseInt(v, 10) / 100 };
  if (last === 'r') return { background: '#ff4d5e', opacity: 0.4 };
  return { background: '#16324a', opacity: 0.7 };
});

/* Hourly P&L bars — verbatim from the reference build's inline script. */
const HOUR_BARS = [3, 4, 5, 6, 7, 5, 4, 3, 2, 5, 12, 22, 34, 46, 52, 58, 54, 44, 34, 28, 22, 16, 12, 8];

export default function DemoPage() {
  return (
    <div className="atlas-site">
      <LandingNav />

      <div className="phero" style={{ '--band': '520px', padding: '108px 0 0' } as React.CSSProperties}>
        <div className="panelgrid" style={{ width: '560px' }}></div>
        <div className="wrap">
          <p className="kicker" style={{ color: '#fff', paddingLeft: '5px', marginBottom: '34px' }}>LIVE DEMO - TRADING ANALYTICS IN ACTION</p>
          <h1 style={{ fontSize: '58px', lineHeight: '63px' }}><span style={{ fontWeight: 700 }}>This is what your</span><em style={{ fontWeight: 400 }}>dashboard looks like</em></h1>
          <p className="sub" style={{ marginTop: '36px' }}>Real screens from the live app with sample data. Upload your own trades and see your actual numbers in under 60 seconds.</p>
          <div className="dstats">
            <p className="hd">SAMPLE DATASET</p>
            <div className="g">
              <div className="s"><b>WINDOW</b><em>30D</em><i></i></div>
              <div className="s"><b>TRADES</b><em>78</em><i></i></div>
              <div className="s"><b>SYMBOLS</b><em>12</em><i></i></div>
              <div className="s"><b>MARKETS</b><em>4</em><i></i></div>
            </div>
          </div>
        </div>
      </div>

      <div className="wrap" style={{ marginTop: '72px' }}>

        {/* row 01 · dashboard */}
        <div className="drow">
          <div className="copy">
            <div className="rule"></div>
            <h3>Dashboard</h3>
            <p>Your main command center - portfolio equity curve, net P&amp;L, win rate, profit factor, activity heatmap, and trade history at a glance. All metrics update automatically as you import trades.</p>
          </div>
          <div className="win" style={{ height: '520px' }}>
            <span className="corner c1"></span><span className="corner c2"></span><span className="corner c3"></span><span className="corner c4"></span>
            <div className="bar"><i></i><i></i><i></i><span>atlas.app/app</span></div>
            <div className="body">
              <p className="lbl">DASHBOARD</p>
              <div className="appbar">
                <h4>Welcome back, trader</h4>
                <div className="tf"><span>1D</span><span>1W</span><span className="on">1M</span><span>3M</span><span>1Y</span><span>ALL</span></div>
              </div>
              <div className="kpis">
                <div className="tile"><b>NET P&amp;L</b><em style={{ color: 'var(--green)' }}>+$4,230</em><span>+18.3%</span></div>
                <div className="tile"><b>WIN RATE</b><em>67%</em><span>67W / 33L</span></div>
                <div className="tile"><b>PROFIT FACTOR</b><em>2.14</em><span>Gross 7.4x</span></div>
                <div className="tile"><b>AVG TRADE</b><em style={{ color: 'var(--green)' }}>+$54</em><span>78 trades</span></div>
              </div>
              <div className="tile" style={{ marginTop: '14px', padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline' }}><b>EQUITY CURVE · 30D</b><span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontWeight: 700, fontSize: '11px', color: 'var(--green)' }}>+$4,230</span></div>
                <svg viewBox="0 0 616 90" style={{ width: '100%', height: '90px', marginTop: '14px' }} preserveAspectRatio="none" fill="none">
                  <defs><linearGradient id="dq" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#24c88a" stopOpacity=".3" /><stop offset="1" stopColor="#24c88a" stopOpacity="0" /></linearGradient></defs>
                  <path d="M0 90 L21 85 L42 73 L64 70 L85 66 L106 60 L127 64 L148 52 L170 55 L191 44 L212 48 L233 36 L254 40 L276 30 L297 34 L318 24 L339 28 L360 20 L382 22 L403 14 L424 18 L445 10 L466 12 L488 6 L509 8 L530 4 L551 5 L572 2 L594 3 L616 0 L616 90 Z" fill="url(#dq)" />
                  <path d="M0 90 L21 85 L42 73 L64 70 L85 66 L106 60 L127 64 L148 52 L170 55 L191 44 L212 48 L233 36 L254 40 L276 30 L297 34 L318 24 L339 28 L360 20 L382 22 L403 14 L424 18 L445 10 L466 12 L488 6 L509 8 L530 4 L551 5 L572 2 L594 3 L616 0" stroke="#24c88a" strokeWidth="2" />
                </svg>
              </div>
              <div className="tile" style={{ marginTop: '12px', padding: '12px 14px' }}>
                <b>ACTIVITY HEATMAP</b>
                <div className="heat" id="demoheat">
                  {HEAT_CELLS.map((c, i) => (
                    <i key={i} style={{ background: c.background, opacity: c.opacity }} />
                  ))}
                </div>
              </div>
            </div>
            <span className="sample">SAMPLE DATA</span>
          </div>
        </div>

        {/* row 02 · leak detection */}
        <div className="drow flip" style={{ marginTop: '110px' }}>
          <div className="win" style={{ height: '460px' }}>
            <span className="corner c1"></span><span className="corner c2"></span><span className="corner c3"></span><span className="corner c4"></span>
            <div className="bar"><i></i><i></i><i></i><span>atlas.app/app</span></div>
            <div className="body">
              <div style={{ display: 'flex', alignItems: 'baseline' }}><p className="lbl amber">VERDICTS · RANKED BY $ IMPACT</p><span style={{ marginLeft: 'auto', fontWeight: 700, fontSize: '9px', color: 'var(--muted-2)' }}>TOTAL COST</span></div>
              <div className="verdict"><h4>5 patterns detected</h4><span className="tot">−$3,270</span></div>
              <div className="vrow"><div className="t"><h5>Revenge Trading</h5><em style={{ color: 'var(--red)' }}>HIGH</em><span className="amt" style={{ color: 'var(--red)' }}>−$1,420</span></div>
                <small>14 trades · +$840 if fixed</small><div className="bar2"><i style={{ width: '100%', background: 'var(--red)' }} /></div></div>
              <div className="vrow"><div className="t"><h5>Oversized Position</h5><em style={{ color: 'var(--red)' }}>HIGH</em><span className="amt" style={{ color: 'var(--red)' }}>−$890</span></div>
                <small>8 trades · +$520 if fixed</small><div className="bar2"><i style={{ width: '63%', background: 'var(--red)' }} /></div></div>
              <div className="vrow"><div className="t"><h5>FOMO Entries</h5><em style={{ color: 'var(--amber)' }}>MED</em><span className="amt" style={{ color: 'var(--amber)' }}>−$540</span></div>
                <small>11 trades · +$320 if fixed</small><div className="bar2"><i style={{ width: '38%', background: 'var(--amber)' }} /></div></div>
              <div className="vrow"><div className="t"><h5>Late Session Drift</h5><em style={{ color: 'var(--amber)' }}>MED</em><span className="amt" style={{ color: 'var(--amber)' }}>−$280</span></div>
                <small>6 trades · +$190 if fixed</small><div className="bar2"><i style={{ width: '20%', background: 'var(--amber)' }} /></div></div>
              <div className="vrow"><div className="t"><h5>No Stop Loss</h5><em style={{ color: 'var(--atlas-muted)' }}>LOW</em><span className="amt" style={{ color: '#9fb0c2' }}>−$140</span></div>
                <small>4 trades · +$95 if fixed</small><div className="bar2"><i style={{ width: '10%', background: 'var(--atlas-muted)' }} /></div></div>
            </div>
            <span className="sample">SAMPLE DATA</span>
          </div>
          <div className="copy">
            <div className="rule"></div>
            <h3>Leak Detection</h3>
            <p>The verdict engine ranks every costly pattern by dollar impact  revenge trading, overtrading, bad session hours, FOMO entries — with evidence clusters and recovery estimates for each.</p>
          </div>
        </div>

        {/* row 03 · behavior */}
        <div className="drow" style={{ marginTop: '110px' }}>
          <div className="copy">
            <div className="rule"></div>
            <h3>Behavior Analysis</h3>
            <p>Behavior analysis tracks your discipline score over time, monitors emotional pressure across sessions, and shows whether your fixes are actually sticking week over week.</p>
          </div>
          <div className="win" style={{ height: '400px' }}>
            <span className="corner c1"></span><span className="corner c2"></span><span className="corner c3"></span><span className="corner c4"></span>
            <div className="bar"><i></i><i></i><i></i><span>atlas.app/app</span></div>
            <div className="body">
              <p className="lbl teal">BEHAVIORAL HEALTH · 30D</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '18px' }}>
                <div className="tile" style={{ padding: '20px 26px', display: 'flex', alignItems: 'center', gap: '22px' }}>
                  <div className="dial2">
                    <svg viewBox="0 0 68 68" width="68" height="68" fill="none">
                      <circle cx="34" cy="34" r="31" stroke="#16202c" strokeWidth="6" />
                      <circle cx="34" cy="34" r="31" stroke="#2fd3c4" strokeWidth="6" strokeLinecap="round" strokeDasharray="194.8" strokeDashoffset="42.9" transform="rotate(-90 34 34)" />
                    </svg>
                    <div className="v"><b>78</b><i>/100</i></div>
                  </div>
                  <div>
                    <b style={{ fontWeight: 700, fontSize: '9px', color: 'var(--muted-2)', letterSpacing: '.03em' }}>DISCIPLINE SCORE</b>
                    <p style={{ margin: '8px 0 0', fontWeight: 700, fontSize: '14px', color: 'var(--green)' }}>+14 vs last month</p>
                    <p style={{ margin: '7px 0 0', fontSize: '11.5px', color: 'var(--muted-2)' }}>Above your 90-day avg</p>
                  </div>
                </div>
                <div className="tile" style={{ padding: '17px 20px' }}>
                  <b>COMPLIANCE STREAK</b>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginTop: '2px' }}>
                    <em style={{ fontFamily: 'var(--mono)', fontWeight: 500, fontSize: '30px', lineHeight: '39px', color: 'var(--text)', fontStyle: 'normal' }}>12</em>
                    <span style={{ fontSize: '12px', color: 'var(--atlas-muted)' }}>days following plan</span>
                  </div>
                  <div className="streak" id="demostreak">
                    {Array.from({ length: 15 }, (_, i) => (
                      <i key={i} className={i < 12 ? 'on' : ''} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="tile" style={{ marginTop: '16px', padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline' }}><b>EMOTIONAL PRESSURE · SESSION AVG</b><span style={{ marginLeft: 'auto', fontWeight: 700, fontSize: '10px', color: 'var(--green)' }}>Net positive 7/10</span></div>
                <div className="emo">
                  <span>Calm</span><span className="track"><i style={{ width: '78%', background: 'var(--green)' }} /></span><span className="pct">78%</span>
                  <span>Confident</span><span className="track"><i style={{ width: '64%', background: 'var(--green)' }} /></span><span className="pct">64%</span>
                  <span>FOMO</span><span className="track"><i style={{ width: '42%', background: 'var(--amber)' }} /></span><span className="pct">42%</span>
                  <span>Frustrated</span><span className="track"><i style={{ width: '28%', background: '#f0722a' }} /></span><span className="pct">28%</span>
                  <span>Tilted</span><span className="track"><i style={{ width: '12%', background: 'var(--red)' }} /></span><span className="pct">12%</span>
                </div>
              </div>
            </div>
            <span className="sample">SAMPLE DATA</span>
          </div>
        </div>

        {/* row 04 · performance */}
        <div className="drow flip" style={{ marginTop: '110px' }}>
          <div className="win" style={{ height: '470px' }}>
            <span className="corner c1"></span><span className="corner c2"></span><span className="corner c3"></span><span className="corner c4"></span>
            <div className="bar"><i></i><i></i><i></i><span>atlas.app/app</span></div>
            <div className="body">
              <p className="lbl amber">PERFORMANCE · 50+ METRICS</p>
              <div className="tile" style={{ marginTop: '14px', padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline' }}><b>BY SYMBOL</b><span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--muted-2)' }}>5 of 12 shown</span></div>
                <div className="sym"><b>SOL/USDT</b><span className="track"><i style={{ width: '100%', background: 'var(--green)' }} /></span><span className="amt" style={{ color: 'var(--green)' }}>+$1,240</span><span className="n">14t</span></div>
                <div className="sym"><b>BTC/USDT</b><span className="track"><i style={{ width: '72%', background: 'var(--green)' }} /></span><span className="amt" style={{ color: 'var(--green)' }}>+$890</span><span className="n">22t</span></div>
                <div className="sym"><b>ETH/USDT</b><span className="track"><i style={{ width: '52%', background: 'var(--green)' }} /></span><span className="amt" style={{ color: 'var(--green)' }}>+$430</span><span className="n">18t</span></div>
                <div className="sym"><b>AVAX/USDT</b><span className="track"><i style={{ width: '30%', background: 'var(--red)' }} /></span><span className="amt" style={{ color: 'var(--red)' }}>−$180</span><span className="n">9t</span></div>
                <div className="sym"><b>BNB/USDT</b><span className="track"><i style={{ width: '22%', background: 'var(--red)' }} /></span><span className="amt" style={{ color: 'var(--red)' }}>−$340</span><span className="n">7t</span></div>
              </div>
              <div className="tile" style={{ marginTop: '12px', padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline' }}><b>HOURLY P&amp;L DISTRIBUTION</b><span style={{ marginLeft: 'auto', fontWeight: 700, fontSize: '10px', color: 'var(--amber)' }}>Peak 13:00</span></div>
                <div className="hours" id="demohours">
                  {HOUR_BARS.map((h, i) => (
                    <i key={i} style={{ height: `${Math.round((h / 58) * 62)}px`, background: i < 9 ? '#d99405' : '#2fd3c4' }} />
                  ))}
                </div>
                <div className="hourlbl"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span></div>
              </div>
              <div className="mini3">
                <div className="tile"><b>SHARPE</b><em>1.84</em></div>
                <div className="tile"><b>MAX DD</b><em>8.2%</em></div>
                <div className="tile"><b>AVG HOLD</b><em>4h 12m</em></div>
              </div>
            </div>
            <span className="sample">SAMPLE DATA</span>
          </div>
          <div className="copy">
            <div className="rule"></div>
            <h3>Performance Analytics</h3>
            <p>Deep performance analytics — breakdown by symbol, time of day, session, and trade type. 50+ metrics to find exactly which setups make money and which ones bleed.</p>
          </div>
        </div>

        {/* row 05 · playbook */}
        <div className="drow" style={{ marginTop: '110px' }}>
          <div className="copy">
            <div className="rule"></div>
            <h3>Playbook</h3>
            <p>Define your trading rules once — max trades per session, risk limits, session hours — and track compliance automatically on every trade you import. No self-grading, no bias.</p>
          </div>
          <div className="win" style={{ height: '450px' }}>
            <span className="corner c1"></span><span className="corner c2"></span><span className="corner c3"></span><span className="corner c4"></span>
            <div className="bar"><i></i><i></i><i></i><span>atlas.app/app</span></div>
            <div className="body">
              <div style={{ display: 'flex', alignItems: 'baseline' }}><p className="lbl teal">PLAYBOOK COMPLIANCE</p><span style={{ marginLeft: 'auto', fontWeight: 700, fontSize: '10px', color: 'var(--green)' }}>86% overall</span></div>
              <div style={{ marginTop: '14px', border: '1px solid #1d3a2e', borderRadius: '2px', background: '#0c1119', padding: '14px 21px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                  <b style={{ fontFamily: 'var(--mono)', fontSize: '38px', lineHeight: '49px', color: 'var(--green)' }}>86</b>
                  <div><p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>Compliance Score</p>
                    <p style={{ margin: '6px 0 0', fontSize: '11.5px', color: 'var(--atlas-muted)' }}>5 of 6 rules followed · up from 64% last month</p></div>
                </div>
                <div style={{ height: '4px', background: '#16202c', marginTop: '14px', position: 'relative' }}><i style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '86%', background: 'var(--green)' }} /></div>
              </div>
              <div style={{ marginTop: '24px' }}>
                <div className="rule-row" style={{ color: 'var(--green)' }}><span className="box"><i></i></span><span style={{ color: 'var(--text-5)' }}>Max 3 trades per session</span><span className="track"><i style={{ width: '92%', background: 'var(--green)' }} /></span><span className="pct">92%</span></div>
                <div className="rule-row" style={{ color: 'var(--green)' }}><span className="box"><i></i></span><span style={{ color: 'var(--text-5)' }}>Risk ≤1.5% per trade</span><span className="track"><i style={{ width: '88%', background: 'var(--green)' }} /></span><span className="pct">88%</span></div>
                <div className="rule-row" style={{ color: 'var(--amber)' }}><span className="box"><i></i></span><span style={{ color: 'var(--text-5)' }}>No trading 21:00–06:00 UTC</span><span className="track"><i style={{ width: '78%', background: 'var(--amber)' }} /></span><span className="pct">78%</span></div>
                <div className="rule-row" style={{ color: 'var(--amber)' }}><span className="box"><i></i></span><span style={{ color: 'var(--text-5)' }}>Stop loss within 0.8% of entry</span><span className="track"><i style={{ width: '65%', background: 'var(--amber)' }} /></span><span className="pct">65%</span></div>
                <div className="rule-row" style={{ color: '#f0722a' }}><span className="box"><i></i></span><span style={{ color: 'var(--text-5)' }}>No revenge trade after −2R loss</span><span className="track"><i style={{ width: '64%', background: '#f0722a' }} /></span><span className="pct">64%</span></div>
                <div className="rule-row" style={{ color: 'var(--green)' }}><span className="box"><i></i></span><span style={{ color: 'var(--text-5)' }}>Avoid first 15min after news</span><span className="track"><i style={{ width: '100%', background: 'var(--green)' }} /></span><span className="pct">100%</span></div>
              </div>
            </div>
            <span className="sample">SAMPLE DATA</span>
          </div>
        </div>
      </div>

      <div className="pcta" style={{ marginTop: '134px', paddingBottom: '130px' }}>
        <div className="gridwash"></div>
        <div className="wrap">
          <p className="kicker" style={{ justifyContent: 'center', color: 'var(--teal)', fontWeight: 700, fontSize: '12px', marginBottom: '12px' }}>READY WHEN YOU ARE</p>
          <h2>Ready to see your own numbers?</h2>
          <p className="sub">Upload your first CSV and get your real dashboard — with your actual trades, your actual patterns, your actual dollar costs. Takes 60 seconds.</p>
          <div className="row"><Link className="btn btn-amber" href="/pricing">Start with Your Own Trades<svg className="arrow-r" viewBox="0 0 12 9" fill="none"><path d="M0 4.5 H12 M12 4.5 L7 0 M12 4.5 L7 9" stroke="#0a0a0a" strokeWidth="1.7" strokeLinecap="round" /></svg></Link></div>
          <p style={{ margin: '44px 0 0', fontSize: '12.5px', color: 'var(--muted-2)' }}>No credit card · 14-day full Pro access · 67+ broker formats</p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
