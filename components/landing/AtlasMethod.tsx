/* The five stages, in order. The rail runs amber -> green across them, which
   is the same "first trade to funded success" arc the lede describes, so the
   colour is carrying the story rather than decorating it. */
const STEPS = [
  { name: 'Learn', desc: 'Master trading from beginner to advanced.' },
  { name: 'Execute', desc: 'Apply proven market structure concepts.' },
  { name: 'Analyze', desc: 'Review every trade with data.' },
  { name: 'Improve', desc: 'Refine your process continuously.' },
  { name: 'Scale', desc: 'Pass funding challenges and grow capital.' },
];

export default function AtlasMethod() {
  return (
    <div className="sec03">
      <div className="wrap">
        <p className="eyebrow">A PROVEN PROCESS</p>
        <h2 className="h2" style={{ marginTop: '11px' }}>The Atlas Method</h2>
        <p className="lede-lg" style={{ marginTop: '23px' }}>A simple, repeatable path from your first trade to funded success.</p>

        <div className="method">
          {/* The rail used to be a bare 1px border with 1.5px ticks and 8px
              specks on it — at a glance it read as a stray hairline, not a
              path. It is its own element now, with a gradient and an arrow
              head so the direction of travel is visible. */}
          <div className="mrail" aria-hidden="true">
            <span className="mrail-line" />
            <span className="mrail-tip" />
          </div>

          <ol className="steps">
            {STEPS.map((s, i) => (
              <li className="step" key={s.name} style={{ ['--i' as string]: i }}>
                <span className="step-node" aria-hidden="true" />
                <h4>{s.name}</h4>
                <p>{s.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
