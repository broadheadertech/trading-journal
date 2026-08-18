'use client';

import { SignUp } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

// ATLAS tokens handed to Clerk's own renderer. Presentation only — no routing,
// redirect or auth behaviour is configured here.
const atlasClerkAppearance = {
  baseTheme: dark,
  variables: {
    colorPrimary: '#d99405',
    colorTextOnPrimaryBackground: '#0a0a0a',
    colorBackground: '#0a0f17',
    colorInputBackground: '#0c121b',
    colorText: '#edf2f7',
    colorTextSecondary: '#7f8ea3',
    colorInputText: '#edf2f7',
    colorDanger: '#ff4d5e',
    colorSuccess: '#24c88a',
    colorWarning: '#d99405',
    borderRadius: '2px',
    fontFamily: 'var(--body)',
    fontSize: '14px',
  },
  elements: {
    card: { backgroundColor: '#0a0f17', border: '1px solid #182432', boxShadow: 'none', borderRadius: '3px' },
    headerTitle: { fontFamily: 'var(--display)', fontWeight: 600, color: '#edf2f7' },
    headerSubtitle: { color: '#7f8ea3' },
    formButtonPrimary: { backgroundColor: '#d99405', color: '#0a0a0a', fontWeight: 700, borderRadius: '2px', textTransform: 'none' as const },
    socialButtonsBlockButton: { border: '1px solid #24344a', borderRadius: '2px' },
    formFieldInput: { border: '1px solid #182432', borderRadius: '2px', backgroundColor: '#0c121b' },
    dividerLine: { backgroundColor: '#182432' },
    dividerText: { color: '#5c6b7e' },
    footerActionLink: { color: '#d99405' },
  },
};

export default function SignUpPage() {
  const [checked, setChecked] = useState(false);
  const [proceeded, setProceeded] = useState(false);

  return (
    <div className="atlas-site" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ borderBottom: '1px solid var(--line)' }}>
        <div className="wrap" style={{ height: '88px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '14px' }} aria-label="Atlas home">
            <Image src="/atlas-icon.svg" alt="" width={26} height={26} priority />
            <span style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: '16px', letterSpacing: '.22em', color: 'var(--text)' }}>ATLAS</span>
          </Link>
          <Link href="/sign-in" style={{ fontSize: '14px', color: 'var(--text-4)' }}>Sign in</Link>
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '72px 20px 96px' }}>
        {!proceeded ? (
          <div style={{ width: '100%', maxWidth: '560px' }}>
            <p className="eyebrow" style={{ textAlign: 'center', margin: '0 0 16px' }}>STEP 1 OF 2 — CONSENT</p>
            <h1 style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: '36px', lineHeight: '40px', color: 'var(--text)', margin: 0, textAlign: 'center' }}>
              Create your Atlas account
            </h1>
            <p className="lede" style={{ marginTop: '16px', textAlign: 'center' }}>
              Before you get started, please review and accept our policies.
            </p>

            <div className="card-solid" style={{ marginTop: '40px', padding: '28px 30px' }}>
              <p style={{ margin: 0, fontFamily: 'var(--micro)', fontWeight: 700, fontSize: '10px', letterSpacing: '.06em', color: 'var(--teal)' }}>
                DATA COLLECTION CONSENT
              </p>
              <p style={{ margin: '16px 0 0', fontSize: '13px', lineHeight: '21px', color: 'var(--atlas-muted)' }}>
                By creating an account, you consent to the collection, processing, and storage of your personal data including your account information, trading data, journal entries, behavioral and psychology data, and usage analytics as described in our Privacy Policy. This data is used to provide personalized trading insights, analytics, AI coaching, and to improve our services.
              </p>
              <p style={{ margin: '14px 0 0', fontSize: '13px', lineHeight: '21px', color: 'var(--atlas-muted)' }}>
                You may withdraw consent and request data deletion at any time by contacting{' '}
                <a href="mailto:support@atlas.app" style={{ color: 'var(--amber)' }}>support@atlas.app</a>{' '}
                or deleting your account.
              </p>

              <hr className="hr" style={{ margin: '24px 0' }} />

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                  style={{ marginTop: '3px', width: '15px', height: '15px', flex: 'none', accentColor: '#d99405', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '13px', lineHeight: '21px', color: 'var(--text-4)' }}>
                  I have read and agree to the{' '}
                  <Link href="/terms" style={{ color: 'var(--amber)' }} target="_blank">Terms of Service</Link>
                  {' '}and{' '}
                  <Link href="/privacy" style={{ color: 'var(--amber)' }} target="_blank">Privacy Policy</Link>,
                  and I consent to the collection and processing of my personal data as described above.
                </span>
              </label>

              <button
                disabled={!checked}
                onClick={() => setProceeded(true)}
                className="btn btn-amber"
                style={{ width: '100%', marginTop: '26px', opacity: checked ? 1 : 0.4, cursor: checked ? 'pointer' : 'not-allowed' }}
              >
                Continue to Sign Up
                <svg className="arrow-r" viewBox="0 0 12 9" fill="none"><path d="M0 4.5 H12 M12 4.5 L7 0 M12 4.5 L7 9" stroke="#0a0a0a" strokeWidth="1.7" strokeLinecap="round" /></svg>
              </button>
            </div>

            <p style={{ margin: '24px 0 0', textAlign: 'center', fontSize: '13px', color: 'var(--muted-2)' }}>
              Already have an account?{' '}
              <Link href="/sign-in" style={{ color: 'var(--amber)' }}>Sign in</Link>
            </p>
          </div>
        ) : (
          <div style={{ width: '100%', maxWidth: '480px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <p className="eyebrow" style={{ textAlign: 'center', margin: '0 0 16px' }}>STEP 2 OF 2 — YOUR DETAILS</p>
            <SignUp appearance={atlasClerkAppearance} />
            <button
              onClick={() => { setProceeded(false); setChecked(false); }}
              style={{ marginTop: '20px', fontSize: '13px', color: 'var(--muted-2)' }}
            >
              Back to consent
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
