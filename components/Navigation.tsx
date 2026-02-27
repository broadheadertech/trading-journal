'use client';

import { TabId } from '@/lib/types';
import {
  LayoutDashboard, BookOpen, Map, List,
  BarChart3, Brain, Sparkles, FileText, Sun, Moon,
  Download, Upload, Plus, Menu, X, Target, Scale, Newspaper, RefreshCw, Orbit,
} from 'lucide-react';
import { cn, SUPPORTED_CURRENCIES } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';
import { UserButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { useCurrency } from '@/hooks/useCurrency';
import SubscriptionBadge from '@/components/SubscriptionBadge';
import PricingPlans from '@/components/PricingPlans';
import BrainMascot from '@/components/BrainMascot';
import { useSubscription } from '@/hooks/useSubscription';

interface NavigationProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  isDark: boolean;
  onThemeToggle: () => void;
  onExport: () => void;
  onImport: () => void;
  onAddTrade: () => void;
  onReseedDemo?: () => void;
  children: React.ReactNode;
}

const tabs: { id: TabId; label: string; shortLabel: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', shortLabel: 'Home', icon: <LayoutDashboard size={20} /> },
  { id: 'playbook', label: 'Playbook', shortLabel: 'Playbook', icon: <BookOpen size={20} /> },
  { id: 'checklist', label: 'Market Context', shortLabel: 'Market', icon: <Map size={20} /> },
  { id: 'trades', label: 'Trades', shortLabel: 'Trades', icon: <List size={20} /> },
  { id: 'analytics', label: 'Analytics', shortLabel: 'Stats', icon: <BarChart3 size={20} /> },
  { id: 'verdicts', label: 'Verdicts', shortLabel: 'Verdicts', icon: <Scale size={20} /> },
  { id: 'psychology', label: 'Psychology', shortLabel: 'Psych', icon: <Brain size={20} /> },
  { id: 'goals', label: 'Goals', shortLabel: 'Goals', icon: <Target size={20} /> },
  { id: 'whatif', label: 'What-If', shortLabel: 'What-If', icon: <Sparkles size={20} /> },
  { id: 'reports', label: 'Reports', shortLabel: 'Reports', icon: <FileText size={20} /> },
  { id: 'news', label: 'News', shortLabel: 'News', icon: <Newspaper size={20} /> },
  { id: 'brain', label: 'Brain', shortLabel: 'Brain', icon: <Orbit size={20} /> },
];

// Bottom nav shows these 5 tabs on mobile; the rest go in "More" or top bar
const APP_VERSION = 'v1.0.0';
const bottomTabs: TabId[] = ['dashboard', 'trades', 'analytics', 'psychology', 'reports'];

export default function Navigation({
  activeTab, onTabChange, isDark, onThemeToggle, onExport, onImport, onAddTrade, onReseedDemo, children,
}: NavigationProps) {
  const { currency, setCurrency } = useCurrency();
  const { user } = useUser();
  const isAdmin = user?.id === process.env.NEXT_PUBLIC_ADMIN_USER_ID;
  const { isFree, canAccessTab } = useSubscription();
  const allowedTabs = tabs.filter(t => canAccessTab(t.id));
  const allowedBottomTabs = bottomTabs.filter(id => canAccessTab(id));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const currencyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currencyOpen) return;
    const handler = (e: MouseEvent) => {
      if (currencyRef.current && !currencyRef.current.contains(e.target as Node)) setCurrencyOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [currencyOpen]);

  const currentSymbol = SUPPORTED_CURRENCIES.find(c => c.code === currency)?.symbol ?? '$';

  const handleTabChange = (tab: TabId) => {
    onTabChange(tab);
    setMobileMenuOpen(false);
  };

  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="shrink-0 z-40 border-b border-[var(--border)] bg-[var(--card)]">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-4 h-12 sm:h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <BrainMascot size={28} className="shrink-0" />
            <h1 className="text-base sm:text-lg font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              PsychSync
            </h1>
            <span className="hidden sm:inline text-[10px] font-medium text-[var(--muted-foreground)] opacity-60">{APP_VERSION}</span>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={onAddTrade}
              className="shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Add Trade</span>
            </button>
            <button onClick={onImport} className="hidden sm:flex p-2 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors" title="Import Data">
              <Upload size={18} />
            </button>
            <button onClick={onExport} className="hidden sm:flex p-2 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors" title="Export Data">
              <Download size={18} />
            </button>
            {onReseedDemo && (
              <button onClick={onReseedDemo} className="hidden sm:flex p-2 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors" title="Reset to demo data">
                <RefreshCw size={18} />
              </button>
            )}
            <div ref={currencyRef} className="relative hidden sm:block">
              <button
                onClick={() => setCurrencyOpen(!currencyOpen)}
                className="p-2 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors font-semibold text-sm min-w-[34px] text-center"
                title="Display Currency"
              >
                {currentSymbol}
              </button>
              {currencyOpen && (
                <div className="absolute right-0 top-full mt-1 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl py-1 z-50 w-48 max-h-64 overflow-y-auto">
                  {SUPPORTED_CURRENCIES.map(c => (
                    <button
                      key={c.code}
                      onClick={() => { setCurrency(c.code); setCurrencyOpen(false); }}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors',
                        currency === c.code
                          ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                          : 'text-[var(--foreground)] hover:bg-[var(--muted)]'
                      )}
                    >
                      <span className="w-5 text-center font-medium">{c.symbol}</span>
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {isAdmin && (
              <Link
                href="/admin"
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                title="Admin Panel"
              >
                Admin
              </Link>
            )}
            {isFree && (
              <button
                onClick={() => setPricingOpen(true)}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors"
              >
                Upgrade
              </button>
            )}
            <button onClick={onThemeToggle} className="p-2 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors" title="Toggle Theme">
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <SubscriptionBadge />
            <UserButton afterSignOutUrl="/sign-in" />
            {/* Menu button — visible on mobile only (desktop uses bottom bar for all tabs) */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Desktop tab bar — below header */}
      <nav className="hidden md:block shrink-0 border-b border-[var(--border)] bg-[var(--card)]">
        <div className="max-w-[1400px] mx-auto flex items-stretch">
          {allowedTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors border-b-2',
                activeTab === tab.id
                  ? 'border-[var(--accent)] text-[var(--accent)]'
                  : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              )}
            >
              {tab.icon}
              <span>{tab.shortLabel}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Slide-down menu (mobile only) */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-12 z-50 animate-in">
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
                  <span>{tab.shortLabel}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center justify-center gap-3 px-3 pb-3 pt-1 border-t border-[var(--border)]">
              <button onClick={() => { onImport(); setMobileMenuOpen(false); }} className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] text-sm">
                <Upload size={16} /> Import
              </button>
              <button onClick={() => { onExport(); setMobileMenuOpen(false); }} className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] text-sm">
                <Download size={16} /> Export
              </button>
              {onReseedDemo && (
                <button onClick={() => { onReseedDemo(); setMobileMenuOpen(false); }} className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] text-sm">
                  <RefreshCw size={16} /> Reset Demo
                </button>
              )}
            </div>
            <div className="px-3 pb-3">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full text-xs"
              >
                {SUPPORTED_CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.symbol} — {c.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>

      {/* Pricing modal */}
      <PricingPlans open={pricingOpen} onClose={() => setPricingOpen(false)} />

      {/* Bottom navigation — mobile only */}
      <nav className="md:hidden shrink-0 z-40 border-t border-[var(--border)] bg-[var(--card)] safe-bottom">
        <div className="flex items-stretch">
          {allowedBottomTabs.map(tabId => {
            const tab = tabs.find(t => t.id === tabId)!;
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
                <span>{tab.shortLabel}</span>
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
  );
}
