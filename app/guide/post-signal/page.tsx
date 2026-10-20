import Link from 'next/link';
import LandingNav from '@/components/landing/LandingNav';
import Footer from '@/components/landing/Footer';

export const metadata = {
  title: 'How to Post a Signal - Atlas',
  description: 'Step-by-step guide for signal providers: how to post, manage, and close a trading signal on Atlas.',
};

const GUIDE_CSS = `
.guide{max-width:820px;margin:0 auto;padding:60px 0 96px}
.guide-back{display:inline-flex;align-items:center;gap:9px;font-size:13px;color:var(--atlas-muted);margin-bottom:34px}
.guide-back:hover{color:var(--text)}
.guide-eyebrow{font-family:var(--micro);font-size:11px;letter-spacing:.14em;color:var(--amber);text-transform:uppercase;margin:0}
.guide h1{font-family:var(--display);font-weight:600;font-size:40px;line-height:44px;color:var(--text);margin:12px 0 0}
.guide-lede{font-size:15.5px;line-height:25px;color:var(--atlas-muted);margin:18px 0 0;max-width:640px}
.guide-note{display:flex;gap:12px;align-items:flex-start;margin-top:26px;padding:16px 18px;border:1px solid var(--line);border-left:3px solid var(--amber);border-radius:3px;background:var(--card)}
.guide-note b{color:var(--text)}
.guide-note p{margin:0;font-size:13.5px;line-height:21px;color:var(--atlas-muted)}
.guide-steps{margin-top:40px;display:flex;flex-direction:column;gap:16px}
.guide-step{display:grid;grid-template-columns:40px 1fr;gap:18px;padding:22px 0;border-top:1px solid var(--line)}
.guide-num{width:36px;height:36px;border:1px solid var(--amber);border-radius:3px;display:flex;align-items:center;justify-content:center;font-family:var(--display);font-weight:700;font-size:16px;color:var(--amber)}
.guide-step h3{font-family:var(--display);font-weight:600;font-size:18px;color:var(--text);margin:4px 0 0}
.guide-step p{font-size:14px;line-height:23px;color:var(--atlas-muted);margin:10px 0 0}
.guide-step b{color:var(--text-3)}
.guide-sec{font-family:var(--micro);font-size:11px;letter-spacing:.1em;color:var(--muted-2);text-transform:uppercase;margin:46px 0 0}
.guide-fields{margin-top:16px;border:1px solid var(--line);border-radius:3px;overflow:hidden}
.guide-field{display:grid;grid-template-columns:150px 1fr;gap:16px;padding:14px 18px;border-top:1px solid var(--line)}
.guide-field:first-child{border-top:0}
.guide-field .fname{font-weight:700;font-size:13px;color:var(--text)}
.guide-field .fname span{display:block;font-family:var(--mono);font-size:10.5px;font-weight:400;color:var(--muted-2);margin-top:3px}
.guide-field .fdesc{font-size:13.5px;line-height:21px;color:var(--atlas-muted)}
.guide-field .fdesc code{font-family:var(--mono);font-size:12px;color:var(--text-3);background:var(--card);padding:1px 5px;border-radius:2px}
.guide-actions{margin-top:16px;display:flex;flex-direction:column;gap:10px}
.guide-action{display:flex;gap:12px;align-items:flex-start;padding:14px 16px;border:1px solid var(--line);border-radius:3px;background:var(--card)}
.guide-action .pill{flex:none;font-weight:700;font-size:10.5px;letter-spacing:.03em;padding:4px 9px;border-radius:2px;text-transform:uppercase}
.guide-action p{margin:0;font-size:13.5px;line-height:20px;color:var(--atlas-muted)}
.guide-action p b{color:var(--text)}
.guide ul{list-style:none;margin:16px 0 0;padding:0;display:flex;flex-direction:column;gap:11px}
.guide li{position:relative;padding-left:20px;font-size:14px;line-height:22px;color:var(--atlas-muted)}
.guide li::before{content:"";position:absolute;left:0;top:9px;width:5px;height:5px;background:var(--amber)}
.guide li b{color:var(--text-3)}
@media(max-width:700px){.guide h1{font-size:30px;line-height:34px}.guide-field{grid-template-columns:1fr;gap:4px}}
`;

export default function PostSignalGuidePage() {
  return (
    <div className="atlas-site">
      <LandingNav />
      <style>{GUIDE_CSS}</style>
      <div className="wrap">
        <div className="guide">
          <Link href="/" className="guide-back">
            <svg width="12" height="9" viewBox="0 0 12 9" fill="none" aria-hidden="true"><path d="M12 4.5 H0 M0 4.5 L5 0 M0 4.5 L5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            Back to Home
          </Link>

          <p className="guide-eyebrow">Signal Provider Guide</p>
          <h1>How to post a trading signal</h1>
          <p className="guide-lede">
            A step-by-step walkthrough for Atlas signal providers — from opening the form to managing a live
            call and closing it out. Everything your followers see comes from the fields below, so take a
            minute to fill them in cleanly.
          </p>

          <a
            href="/atlas-post-signal-guide.pdf"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 9, marginTop: 20,
              padding: '10px 18px', borderRadius: 3, fontSize: 13, fontWeight: 700,
              color: '#0a0a0a', background: 'var(--amber)', textDecoration: 'none',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M7 1v8M3.5 6 7 9.5 10.5 6M1.5 12.5h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Download the PDF manual
          </a>

          <div className="guide-note">
            <div>
              <p>
                <b>Who can post:</b> posting signals is available on any <b>paid plan</b> — <b>Core</b>, <b>Pro</b>, or
                <b> Elite</b>. On the free plan the button is locked; if you don&apos;t see <b>Post a Signal</b> on the
                Signals page, upgrade from <Link href="/pricing" style={{ color: 'var(--amber)' }}>Pricing</Link> or ask your admin.
              </p>
            </div>
          </div>

          {/* ── Steps ── */}
          <div className="guide-steps">
            <div className="guide-step">
              <div className="guide-num">1</div>
              <div>
                <h3>Open the Signals page</h3>
                <p>Log in and open the app. In the left sidebar, click <b>Signals</b> (the broadcast icon). This is where all your posted calls live.</p>
              </div>
            </div>

            <div className="guide-step">
              <div className="guide-num">2</div>
              <div>
                <h3>Click &ldquo;Post Signal&rdquo;</h3>
                <p>Use the <b>Post Signal</b> button near the top of the Signals page. A form opens where you enter the trade.</p>
              </div>
            </div>

            <div className="guide-step">
              <div className="guide-num">3</div>
              <div>
                <h3>Fill in the trade details</h3>
                <p>Complete the fields below. Symbol, entry, stop loss, and at least one target are required — the rest are optional and can be edited later.</p>
                <div className="guide-fields">
                  <div className="guide-field"><div className="fname">Symbol<span>required</span></div><div className="fdesc">The instrument, e.g. <code>XAUUSD</code>, <code>EURUSD</code>, <code>BTCUSDT</code>. Typed in capitals automatically.</div></div>
                  <div className="guide-field"><div className="fname">Market</div><div className="fdesc">Commodities, Forex, Crypto, or Stocks. Sets sensible pip/lot defaults.</div></div>
                  <div className="guide-field"><div className="fname">Order</div><div className="fdesc">Pick direction &amp; type: <code>BUY</code>/<code>SELL</code> as <code>Market</code>, <code>Stop</code>, or <code>Limit</code> (6 buttons).</div></div>
                  <div className="guide-field"><div className="fname">Risk Level</div><div className="fdesc">Low, Medium, or High — your own read on the setup&apos;s risk.</div></div>
                  <div className="guide-field"><div className="fname">Entry Low<span>required</span></div><div className="fdesc">The entry price. For a single price, fill only this field.</div></div>
                  <div className="guide-field"><div className="fname">Entry High<span>optional</span></div><div className="fdesc">Fill this to make the entry a <b>zone</b> (e.g. <code>4685</code>–<code>4700</code>). Leave blank for a single price.</div></div>
                  <div className="guide-field"><div className="fname">Stop Loss<span>required</span></div><div className="fdesc">Your invalidation level — below entry for a BUY, above entry for a SELL.</div></div>
                  <div className="guide-field"><div className="fname">Take Profits<span>required · 1+</span></div><div className="fdesc">Add <b>TP1, TP2, …</b> with <b>+ Add target</b> (no limit). The risk:reward for each target is shown as you type.</div></div>
                  <div className="guide-field"><div className="fname">Description<span>optional</span></div><div className="fdesc">Your rationale / notes. Can be added or refined later via Edit.</div></div>
                  <div className="guide-field"><div className="fname">Advanced</div><div className="fdesc">Optional overrides — custom pip size, lot size, and whether to show pip annotations.</div></div>
                </div>
              </div>
            </div>

            <div className="guide-step">
              <div className="guide-num">4</div>
              <div>
                <h3>Post it</h3>
                <p>Click <b>Post Signal</b>. The call goes live on the Signals page and on your public profile, and your followers are in the loop. If anything is missing, a red message tells you what to fix.</p>
              </div>
            </div>

            <div className="guide-step">
              <div className="guide-num">5</div>
              <div>
                <h3>Manage it as the trade plays out</h3>
                <p>On your own signal card you have owner controls:</p>
                <div className="guide-actions">
                  <div className="guide-action"><span className="pill" style={{ color: 'var(--green)', border: '1px solid var(--green)' }}>TP1 / TP2</span><p><b>Mark a target hit (while running).</b> Tap the TP chips to show a green check on levels price has reached — the signal stays active, so followers see partial progress.</p></div>
                  <div className="guide-action"><span className="pill" style={{ color: 'var(--green)', border: '1px solid var(--green)' }}>Target hit</span><p><b>Close as Won.</b> Pick the take-profit the position closed at — this records the result and R-multiple.</p></div>
                  <div className="guide-action"><span className="pill" style={{ color: 'var(--red)', border: '1px solid var(--red)' }}>SL</span><p><b>Close as Lost.</b> Marks the signal stopped out (−1R).</p></div>
                  <div className="guide-action"><span className="pill" style={{ color: 'var(--amber)', border: '1px solid var(--amber)' }}>Edit / Cancel</span><p><b>Adjust or withdraw.</b> Edit any field (e.g. add the rationale), or cancel a call that&apos;s no longer valid.</p></div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Tips ── */}
          <p className="guide-sec">Tips for clean signals</p>
          <ul>
            <li><b>Entry zone vs single price:</b> fill both Entry Low and Entry High for a range; leave High blank for one price.</li>
            <li><b>Check your stop side:</b> stop loss goes <b>below</b> entry for a BUY and <b>above</b> entry for a SELL — the preview R:R will look wrong if it&apos;s flipped.</li>
            <li><b>Ladder your targets:</b> add TP1, TP2, TP3… so followers can scale out; the per-target R:R updates live.</li>
            <li><b>You can post first, explain later:</b> the description is optional at post time — add it through Edit once you have a moment.</li>
            <li><b>Mark partial hits:</b> tapping TP1/TP2 as price reaches them keeps your track record honest without closing the trade early.</li>
          </ul>
        </div>
      </div>
      <Footer />
    </div>
  );
}
