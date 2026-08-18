import type { CSSProperties } from 'react';
import Link from 'next/link';
import LandingNav from '@/components/landing/LandingNav';
import Footer from '@/components/landing/Footer';

export default function SecurityPage() {
  return (
    <div className="atlas-site">
      <LandingNav />

      <div className="phero" style={{ '--band': '430px', padding: '141px 0 0' } as CSSProperties}>
        <div className="panelgrid"></div>
        <div className="wrap">
          <p className="kicker" style={{ color: '#fff' }}>
            <svg width="24" height="24" viewBox="0 0 17 17" fill="none" style={{ marginLeft: '-32px' }}><circle cx="8.5" cy="8.5" r="8" stroke="#fff" strokeOpacity=".35"/><rect x="5" y="7.6" width="7" height="5.4" rx="1" stroke="#fff" strokeOpacity=".7"/><path d="M6.6 7.6V6.2a1.9 1.9 0 013.8 0v1.4" stroke="#fff" strokeOpacity=".7"/></svg>
            READ AND ANALYTICS ONLY
          </p>
          <h1 className="light" style={{ fontSize: '52px', lineHeight: '57px' }}>Read-only analytics with explicit<em>non-trading boundaries</em></h1>
          <p className="sub" style={{ marginTop: '33px' }}>Atlas never holds funds, executes orders, or asks for withdrawal access. Here&rsquo;s how the platform is engineered to keep your trade history safe.</p>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--line)', marginTop: '80px' }}>
        <div className="wrap">
          <div className="bounds">
            <div className="bound"><svg className="ic" width="18" height="21" viewBox="0 0 18 21" fill="none"><path d="M9 0 L18 3.5 L18 10.5 C18 16 14 19 9 21 C4 19 0 16 0 10.5 L0 3.5 L9 0 Z" stroke="#2fd3c4" strokeWidth="1.2"/></svg>
              <h4>Read-only account access</h4><p>Use read-only credentials wherever connectors require them. Atlas is designed for post-trade data retrieval only.</p></div>
            <div className="bound"><svg className="ic" width="18" height="21" viewBox="0 0 18 21" fill="none"><path d="M9 0 L18 3.5 L18 10.5 C18 16 14 19 9 21 C4 19 0 16 0 10.5 L0 3.5 L9 0 Z" stroke="#2fd3c4" strokeWidth="1.2"/></svg>
              <h4>No order execution path</h4><p>The platform is analytics software. It does not submit, modify, or cancel orders — there is no code path that could.</p></div>
            <div className="bound"><svg className="ic" width="18" height="21" viewBox="0 0 18 21" fill="none"><path d="M9 0 L18 3.5 L18 10.5 C18 16 14 19 9 21 C4 19 0 16 0 10.5 L0 3.5 L9 0 Z" stroke="#2fd3c4" strokeWidth="1.2"/></svg>
              <h4>Scoped data usage</h4><p>Imported payloads are used for normalization, analytics, and verdict generation only. Nothing else, nowhere else.</p></div>
            <div className="bound"><svg className="ic" width="18" height="21" viewBox="0 0 18 21" fill="none"><path d="M9 0 L18 3.5 L18 10.5 C18 16 14 19 9 21 C4 19 0 16 0 10.5 L0 3.5 L9 0 Z" stroke="#2fd3c4" strokeWidth="1.2"/></svg>
              <h4>Background task isolation</h4><p>Import, aggregate, and verdict computations run via service/task boundaries to reduce request-layer risk.</p></div>
            <div className="bound"><svg className="ic" width="18" height="21" viewBox="0 0 18 21" fill="none"><path d="M9 0 L18 3.5 L18 10.5 C18 16 14 19 9 21 C4 19 0 16 0 10.5 L0 3.5 L9 0 Z" stroke="#2fd3c4" strokeWidth="1.2"/></svg>
              <h4>Idempotent imports</h4><p>Deterministic hashes prevent duplicate trade creation during reruns and recovery. Re-importing the same file is always safe.</p></div>
            <div className="bound"><svg className="ic" width="18" height="21" viewBox="0 0 18 21" fill="none"><path d="M9 0 L18 3.5 L18 10.5 C18 16 14 19 9 21 C4 19 0 16 0 10.5 L0 3.5 L9 0 Z" stroke="#2fd3c4" strokeWidth="1.2"/></svg>
              <h4>Operational visibility</h4><p>Import logs track statuses, sources, and errors to support incident response and reproducibility.</p></div>
          </div>

          <hr className="inset-rule" style={{ marginTop: '86px' }} />
          <div className="setupcard">
            <p className="hd" style={{ margin: 0 }}>RECOMMENDED ACCOUNT SETUP</p>
            <ul>
              <li><svg width="13" height="10" viewBox="0 0 13 10" fill="none"><path d="M0 5 L4.5 10 L13 0" stroke="#2fd3c4" strokeWidth="1.8"/></svg>Create dedicated exchange API keys for analytics only</li>
              <li><svg width="13" height="10" viewBox="0 0 13 10" fill="none"><path d="M0 5 L4.5 10 L13 0" stroke="#2fd3c4" strokeWidth="1.8"/></svg>Disable trading and withdrawal permissions on those keys</li>
              <li><svg width="13" height="10" viewBox="0 0 13 10" fill="none"><path d="M0 5 L4.5 10 L13 0" stroke="#2fd3c4" strokeWidth="1.8"/></svg>Rotate keys when access policies or account ownership changes</li>
              <li><svg width="13" height="10" viewBox="0 0 13 10" fill="none"><path d="M0 5 L4.5 10 L13 0" stroke="#2fd3c4" strokeWidth="1.8"/></svg>Enable account-level MFA and exchange-side IP allowlists where available</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="pcta" style={{ marginTop: '84px' }}>
        <div className="gridwash"></div><div className="glow"></div>
        <div className="wrap">
          <h2>Questions about security?</h2>
          <p className="sub">Reach our security team at <a href="mailto:security@atlas.app">security@atlas.app</a>  or start with no commitment.</p>
          <div className="row">
            <Link className="btn btn-amber" href="/pricing">Start Free Trial<svg className="arrow-r" viewBox="0 0 12 9" fill="none"><path d="M0 4.5 H12 M12 4.5 L7 0 M12 4.5 L7 9" stroke="#0a0a0a" strokeWidth="1.7" strokeLinecap="round"/></svg></Link>
            <Link className="btn btn-ghost" href="/contact">Contact Us</Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
