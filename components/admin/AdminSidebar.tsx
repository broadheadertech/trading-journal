'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, CreditCard, Settings, Brain, ShieldAlert, SlidersHorizontal, Microscope, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import BrainMascot from '@/components/BrainMascot';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/brain', label: 'Brain Monitor', icon: Brain },
  { href: '/admin/flags', label: 'Anti-Gaming Alerts', icon: ShieldAlert },
  { href: '/admin/thresholds', label: 'Thresholds', icon: SlidersHorizontal },
  { href: '/admin/inspect', label: 'Brain Inspect', icon: Microscope },
  { href: '/admin/trends', label: 'Score Trends', icon: TrendingUp },
  { href: '/admin/revenue', label: 'Revenue & Billing', icon: CreditCard },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r border-[var(--border)] bg-[var(--card)] flex flex-col">
      <div className="p-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <BrainMascot size={28} />
          <div>
            <p className="text-sm font-bold text-[var(--foreground)]">Admin Panel</p>
            <p className="text-[10px] text-[var(--muted-foreground)]">Tradia</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                  : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
              )}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
