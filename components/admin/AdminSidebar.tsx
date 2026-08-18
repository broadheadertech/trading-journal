'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, CreditCard, Settings, Brain, ShieldAlert, SlidersHorizontal, Microscope, TrendingUp, GraduationCap, CalendarDays, MessagesSquare, Headphones, BookOpen } from 'lucide-react';
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
  { href: '/admin/courses', label: 'Courses', icon: GraduationCap },
  { href: '/admin/events', label: 'Events', icon: CalendarDays },
  { href: '/admin/community', label: 'Community', icon: MessagesSquare },
  { href: '/admin/coaches',   label: 'Coaches',   icon: Headphones },
  { href: '/admin/articles',  label: 'Articles',  icon: BookOpen },
  { href: '/admin/revenue', label: 'Revenue & Billing', icon: CreditCard },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="shrink-0 flex flex-col overflow-y-auto"
      style={{
        width: 'var(--side)',
        background: 'var(--bg)',
        borderRight: '1px solid var(--line)',
      }}
    >
      <div className="brand">
        <BrainMascot size={26} />
        <div>
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--display)',
              fontWeight: 700,
              fontSize: 14,
              lineHeight: '16px',
              color: 'var(--text)',
            }}
          >
            Admin Panel
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 9.5, fontWeight: 700, letterSpacing: '.05em', color: 'var(--muted-3)' }}>
            ATLAS
          </p>
        </div>
      </div>

      <nav className="nav flex-1" style={{ paddingBottom: 16 }}>
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
              className={cn(isActive && 'on')}
            >
              <Icon size={16} className="ic" />
              <span className="lb">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
