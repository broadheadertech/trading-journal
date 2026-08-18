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
    <div className="atlas-dash h-dvh flex overflow-hidden">
      {/* Team Sidebar */}
      <aside
        className="hidden md:flex flex-col shrink-0 w-[240px] overflow-y-auto"
        style={{ background: 'var(--bg)', borderRight: '1px solid var(--line)' }}
      >
        {/* Team logo/name */}
        <div
          className="shrink-0 flex items-center gap-3 px-6"
          style={{ height: 72, borderBottom: '1px solid var(--line)' }}
        >
          <BrainMascot size={26} className="shrink-0" />
          <h1
            className="truncate"
            style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 14, lineHeight: '17px', margin: 0 }}
          >
            {workspaceName}
          </h1>
        </div>

        {/* Nav items */}
        <nav className="nav flex-1">
          <h5>TEAM MANAGEMENT</h5>
          {teamTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn('w-full text-left', activeTab === tab.id && 'on')}
              style={{
                display: 'flex',
                alignItems: 'center',
                height: 40,
                padding: '0 0 0 26px',
                position: 'relative',
                fontSize: 13.5,
                fontWeight: activeTab === tab.id ? 700 : 400,
                color: activeTab === tab.id ? 'var(--text)' : 'var(--text-2)',
                background: activeTab === tab.id ? 'var(--panel-2)' : 'none',
              }}
            >
              {activeTab === tab.id && (
                <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'var(--amber)' }} />
              )}
              <span
                className="flex items-center shrink-0"
                style={{ width: 16, height: 16, color: activeTab === tab.id ? 'var(--amber)' : 'inherit' }}
              >
                {tab.icon}
              </span>
              <span className="truncate" style={{ marginLeft: 16 }}>{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Back to personal */}
        <div className="shrink-0" style={{ borderTop: '1px solid var(--line)', padding: '14px 0 12px' }}>
          <button
            onClick={onBackToPersonal}
            className="w-full flex items-center"
            style={{ height: 44, padding: '0 0 0 26px', fontSize: 13.5, color: 'var(--text-2)' }}
          >
            <ChevronLeft size={16} className="shrink-0" />
            <span style={{ marginLeft: 17 }}>Back to Personal</span>
          </button>

          {/* User info */}
          <div
            className="flex items-center gap-3"
            style={{ margin: '12px 20px 0', paddingTop: 14, borderTop: '1px solid var(--line)' }}
          >
            <div
              className="flex items-center justify-center shrink-0"
              style={{
                width: 30, height: 29, borderRadius: 2, background: 'var(--amber)', color: 'var(--ink)',
                fontFamily: 'var(--display)', fontWeight: 700, fontSize: 14,
              }}
            >
              {(user?.emailAddresses?.[0]?.emailAddress ?? 'U')[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate" style={{ margin: 0, fontSize: 12, color: 'var(--text-2)' }}>
                {user?.emailAddresses?.[0]?.emailAddress}
              </p>
              <p className="capitalize" style={{ margin: '3px 0 0', fontSize: 10, color: 'var(--muted-2)' }}>{role}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header
          className="shrink-0 flex items-center justify-between px-4 sm:px-6 gap-4"
          style={{ height: 72, background: 'var(--bg)', borderBottom: '1px solid var(--line)' }}
        >
          <div className="flex items-center gap-2" style={{ fontSize: 13 }}>
            <span style={{ color: 'var(--muted-2)' }}>Team</span>
            <span style={{ color: 'var(--muted-3)' }}>&rsaquo;</span>
            <h1 style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 14, lineHeight: '17px', margin: 0 }}>
              {teamTabs.find(t => t.id === activeTab)?.label}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div
              className="hidden lg:flex items-center gap-2"
              style={{
                height: 38, padding: '0 14px', borderRadius: 2,
                border: '1px solid var(--line)', background: 'var(--panel-2)',
              }}
            >
              <Search size={14} style={{ color: 'var(--muted-3)' }} />
              <input
                type="text"
                placeholder="Search students, cohorts, rules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: 'transparent', border: 0, outline: 'none',
                  fontSize: 12.5, color: 'var(--text)', width: 190,
                }}
              />
            </div>

            {/* Member filter placeholder */}
            <select
              className="hidden lg:block"
              style={{
                height: 38, padding: '0 12px', borderRadius: 2,
                border: '1px solid var(--line)', background: 'var(--panel-2)',
                fontSize: 12.5, color: 'var(--text-2)',
              }}
            >
              <option>All Members</option>
            </select>

            {/* Time range */}
            <div className="range" style={{ marginLeft: 0 }}>
              {(['7d', '30d', '90d'] as const).map(range => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={cn(timeRange === range && 'on')}
                >
                  {range}
                </button>
              ))}
            </div>

            {/* Live badge */}
            <span className="hidden sm:block">
              <span className="synced" style={{ marginRight: 0 }}>
                <span
                  className="animate-pulse"
                  style={{ width: 7, height: 7, borderRadius: 1, background: 'var(--green)' }}
                />
                LIVE
              </span>
            </span>

            {/* Role badge */}
            <span className="hidden sm:block">
              <span className="chip on uppercase">{role}</span>
            </span>

            {/* Notification bell */}
            <button className="relative" style={{ padding: 6 }}>
              <Bell size={17} style={{ color: 'var(--muted)' }} />
              <span
                className="absolute flex items-center justify-center"
                style={{
                  top: -1, right: -1, width: 15, height: 15, borderRadius: 2,
                  background: 'var(--red)', color: '#fff', fontSize: 9, fontWeight: 700,
                }}
              >
                2
              </span>
            </button>
          </div>
        </header>

        {/* Tab content */}
        <main className="flex-1 overflow-y-auto" style={{ background: 'var(--bg)' }}>
          <div className="max-w-[1400px] mx-auto" style={{ padding: '32px 32px 64px' }}>
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
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around px-2 py-2 z-50"
        style={{ background: 'var(--bg)', borderTop: '1px solid var(--line)' }}
      >
        {teamTabs.slice(0, 5).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex flex-col items-center gap-1 px-2 py-1"
            style={{
              borderRadius: 2,
              fontSize: 10,
              fontWeight: 700,
              color: activeTab === tab.id ? 'var(--amber)' : 'var(--muted-2)',
            }}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
        <button
          onClick={onBackToPersonal}
          className="flex flex-col items-center gap-1 px-2 py-1"
          style={{ borderRadius: 2, fontSize: 10, fontWeight: 700, color: 'var(--muted-2)' }}
        >
          <ChevronLeft size={20} />
          <span>Personal</span>
        </button>
      </div>
    </div>
  );
}
