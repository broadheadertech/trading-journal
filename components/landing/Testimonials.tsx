export default function Testimonials() {
  return (
    <div className="sec10">
      <div className="wrap">
        <p className="eyebrow">TRUSTED BY TRADERS</p>
        <h2 className="h2" style={{ marginTop: '13px' }}>What traders are saying</h2>
        <p className="lede-lg" style={{ marginTop: '12px' }}>See what crypto, stock, forex, futures, options, and metals traders find inside Atlas.</p>

        <p className="quotemark">&#8221;</p>
        <p className="quote">&#8220;I trade both crypto and stocks. The AI Coach caught patterns across both markets I never noticed  my win rate improved 15% in two months.&#8221;</p>

        <div className="byline">
          <div className="avatar">SK</div>
          <div><b>Sarah K.</b><span>Multi-Market Day Trader</span></div>
          <div className="dots"><i></i><i className="on"></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
          <div className="pager">
            <button aria-label="Previous"><svg width="7" height="16" viewBox="0 0 7 16" fill="none"><path d="M7 0 L0 8 L7 16" stroke="#edf2f7" strokeWidth="1.1" /></svg></button>
            <button aria-label="Next"><svg width="7" height="16" viewBox="0 0 7 16" fill="none"><path d="M0 0 L7 8 L0 16" stroke="#edf2f7" strokeWidth="1.1" /></svg></button>
          </div>
        </div>
      </div>
    </div>
  );
}
