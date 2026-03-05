'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import {
  Settings, Users, ShieldCheck, AlertTriangle, Clock, Eye, Save, Trash2, Check,
} from 'lucide-react';

interface WorkspaceMember {
  workspaceId: string;
  userId: string;
  displayName: string;
  email: string;
  role: string;
  joinedAt: string;
}

interface ActivityEvent {
  userId: string;
  displayName: string;
  type: string;
  message: string;
  timestamp: string;
}

interface TeamSettingsProps {
  workspaceId: string;
  workspaceName: string;
  members: WorkspaceMember[];
  activityFeed: ActivityEvent[];
  myRole: string;
}

const MAX_SEATS = 5;

const PERMISSIONS_MATRIX = [
  { permission: 'View Dashboard', owner: true, coach: true, assistant: true, student: true, viewer: true },
  { permission: 'View Members', owner: true, coach: true, assistant: true, student: false, viewer: true },
  { permission: 'Invite Members', owner: true, coach: true, assistant: false, student: false, viewer: false },
  { permission: 'Manage Roles', owner: true, coach: false, assistant: false, student: false, viewer: false },
  { permission: 'Create Cohorts', owner: true, coach: true, assistant: false, student: false, viewer: false },
  { permission: 'Write Notes', owner: true, coach: true, assistant: true, student: false, viewer: false },
  { permission: 'Assign Tasks', owner: true, coach: true, assistant: false, student: false, viewer: false },
  { permission: 'View as Student', owner: true, coach: true, assistant: false, student: false, viewer: false },
  { permission: 'Generate Reports', owner: true, coach: true, assistant: true, student: false, viewer: false },
  { permission: 'Workspace Settings', owner: true, coach: false, assistant: false, student: false, viewer: false },
];

export default function TeamSettings({ workspaceId, workspaceName, members, activityFeed, myRole }: TeamSettingsProps) {
  const [name, setName] = useState(workspaceName);
  const [privacyMode, setPrivacyMode] = useState(false);
  const isOwner = myRole === 'owner';

  // Role distribution
  const roleCounts: Record<string, number> = {};
  for (const m of members) {
    roleCounts[m.role] = (roleCounts[m.role] ?? 0) + 1;
  }

  const seatUsed = members.length;
  const seatPercent = Math.min((seatUsed / MAX_SEATS) * 100, 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold">Settings</h2>
        <p className="text-sm text-[var(--muted-foreground)]">Workspace configuration and audit log</p>
      </div>

      {/* Workspace section */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 space-y-4">
        <h3 className="font-bold flex items-center gap-2">
          <Settings size={16} className="text-[var(--muted-foreground)]" />
          Workspace
        </h3>

        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5 block">
            Workspace Name
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={!isOwner}
            className="w-full max-w-md px-3 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm outline-none focus:border-[var(--accent)] disabled:opacity-60"
          />
        </div>

        <div className="flex items-center justify-between max-w-md">
          <div>
            <p className="text-sm font-semibold">Privacy Mode</p>
            <p className="text-[11px] text-[var(--muted-foreground)]">Hide trader names from other students</p>
          </div>
          <button
            onClick={() => setPrivacyMode(!privacyMode)}
            disabled={!isOwner}
            className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 ${
              privacyMode ? 'bg-[var(--accent)]' : 'bg-[var(--muted)]'
            } disabled:opacity-60`}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
              privacyMode ? 'translate-x-4' : 'translate-x-0'
            }`} />
          </button>
        </div>

        {isOwner && (
          <button className="flex items-center gap-2 px-4 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl text-sm font-semibold transition-colors">
            <Save size={14} />
            Save Changes
          </button>
        )}
      </div>

      {/* Seats + Role Distribution row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Seats */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <h3 className="font-bold flex items-center gap-2 mb-4">
            <Users size={16} className="text-[var(--muted-foreground)]" />
            Seats
          </h3>
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-3xl font-bold">{seatUsed}</span>
            <span className="text-lg text-[var(--muted-foreground)]">/ {MAX_SEATS}</span>
          </div>
          <p className="text-xs text-[var(--muted-foreground)] mb-3">Active seats used</p>
          <div className="h-2 bg-[var(--muted)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--accent)] rounded-full transition-all"
              style={{ width: `${seatPercent}%` }}
            />
          </div>
        </div>

        {/* Role Distribution */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <h3 className="font-bold flex items-center gap-2 mb-4">
            <ShieldCheck size={16} className="text-[var(--muted-foreground)]" />
            Role Distribution
          </h3>
          <div className="space-y-2">
            {Object.entries(roleCounts).map(([role, count]) => (
              <div key={role} className="flex items-center justify-between py-1">
                <span className="text-sm capitalize">{role}</span>
                <span className="text-sm font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Permissions Matrix */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
        <h3 className="font-bold flex items-center gap-2 mb-4">
          <ShieldCheck size={16} className="text-[var(--muted-foreground)]" />
          Permissions Matrix
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                <th className="text-left py-2 pr-4 min-w-[160px]">Permission</th>
                <th className="text-center py-2 px-4">Owner</th>
                <th className="text-center py-2 px-4">Coach</th>
                <th className="text-center py-2 px-4">Assistant</th>
                <th className="text-center py-2 px-4">Student</th>
                <th className="text-center py-2 px-4">Viewer</th>
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS_MATRIX.map((row, i) => (
                <tr key={i} className="border-t border-[var(--border)]/50">
                  <td className="py-3 pr-4 text-sm">{row.permission}</td>
                  {(['owner', 'coach', 'assistant', 'student', 'viewer'] as const).map(role => (
                    <td key={role} className="text-center py-3 px-4">
                      {row[role] ? (
                        <Check size={16} className="inline text-green-400" />
                      ) : (
                        <span className="text-[var(--muted-foreground)]">&mdash;</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Danger Zone */}
      {isOwner && (
        <div className="bg-[var(--card)] border border-red-500/30 rounded-xl p-5">
          <h3 className="font-bold flex items-center gap-2 text-red-400 mb-2">
            <AlertTriangle size={16} />
            Danger Zone
          </h3>
          <p className="text-sm text-[var(--muted-foreground)] mb-4">
            Deleting a workspace permanently removes all members, cohorts, templates, assignments, notes, and audit logs.
          </p>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm font-semibold hover:bg-red-500/20 transition-colors">
            <Trash2 size={14} />
            Delete Workspace
          </button>
        </div>
      )}

      {/* Audit Log */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
        <h3 className="font-bold flex items-center gap-2 mb-4">
          <Clock size={16} className="text-[var(--muted-foreground)]" />
          Audit Log
        </h3>
        {activityFeed.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)] text-center py-6">No activity recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {activityFeed.map((event, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <div className="w-7 h-7 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-[10px] font-bold text-[var(--accent)] shrink-0">
                  {event.displayName[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-semibold">{event.displayName}</span>{' '}
                    <span className="text-[var(--muted-foreground)]">{event.message}</span>
                  </p>
                </div>
                <span className="text-[11px] text-[var(--muted-foreground)] shrink-0">
                  {new Date(event.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
