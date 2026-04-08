'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { ShieldAlert } from 'lucide-react';
import { TabId, TimeRange } from '@/lib/types';
import { storage } from '@/lib/storage';
import { filterTradesByTimeRange } from '@/lib/utils';
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
import Sidebar from '@/components/Sidebar';
import Dashboard from '@/components/Dashboard';
import JournalTab, { type JournalSubTab } from '@/components/JournalTab';
import Courses from '@/components/Courses';
import Events from '@/components/Events';
import Community from '@/components/Community';
import Coaching from '@/components/Coaching';
import News from '@/components/News';
import Leaderboard from '@/components/Leaderboard';
import Tools from '@/components/Tools';
import TeamLayout from '@/components/team/TeamLayout';
import { Loader2 } from 'lucide-react';


type MigrationState = 'checking' | 'show' | 'migrating' | 'done';

function AppContent() {
  const { showToast } = useToast();
  const { user } = useUser();
  const isAdmin = user?.id === process.env.NEXT_PUBLIC_ADMIN_USER_ID;
  const { canAccessTab, hasTeamAccess } = useSubscription();
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [journalSubTab, setJournalSubTab] = useState<JournalSubTab>('trades');
  const [isDark, setIsDark] = useLocalStorage('crypto-journal-theme-dark', true);
  const [showAddTrade, setShowAddTrade] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [migrationState, setMigrationState] = useState<MigrationState>('checking');
  const [timeRange, setTimeRange] = useState<TimeRange>('ALL');
  const [teamMode, setTeamMode] = useState(false);
  const [activeWorkspaceId, setActiveWorkspaceId] = useLocalStorage<string | null>('crypto-journal-active-workspace', null);
  const importRef = useRef<HTMLInputElement>(null);

  const banStatus = useQuery(api.profile.getBanStatus);
  const userWorkspaces = useQuery(api.workspaces.getUserWorkspaces);
  const createWorkspaceMutation = useMutation(api.workspaces.createWorkspace);
  const reseedMutation = useMutation(api.seed.forceReseed);
  const importMutation = useMutation(api.migrations.importFromLocalStorage);
  const ensureFreeSub = useMutation(api.subscriptions.ensureFreeSubscription);
  const initBrainState = useMutation(api.brain.initializeBrainState);

  const { trades, addTrade, updateTrade, deleteTrade, bulkImportTrades, isLoaded: tradesLoaded } = useTrades();
  const { strategies, addStrategy, updateStrategy, deleteStrategy, isLoaded: strategiesLoaded } = useStrategies();
  const { checklists, addChecklist, deleteChecklist, isLoaded: checklistsLoaded } = useChecklists();
  const { entries, addEntry, updateEntry, deleteEntry, isLoaded: journalLoaded } = useJournal();
  const { breakerEvents, isLoaded: breakersLoaded } = useCircuitBreakers();
  const { triggers, addTrigger, deleteTrigger, isLoaded: triggersLoaded } = useTriggers();
  const { reflections, addReflection, isLoaded: reflectionsLoaded } = useReflections();
  const { reviews, addReview, isLoaded: reviewsLoaded } = useWeeklyReviews();
  const { addRuleBreak, isLoaded: ruleBreaksLoaded } = useRuleBreakLogs();
  const { goals, addGoal, updateGoal, isLoaded: goalsLoaded } = useGoals();
  const { initialCapital, setInitialCapital, dailyLossLimit, dailyProfitTarget, goalMode, setDailyGoal, onboardingComplete, completeOnboarding } = useProfile();

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
    setJournalSubTab('trades');
    setActiveTab('journal');
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
      setActiveTab('dashboard');
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initBrainState, completeOnboarding],
  );

  // Map legacy top-level tab IDs to Journaling sub-tabs (so old onNavigate calls keep working)
  const JOURNAL_SUB_REDIRECTS: Record<string, JournalSubTab> = {
    psychology: 'psychology',
    verdicts: 'verdicts',
    analytics: 'performance',
    reports: 'reports',
    playbook: 'playbook',
    checklist: 'checklist',
    goals: 'goals',
    whatif: 'whatif',
  };

  const handleNavigate = useCallback((tab: string) => {
    // Support explicit deep links like "journal:verdicts"
    if (tab.startsWith('journal:')) {
      setJournalSubTab(tab.slice('journal:'.length) as JournalSubTab);
      setActiveTab('journal');
      return;
    }
    // Legacy tab id → journaling sub-tab redirect
    if (JOURNAL_SUB_REDIRECTS[tab]) {
      setJournalSubTab(JOURNAL_SUB_REDIRECTS[tab]);
      setActiveTab('journal');
      return;
    }
    setActiveTab(tab as TabId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Team mode — must be before any early returns to satisfy Rules of Hooks
  const workspacesList = userWorkspaces ?? [];
  const activeWs = workspacesList.find((ws: any) => ws?.id === activeWorkspaceId) ?? workspacesList[0];

  const handleEnterTeamMode = useCallback(async () => {
    if (activeWs) {
      setActiveWorkspaceId(activeWs.id);
      setTeamMode(true);
    } else {
      // No workspace yet — create one automatically
      try {
        const name = user?.fullName
          ? `${user.fullName}'s Team`
          : 'My Team';
        const newId = await createWorkspaceMutation({ name });
        setActiveWorkspaceId(newId);
        setTeamMode(true);
      } catch {
        showToast('Failed to create team workspace. Please try again.', 'error');
      }
    }
  }, [activeWs, setActiveWorkspaceId, createWorkspaceMutation, user, showToast]);

  const handleExitTeamMode = useCallback(() => {
    setTeamMode(false);
  }, []);

  // Filter trades by selected time range
  const filteredTrades = filterTradesByTimeRange(trades, timeRange);

  // Last synced — use the most recent trade's timestamp as a proxy
  const lastSyncedAt = trades.length > 0 ? new Date().toISOString() : null;

  const allLoaded = mounted && tradesLoaded && strategiesLoaded && checklistsLoaded &&
    journalLoaded && breakersLoaded && triggersLoaded && reflectionsLoaded &&
    reviewsLoaded && ruleBreaksLoaded && goalsLoaded;

  if (!allLoaded || migrationState === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <div className="mx-auto mb-4">
            <BrainMascot size={48} glow beat />
          </div>
          <p className="text-[var(--muted-foreground)] text-sm">Loading Tradia...</p>
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
            <BrainMascot size={56} glow beat />
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

  if (teamMode) {
    if (activeWs) {
      return (
        <TeamLayout
          workspaceId={activeWs.id}
          workspaceName={activeWs.name}
          role={activeWs.role}
          onBackToPersonal={handleExitTeamMode}
        />
      );
    }
    // Workspace is being created — show loading
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <div className="mx-auto mb-4">
            <BrainMascot size={48} glow beat />
          </div>
          <p className="text-[var(--muted-foreground)] text-sm">Setting up your team...</p>
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

      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isDark={isDark}
        onThemeToggle={handleThemeToggle}
        onExport={handleExport}
        onImport={handleImport}
        onAddTrade={handleAddTrade}
        onReseedDemo={isAdmin ? handleReseedDemo : undefined}
        hasTeam={hasTeamAccess}
        onTeamMode={handleEnterTeamMode}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        lastSyncedAt={lastSyncedAt}
      >
        <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4 sm:py-6">
          {activeTab === 'dashboard' && (
            <Dashboard
              trades={filteredTrades}
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
          {activeTab === 'journal' && (
            <JournalTab
              initialSubTab={journalSubTab}
              trades={filteredTrades}
              strategies={strategies}
              addTrade={addTrade}
              updateTrade={updateTrade}
              deleteTrade={deleteTrade}
              bulkImportTrades={bulkImportTrades}
              showAddTrade={showAddTrade}
              onCloseAddModal={() => setShowAddTrade(false)}
              onRuleBreak={(ruleName, explanation) => addRuleBreak({ tradeId: '', ruleName, explanation, timestamp: new Date().toISOString() })}
              initialCapital={initialCapital}
              onAddTrade={handleAddTrade}
              entries={entries}
              addEntry={addEntry}
              updateEntry={updateEntry}
              deleteEntry={deleteEntry}
              breakerEvents={breakerEvents}
              triggers={triggers}
              addTrigger={addTrigger}
              deleteTrigger={deleteTrigger}
              reflections={reflections}
              addReflection={addReflection}
              reviews={reviews}
              addReview={addReview}
              addStrategy={addStrategy}
              updateStrategy={updateStrategy}
              deleteStrategy={deleteStrategy}
              checklists={checklists}
              addChecklist={addChecklist}
              deleteChecklist={deleteChecklist}
              goals={goals}
              addGoal={addGoal}
              updateGoal={updateGoal}
            />
          )}
          {activeTab === 'courses' && (
            canAccessTab('courses') ? <Courses /> : <UpgradePrompt requiredTier={getRequiredTier('courses')} />
          )}
          {activeTab === 'events' && (
            canAccessTab('events') ? <Events /> : <UpgradePrompt requiredTier={getRequiredTier('events')} />
          )}
          {activeTab === 'community' && (
            canAccessTab('community') ? <Community /> : <UpgradePrompt requiredTier={getRequiredTier('community')} />
          )}
          {activeTab === 'coaching' && (
            canAccessTab('coaching') ? <Coaching /> : <UpgradePrompt requiredTier={getRequiredTier('coaching')} />
          )}
          {activeTab === 'news' && (
            canAccessTab('news') ? (
              <News />
            ) : <UpgradePrompt requiredTier={getRequiredTier('news')} />
          )}
          {activeTab === 'leaderboard' && (
            canAccessTab('leaderboard') ? (
              <Leaderboard trades={filteredTrades} />
            ) : <UpgradePrompt requiredTier={getRequiredTier('leaderboard')} />
          )}
          {activeTab === 'tools' && (
            canAccessTab('tools') ? (
              <Tools />
            ) : <UpgradePrompt requiredTier={getRequiredTier('tools')} />
          )}
        </main>
      </Sidebar>

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
