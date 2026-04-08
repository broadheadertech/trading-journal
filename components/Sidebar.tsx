'use client';

import { TabId, TimeRange } from '@/lib/types';
import {
  LayoutDashboard, BookOpen, Map, List,
  BarChart3, Brain, Sparkles, FileText, Sun, Moon,
  Download, Upload, Plus, Menu, X, Target, Scale, Newspaper, RefreshCw, Orbit, Trophy, Wrench, GraduationCap, CalendarDays, MessagesSquare, Headphones,
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
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { id: 'journal', label: 'Journaling', icon: <List size={20} /> },
  { id: 'courses', label: 'Courses', icon: <GraduationCap size={20} /> },
  { id: 'events', label: 'Events', icon: <CalendarDays size={20} /> },
  { id: 'community', label: 'Community', icon: <MessagesSquare size={20} /> },
  { id: 'coaching', label: 'Coaching', icon: <Headphones size={20} /> },
  { id: 'news', label: 'News', icon: <Newspaper size={20} /> },
  { id: 'leaderboard', label: 'Leaderboard', icon: <Trophy size={20} /> },
  { id: 'tools', label: 'Tools', icon: <Wrench size={20} /> },
];

const bottomTabs: TabId[] = ['dashboard', 'journal', 'community', 'news'];

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
  const allowedBottomTabs = bottomTabs.filter(id => canAccessTab(id));
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
    <div className="h-dvh flex overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className={cn(
        'hidden md:flex flex-col shrink-0 border-r border-[var(--border)] bg-[var(--card)]/70 backdrop-blur-xl transition-all duration-300 relative',
        collapsed ? 'w-[68px]' : 'w-[220px]'
      )}>
        {/* Subtle ambient glow */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-teal-500/10 to-transparent" />
        {/* Logo */}
        <div className="shrink-0 h-14 flex items-center gap-2.5 px-4 border-b border-[var(--border)]">
          <BrainMascot size={28} className="shrink-0" />
          {!collapsed && (
            <h1 className="text-base font-bold bg-gradient-to-r from-teal-400 to-teal-600 bg-clip-text text-transparent truncate">
              Tradia
            </h1>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {allowedTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-all relative',
                collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5',
                activeTab === tab.id
                  ? 'bg-gradient-to-br from-teal-500/20 to-teal-600/10 text-[var(--foreground)] shadow-sm before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-1 before:rounded-r-full before:bg-gradient-to-b before:from-teal-400 before:to-teal-600'
                  : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]/60 hover:text-[var(--foreground)]'
              )}
              title={collapsed ? tab.label : undefined}
            >
              {tab.icon}
              {!collapsed && <span className="truncate">{tab.label}</span>}
            </button>
          ))}

          {/* Utilities section divider */}
          <div className="pt-4 pb-1">
            {!collapsed && (
              <span className="px-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]/60">
                Utilities
              </span>
            )}
          </div>

          {isFree && (
            <button
              onClick={() => setPricingOpen(true)}
              className={cn(
                'w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-colors text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]',
                collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'
              )}
              title={collapsed ? 'Subscription' : undefined}
            >
              <CreditCard size={20} />
              {!collapsed && <span>Subscription</span>}
            </button>
          )}

          <button
            onClick={onImport}
            className={cn(
              'w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-colors text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]',
              collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'
            )}
            title={collapsed ? 'Import' : undefined}
          >
            <Upload size={20} />
            {!collapsed && <span>Imports</span>}
          </button>

          <button
            onClick={onExport}
            className={cn(
              'w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-colors text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]',
              collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'
            )}
            title={collapsed ? 'Export' : undefined}
          >
            <Download size={20} />
            {!collapsed && <span>Export</span>}
          </button>

          {isAdmin && (
            <Link
              href="/admin"
              className={cn(
                'w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-colors text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]',
                collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'
              )}
              title={collapsed ? 'Admin' : undefined}
            >
              <Settings size={20} />
              {!collapsed && <span>Admin</span>}
            </Link>
          )}

          {onReseedDemo && (
            <button
              onClick={onReseedDemo}
              className={cn(
                'w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-colors text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]',
                collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'
              )}
              title={collapsed ? 'Reset Demo' : undefined}
            >
              <RefreshCw size={20} />
              {!collapsed && <span>Reset Demo</span>}
            </button>
          )}
        </nav>

        {/* Bottom area */}
        <div className="shrink-0 border-t border-[var(--border)] p-2 space-y-1">
          <button
            onClick={onThemeToggle}
            className={cn(
              'w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-colors text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]',
              collapsed ? 'justify-center px-2 py-2' : 'px-3 py-2'
            )}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
            {!collapsed && <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>
          <button
            onClick={() => signOut({ redirectUrl: '/sign-in' })}
            className={cn(
              'w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-colors text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]',
              collapsed ? 'justify-center px-2 py-2' : 'px-3 py-2'
            )}
          >
            <LogOut size={18} />
            {!collapsed && <span>Logout</span>}
          </button>

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center py-1.5 rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
          >
            <ChevronLeft size={16} className={cn('transition-transform', collapsed && 'rotate-180')} />
          </button>
        </div>
      </aside>

      {/* Main content column */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="shrink-0 z-40 border-b border-[var(--border)] bg-[var(--card)]">
          <div className="px-4 sm:px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Mobile logo */}
              <div className="md:hidden flex items-center gap-2">
                <BrainMascot size={24} className="shrink-0" />
                <span className="text-sm font-bold bg-gradient-to-r from-teal-400 to-teal-600 bg-clip-text text-transparent">
                  Tradia
                </span>
              </div>
              {/* Desktop: page title */}
              <h2 className="hidden md:block text-sm font-semibold text-[var(--foreground)]">
                {mainTabs.find(t => t.id === activeTab)?.label ?? 'Dashboard'}
              </h2>

              {/* Time range pills */}
              <div className="hidden sm:flex items-center border border-[var(--border)] rounded-lg overflow-hidden">
                {TIME_RANGES.map(r => (
                  <button
                    key={r}
                    onClick={() => onTimeRangeChange(r)}
                    className={cn(
                      'px-2.5 py-1 text-[11px] font-semibold transition-colors',
                      timeRange === r
                        ? 'bg-[var(--accent)] text-white'
                        : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]'
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Sync badge */}
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[10px] font-semibold text-green-400 uppercase tracking-wide">Synced</span>
                {lastSyncedAt && (
                  <span className="text-[10px] text-green-400/60">
                    {new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>

              <button
                onClick={onAddTrade}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Add Trade</span>
              </button>
              {hasTeam && onTeamMode && (
                <button
                  onClick={onTeamMode}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded-lg text-xs font-bold transition-colors"
                >
                  <Users size={14} />
                  TEAM
                </button>
              )}

              {/* Help button */}
              <div ref={helpRef} className="relative">
                <button
                  onClick={() => { setHelpOpen(!helpOpen); setNotificationsOpen(false); }}
                  className="p-2 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  title="Help"
                >
                  <HelpCircle size={18} />
                </button>
                {helpOpen && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl z-50 p-4 space-y-3">
                    <h3 className="text-sm font-bold">Help & Resources</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start gap-2 p-2 rounded-lg hover:bg-[var(--muted)] cursor-pointer">
                        <BookOpen size={16} className="text-[var(--accent)] mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium">Getting Started</p>
                          <p className="text-[11px] text-[var(--muted-foreground)]">Learn the basics of Tradia</p>
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
                      <p className="text-[11px] text-[var(--muted-foreground)]">Need more help? Contact support@tradia.app</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Notification bell */}
              <div ref={notifRef} className="relative">
                <button
                  onClick={() => { setNotificationsOpen(!notificationsOpen); setHelpOpen(false); }}
                  className="relative p-2 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  title="Notifications"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
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

              <SubscriptionBadge />
              <UserButton afterSignOutUrl="/sign-in" />
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </header>

        {/* Mobile slide-down menu */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 top-14 z-50">
            <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
            <div className="relative bg-[var(--card)] border-b border-[var(--border)] shadow-xl">
              <div className="p-3 grid grid-cols-4 gap-2">
                {allowedTabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-xs font-medium transition-colors',
                      activeTab === tab.id
                        ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                        : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
                    )}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

        {/* Mobile bottom nav */}
        <nav className="md:hidden shrink-0 z-40 border-t border-[var(--border)] bg-[var(--card)] safe-bottom">
          <div className="flex items-stretch">
            {allowedBottomTabs.map(tabId => {
              const tab = mainTabs.find(t => t.id === tabId)!;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={cn(
                    'flex-1 flex flex-col items-center gap-0.5 py-2 pt-2.5 text-[10px] font-medium transition-colors min-h-[56px]',
                    activeTab === tab.id
                      ? 'text-[var(--accent)]'
                      : 'text-[var(--muted-foreground)]'
                  )}
                >
                  <div className={cn(
                    'p-1 rounded-lg transition-colors',
                    activeTab === tab.id && 'bg-[var(--accent)]/15'
                  )}>
                    {tab.icon}
                  </div>
                  <span>{tab.label}</span>
                </button>
              );
            })}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={cn(
                'flex-1 flex flex-col items-center gap-0.5 py-2 pt-2.5 text-[10px] font-medium transition-colors min-h-[56px]',
                !allowedBottomTabs.includes(activeTab)
                  ? 'text-[var(--accent)]'
                  : 'text-[var(--muted-foreground)]'
              )}
            >
              <div className={cn(
                'p-1 rounded-lg transition-colors',
                !allowedBottomTabs.includes(activeTab) && 'bg-[var(--accent)]/15'
              )}>
                <Menu size={20} />
              </div>
              <span>More</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Pricing modal */}
      <PricingPlans open={pricingOpen} onClose={() => setPricingOpen(false)} />
    </div>
  );
}
