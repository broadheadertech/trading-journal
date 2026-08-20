export default function HowItWorks() {
  return (
    <div className="sec04">
      <div className="wrap">
        <div className="sechead">
          <div>
            <p className="eyebrow">HOW IT WORKS</p>
            <h2 className="h2" style={{ marginTop: '13px' }}>Three steps to<br /><span className="alt">measurable improvement</span></h2>
          </div>
          <div className="right"><p className="lede">No spreadsheets. No guesswork. A clear path from raw trade history to a measurably better trader.</p></div>
        </div>

        <div className="hiw">
          <div>
            <div className="panel">
              <div className="drop">
                <svg width="12" height="14" viewBox="0 0 12 14" fill="none"><path d="M6 0 V14 M6 0 L0 6 M6 0 L12 6" stroke="#d99405" strokeWidth="1.6" strokeLinecap="round" /></svg>
                <small>trades_q4_2026.csv</small>
              </div>
              <div className="tick-list">
                <div><svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M0 3.5 L3 7 L9 0" stroke="#24c88a" strokeWidth="1.4" /></svg>Broker detected: IC Markets</div>
                <div><svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M0 3.5 L3 7 L9 0" stroke="#24c88a" strokeWidth="1.4" /></svg>Normalizing 482 fills</div>
                <div><svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M0 3.5 L3 7 L9 0" stroke="#24c88a" strokeWidth="1.4" /></svg>Computing 50+ metrics</div>
                <div className="off"><svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M0 3.5 L3 7 L9 0" stroke="#5c6b7e" strokeWidth="1.4" /></svg>Scoring behaviour</div>
              </div>
            </div>
            <h4>Connect Your Trading Data</h4>
            <p>40+ brokers supported. CSV or API. Auto-detected, auto-normalized. Takes 60 seconds.</p>
          </div>

          <div>
            <div className="panel">
              <div className="leaklist">
                <div className="hd">RANKED BY $ IMPACT</div>
                <div className="r"><span>revenge trading</span><span style={{ color: 'var(--red)' }}>−$1,420</span></div>
                <div className="b"><i style={{ width: '100%', background: 'var(--red)' }}></i></div>
                <div className="r"><span>overtrading</span><span style={{ color: 'var(--red)' }}>−$890</span></div>
                <div className="b"><i style={{ width: '62%', background: 'var(--red)' }}></i></div>
                <div className="r"><span>late session</span><span style={{ color: 'var(--amber)' }}>−$540</span></div>
                <div className="b"><i style={{ width: '38%', background: 'var(--amber)' }}></i></div>
                <div className="r"><span>no stop loss</span><span style={{ color: 'var(--amber)' }}>−$140</span></div>
                <div className="b"><i style={{ width: '12%', background: 'var(--amber)' }}></i></div>
              </div>
            </div>
            <h4>Discover Costly Habits</h4>
            <p>20+ patterns detected and ranked by dollar impact — revenge trading, overtrading, bad sessions, with evidence.</p>
          </div>

          <div>
            <div className="panel">
              <div className="bars">
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
            <h4>Build Consistency</h4>
            <p>Set rules, track compliance, run what-if simulations. Watch your discipline score climb.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
