import Link from 'next/link';

const V_LINES = Array.from({ length: Math.floor(1440 / 48) + 1 }, (_, i) => i * 48);
const H_LINES = Array.from({ length: Math.floor(420 / 48) + 1 }, (_, i) => i * 48);

export default function MidCTA() {
  return (
    <div className="cta">
      <svg className="gridbg" id="ctagrid" viewBox="0 0 1440 420" preserveAspectRatio="none" aria-hidden="true">
        {V_LINES.map((x) => (
          <line key={`v${x}`} x1={x} y1={0} x2={x} y2={420} stroke="#0e1725" strokeWidth={1} />
        ))}
        {H_LINES.map((y) => (
          <line key={`h${y}`} x1={0} y1={y} x2={1440} y2={y} stroke="#0e1725" strokeWidth={1} />
        ))}
      </svg>
      <div className="wrap">
        <p className="kicker">STOP REPEATING</p>
        <h2>Your next trade doesn&#8217;t have to<br /><span>repeat the same mistake</span></h2>
        <p className="sub">Upload your trades. See the dollar cost of every pattern. Fix the biggest one first.</p>
        <div className="row">
          <Link className="btn btn-amber" href="/pricing">Start Free Trial
            <svg className="arrow-r" viewBox="0 0 12 9" fill="none"><path d="M0 4.5 H12 M12 4.5 L7 0 M12 4.5 L7 9" stroke="#0a0a0a" strokeWidth="1.7" strokeLinecap="round" /></svg>
          </Link>
          <Link className="btn btn-ghost" href="/demo">See Demo First</Link>
        </div>
        <p className="fine">14 days free &middot; No credit card &middot; Setup in 60 seconds</p>
      </div>
    </div>
  );
}
