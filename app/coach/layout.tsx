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
      <div className="h-dvh flex items-center justify-center bg-[var(--background)]">
        <BrainMascot size={48} glow beat />
      </div>
    );
  }

  return (
    <div className="h-dvh flex bg-[var(--background)]">
      <aside className="w-56 shrink-0 border-r border-[var(--border)] bg-[var(--card)]/70 backdrop-blur-xl flex flex-col">
        <div className="p-4 border-b border-[var(--border)]">
          <p className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
            <Headphones size={18} className="text-teal-400" /> Coach Hub
          </p>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {NAV.map((item) => {
            const active = item.href === '/coach' ? pathname === '/coach' : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-gradient-to-br from-teal-500/20 to-teal-600/10 text-[var(--foreground)]'
                    : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]/60 hover:text-[var(--foreground)]'
                }`}
              >
                <Icon size={16} /> {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-[var(--border)]">
          <Link href="/app" className="flex items-center gap-2 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
            <ArrowLeft size={12} /> Back to app
          </Link>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
}
