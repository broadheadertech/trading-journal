'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import BrainMascot from '@/components/BrainMascot';

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
];

export default function LandingNav() {
  const { isSignedIn } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-lg">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <BrainMascot size={30} />
          <span className="text-lg font-bold bg-gradient-to-r from-teal-400 to-teal-600 bg-clip-text text-transparent">
            Tradia
          </span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map(link => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              {link.label}
            </a>
          ))}
          {isSignedIn ? (
            <Link
              href="/app"
              className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-sm font-medium transition-colors"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-sm font-medium transition-colors"
              >
                Get Started Free
              </Link>
            </>
          )}
        </nav>

        {/* Mobile menu button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden p-2 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-[var(--border)] bg-[var(--background)] px-4 py-4 space-y-3">
          {navLinks.map(link => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="block text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors py-2"
            >
              {link.label}
            </a>
          ))}
          <div className="pt-2 border-t border-[var(--border)] flex flex-col gap-2">
            {isSignedIn ? (
              <Link
                href="/app"
                className="w-full text-center px-4 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-sm font-medium transition-colors"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="w-full text-center px-4 py-2.5 border border-[var(--border)] text-[var(--foreground)] rounded-lg text-sm font-medium hover:bg-[var(--muted)] transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  className="w-full text-center px-4 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Get Started Free
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
