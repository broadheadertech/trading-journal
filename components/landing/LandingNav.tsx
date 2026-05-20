'use client';

import { useState, useRef, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import Image from 'next/image';
import {
  Menu, X, Zap, ChevronDown,
  Sparkles, Workflow, Plug, Users,
  Database, Gift, Calculator, Scale,
  Shield, FileText, Mail, GitBranch, Lock, ScrollText,
  Search, Activity, BarChart3, LayoutDashboard,
} from 'lucide-react';

type NavItem = { label: string; href: string };
type Dropdown = {
  label: string;
  groups: { heading?: string; items: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; desc: string; href: string }[] }[];
};

const TOP_LINKS: NavItem[] = [
  { label: 'Home',    href: '/' },
  { label: 'Demo',    href: '/demo' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Blog',    href: '/blog' },
];

const DROPDOWNS: Dropdown[] = [
  {
    label: 'Features',
    groups: [
      {
        heading: 'What you get',
        items: [
          { icon: Search,          label: 'Leak Detection',        desc: 'Costly trading mistakes ranked by $ impact',     href: '/#features' },
          { icon: Activity,        label: 'Behavior Analysis',     desc: 'Discipline score + emotional pressure tracking', href: '/#features' },
          { icon: BarChart3,       label: 'Performance Analytics', desc: '50+ metrics computed automatically every import', href: '/#features' },
          { icon: Shield,          label: 'Playbook Rules',        desc: 'Custom rules scored compliance trade-by-trade',  href: '/#features' },
          { icon: LayoutDashboard, label: 'Dashboard Overview',    desc: 'Net P&L, equity curve, heatmap, recent trades',  href: '/#features' },
          { icon: Sparkles,        label: 'What-If Scenarios',     desc: 'Replay trades with adjusted stops or rules',     href: '/#features' },
        ],
      },
    ],
  },
  {
    label: 'Platform',
    groups: [
      {
        items: [
          { icon: Sparkles, label: 'Features',     desc: 'Leak detection, behavior scoring, 50+ metrics', href: '/#features' },
          { icon: Workflow, label: 'How It Works', desc: 'Three steps from CSV upload to improvement',   href: '/#how-it-works' },
          { icon: Plug,     label: 'Integrations', desc: '67+ broker formats and 5 live API connectors', href: '/integrations' },
          { icon: Users,    label: 'Use Cases',    desc: 'Solo traders, prop firms, coaches, risk',      href: '/use-cases' },
        ],
      },
    ],
  },
  {
    label: 'Explore',
    groups: [
      {
        heading: 'Browse',
        items: [
          { icon: Database,   label: 'Brokers',   desc: 'All 67+ supported brokers and exchanges',  href: '/brokers' },
          { icon: Gift,       label: 'Affiliate', desc: 'Earn 30–50% recurring commission',         href: '/affiliate' },
        ],
      },
      {
        heading: 'Free Tools',
        items: [
          { icon: Calculator, label: 'Position Size Calculator', desc: 'Size positions to your risk budget', href: '#' },
          { icon: Scale,      label: 'Risk/Reward Calculator',   desc: 'Plan trade RR before you click buy',  href: '#' },
        ],
      },
    ],
  },
  {
    label: 'Trust',
    groups: [
      {
        heading: 'Company',
        items: [
          { icon: FileText,  label: 'About',     desc: 'Why Tradia exists, who built it',     href: '/about' },
          { icon: Shield,    label: 'Security',  desc: 'Read-only by design, EU-hosted',      href: '/security' },
          { icon: Mail,      label: 'Contact',   desc: 'Email-routed support, UTC business hours', href: '/contact' },
          { icon: GitBranch, label: 'Changelog', desc: 'What we shipped recently',            href: '/changelog' },
        ],
      },
      {
        heading: 'Legal',
        items: [
          { icon: Lock,       label: 'Privacy Policy',   desc: 'How we handle your data',  href: '/privacy' },
          { icon: ScrollText, label: 'Terms of Service', desc: 'Service terms and limits', href: '/terms' },
        ],
      },
    ],
  },
];

export default function LandingNav() {
  const { isSignedIn } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [openMobileGroup, setOpenMobileGroup] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = (label: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenDropdown(label);
  };
  const handleLeave = () => {
    closeTimer.current = setTimeout(() => setOpenDropdown(null), 120);
  };

  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo — neural-brain brand mark + pink-aurora wordmark (legacy marketing variant) */}
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <Image
            src="/tradia-brain-only.png"
            alt="Tradia"
            width={36}
            height={36}
            priority
            className="w-9 h-9 object-contain"
          />
          <span className="font-brand text-xl font-extrabold tracking-[0.18em] uppercase bg-gradient-to-r from-pink-400 to-fuchsia-400 bg-clip-text text-transparent">
            Tradia
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {TOP_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-2 text-sm font-medium text-[var(--muted-foreground)] hover:text-pink-400 transition-colors"
            >
              {link.label}
            </Link>
          ))}
          {DROPDOWNS.map(d => (
            <div
              key={d.label}
              className="relative"
              onMouseEnter={() => handleEnter(d.label)}
              onMouseLeave={handleLeave}
            >
              <button
                className={`px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1 ${
                  openDropdown === d.label ? 'text-pink-400' : 'text-[var(--muted-foreground)] hover:text-pink-400'
                }`}
              >
                {d.label}
                <ChevronDown size={13} className={`transition-transform ${openDropdown === d.label ? 'rotate-180' : ''}`} />
              </button>
              {openDropdown === d.label && (
                <DropdownPanel dropdown={d} onClose={() => setOpenDropdown(null)} />
              )}
            </div>
          ))}
        </nav>

        {/* Right cluster */}
        <div className="hidden lg:flex items-center gap-4 shrink-0">
          {isSignedIn ? (
            <Link
              href="/app"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-slate-900 bg-gradient-to-r from-orange-400 to-amber-400 hover:from-orange-300 hover:to-amber-300 shadow-[0_0_20px_-4px_rgba(251,146,60,0.6)] transition-all"
            >
              <Zap size={14} className="fill-current" />
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-slate-900 bg-gradient-to-r from-orange-400 to-amber-400 hover:from-orange-300 hover:to-amber-300 shadow-[0_0_20px_-4px_rgba(251,146,60,0.6)] transition-all"
              >
                <Zap size={14} className="fill-current" />
                Start Free Trial
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="lg:hidden p-2 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="lg:hidden border-t border-[var(--border)] bg-[var(--background)] max-h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="px-4 py-4 space-y-1">
            {TOP_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2.5 text-sm font-medium text-[var(--muted-foreground)] hover:text-pink-400 hover:bg-[var(--muted)]/30 rounded-lg transition-colors"
              >
                {link.label}
              </Link>
            ))}
            {DROPDOWNS.map(d => {
              const isOpen = openMobileGroup === d.label;
              return (
                <div key={d.label} className="rounded-lg">
                  <button
                    onClick={() => setOpenMobileGroup(isOpen ? null : d.label)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                      isOpen ? 'bg-[var(--muted)]/30 text-pink-400' : 'text-[var(--muted-foreground)] hover:text-pink-400 hover:bg-[var(--muted)]/30'
                    }`}
                  >
                    {d.label}
                    <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="mt-1 ml-2 pl-3 border-l border-[var(--border)] space-y-1 py-1">
                      {d.groups.map(g => (
                        <div key={g.heading || 'g'} className="space-y-0.5">
                          {g.heading && (
                            <div className="px-2 pt-2 pb-1 text-[9px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/60">
                              {g.heading}
                            </div>
                          )}
                          {g.items.map(it => (
                            <Link
                              key={it.label}
                              href={it.href}
                              onClick={() => setMenuOpen(false)}
                              className="flex items-start gap-2.5 px-2 py-2 rounded-md hover:bg-[var(--muted)]/30 transition-colors group"
                            >
                              <it.icon size={14} className="mt-0.5 text-pink-400 shrink-0" />
                              <div>
                                <div className="text-xs font-bold text-[var(--foreground)]">{it.label}</div>
                                <div className="text-[10px] text-[var(--muted-foreground)] leading-snug">{it.desc}</div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="px-4 py-4 border-t border-[var(--border)] flex flex-col gap-2">
            {isSignedIn ? (
              <Link
                href="/app"
                onClick={() => setMenuOpen(false)}
                className="w-full text-center inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-900 bg-gradient-to-r from-orange-400 to-amber-400"
              >
                <Zap size={14} className="fill-current" /> Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  onClick={() => setMenuOpen(false)}
                  className="w-full text-center px-4 py-2.5 border border-[var(--border)] text-[var(--foreground)] rounded-lg text-sm font-medium hover:bg-[var(--muted)] transition-colors"
                >
                  Log in
                </Link>
                <Link
                  href="/sign-up"
                  onClick={() => setMenuOpen(false)}
                  className="w-full text-center inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-900 bg-gradient-to-r from-orange-400 to-amber-400"
                >
                  <Zap size={14} className="fill-current" /> Start Free Trial
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function DropdownPanel({ dropdown, onClose }: { dropdown: Dropdown; onClose: () => void }) {
  const wide = dropdown.groups.length > 1;
  return (
    <div
      className={`absolute top-full left-1/2 -translate-x-1/2 pt-2 ${wide ? 'w-[480px]' : 'w-[340px]'}`}
    >
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-2xl overflow-hidden backdrop-blur-xl">
        {/* Top accent line */}
        <div className="h-px bg-gradient-to-r from-transparent via-pink-400/50 to-transparent" />
        <div className={`p-2 ${wide ? 'grid grid-cols-2 gap-1' : ''}`}>
          {dropdown.groups.map(g => (
            <div key={g.heading || 'group'} className="space-y-0.5">
              {g.heading && (
                <div className="px-3 pt-2 pb-1 text-[9px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/60">
                  {g.heading}
                </div>
              )}
              {g.items.map(it => (
                <Link
                  key={it.label}
                  href={it.href}
                  onClick={onClose}
                  className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-pink-500/10 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-md bg-gradient-to-br from-pink-500/15 to-fuchsia-500/10 border border-pink-500/20 flex items-center justify-center shrink-0 group-hover:border-pink-500/40 transition-colors">
                    <it.icon size={14} className="text-pink-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[var(--foreground)] group-hover:text-pink-400 transition-colors">{it.label}</div>
                    <div className="text-[10px] text-[var(--muted-foreground)] leading-snug mt-0.5">{it.desc}</div>
                  </div>
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
