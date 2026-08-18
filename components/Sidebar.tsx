'use client';

import { TabId, TimeRange } from '@/lib/types';
import {
  LayoutDashboard, BookOpen, Map, List,
  BarChart3, Brain, Sparkles, FileText, Sun, Moon,
  Download, Upload, Plus, Target, Scale, Newspaper, RefreshCw, Orbit, Trophy, Wrench, GraduationCap, CalendarDays, MessagesSquare, Headphones, TrendingUp, Gift, Gamepad2, Activity, CalendarClock, Globe, Radio, Plug,
  ChevronLeft, Settings, CreditCard, LogOut, Users, Bell, HelpCircle, Check,
} from 'lucide-react';
import { cn, SUPPORTED_CURRENCIES } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';
import { UserButton, useUser, useClerk } from '@clerk/nextjs';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import Link from 'next/link';
import { useCurrency } from '@/hooks/useCurrency';
import SubscriptionBadge from '@/components/SubscriptionBadge';
import PricingPlans from '@/components/PricingPlans';
import BrainMascot from '@/components/BrainMascot';
import { useSubscription } from '@/hooks/useSubscription';

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  isDark: boolean;
  onThemeToggle: () => void;
  onExport: () => void;
  onImport: () => void;
  onAddTrade: () => void;
  onReseedDemo?: () => void;
  onTeamMode?: () => void;
  hasTeam?: boolean;
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  lastSyncedAt: string | null;
  children: React.ReactNode;
}

const TIME_RANGES: TimeRange[] = ['1D', '1W', '1M', '3M', '1Y', 'ALL'];

const mainTabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard',   label: 'Dashboard',           icon: <LayoutDashboard size={20} /> },
  { id: 'strategies',  label: 'Trading Strategies',  icon: <TrendingUp size={20} /> },
  { id: 'signals',     label: 'Trading Signals',     icon: <Radio size={20} /> },
  { id: 'brokers',     label: 'Connect Broker',      icon: <Plug size={20} /> },
  { id: 'courses',     label: 'Trading Courses',     icon: <GraduationCap size={20} /> },
  { id: 'journal',     label: 'Journal & Analytics', icon: <List size={20} /> },
  { id: 'coaching',    label: 'Call a Coach',        icon: <Headphones size={20} /> },
  { id: 'rewards',     label: 'Rewards & Bonuses',   icon: <Gift size={20} /> },
  { id: 'games',       label: 'Trading Games',       icon: <Gamepad2 size={20} /> },
  { id: 'indicators',  label: 'Indicators',          icon: <Activity size={20} /> },
  { id: 'economic',    label: 'Economic Calendar',   icon: <CalendarClock size={20} /> },
  { id: 'world',       label: 'World Monitoring',    icon: <Globe size={20} /> },
  { id: 'articles',    label: 'Articles',            icon: <BookOpen size={20} /> },
  { id: 'community',   label: 'Community',           icon: <MessagesSquare size={20} /> },
  { id: 'events',      label: 'Events',              icon: <CalendarDays size={20} /> },
  { id: 'leaderboard', label: 'Leaderboard',         icon: <Trophy size={20} /> },
  { id: 'news',        label: 'News',                icon: <Newspaper size={20} /> },
  { id: 'tools',       label: 'Tools',               icon: <Wrench size={20} /> },
];

export default function Sidebar({
  activeTab, onTabChange, isDark, onThemeToggle, onExport, onImport, onAddTrade, onReseedDemo, onTeamMode, hasTeam,
  timeRange, onTimeRangeChange, lastSyncedAt, children,
}: SidebarProps) {
  const { currency, setCurrency } = useCurrency();
  const { user } = useUser();
  const { signOut } = useClerk();
  const isAdmin = user?.id === process.env.NEXT_PUBLIC_ADMIN_USER_ID;
  const { isFree, canAccessTab } = useSubscription();
  const allowedTabs = mainTabs.filter(t => canAccessTab(t.id));
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const helpRef = useRef<HTMLDivElement>(null);

  // Notifications
  const unreadCount = useQuery(api.notifications.getUnreadCount) ?? 0;
  const notifications = useQuery(api.notifications.getUserNotifications, { limit: 10 }) ?? [];
  const markAllRead = useMutation(api.notifications.markAllAsRead);
  const markOneRead = useMutation(api.notifications.markAsRead);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotificationsOpen(false);
      if (helpRef.current && !helpRef.current.contains(e.target as Node)) setHelpOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleTabChange = (tab: TabId) => {
    onTabChange(tab);
    setMobileMenuOpen(false);
  };

  return (
    <div style={{ ['--side' as string]: collapsed ? '68px' : '240px' } as React.CSSProperties}>
      {/* ============================= SIDEBAR ============================= */}
      <aside className={cn('side', mobileMenuOpen && 'open')}>
        <a className="brand" onClick={() => handleTabChange('dashboard')} style={{ cursor: 'pointer' }} aria-label="Atlas dashboard">
          <BrainMascot size={22} className="shrink-0" />
          {!collapsed && (
            <span style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 15, letterSpacing: '.02em', color: 'var(--text)' }}>
              Atlas
            </span>
          )}
        </a>

        <nav className="nav" aria-label="Dashboard sections">
          {allowedTabs.map(tab => (
            <a
              key={tab.id}
              role="button"
              tabIndex={0}
              onClick={() => handleTabChange(tab.id)}
              className={cn(activeTab === tab.id && 'on')}
              style={{ cursor: 'pointer' }}
              title={collapsed ? tab.label : undefined}
            >
              <span className="ic [&>svg]:w-4 [&>svg]:h-4">{tab.icon}</span>
              {!collapsed && <span className="lb">{tab.label}</span>}
            </a>
          ))}

          {!collapsed && <h5>UTILITIES</h5>}
          {collapsed && <h5 style={{ height: 1, margin: '24px 0 8px', padding: 0 }} />}

          {isFree && (
            <a
              role="button"
              tabIndex={0}
              onClick={() => setPricingOpen(true)}
              style={{ cursor: 'pointer' }}
              title={collapsed ? 'Subscription' : undefined}
            >
              <span className="ic"><CreditCard size={16} /></span>
              {!collapsed && <span className="lb">Subscription</span>}
            </a>
          )}

          <a role="button" tabIndex={0} onClick={onImport} style={{ cursor: 'pointer' }} title={collapsed ? 'Imports' : undefined}>
            <span className="ic"><Upload size={16} /></span>
            {!collapsed && <span className="lb">Imports</span>}
          </a>

          <a role="button" tabIndex={0} onClick={onExport} style={{ cursor: 'pointer' }} title={collapsed ? 'Export' : undefined}>
            <span className="ic"><Download size={16} /></span>
            {!collapsed && <span className="lb">Export</span>}
          </a>

          {isAdmin && (
            <Link href="/admin" title={collapsed ? 'Admin' : undefined}>
              <span className="ic"><Settings size={16} /></span>
              {!collapsed && <span className="lb">Admin</span>}
            </Link>
          )}

          {onReseedDemo && (
            <a role="button" tabIndex={0} onClick={onReseedDemo} style={{ cursor: 'pointer' }} title={collapsed ? 'Reset Demo' : undefined}>
              <span className="ic"><RefreshCw size={16} /></span>
              {!collapsed && <span className="lb">Reset Demo</span>}
            </a>
          )}
        </nav>

        <div className="foot">
          <a role="button" tabIndex={0} onClick={onThemeToggle} style={{ cursor: 'pointer' }}>
            <span className="ic">{isDark ? <Sun size={16} /> : <Moon size={16} />}</span>
            {!collapsed && <span className="lb">{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
          </a>
          <a role="button" tabIndex={0} onClick={() => signOut({ redirectUrl: '/sign-in' })} style={{ cursor: 'pointer' }}>
            <span className="ic"><LogOut size={16} /></span>
            {!collapsed && <span className="lb">Logout</span>}
          </a>
        </div>

        <button
          className="collapse"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => setCollapsed(!collapsed)}
        >
          <ChevronLeft size={12} style={{ color: '#7f8ea3', transform: collapsed ? 'rotate(180deg)' : undefined }} />
        </button>
      </aside>

      <div
        className={cn('scrim', mobileMenuOpen && 'on')}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* ============================= MAIN ============================= */}
      <main className="main">
        {/* ---------- topbar ---------- */}
        <header className="top">
          <button className="burger" aria-label="Menu" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <span />
          </button>
          <h1>{mainTabs.find(t => t.id === activeTab)?.label ?? 'Dashboard'}</h1>

          <div className="range">
            {TIME_RANGES.map(r => (
              <button
                key={r}
                onClick={() => onTimeRangeChange(r)}
                className={cn(timeRange === r && 'on')}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="right">
            {/* 1. SYNCED */}
            <span className="synced">
              <svg width="6" height="9" viewBox="0 0 6 9" fill="none" aria-hidden="true">
                <path d="M4 0 L0 5 H3 L2 9 L6 4 H3 L4 0 Z" fill="#24c88a" />
              </svg>
              SYNCED
              {lastSyncedAt && (
                <span style={{ fontWeight: 400, color: 'var(--muted-2)' }}>
                  {new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </span>

            {/* 2. Add Trade */}
            <button className="addtrade" onClick={onAddTrade}>
              <Plus size={11} strokeWidth={2.6} />
              Add Trade
            </button>

            {hasTeam && onTeamMode && (
              <button className="chip" onClick={onTeamMode} style={{ marginLeft: 12 }}>
                <Users size={12} />
                TEAM
              </button>
            )}

            {/* 3. Help */}
            <div ref={helpRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <button
                className="help"
                onClick={() => { setHelpOpen(!helpOpen); setNotificationsOpen(false); }}
                title="Help"
              >
                ?
              </button>
                {helpOpen && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl z-50 p-4 space-y-3">
                    <h3 className="text-sm font-bold">Help & Resources</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start gap-2 p-2 rounded-lg hover:bg-[var(--muted)] cursor-pointer">
                        <BookOpen size={16} className="text-[var(--accent)] mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium">Getting Started</p>
                          <p className="text-[11px] text-[var(--muted-foreground)]">Learn the basics of Atlas</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 p-2 rounded-lg hover:bg-[var(--muted)] cursor-pointer">
                        <Target size={16} className="text-[var(--accent)] mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium">Keyboard Shortcuts</p>
                          <p className="text-[11px] text-[var(--muted-foreground)]">Speed up your workflow</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 p-2 rounded-lg hover:bg-[var(--muted)] cursor-pointer">
                        <Brain size={16} className="text-[var(--accent)] mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium">AI Coach Guide</p>
                          <p className="text-[11px] text-[var(--muted-foreground)]">How Brain analyzes your trades</p>
                        </div>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-[var(--border)]">
                      <p className="text-[11px] text-[var(--muted-foreground)]">Need more help? Contact support@atlas.app</p>
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Notification bell */}
              <div ref={notifRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <button
                  onClick={() => { setNotificationsOpen(!notificationsOpen); setHelpOpen(false); }}
                  style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
                  title="Notifications"
                >
                  <Bell size={16} className="bell" color="#7f8ea3" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] flex items-center justify-center px-1 text-[9px] font-bold text-white bg-red-500 rounded-full">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                {notificationsOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                      <h3 className="text-sm font-bold">Notifications</h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={() => markAllRead()}
                          className="text-[11px] font-medium text-[var(--accent)] hover:underline"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="text-sm text-[var(--muted-foreground)] text-center py-8">No notifications yet</p>
                      ) : (
                        notifications.map(n => (
                          <button
                            key={n._id}
                            onClick={() => { if (!n.read) markOneRead({ notificationId: n._id }); }}
                            className={cn(
                              'w-full text-left px-4 py-3 border-b border-[var(--border)]/50 hover:bg-[var(--muted)]/30 transition-colors',
                              !n.read && 'bg-[var(--accent)]/5'
                            )}
                          >
                            <div className="flex items-start gap-2">
                              {!n.read && <div className="w-2 h-2 rounded-full bg-[var(--accent)] mt-1.5 shrink-0" />}
                              <div className={cn('flex-1 min-w-0', n.read && 'ml-4')}>
                                <p className="text-sm font-medium truncate">{n.title}</p>
                                <p className="text-[11px] text-[var(--muted-foreground)] line-clamp-2">{n.message}</p>
                                <p className="text-[10px] text-[var(--muted-foreground)]/60 mt-1">
                                  {new Date(n.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 5. Plan chip */}
              <span className="plan" style={{ display: 'inline-flex', alignItems: 'center' }}>
                <SubscriptionBadge />
              </span>

              {/* 6. Profile link */}
              {user?.id && (
                <Link className="who" href={`/u/${user.username ?? user.id}`} title="View your public profile">
                  My profile
                </Link>
              )}

              {/* 7. Avatar */}
              <span style={{ marginLeft: 13, display: 'flex', alignItems: 'center' }}>
                <UserButton afterSignOutUrl="/sign-in" />
              </span>
            </div>
          </header>

        {children}
      </main>

      {/* Pricing modal */}
      <PricingPlans open={pricingOpen} onClose={() => setPricingOpen(false)} />
    </div>
  );
}
