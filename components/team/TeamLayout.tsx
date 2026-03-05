'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { TeamTabId } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, Layers, MessageSquare, FileText, Trophy, Settings,
  ChevronLeft, Search, Bell,
} from 'lucide-react';
import BrainMascot from '@/components/BrainMascot';
import TeamOverview from './TeamOverview';
import TeamMembers from './TeamMembers';
import TeamCohorts from './TeamCohorts';
import CoachDesk from './CoachDesk';
import TeamReports from './TeamReports';
import TeamLeaderboard from './TeamLeaderboard';
import TeamSettings from './TeamSettings';

interface TeamLayoutProps {
  workspaceId: string;
  workspaceName: string;
  role: string;
  onBackToPersonal: () => void;
}

const teamTabs: { id: TeamTabId; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={20} /> },
  { id: 'members', label: 'Members', icon: <Users size={20} /> },
  { id: 'cohorts', label: 'Cohorts', icon: <Layers size={20} /> },
  { id: 'coach-desk', label: 'Coach Desk', icon: <MessageSquare size={20} /> },
  { id: 'reports', label: 'Reports', icon: <FileText size={20} /> },
  { id: 'leaderboard', label: 'Leaderboard', icon: <Trophy size={20} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
];

export default function TeamLayout({ workspaceId, workspaceName, role, onBackToPersonal }: TeamLayoutProps) {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<TeamTabId>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  const memberStats = useQuery(api.workspaces.getMemberStats, { workspaceId });
  const activityFeed = useQuery(api.workspaces.getActivityFeed, { workspaceId, limit: 20 });
  const members = useQuery(api.workspaces.getMembers, { workspaceId });

  return (
    <div className="h-dvh flex overflow-hidden">
      {/* Team Sidebar */}
      <aside className="hidden md:flex flex-col shrink-0 w-[220px] border-r border-[var(--border)] bg-[var(--card)]">
        {/* Team logo/name */}
        <div className="shrink-0 h-14 flex items-center gap-2.5 px-4 border-b border-[var(--border)]">
          <BrainMascot size={28} className="shrink-0" />
          <h1 className="text-base font-bold truncate">{workspaceName}</h1>
        </div>

        {/* Section label */}
        <div className="px-4 pt-4 pb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]/60">
            Team Management
          </span>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {teamTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                  : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
              )}
            >
              {tab.icon}
              <span className="truncate">{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Back to personal */}
        <div className="shrink-0 border-t border-[var(--border)] p-3">
          <button
            onClick={onBackToPersonal}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            <ChevronLeft size={18} />
            <span>Back to Personal</span>
          </button>

          {/* User info */}
          <div className="flex items-center gap-2.5 px-3 pt-3 mt-2 border-t border-[var(--border)]">
            <div className="w-8 h-8 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-xs font-bold text-[var(--accent)]">
              {(user?.emailAddresses?.[0]?.emailAddress ?? 'U')[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{user?.emailAddresses?.[0]?.emailAddress}</p>
              <p className="text-[10px] text-[var(--muted-foreground)] capitalize">{role}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="shrink-0 h-14 flex items-center justify-between px-4 sm:px-6 border-b border-[var(--border)] bg-[var(--card)]">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[var(--muted-foreground)]">Team</span>
            <span className="text-[var(--muted-foreground)]">&rsaquo;</span>
            <span className="font-semibold">{teamTabs.find(t => t.id === activeTab)?.label}</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[var(--muted)] rounded-lg border border-[var(--border)] text-sm">
              <Search size={14} className="text-[var(--muted-foreground)]" />
              <input
                type="text"
                placeholder="Search students, cohorts, rules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent outline-none text-sm w-48"
              />
            </div>

            {/* Member filter placeholder */}
            <select className="hidden sm:block px-3 py-1.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm">
              <option>All Members</option>
            </select>

            {/* Time range */}
            <div className="flex items-center border border-[var(--border)] rounded-lg overflow-hidden">
              {(['7d', '30d', '90d'] as const).map(range => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-semibold transition-colors',
                    timeRange === range
                      ? 'bg-[var(--accent)] text-white'
                      : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                  )}
                >
                  {range}
                </button>
              ))}
            </div>

            {/* Live badge */}
            <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              LIVE
            </span>

            {/* Role badge */}
            <span className="hidden sm:inline px-2.5 py-1 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-semibold uppercase">
              {role}
            </span>

            {/* Notification bell */}
            <button className="relative p-2">
              <Bell size={18} className="text-[var(--muted-foreground)]" />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                2
              </span>
            </button>
          </div>
        </header>

        {/* Tab content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
            {activeTab === 'overview' && (
              <TeamOverview
                memberStats={memberStats ?? []}
                activityFeed={activityFeed ?? []}
                timeRange={timeRange}
              />
            )}
            {activeTab === 'members' && (
              <TeamMembers
                workspaceId={workspaceId}
                memberStats={memberStats ?? []}
                members={members ?? []}
                myRole={role}
              />
            )}
            {activeTab === 'cohorts' && (
              <TeamCohorts
                workspaceId={workspaceId}
                memberStats={memberStats ?? []}
                members={members ?? []}
                myRole={role}
              />
            )}
            {activeTab === 'coach-desk' && (
              <CoachDesk
                workspaceId={workspaceId}
                memberStats={memberStats ?? []}
                members={members ?? []}
                myRole={role}
              />
            )}
            {activeTab === 'reports' && (
              <TeamReports
                workspaceId={workspaceId}
                memberStats={memberStats ?? []}
              />
            )}
            {activeTab === 'leaderboard' && (
              <TeamLeaderboard
                memberStats={memberStats ?? []}
              />
            )}
            {activeTab === 'settings' && (
              <TeamSettings
                workspaceId={workspaceId}
                workspaceName={workspaceName}
                members={members ?? []}
                activityFeed={activityFeed ?? []}
                myRole={role}
              />
            )}
          </div>
        </main>
      </div>

      {/* Mobile bottom bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around bg-[var(--card)] border-t border-[var(--border)] px-2 py-2 z-50">
        {teamTabs.slice(0, 5).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors',
              activeTab === tab.id
                ? 'text-[var(--accent)]'
                : 'text-[var(--muted-foreground)]'
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
        <button
          onClick={onBackToPersonal}
          className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium text-[var(--muted-foreground)]"
        >
          <ChevronLeft size={20} />
          <span>Personal</span>
        </button>
      </div>
    </div>
  );
}
