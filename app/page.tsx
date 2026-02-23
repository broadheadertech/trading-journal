'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { TabId } from '@/lib/types';
import { storage } from '@/lib/storage';
import { useTrades, useStrategies, useChecklists, useJournal, useGoals, useProfile } from '@/hooks/useStore';
import { useCircuitBreakers } from '@/hooks/useCircuitBreakers';
import { useTriggers, useReflections, useWeeklyReviews, useRuleBreakLogs } from '@/hooks/useDiscipline';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { CurrencyProvider } from '@/hooks/useCurrency';
import Navigation from '@/components/Navigation';
import Dashboard from '@/components/Dashboard';
import Playbook from '@/components/Playbook';
import PreTradeChecklist from '@/components/PreTradeChecklist';
import TradesLog from '@/components/TradesLog';
import Analytics from '@/components/Analytics';
import Verdicts from '@/components/Verdicts';
import PsychologyJournal from '@/components/PsychologyJournal';
import WhatIfScenarios from '@/components/WhatIfScenarios';
import Reports from '@/components/Reports';
import Goals from '@/components/Goals';
import News from '@/components/News';

type MigrationState = 'checking' | 'show' | 'migrating' | 'done';

function AppContent() {
  const { showToast } = useToast();
  const { user } = useUser();
  const isAdmin = user?.id === process.env.NEXT_PUBLIC_ADMIN_USER_ID;
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [isDark, setIsDark] = useLocalStorage('crypto-journal-theme-dark', true);
  const [showAddTrade, setShowAddTrade] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [migrationState, setMigrationState] = useState<MigrationState>('checking');
  const importRef = useRef<HTMLInputElement>(null);

  const reseedMutation = useMutation(api.seed.forceReseed);
  const importMutation = useMutation(api.migrations.importFromLocalStorage);

  const { trades, addTrade, updateTrade, deleteTrade, isLoaded: tradesLoaded } = useTrades();
  const { strategies, addStrategy, updateStrategy, deleteStrategy, isLoaded: strategiesLoaded } = useStrategies();
  const { checklists, addChecklist, deleteChecklist, isLoaded: checklistsLoaded } = useChecklists();
  const { entries, addEntry, updateEntry, deleteEntry, isLoaded: journalLoaded } = useJournal();
  const { breakerEvents, isLoaded: breakersLoaded } = useCircuitBreakers();
  const { triggers, addTrigger, deleteTrigger, isLoaded: triggersLoaded } = useTriggers();
  const { reflections, addReflection, isLoaded: reflectionsLoaded } = useReflections();
  const { reviews, addReview, isLoaded: reviewsLoaded } = useWeeklyReviews();
  const { addRuleBreak, isLoaded: ruleBreaksLoaded } = useRuleBreakLogs();
  const { goals, addGoal, updateGoal, isLoaded: goalsLoaded } = useGoals();
  const { initialCapital, setInitialCapital, dailyLossLimit, dailyProfitTarget, goalMode, setDailyGoal } = useProfile();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Seed / migration logic — runs once after trades are loaded
  useEffect(() => {
    if (!tradesLoaded) return;

    if (trades.length > 0) {
      // User already has cloud data — nothing to do
      setMigrationState('done');
      return;
    }

    // No cloud data: check if there's anything in localStorage
    try {
      const localRaw = localStorage.getItem('crypto-journal-trades');
      const localTrades = localRaw ? JSON.parse(localRaw) : [];
      if (localTrades.length > 0) {
        setMigrationState('show');
      } else {
        // Brand new user — start with empty state
        setMigrationState('done');
      }
    } catch {
      setMigrationState('done');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tradesLoaded]);

  useEffect(() => {
    if (mounted) {
      document.documentElement.className = isDark ? '' : 'light';
    }
  }, [isDark, mounted]);

  const handleMigrateData = useCallback(async () => {
    setMigrationState('migrating');
    try {
      // Collect all localStorage data
      const getAllLocalStorage = () => {
        const get = (key: string) => {
          try { return JSON.parse(localStorage.getItem(key) ?? 'null'); } catch { return null; }
        };
        return JSON.stringify({
          trades: get('crypto-journal-trades') ?? [],
          strategies: get('crypto-journal-strategies') ?? [],
          checklists: get('crypto-journal-checklists') ?? [],
          journal: get('crypto-journal-journal') ?? [],
          goals: get('crypto-journal-goals') ?? [],
          triggers: get('crypto-journal-triggers') ?? [],
          reflections: get('crypto-journal-reflections') ?? [],
          weeklyReviews: get('crypto-journal-weekly-reviews') ?? [],
          ruleBreaks: get('crypto-journal-rule-breaks') ?? [],
          breakerEvents: get('crypto-journal-breaker-events') ?? [],
        });
      };
      await importMutation({ json: getAllLocalStorage() });
      showToast('Your local data has been migrated to the cloud!', 'success');
      setMigrationState('done');
    } catch {
      showToast('Migration failed. Please try again.', 'error');
      setMigrationState('show');
    }
  }, [importMutation, showToast]);

  const handleStartFresh = useCallback(() => {
    setMigrationState('done');
  }, []);

  const handleReseedDemo = useCallback(async () => {
    if (!confirm('Reset all data to demo sample data? This cannot be undone.')) return;
    try {
      await reseedMutation();
      showToast('Demo data reset successfully!', 'success');
    } catch {
      showToast('Reset failed. Please try again.', 'error');
    }
  }, [reseedMutation, showToast]);

  const handleThemeToggle = useCallback(() => {
    setIsDark(prev => !prev);
  }, [setIsDark]);

  const handleExport = useCallback(() => {
    const data = storage.exportAll({ trades, strategies, checklists, entries });
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crypto-journal-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported successfully');
  }, [showToast, trades, strategies, checklists, entries]);

  const handleImport = useCallback(() => {
    importRef.current?.click();
  }, []);

  const handleImportFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const content = ev.target?.result as string;
      try {
        await importMutation({ json: content });
        showToast('Data imported successfully!', 'success');
      } catch {
        showToast('Failed to import data. Invalid format or data already exists.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [importMutation, showToast]);

  const handleAddTrade = useCallback(() => {
    setActiveTab('trades');
    setShowAddTrade(true);
  }, []);

  const handleNavigate = useCallback((tab: string) => {
    setActiveTab(tab as TabId);
  }, []);

  const allLoaded = mounted && tradesLoaded && strategiesLoaded && checklistsLoaded &&
    journalLoaded && breakersLoaded && triggersLoaded && reflectionsLoaded &&
    reviewsLoaded && ruleBreaksLoaded && goalsLoaded;

  if (!allLoaded || migrationState === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-white font-bold text-lg">TJ</span>
          </div>
          <p className="text-[var(--muted-foreground)] text-sm">Loading Trade Journal...</p>
        </div>
      </div>
    );
  }

  // Migration prompt — shown when user has local data but no cloud data yet
  if (migrationState === 'show' || migrationState === 'migrating') {
    const busy = migrationState === 'migrating';
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
        <div className="max-w-md w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto">
            <span className="text-white font-bold text-xl">TJ</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--foreground)] mb-1">Welcome back!</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              We found existing journal data on this device. Would you like to migrate it to the cloud so it's available everywhere?
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleMigrateData}
              disabled={busy}
              className="w-full py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl font-medium transition-colors disabled:opacity-60"
            >
              {busy ? 'Migrating...' : 'Migrate my data to the cloud'}
            </button>
            <button
              onClick={handleStartFresh}
              disabled={busy}
              className="w-full py-3 border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] rounded-xl font-medium transition-colors disabled:opacity-60"
            >
              Start fresh with sample data
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <input
        ref={importRef}
        type="file"
        accept=".json"
        onChange={handleImportFile}
        className="hidden"
      />

      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isDark={isDark}
        onThemeToggle={handleThemeToggle}
        onExport={handleExport}
        onImport={handleImport}
        onAddTrade={handleAddTrade}
        onReseedDemo={isAdmin ? handleReseedDemo : undefined}
      >
        <main className="max-w-[1400px] mx-auto px-3 sm:px-4 py-4 sm:py-6">
          {activeTab === 'dashboard' && (
            <Dashboard
              trades={trades}
              strategies={strategies}
              reflections={reflections}
              triggers={triggers}
              onAddTrade={handleAddTrade}
              onNavigate={handleNavigate}
              updateTrade={updateTrade}
              initialCapital={initialCapital}
              onSetCapital={setInitialCapital}
              dailyLossLimit={dailyLossLimit}
              dailyProfitTarget={dailyProfitTarget}
              goalMode={goalMode}
              onSetDailyGoal={setDailyGoal}
            />
          )}
          {activeTab === 'playbook' && (
            <Playbook
              strategies={strategies}
              trades={trades}
              onAdd={addStrategy}
              onUpdate={updateStrategy}
              onDelete={deleteStrategy}
            />
          )}
          {activeTab === 'checklist' && (
            <PreTradeChecklist
              checklists={checklists}
              strategies={strategies}
              onAdd={addChecklist}
              onDelete={deleteChecklist}
            />
          )}
          {activeTab === 'trades' && (
            <TradesLog
              trades={trades}
              strategies={strategies}
              onAdd={addTrade}
              onUpdate={updateTrade}
              onDelete={deleteTrade}
              showAddModal={showAddTrade}
              onCloseAddModal={() => setShowAddTrade(false)}
              onRuleBreak={(ruleName, explanation) => addRuleBreak({ tradeId: '', ruleName, explanation, timestamp: new Date().toISOString() })}
              initialCapital={initialCapital}
            />
          )}
          {activeTab === 'analytics' && (
            <Analytics trades={trades} initialCapital={initialCapital} />
          )}
          {activeTab === 'verdicts' && (
            <Verdicts trades={trades} />
          )}
          {activeTab === 'psychology' && (
            <PsychologyJournal
              trades={trades}
              entries={entries}
              onAddEntry={addEntry}
              onUpdateEntry={updateEntry}
              onDeleteEntry={deleteEntry}
              breakerEvents={breakerEvents}
              triggers={triggers}
              onAddTrigger={addTrigger}
              onDeleteTrigger={deleteTrigger}
              reflections={reflections}
              onAddReflection={addReflection}
              reviews={reviews}
              onAddReview={addReview}
            />
          )}
          {activeTab === 'goals' && (
            <Goals
              goals={goals}
              trades={trades}
              onAdd={addGoal}
              onUpdate={updateGoal}
            />
          )}
          {activeTab === 'whatif' && (
            <WhatIfScenarios trades={trades} strategies={strategies} />
          )}
          {activeTab === 'reports' && (
            <Reports trades={trades} strategies={strategies} />
          )}
          {activeTab === 'news' && (
            <News />
          )}
        </main>
      </Navigation>
    </>
  );
}

export default function Page() {
  return (
    <CurrencyProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </CurrencyProvider>
  );
}
