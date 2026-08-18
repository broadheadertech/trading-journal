/* ---------- sec-02 price-action chart (grid + 58 candles + price line) ----------
   Ported from the inline <script> in uiux/atlass.html. Deterministic, so it is
   evaluated during render rather than in an effect. */

/* x, wickY, wickH, bodyY, bodyH, up(1)/down(0) — exact values from the Figma frame */
const CANDLES = "40,110.9,23.4,118.9,7.4,0 59,136.1,18.1,144.1,3,0 78,116.8,26.5,124.8,10.5,0 97,151.9,21.2,159.9,5.2,1 116,142.6,21.5,150.6,5.5,0 135,152.1,18.6,160.1,3,0 154,178,18.3,186,3,0 173,178.2,17.2,186.2,3,1 192,195.5,25.5,203.5,9.5,0 211,195,28.5,203,12.5,0 230,232.3,16.7,240.3,3,1 249,251.2,20.6,259.2,4.6,0 268,258.8,28.3,266.8,12.3,1 287,231.5,21.6,239.5,5.6,0 306,254.5,20.1,262.5,4.1,0 325,260.2,29.8,268.2,13.8,0 344,255.5,25.1,263.5,9,0 363,235.4,22.1,243.4,6,1 382,229.1,19.2,237.1,3.2,1 401,229.1,20.7,237.1,4.7,0 420,202.9,29.4,210.9,13.4,1 439,229.2,17,237.2,3,1 458,205.5,25.3,213.5,9.3,1 477,216.8,26.8,224.8,10.7,1 496,237.1,28.3,245.1,12.3,1 515,251.4,23.5,259.4,7.5,0 534,269.1,26.4,277.1,10.4,1 553,240.9,23.1,248.9,7.1,1 572,251.8,19.1,259.8,3.1,1 591,227.7,26.4,235.7,10.4,0 610,220.8,27.8,228.8,11.7,1 629,219.9,17.5,227.9,3,1 648,206.9,17.4,214.9,3,0 667,215.7,26.7,223.7,10.7,0 686,235.8,24.9,243.8,8.9,0 705,243.9,26.2,251.9,10.2,0 724,234.2,22.2,242.2,6.2,1 743,230,18.3,238,3,1 762,232.6,20,240.6,4,1 781,207.9,26.8,215.9,10.8,0 800,200,28.8,208,12.8,0 819,216.4,25.8,224.4,9.8,1 838,189.6,25,197.6,9.1,1 857,168.6,23.5,176.6,7.5,1 876,175.6,23.5,183.6,7.5,1 895,162.3,16.4,170.3,3,1 914,149.5,18.5,157.5,3,0 933,120.2,22.7,128.2,6.6,1 952,97.4,29.9,105.4,13.9,1 971,101.7,18.3,109.7,3,1 990,63.5,19.7,71.5,3.7,1 1009,76.4,17.8,84.4,3,0 1028,61.8,28.7,69.8,12.7,0 1047,44.7,21.3,52.7,5.3,0 1066,62.2,16.4,70.2,3,0 1085,51.3,19.3,59.3,3.3,0 1104,69.2,21,77.2,4.9,0 1123,55.1,28.5,63.1,12.5,1".split(' ');

const PRICE_LINE = "M0 68 L19 88 L38 77 L57 102 L76 98 L95 105 L114 130 L133 128 L152 155 L171 157 L190 182 L209 206 L228 209 L247 187 L266 209 L285 224 L304 215 L323 185 L342 179 L361 184 L380 153 L399 179 L418 156 L437 167 L456 187 L475 209 L494 219 L513 191 L532 202 L551 188 L570 171 L589 170 L608 158 L627 176 L646 195 L665 204 L684 184 L703 180 L722 183 L741 169 L760 163 L779 166 L798 140 L817 119 L836 126 L855 112 L874 102 L893 70 L912 47 L931 52 L950 13 L969 28 L988 25 L1007 0 L1026 13 L1045 5 L1064 24 L1083 5";

function EffChartSvg() {
  const vLines: number[] = [];
  for (let i = 20; i <= 1220; i += 40) vLines.push(i);
  const hLines: number[] = [];
  for (let i = 32; i <= 312; i += 40) hLines.push(i);

  return (
    <svg className="gridbg" id="effchart" viewBox="0 0 1240 330" preserveAspectRatio="none" aria-hidden="true">
      {vLines.map((i) => (
        <line key={`v${i}`} x1={i} y1={0} x2={i} y2={330} stroke="#0e1725" strokeWidth={1} />
      ))}
      {hLines.map((i) => (
        <line key={`h${i}`} x1={0} y1={i} x2={1240} y2={i} stroke="#0e1725" strokeWidth={1} />
      ))}

      {CANDLES.map((c, i) => {
        const p = c.split(',');
        const x = +p[0];
        const up = p[5] === '1';
        const col = up ? '#24c88a' : '#ff4d5e';
        return (
          <g key={`c${i}`}>
            <line x1={x} y1={+p[1]} x2={x} y2={+p[1] + +p[2]} stroke={col} strokeWidth={1} opacity={0.7} />
            <rect x={x - 4} y={+p[3]} width={8} height={+p[4]} fill={col} opacity={0.85} />
          </g>
        );
      })}

      <path d={PRICE_LINE} stroke="#2fd3c4" strokeWidth={2} fill="none" opacity={0.9} transform="translate(40,40)" />
    </svg>
  );
}

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

        <div className="card chartcard">
          <EffChartSvg />
          <div className="chartlabel">PRICE ACTION / SCORED ON CLOSE</div>
          <div className="chip"><b>JOURNALED AUTOMATICALLY</b><span>1,284 TRADES</span></div>
        </div>

        <div className="statrow">
          <div className="stat"><b>10×</b><span>FASTER REVIEW</span><p>Weeks of self-analysis in one session</p></div>
          <div className="stat"><b>30 SEC</b><span>PER TRADE LOGGED</span><p>Auto-scored the moment you close</p></div>
          <div className="stat"><b>1 YEAR</b><span>OF INSIGHT, INSTANTLY</span><p>Patterns that take months to spot</p></div>
        </div>
      </div>
    </div>
  );
}
