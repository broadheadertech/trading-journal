import HowItWorksCards from './HowItWorksCards';

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

        <HowItWorksCards />
      </div>
    </div>
  );
}
