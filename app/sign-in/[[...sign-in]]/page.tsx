import Link from 'next/link';
import Image from 'next/image';
import { SignIn } from '@clerk/nextjs';
import { dark } from '@clerk/themes';

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

export default function SignInPage() {
  return (
    <div className="atlas-site" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ borderBottom: '1px solid var(--line)' }}>
        <div className="wrap" style={{ height: '88px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '14px' }} aria-label="Atlas home">
            <Image src="/atlas-icon.svg" alt="" width={26} height={26} priority />
            <span style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: '16px', letterSpacing: '.22em', color: 'var(--text)' }}>ATLAS</span>
          </Link>
          <Link href="/sign-up" style={{ fontSize: '14px', color: 'var(--text-4)' }}>Create an account</Link>
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '72px 20px 96px' }}>
        <div style={{ width: '100%', maxWidth: '480px' }}>
          <p className="eyebrow" style={{ textAlign: 'center', margin: '0 0 16px' }}>SECURE SIGN-IN</p>
          <h1 style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: '36px', lineHeight: '40px', color: 'var(--text)', margin: 0, textAlign: 'center' }}>
            Welcome back
          </h1>
          <p className="lede" style={{ marginTop: '16px', textAlign: 'center' }}>
            Pick up where your journal left off — every trade, verdict and streak is exactly where you left it.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px' }}>
            <SignIn appearance={atlasClerkAppearance} />
          </div>

          <hr className="hr" style={{ marginTop: '48px' }} />
          <p style={{ margin: '20px 0 0', textAlign: 'center', fontSize: '13px', lineHeight: '20px', color: 'var(--muted-2)' }}>
            Trouble signing in? Reach us at{' '}
            <a href="mailto:support@atlas.app" style={{ color: 'var(--amber)' }}>support@atlas.app</a>
          </p>
        </div>
      </main>
    </div>
  );
}
