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

// shared ATLAS input chrome (markup-level styling only)
const inputBox: React.CSSProperties = {
  width: '100%', height: 42, padding: '0 14px', borderRadius: 2,
  border: '1px solid var(--line)', background: 'var(--panel-2)',
  fontSize: 13, color: 'var(--text)', outline: 'none',
};

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
    <div>
      {/* Header */}
      <div className="phead" style={{ marginBottom: 24 }}>
        <p className="eyebrow" style={{ margin: '0 0 12px' }}>Configuration</p>
        <h2 style={{ fontSize: 34, lineHeight: '38px' }}>Settings</h2>
        <p className="sub" style={{ marginTop: 14, fontSize: 14.5 }}>Workspace configuration and audit log</p>
      </div>

      {/* Workspace section */}
      <div className="card">
        <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
        <div className="flex items-center gap-2">
          <Settings size={15} style={{ color: 'var(--muted-3)' }} />
          <h3>Workspace</h3>
        </div>
        <p className="sub">Identity and visibility for this workspace</p>

        <div className="field" style={{ marginTop: 20, maxWidth: 420 }}>
          <label>WORKSPACE NAME</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={!isOwner}
            style={{ ...inputBox, opacity: isOwner ? 1 : 0.6 }}
          />
        </div>

        <div className="flex items-center justify-between gap-4" style={{ marginTop: 18, maxWidth: 420 }}>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Privacy Mode</p>
            <p style={{ margin: '4px 0 0', fontSize: 11.5, color: 'var(--muted-2)' }}>Hide trader names from other students</p>
          </div>
          <button
            onClick={() => setPrivacyMode(!privacyMode)}
            disabled={!isOwner}
            className="flex items-center shrink-0"
            style={{
              width: 42, height: 22, padding: 2, borderRadius: 2,
              border: '1px solid var(--line-2)',
              background: privacyMode ? 'var(--amber)' : 'var(--panel-2)',
              opacity: isOwner ? 1 : 0.6,
            }}
          >
            <span
              style={{
                width: 16, height: 16, borderRadius: 1,
                background: privacyMode ? 'var(--ink)' : 'var(--muted)',
                transform: privacyMode ? 'translateX(20px)' : 'translateX(0)',
                transition: 'transform .18s',
              }}
            />
          </button>
        </div>

        {isOwner && (
          <button className="btn-a" style={{ marginTop: 20 }}>
            <Save size={14} />
            Save Changes
          </button>
        )}
      </div>

      {/* Seats + Role Distribution row */}
      <div className="split" style={{ marginTop: 24 }}>
        {/* Seats */}
        <div className="card">
          <span className="accent" style={{ width: 56, background: 'var(--teal)' }} />
          <div className="flex items-center gap-2">
            <Users size={15} style={{ color: 'var(--muted-3)' }} />
            <h3>Seats</h3>
          </div>
          <p className="sub">Active seats used in this workspace</p>
          <div className="flex items-baseline gap-2" style={{ marginTop: 20 }}>
            <span style={{ fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 30, lineHeight: '38px' }}>{seatUsed}</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 16, color: 'var(--muted-2)' }}>/ {MAX_SEATS}</span>
          </div>
          <div style={{ height: 8, marginTop: 12, background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'var(--amber)', width: `${seatPercent}%` }} />
          </div>
        </div>

        {/* Role Distribution */}
        <div className="card">
          <span className="accent" style={{ width: 56, background: 'var(--pink)' }} />
          <div className="flex items-center gap-2">
            <ShieldCheck size={15} style={{ color: 'var(--muted-3)' }} />
            <h3>Role Distribution</h3>
          </div>
          <p className="sub">How the roster breaks down by role</p>
          <div style={{ marginTop: 18 }}>
            {Object.entries(roleCounts).map(([role, count]) => (
              <div key={role} className="mrow">
                <span className="ic" />
                <span className="lb capitalize" style={{ marginLeft: 0 }}>{role}</span>
                <span className="val">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Permissions Matrix */}
      <div className="card" style={{ marginTop: 24 }}>
        <span className="accent" style={{ width: 56, background: 'var(--green)' }} />
        <div className="flex items-center gap-2">
          <ShieldCheck size={15} style={{ color: 'var(--muted-3)' }} />
          <h3>Permissions Matrix</h3>
        </div>
        <p className="sub">What each role can do in the workspace</p>

        <div className="overflow-x-auto" style={{ marginTop: 18 }}>
          <table className="w-full">
            <thead>
              <tr style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--muted-2)' }}>
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
                <tr key={i} style={{ borderTop: '1px solid var(--hair)' }}>
                  <td className="py-3 pr-4" style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{row.permission}</td>
                  {(['owner', 'coach', 'assistant', 'student', 'viewer'] as const).map(role => (
                    <td key={role} className="text-center py-3 px-4">
                      {row[role] ? (
                        <Check size={15} className="inline" style={{ color: 'var(--green)' }} />
                      ) : (
                        <span style={{ color: 'var(--muted-3)' }}>&mdash;</span>
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
        <div className="card" style={{ marginTop: 24, borderColor: '#3a1218' }}>
          <span className="accent" style={{ width: 56, background: 'var(--red)' }} />
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} style={{ color: 'var(--red)' }} />
            <h3 style={{ color: 'var(--red)' }}>Danger Zone</h3>
          </div>
          <p className="sub">
            Deleting a workspace permanently removes all members, cohorts, templates, assignments, notes, and audit logs.
          </p>
          <button
            className="flex items-center gap-2"
            style={{
              marginTop: 18, height: 40, padding: '0 20px', borderRadius: 2,
              border: '1px solid #3a1218', background: '#160a0d',
              fontWeight: 700, fontSize: 13, color: 'var(--red)',
            }}
          >
            <Trash2 size={14} />
            Delete Workspace
          </button>
        </div>
      )}

      {/* Audit Log */}
      <div className="card" style={{ marginTop: 24 }}>
        <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
        <div className="flex items-center gap-2">
          <Clock size={15} style={{ color: 'var(--muted-3)' }} />
          <h3>Audit Log</h3>
        </div>
        <p className="sub">Every recorded workspace event</p>
        {activityFeed.length === 0 ? (
          <p className="empty-line" style={{ padding: '34px 0 8px' }}>No activity recorded yet.</p>
        ) : (
          <div style={{ marginTop: 18 }}>
            {activityFeed.map((event, i) => (
              <div key={i} className="flex items-center gap-3" style={{ padding: '10px 0', borderBottom: '1px solid var(--hair)' }}>
                <div
                  className="flex items-center justify-center shrink-0"
                  style={{
                    width: 26, height: 26, borderRadius: 2, background: 'var(--panel-2)',
                    border: '1px solid var(--line)', fontSize: 10, fontWeight: 700, color: 'var(--amber)',
                  }}
                >
                  {event.displayName[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p style={{ margin: 0, fontSize: 12.5, lineHeight: '18px', color: 'var(--text-2)' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text)' }}>{event.displayName}</span>{' '}
                    {event.message}
                  </p>
                </div>
                <span className="shrink-0 whitespace-nowrap" style={{ fontSize: 10.5, color: 'var(--muted-2)' }}>
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
