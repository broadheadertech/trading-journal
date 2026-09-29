/* Live platform numbers as a market-ticker strip. Every value, label and
   description below is verbatim from the five .num cards this replaces —
   the change is the presentation.

   The five items are rendered twice and the track is translated by exactly
   -50%, which lands the second copy where the first began: the loop is
   seamless without measuring anything at runtime. The duplicate carries
   aria-hidden, so each stat is announced once. */
const STATS = [
  { value: '100,800+', label: 'TRADES ANALYZED', desc: 'Across every connected account' },
  { value: '16,760+', label: 'LEAKS DETECTED', desc: 'Costly patterns surfaced' },
  { value: '$547K+', label: 'IN LEAKS FOUND', desc: 'Behavioral cost measured', neg: true },
  { value: '70+', label: 'BEHAVIORAL METRICS', desc: 'Live risk and rule tracking' },
  { value: '30+', label: 'PATTERN DETECTORS', desc: 'Behavioral patterns tracked' },
];

function Items() {
  return (
    <>
      {STATS.map((s) => (
        <div className="tick-item" key={s.label}>
          <span className="tick-label">{s.label}</span>
          <b className={s.neg ? 'tick-value neg' : 'tick-value'}>{s.value}</b>
          <p className="tick-desc">{s.desc}</p>
        </div>
      ))}
    </>
  );
}

export default function PlatformStats() {
  return (
    <div className="sec05">
      <div className="wrap">
        <p className="eyebrow">BY THE NUMBERS</p>
        <h2 className="h2" style={{ marginTop: '13px' }}>Trusted By Traders Worldwide</h2>
        <p className="lede" style={{ marginTop: '22px', maxWidth: '800px' }}>Brokers integrated, detectors shipped, metrics computed. Live platform numbers — no marketing fluff.</p>

        <div className="ticker">
          <div className="tick-track">
            {/* display:contents on the set wrappers, so the flex row still sees
                the ten items directly — the wrappers exist only so the second
                copy can be hidden wholesale under reduced motion. */}
            <div className="tick-set"><Items /></div>
            <div className="tick-set" aria-hidden="true"><Items /></div>
          </div>
        </div>
      </div>
    </div>
  );
}
