import Link from 'next/link';

export default function ExploreSection() {
  return (
    <div className="sec08">
      <div className="wrap">
        <p className="eyebrow">EXPLORE</p>
        <h2 className="h2" style={{ marginTop: '11px' }}>Explore Atlas</h2>
        <p className="lede-lg" style={{ marginTop: '23px' }}>Everything you need to know — features, pricing, integrations, and where to go next.</p>

        <div className="explore">
          <div className="exprow"><h4>Features</h4><p>Leak detection, behavior scoring, playbook rules, 50+ metrics.</p><svg className="go" viewBox="0 0 16 16" fill="none"><path d="M8.9 0 L16 8 M16 8 L8.9 16 M16 8 H0" stroke="#d99405" strokeWidth=".8" /></svg></div>
          <div className="exprow"><h4>How It Works</h4><p>Three steps from CSV upload to measurable improvement.</p><svg className="go" viewBox="0 0 16 15" fill="none"><path d="M8.9 0 L16 7.5 M16 7.5 L8.9 15 M16 7.5 H0" stroke="#d99405" strokeWidth=".8" /></svg></div>
          <Link className="exprow" href="/pricing"><h4>Pricing</h4><p>Pro $29/mo, Team $69/mo, 14 day free trial.</p><svg className="go" viewBox="0 0 16 16" fill="none"><path d="M8.9 0 L16 8 M16 8 L8.9 16 M16 8 H0" stroke="#d99405" strokeWidth=".8" /></svg></Link>
          <Link className="exprow" href="/integrations"><h4>Integrations</h4><p>40+ broker CSV formats and 5 live API connections.</p><svg className="go" viewBox="0 0 16 16" fill="none"><path d="M8.9 0 L16 8 M16 8 L8.9 16 M16 8 H0" stroke="#d99405" strokeWidth=".8" /></svg></Link>
          <Link className="exprow" href="/use-cases"><h4>Use Cases</h4><p>Solo traders, prop firms, coaches, risk management.</p><svg className="go" viewBox="0 0 16 16" fill="none"><path d="M8.9 0 L16 8 M16 8 L8.9 16 M16 8 H0" stroke="#d99405" strokeWidth=".8" /></svg></Link>
          <Link className="exprow" href="/demo"><h4>Interactive Demo</h4><p>See the app with sample data before you sign up.</p><svg className="go" viewBox="0 0 16 15" fill="none"><path d="M8.9 0 L16 7.5 M16 7.5 L8.9 15 M16 7.5 H0" stroke="#d99405" strokeWidth=".8" /></svg></Link>
          <Link className="exprow" href="/blog"><h4>Trading Blog</h4><p>Articles on psychology, mistakes, and performance improvement.</p><svg className="go" viewBox="0 0 16 16" fill="none"><path d="M8.9 0 L16 8 M16 8 L8.9 16 M16 8 H0" stroke="#d99405" strokeWidth=".8" /></svg></Link>
        </div>
      </div>
    </div>
  );
}
