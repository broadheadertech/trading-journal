'use client';

import { SignUp } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function SignUpPage() {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)] px-4">
      {!agreed ? (
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <Image src="/logo.png" alt="Tradia" width={56} height={56} className="mb-4" />
            <h1 className="text-2xl font-bold text-[var(--foreground)]">Create your Tradia account</h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-2 text-center">
              Before you get started, please review and accept our policies.
            </p>
          </div>

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-5">
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">Data Collection Consent</h2>
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                By creating an account, you consent to the collection, processing, and storage of your personal data including your account information, trading data, journal entries, behavioral and psychology data, and usage analytics as described in our Privacy Policy. This data is used to provide personalized trading insights, analytics, AI coaching, and to improve our services.
              </p>
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                You may withdraw consent and request data deletion at any time by contacting{' '}
                <a href="mailto:support@tradia.app" className="text-[var(--accent)] hover:underline">support@tradia.app</a>{' '}
                or deleting your account.
              </p>
            </div>

            <div className="border-t border-[var(--border)] pt-4">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 shrink-0 rounded border-[var(--border)] accent-[var(--accent)] cursor-pointer"
                />
                <span className="text-xs text-[var(--muted-foreground)] group-hover:text-[var(--foreground)] transition-colors leading-relaxed">
                  I have read and agree to the{' '}
                  <Link href="/terms" className="text-[var(--accent)] hover:underline" target="_blank">Terms of Service</Link>
                  {' '}and{' '}
                  <Link href="/privacy" className="text-[var(--accent)] hover:underline" target="_blank">Privacy Policy</Link>,
                  and I consent to the collection and processing of my personal data as described above.
                </span>
              </label>
            </div>

            <button
              disabled={!agreed}
              onClick={() => setAgreed(true)}
              className="w-full py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue to Sign Up
            </button>
          </div>

          <p className="text-xs text-[var(--muted-foreground)] text-center mt-6">
            Already have an account?{' '}
            <Link href="/sign-in" className="text-[var(--accent)] hover:underline">Sign in</Link>
          </p>
        </div>
      ) : (
        <div className="w-full max-w-md flex flex-col items-center">
          <SignUp appearance={{ baseTheme: dark }} />
          <button
            onClick={() => setAgreed(false)}
            className="mt-4 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            Back to consent
          </button>
        </div>
      )}
    </div>
  );
}
