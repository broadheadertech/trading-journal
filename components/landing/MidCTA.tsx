import Button from '@/components/ui/Button';

/* Reassurance line, split so each clause reads as its own guarantee rather
   than one dim run-on. Copy is unchanged — only the separators are gone. */
const FINE = ['14 days free', 'No credit card', 'Setup in 60 seconds'];

export default function MidCTA() {
  return (
    <div className="cta">
      {/* The flat 48px grid that used to cover the whole band read as graph
          paper behind the headline. A single soft amber bloom behind the
          wordmark area does the same job of filling the space without
          competing with the type. */}
      <span className="cta-glow" aria-hidden="true" />
      <span className="cta-rule" aria-hidden="true" />

      <div className="wrap">
        <p className="kicker">STOP REPEATING</p>
        <h2>Your next trade doesn&#8217;t have to<br /><span>repeat the same mistake</span></h2>
        <p className="sub">Upload your trades. See the dollar cost of every pattern. Fix the biggest one first.</p>

        <div className="row">
          <Button href="/pricing" size="lg">Start Free Trial</Button>
          <Button href="/demo" size="lg" variant="secondary">See Demo First</Button>
        </div>

        <ul className="fine">
          {FINE.map((f) => (
            <li key={f}>
              <svg viewBox="0 0 11 9" fill="none" aria-hidden="true">
                <path d="M0 4 L4 9 L11 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {f}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
