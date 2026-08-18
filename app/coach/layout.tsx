'use client';

import { useUser } from '@clerk/nextjs';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Headphones, User, Calendar, MessageSquare, DollarSign, ArrowLeft } from 'lucide-react';
import BrainMascot from '@/components/BrainMascot';

const NAV = [
  { href: '/coach',           label: 'Profile',     icon: User },
  { href: '/coach/slots',     label: 'Availability',icon: Calendar },
  { href: '/coach/sessions',  label: 'Sessions',    icon: Headphones },
  { href: '/coach/messages',  label: 'Messages',    icon: MessageSquare },
  { href: '/coach/earnings',  label: 'Earnings',    icon: DollarSign },
];

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  const { isLoaded } = useUser();
  const pathname = usePathname();
  const profile = useQuery(api.coaches.getMyCoachProfile);

  if (!isLoaded || profile === undefined) {
    return (
      <div
        className="atlas-dash"
        style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}
      >
        <BrainMascot size={48} glow beat />
      </div>
    );
  }

  return (
    <div className="atlas-dash" style={{ minHeight: '100dvh', display: 'flex', background: 'var(--bg)' }}>
      <aside
        className="side"
        style={{ position: 'sticky', top: 0, height: '100dvh', flex: 'none', alignSelf: 'flex-start' }}
      >
        <div className="brand">
          <Headphones size={16} style={{ color: 'var(--amber)' }} />
          <span style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 14, letterSpacing: '.02em' }}>
            COACH HUB
          </span>
        </div>

        <nav className="nav">
          <h5>WORKSPACE</h5>
          {NAV.map((item) => {
            const active = item.href === '/coach' ? pathname === '/coach' : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={active ? 'on' : undefined}>
                <Icon size={16} className="ic" />
                <span className="lb">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="foot" style={{ marginTop: 'auto' }}>
          <Link href="/app">
            <ArrowLeft size={16} className="ic" />
            <span className="lb">Back to app</span>
          </Link>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, height: '100dvh', overflowY: 'auto', padding: '32px 40px 64px' }}>
        {children}
      </main>
    </div>
  );
}
