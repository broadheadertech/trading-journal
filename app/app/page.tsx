'use client';

import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { useUser } from '@clerk/nextjs';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { ShieldAlert } from 'lucide-react';
import { TabId } from '@/lib/types';
import { storage } from '@/lib/storage';
import { useSubscription } from '@/hooks/useSubscription';
import { getRequiredTier } from '@/lib/features';
import UpgradePrompt from '@/components/UpgradePrompt';
import BrainMascot from '@/components/BrainMascot';
import OnboardingWizard from '@/components/OnboardingWizard';
import { useTrades, useStrategies, useChecklists, useJournal, useGoals, useProfile } from '@/hooks/useStore';
import { useCircuitBreakers } from '@/hooks/useCircuitBreakers';
import { useTriggers, useReflections, useWeeklyReviews, useRuleBreakLogs } from '@/hooks/useDiscipline';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { CurrencyProvider } from '@/hooks/useCurrency';
import { StageThemeProvider } from '@/components/brain/providers/StageThemeProvider';
import { ReducedMotionProvider } from '@/components/brain/ReducedMotionProvider';
import { BrainMiniWidget } from '@/components/brain/BrainMiniWidget';
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
import { Loader2 } from 'lucide-react';

const LazyBrainTab = lazy(() => import('@/components/brain/BrainTab'));
const LazyTextOnlyBrainTab = lazy(() => import('@/components/brain/TextOnlyBrainTab'));

type MigrationState = 'checking' | 'show' | 'migrating' | 'done';

function AppContent() {
  const { showToast } = useToast();
  const { user } = useUser();
  const isAdmin = user?.id === process.env.NEXT_PUBLIC_ADMIN_USER_ID;
  const { canAccessTab } = useSubscription();
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [isDark, setIsDark] = useLocalStorage('crypto-journal-theme-dark', true);
  const [showAddTrade, setShowAddTrade] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [migrationState, setMigrationState] = useState<MigrationState>('checking');
  const importRef = useRef<HTMLInputElement>(null);

  const banStatus = useQuery(api.profile.getBanStatus);
  const reseedMutation = useMutation(api.seed.forceReseed);
  const importMutation = useMutation(api.migrations.importFromLocalStorage);
  const ensureFreeSub = useMutation(api.subscriptions.ensureFreeSubscription);
  const initBrainState = useMutation(api.brain.initializeBrainState);

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
  const { initialCapital, setInitialCapital, dailyLossLimit, dailyProfitTarget, goalMode, setDailyGoal, onboardingComplete, completeOnboarding, textOnlyBrain } = useProfile();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Ensure every authenticated user has a subscription record
  useEffect(() => {
    if (user) ensureFreeSub().catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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

  // Reset to dashboard if current tab becomes locked (e.g., after downgrade)
  useEffect(() => {
    if (!canAccessTab(activeTab)) setActiveTab('dashboard');
  }, [activeTab, canAccessTab]);

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

  // Stories 6.1 + 6.2 — initialize brain state (with personalized first message) and navigate to Brain tab
  const handleOnboardingComplete = useCallback(
    async (data: { initialCapital: number; currency: string; primaryMarket: string }) => {
      initBrainState({
        primaryMarket: data.primaryMarket,
        initialCapital: data.initialCapital,
        currency: data.currency,
      }).catch(() => {});
      await completeOnboarding(data);
      setActiveTab('brain');
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initBrainState, completeOnboarding],
  );

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
          <div className="mx-auto mb-4">
            <BrainMascot size={48} glow />
          </div>
          <p className="text-[var(--muted-foreground)] text-sm">Loading PsychSync...</p>
        </div>
      </div>
    );
  }

  // Ban enforcement — block access for suspended users
  if (banStatus?.isBanned) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
        <div className="max-w-md w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 text-center space-y-5">
          <div className="mx-auto w-16 h-16 rounded-full bg-[var(--red)]/10 flex items-center justify-center">
            <ShieldAlert size={32} className="text-[var(--red)]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--foreground)]">Account Suspended</h2>
            <p className="text-sm text-[var(--muted-foreground)] mt-2">
              Your account has been suspended.
              {banStatus.bannedReason && (
                <span className="block mt-1">Reason: {banStatus.bannedReason}</span>
              )}
            </p>
            <p className="text-xs text-[var(--muted-foreground)] mt-3">
              Contact support if you believe this is a mistake.
            </p>
          </div>
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
          <div className="mx-auto">
            <BrainMascot size={56} glow />
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

  // Onboarding wizard — show for brand-new users
  if (!onboardingComplete && trades.length === 0) {
    return (
      <OnboardingWizard
        onComplete={handleOnboardingComplete}
        onLogFirstTrade={handleAddTrade}
        onGoToDashboard={() => setActiveTab('dashboard')}
      />
    );
  }

  return (
    <>
      {activeTab !== 'brain' && (
        <BrainMiniWidget onNavigate={() => setActiveTab('brain')} />
      )}

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
            canAccessTab('checklist') ? (
              <PreTradeChecklist
                checklists={checklists}
                strategies={strategies}
                onAdd={addChecklist}
                onDelete={deleteChecklist}
              />
            ) : <UpgradePrompt requiredTier={getRequiredTier('checklist')} />
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
            <Analytics trades={trades} initialCapital={initialCapital} onAddTrade={handleAddTrade} />
          )}
          {activeTab === 'verdicts' && (
            canAccessTab('verdicts') ? (
              <Verdicts trades={trades} />
            ) : <UpgradePrompt requiredTier={getRequiredTier('verdicts')} />
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
            canAccessTab('goals') ? (
              <Goals
                goals={goals}
                trades={trades}
                onAdd={addGoal}
                onUpdate={updateGoal}
              />
            ) : <UpgradePrompt requiredTier={getRequiredTier('goals')} />
          )}
          {activeTab === 'whatif' && (
            canAccessTab('whatif') ? (
              <WhatIfScenarios trades={trades} strategies={strategies} />
            ) : <UpgradePrompt requiredTier={getRequiredTier('whatif')} />
          )}
          {activeTab === 'reports' && (
            canAccessTab('reports') ? (
              <Reports trades={trades} strategies={strategies} />
            ) : <UpgradePrompt requiredTier={getRequiredTier('reports')} />
          )}
          {activeTab === 'news' && (
            canAccessTab('news') ? (
              <News />
            ) : <UpgradePrompt requiredTier={getRequiredTier('news')} />
          )}
        </main>
      </Navigation>

      {/* Brain dimension overlay — rendered outside Navigation for full-screen takeover */}
      {/* Story 9.1 — conditionally render text-only or visual brain tab (FR43) */}
      {activeTab === 'brain' && (
        canAccessTab('brain') ? (
          <Suspense fallback={
            <div className="fixed inset-0 z-[60] flex items-center justify-center brain-dimension-bg">
              <Loader2 className="animate-spin w-8 h-8 text-white/40" />
            </div>
          }>
            {textOnlyBrain
              ? <LazyTextOnlyBrainTab onBack={() => setActiveTab('dashboard')} />
              : <LazyBrainTab onBack={() => setActiveTab('dashboard')} />
            }
          </Suspense>
        ) : <UpgradePrompt requiredTier={getRequiredTier('brain')} />
      )}
    </>
  );
}

export default function Page() {
  return (
    <CurrencyProvider>
      <ToastProvider>
        <StageThemeProvider>
          <ReducedMotionProvider>
            <AppContent />
          </ReducedMotionProvider>
        </StageThemeProvider>
      </ToastProvider>
    </CurrencyProvider>
  );
}
