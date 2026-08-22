'use client';

import { useState, useMemo } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import {
  MagnifyingGlass, UserPlus, CaretDown, CaretUp, Prohibit, X as XIcon,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface MemberStat {
  userId: string;
  displayName: string;
  role: string;
  totalTrades: number;
  totalPnL: number;
  winRate: number;
  compliance: number;
}

interface WorkspaceMember {
  workspaceId: string;
  userId: string;
  displayName: string;
  email: string;
  role: string;
  joinedAt: string;
}

interface TeamMembersProps {
  workspaceId: string;
  memberStats: MemberStat[];
  members: WorkspaceMember[];
  myRole: string;
}

type SortField = 'name' | 'role' | 'compliance' | 'pnl' | 'winRate' | 'trades';
type SortDir = 'asc' | 'desc';
type RoleFilter = 'all' | 'owner' | 'admin' | 'coach' | 'member';

function getRiskLevel(compliance: number, pnl: number): 'low' | 'medium' | 'high' {
  if (compliance < 50 || pnl < -2000) return 'high';
  if (compliance < 75 || pnl < -500) return 'medium';
  return 'low';
}

const RISK_COLOR: Record<'low' | 'medium' | 'high', string> = {
  low: 'var(--green)',
  medium: 'var(--amber)',
  high: 'var(--red)',
};

// shared ATLAS input chrome (markup-level styling only)
const inputBox: React.CSSProperties = {
  width: '100%', height: 42, padding: '0 14px', borderRadius: 2,
  border: '1px solid var(--line)', background: 'var(--panel-2)',
  fontSize: 13, color: 'var(--text)', outline: 'none',
};

function RiskBadge({ level }: { level: 'low' | 'medium' | 'high' }) {
  return (
    <span className="chip" style={{ height: 24, padding: '0 10px', fontSize: 11, color: RISK_COLOR[level] }}>
      <i style={{ background: RISK_COLOR[level] }} />
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </span>
  );
}

function SortIcon({ field, current, dir }: { field: SortField; current: SortField; dir: SortDir }) {
  if (field !== current) {
    return (
      <span className="inline-flex flex-col ml-1 opacity-30">
        <CaretUp size={10} />
        <CaretDown size={10} className="-mt-1" />
      </span>
    );
  }
  return dir === 'asc'
    ? <CaretUp size={12} className="ml-1" />
    : <CaretDown size={12} className="ml-1" />;
}

export default function TeamMembers({ workspaceId, memberStats, members, myRole }: TeamMembersProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const removeMember = useMutation(api.workspaces.removeMember);

  const canManage = myRole === 'owner' || myRole === 'admin';

  // Merge member info with stats
  const enrichedMembers = useMemo(() => {
    return members.map(m => {
      const stat = memberStats.find(s => s.userId === m.userId);
      return {
        ...m,
        totalTrades: stat?.totalTrades ?? 0,
        totalPnL: stat?.totalPnL ?? 0,
        winRate: stat?.winRate ?? 0,
        compliance: stat?.compliance ?? 0,
      };
    });
  }, [members, memberStats]);

  // Filter
  const filtered = useMemo(() => {
    let list = enrichedMembers;
    if (roleFilter !== 'all') {
      list = list.filter(m => m.role === roleFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(m =>
        m.displayName.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q)
      );
    }
    return list;
  }, [enrichedMembers, roleFilter, searchQuery]);

  // Sort
  const sorted = useMemo(() => {
    const list = [...filtered];
    const dir = sortDir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      switch (sortField) {
        case 'name': return dir * a.displayName.localeCompare(b.displayName);
        case 'role': return dir * a.role.localeCompare(b.role);
        case 'compliance': return dir * (a.compliance - b.compliance);
        case 'pnl': return dir * (a.totalPnL - b.totalPnL);
        case 'winRate': return dir * (a.winRate - b.winRate);
        case 'trades': return dir * (a.totalTrades - b.totalTrades);
        default: return 0;
      }
    });
    return list;
  }, [filtered, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const handleRemove = async (userId: string, displayName: string) => {
    if (!confirm(`Remove ${displayName} from this workspace?`)) return;
    try {
      await removeMember({ workspaceId, userId });
    } catch {
      // silently fail — will show stale data until re-query
    }
  };

  const roleFilters: { value: RoleFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'owner', label: 'Owner' },
    { value: 'admin', label: 'Admin' },
    { value: 'coach', label: 'Coach' },
    { value: 'member', label: 'Member' },
  ];

  // Only show filters that have members
  const activeRoles = new Set(enrichedMembers.map(m => m.role));
  const visibleFilters = roleFilters.filter(f => f.value === 'all' || activeRoles.has(f.value));

  return (
    <div>
      {/* Header */}
      <div className="phead pwrap" style={{ marginBottom: 24 }}>
        <p className="eyebrow" style={{ margin: '0 0 12px' }}>Roster</p>
        <h2 style={{ fontSize: 34, lineHeight: '38px' }}>Members</h2>
        <p className="sub" style={{ marginTop: 14, fontSize: 14.5 }}>{enrichedMembers.length} members total</p>
        {canManage && (
          <div className="actions">
            <button onClick={() => setShowAddModal(true)} className="btn-a" style={{ height: 44 }}>
              <UserPlus size={14} />
              Add Member
            </button>
          </div>
        )}
      </div>

      {/* Search + role filter */}
      <div className="flex items-center gap-3 flex-wrap" style={{ marginBottom: 20 }}>
        <div
          className="flex items-center gap-2 flex-1 max-w-md"
          style={{ height: 40, padding: '0 14px', borderRadius: 2, border: '1px solid var(--line)', background: 'var(--panel-2)' }}
        >
          <MagnifyingGlass size={14} className="shrink-0" style={{ color: 'var(--muted-3)' }} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ background: 'transparent', border: 0, outline: 'none', fontSize: 12.5, color: 'var(--text)', width: '100%' }}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {visibleFilters.map(f => (
            <button
              key={f.value}
              onClick={() => setRoleFilter(f.value)}
              className={cn('chip', roleFilter === f.value && 'on')}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Table header */}
        <div
          className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_0.8fr_0.8fr] gap-2 px-5 py-3"
          style={{ borderBottom: '1px solid var(--line)', fontSize: 9.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--muted-2)' }}
        >
          <button onClick={() => handleSort('name')} className="flex items-center text-left">
            Name <SortIcon field="name" current={sortField} dir={sortDir} />
          </button>
          <button onClick={() => handleSort('role')} className="flex items-center">
            Role <SortIcon field="role" current={sortField} dir={sortDir} />
          </button>
          <button onClick={() => handleSort('compliance')} className="flex items-center justify-center">
            Compliance <SortIcon field="compliance" current={sortField} dir={sortDir} />
          </button>
          <button onClick={() => handleSort('pnl')} className="flex items-center justify-center">
            P&L <SortIcon field="pnl" current={sortField} dir={sortDir} />
          </button>
          <button onClick={() => handleSort('winRate')} className="flex items-center justify-center">
            Win Rate <SortIcon field="winRate" current={sortField} dir={sortDir} />
          </button>
          <button onClick={() => handleSort('trades')} className="flex items-center justify-center">
            Trades <SortIcon field="trades" current={sortField} dir={sortDir} />
          </button>
          <span className="text-center">Risk</span>
        </div>

        {/* Table rows */}
        {sorted.length === 0 ? (
          <p className="empty-line">
            {searchQuery || roleFilter !== 'all' ? 'No members match your filters.' : 'No members yet.'}
          </p>
        ) : (
          sorted.map(member => {
            const risk = getRiskLevel(member.compliance, member.totalPnL);
            const isExpanded = expandedUserId === member.userId;
            const wins = member.totalTrades > 0
              ? Math.round((member.winRate / 100) * member.totalTrades)
              : 0;
            const losses = member.totalTrades - wins;

            return (
              <div key={member.userId}>
                {/* Main row */}
                <div
                  onClick={() => setExpandedUserId(isExpanded ? null : member.userId)}
                  className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_0.8fr_0.8fr] gap-2 px-5 py-3.5 items-center cursor-pointer"
                  style={{
                    borderBottom: '1px solid var(--hair)',
                    background: isExpanded ? 'var(--panel-2)' : 'transparent',
                  }}
                >
                  {/* Name + email */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="flex items-center justify-center shrink-0"
                      style={{
                        width: 30, height: 29, borderRadius: 2, background: 'var(--panel-2)',
                        border: '1px solid var(--line)', fontFamily: 'var(--display)',
                        fontWeight: 700, fontSize: 13, color: 'var(--amber)',
                      }}
                    >
                      {member.displayName[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate" style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>{member.displayName}</p>
                      <p className="truncate" style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--muted-2)' }}>{member.email}</p>
                    </div>
                  </div>

                  {/* Role */}
                  <span className="capitalize" style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{member.role}</span>

                  {/* Compliance */}
                  <span className="text-center" style={{ fontFamily: 'var(--mono)', fontSize: 12.5 }}>{Math.round(member.compliance)}%</span>

                  {/* P&L */}
                  <span
                    className="text-center"
                    style={{ fontFamily: 'var(--mono)', fontSize: 12.5, color: member.totalPnL >= 0 ? 'var(--green)' : 'var(--red)' }}
                  >
                    {member.totalPnL >= 0 ? '+' : '-'}${Math.abs(member.totalPnL).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>

                  {/* Win Rate */}
                  <span className="text-center" style={{ fontFamily: 'var(--mono)', fontSize: 12.5 }}>{Math.round(member.winRate)}%</span>

                  {/* Trades */}
                  <span className="text-center" style={{ fontFamily: 'var(--mono)', fontSize: 12.5 }}>{member.totalTrades}</span>

                  {/* Risk + actions */}
                  <div className="flex items-center justify-center gap-2">
                    <RiskBadge level={risk} />
                  </div>
                </div>

                {/* Expanded detail row */}
                {isExpanded && (
                  <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--line)', background: 'var(--panel-2)' }}>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="inset">
                        <p className="lbl">STATUS</p>
                        <p style={{ margin: '6px 0 0', fontSize: 13, fontWeight: 700 }}>Active</p>
                      </div>
                      <div className="inset">
                        <p className="lbl">COHORTS</p>
                        <p style={{ margin: '6px 0 0', fontSize: 13, fontWeight: 700 }}>&mdash;</p>
                      </div>
                      <div className="inset">
                        <p className="lbl">ACCOUNTS</p>
                        <p style={{ margin: '6px 0 0', fontSize: 13, fontWeight: 700 }}>0 linked</p>
                      </div>
                      <div className="inset">
                        <p className="lbl">WINS / LOSSES</p>
                        <p style={{ margin: '6px 0 0', fontFamily: 'var(--mono)', fontSize: 13 }}>{wins} / {losses}</p>
                      </div>
                    </div>

                    {/* Actions row */}
                    {canManage && member.role !== 'owner' && (
                      <div className="flex items-center gap-3" style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
                        {/* Role selector */}
                        <select
                          defaultValue={member.role}
                          style={{ ...inputBox, width: 'auto', height: 32, fontSize: 12, fontWeight: 700 }}
                          onClick={e => e.stopPropagation()}
                        >
                          <option value="admin">Admin</option>
                          <option value="coach">Coach</option>
                          <option value="member">Member</option>
                        </select>
                        <button
                          onClick={(e) => { e.stopPropagation(); }}
                          className="flex items-center justify-center"
                          style={{ width: 32, height: 32, borderRadius: 2, border: '1px solid var(--line-2)', color: 'var(--amber)' }}
                          title="Ban member"
                        >
                          <Prohibit size={15} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemove(member.userId, member.displayName); }}
                          className="flex items-center justify-center"
                          style={{ width: 32, height: 32, borderRadius: 2, border: '1px solid var(--line-2)', color: 'var(--red)' }}
                          title="Remove member"
                        >
                          <XIcon size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add member modal */}
      {showAddModal && (
        <AddMemberModal
          workspaceId={workspaceId}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}

interface ClerkUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  imageUrl: string;
}

type AddTab = 'existing' | 'invite';

function AddMemberModal({ workspaceId, onClose }: { workspaceId: string; onClose: () => void }) {
  const [tab, setTab] = useState<AddTab>('existing');
  const [role, setRole] = useState<'admin' | 'coach' | 'member'>('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Existing user search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ClerkUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ClerkUser | null>(null);

  // Invite tab
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteDisplayName, setInviteDisplayName] = useState('');

  const addMember = useMutation(api.workspaces.addMember);

  // Debounced search
  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    setSelectedUser(null);
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/clerk/search-users?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      setSearchResults(data.users ?? []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleAddExisting = async () => {
    if (!selectedUser) return;
    setLoading(true);
    setError('');
    try {
      const name = [selectedUser.firstName, selectedUser.lastName].filter(Boolean).join(' ') || selectedUser.email;
      await addMember({
        workspaceId,
        userId: selectedUser.id,
        displayName: name,
        email: selectedUser.email,
        role,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteDisplayName.trim()) return;
    setLoading(true);
    setError('');
    try {
      await addMember({
        workspaceId,
        userId: `pending-${inviteEmail.toLowerCase()}`,
        displayName: inviteDisplayName.trim(),
        email: inviteEmail.trim().toLowerCase(),
        role,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to invite member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,.65)' }}>
      <div className="modal w-full" style={{ maxWidth: 480, textAlign: 'left', padding: '28px 26px 32px' }}>
        <span className="accent" />
        <span className="corner" style={{ left: 0, top: 0, borderRight: 0, borderBottom: 0 }} />
        <span className="corner" style={{ right: 0, top: 0, borderLeft: 0, borderBottom: 0 }} />
        <span className="corner" style={{ left: 0, bottom: 0, borderRight: 0, borderTop: 0 }} />
        <span className="corner" style={{ right: 0, bottom: 0, borderLeft: 0, borderTop: 0 }} />

        <button
          onClick={onClose}
          className="absolute flex items-center justify-center"
          style={{ top: 16, right: 16, width: 26, height: 26, borderRadius: 2, border: '1px solid var(--line-2)', color: 'var(--muted)' }}
        >
          <XIcon size={14} />
        </button>

        <h3 style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 20, margin: 0 }}>Add Member</h3>

        {/* Tab switcher */}
        <div className="tabs line" style={{ marginTop: 18, marginBottom: 20 }}>
          <button
            onClick={() => { setTab('existing'); setError(''); }}
            className={cn('flex items-center gap-2', tab === 'existing' && 'on')}
          >
            <UserPlus size={13} />
            Add Existing User
          </button>
          <button
            onClick={() => { setTab('invite'); setError(''); }}
            className={cn('flex items-center gap-2', tab === 'invite' && 'on')}
          >
            <MagnifyingGlass size={13} />
            Invite
          </button>
        </div>

        {/* Role selector (shared) */}
        <div className="field" style={{ marginBottom: 16 }}>
          <label>ROLE</label>
          <select
            value={role}
            onChange={e => setRole(e.target.value as 'admin' | 'coach' | 'member')}
            style={{ ...inputBox, cursor: 'pointer' }}
          >
            <option value="member">Member</option>
            <option value="coach">Coach</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {/* Tab content */}
        {tab === 'existing' ? (
          <div>
            {/* Search input */}
            <div
              className="flex items-center gap-2"
              style={{ height: 42, padding: '0 14px', borderRadius: 2, border: '1px solid var(--line)', background: 'var(--panel-2)' }}
            >
              <MagnifyingGlass size={14} className="shrink-0" style={{ color: 'var(--muted-3)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Search by username or email..."
                style={{ background: 'transparent', border: 0, outline: 'none', fontSize: 13, color: 'var(--text)', width: '100%' }}
                autoFocus
              />
            </div>

            {/* Search results */}
            {searchQuery.trim().length < 2 ? (
              <p className="empty-line" style={{ padding: '20px 0', fontSize: 12.5 }}>
                Type at least 2 characters to search
              </p>
            ) : searching ? (
              <p className="empty-line" style={{ padding: '20px 0', fontSize: 12.5 }}>
                Searching...
              </p>
            ) : searchResults.length === 0 ? (
              <p className="empty-line" style={{ padding: '20px 0', fontSize: 12.5 }}>
                No users found
              </p>
            ) : (
              <div style={{ maxHeight: 200, overflowY: 'auto', marginTop: 12 }}>
                {searchResults.map(user => {
                  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
                  const isSelected = selectedUser?.id === user.id;
                  return (
                    <button
                      key={user.id}
                      onClick={() => setSelectedUser(isSelected ? null : user)}
                      className="w-full flex items-center gap-3 text-left"
                      style={{
                        padding: '9px 12px', marginTop: 6, borderRadius: 2,
                        border: `1px solid ${isSelected ? 'var(--amber)' : 'var(--line)'}`,
                        background: isSelected ? '#14100a' : 'var(--panel-2)',
                      }}
                    >
                      {user.imageUrl ? (
                        <img src={user.imageUrl} alt="" className="shrink-0" style={{ width: 28, height: 28, borderRadius: 2 }} />
                      ) : (
                        <div
                          className="flex items-center justify-center shrink-0"
                          style={{
                            width: 28, height: 28, borderRadius: 2, background: 'var(--panel)',
                            border: '1px solid var(--line)', fontSize: 11, fontWeight: 700, color: 'var(--amber)',
                          }}
                        >
                          {(fullName || user.email)[0]?.toUpperCase() ?? '?'}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        {fullName && <p className="truncate" style={{ margin: 0, fontSize: 12.5, fontWeight: 700 }}>{fullName}</p>}
                        <p className="truncate" style={{ margin: fullName ? '3px 0 0' : 0, fontSize: 11, color: 'var(--muted-2)' }}>{user.email}</p>
                      </div>
                      {isSelected && (
                        <span className="shrink-0" style={{ fontSize: 11, fontWeight: 700, color: 'var(--amber)' }}>Selected</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {error && <p style={{ margin: '12px 0 0', fontSize: 11.5, color: 'var(--red)' }}>{error}</p>}

            <div className="flex gap-3" style={{ marginTop: 20 }}>
              <button type="button" onClick={onClose} className="btn-g" style={{ flex: 1 }}>
                Cancel
              </button>
              <button
                onClick={handleAddExisting}
                disabled={loading || !selectedUser}
                className={loading || !selectedUser ? 'btn-d' : 'btn-a'}
                style={{ flex: 1 }}
              >
                {loading ? 'Adding...' : 'Add Member'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleInvite}>
            <div className="field" style={{ marginBottom: 16 }}>
              <label>DISPLAY NAME</label>
              <input
                type="text"
                value={inviteDisplayName}
                onChange={e => setInviteDisplayName(e.target.value)}
                placeholder="John Doe"
                required
                style={inputBox}
              />
            </div>
            <div className="field">
              <label>EMAIL</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="john@example.com"
                required
                style={inputBox}
              />
            </div>

            {error && <p style={{ margin: '12px 0 0', fontSize: 11.5, color: 'var(--red)' }}>{error}</p>}

            <div className="flex gap-3" style={{ marginTop: 20 }}>
              <button type="button" onClick={onClose} className="btn-g" style={{ flex: 1 }}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={loading ? 'btn-d' : 'btn-a'}
                style={{ flex: 1 }}
              >
                {loading ? 'Inviting...' : 'Send Invite'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
