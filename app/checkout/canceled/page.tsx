'use client';

import { useRouter } from 'next/navigation';
import { XCircle } from 'lucide-react';

export default function CheckoutCanceledPage() {
  const router = useRouter();

  return (
    <div className="atlas-site" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 20px' }}>
      <div className="card-solid" style={{ width: '100%', maxWidth: '480px', padding: '38px 36px', textAlign: 'center', position: 'relative' }}>
        <span style={{ position: 'absolute', left: 0, top: '-1px', width: '120px', height: '2px', background: 'var(--line-2)' }} />
        <div style={{ margin: '0 auto 20px', width: '52px', height: '52px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--line-2)', borderRadius: '3px', background: 'var(--card-2)' }}>
          <XCircle size={24} style={{ color: 'var(--atlas-muted)' }} />
        </div>
        <p className="eyebrow" style={{ margin: '0 0 12px', color: 'var(--muted-2)' }}>NO CHARGE MADE</p>
        <h1 style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: '30px', lineHeight: '34px', color: 'var(--text)', margin: 0 }}>Checkout canceled</h1>
        <p style={{ margin: '14px 0 0', fontSize: '14px', lineHeight: '22px', color: 'var(--atlas-muted)' }}>
          No charge was made. You can pick a plan again any time from the pricing page.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '28px' }}>
          <button
            onClick={() => router.replace('/pricing')}
            className="btn btn-amber"
            style={{ width: '100%' }}
          >
            Back to pricing
            <svg className="arrow-r" viewBox="0 0 12 9" fill="none"><path d="M0 4.5 H12 M12 4.5 L7 0 M12 4.5 L7 9" stroke="#0a0a0a" strokeWidth="1.7" strokeLinecap="round" /></svg>
          </button>
          <button
            onClick={() => router.replace('/app')}
            className="btn btn-ghost"
            style={{ width: '100%' }}
          >
            Continue on the free plan
          </button>
        </div>
      </div>
    </div>
  );
}
