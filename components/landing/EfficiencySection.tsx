import InsightChart from './InsightChart';

export default function EfficiencySection() {
  return (
    <div className="sec02">
      <div className="wrap">
        <div className="sechead">
          <div>
            <p className="eyebrow">EFFICIENCY</p>
            <h2 className="h2" style={{ marginTop: '13px' }}>Gain a Year’s Worth of<br /><span className="alt">Trading Insight in Weeks</span></h2>
          </div>
          <div className="right"><p className="lede">What used to mean hours of spreadsheets and months of guesswork, Atlas does automatically — every trade journaled, scored, and turned into a lesson the moment you close it.</p></div>
        </div>

        <InsightChart />

        <div className="statrow">
          <div className="stat"><b>10×</b><span>FASTER REVIEW</span><p>Weeks of self-analysis in one session</p></div>
          <div className="stat"><b>30 SEC</b><span>PER TRADE LOGGED</span><p>Auto-scored the moment you close</p></div>
          <div className="stat"><b>1 YEAR</b><span>OF INSIGHT, INSTANTLY</span><p>Patterns that take months to spot</p></div>
        </div>
      </div>
    </div>
  );
}
