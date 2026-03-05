'use client';

import { useState, useMemo } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import {
  Search, UserPlus, ChevronDown, ChevronUp, Ban, X as XIcon,
} from 'lucide-react';
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

function RiskBadge({ level }: { level: 'low' | 'medium' | 'high' }) {
  const styles = {
    low: 'bg-green-500/15 text-green-400',
    medium: 'bg-yellow-500/15 text-yellow-400',
    high: 'bg-red-500/15 text-red-400',
  };
  return (
    <span className={`px-2.5 py-1 rounded-md text-[11px] font-semibold capitalize ${styles[level]}`}>
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </span>
  );
}

function SortIcon({ field, current, dir }: { field: SortField; current: SortField; dir: SortDir }) {
  if (field !== current) {
    return (
      <span className="inline-flex flex-col ml-1 opacity-30">
        <ChevronUp size={10} />
        <ChevronDown size={10} className="-mt-1" />
      </span>
    );
  }
  return dir === 'asc'
    ? <ChevronUp size={12} className="ml-1" />
    : <ChevronDown size={12} className="ml-1" />;
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Members</h2>
          <p className="text-sm text-[var(--muted-foreground)]">{enrichedMembers.length} members total</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl text-sm font-semibold transition-colors"
          >
            <UserPlus size={16} />
            Add Member
          </button>
        )}
      </div>

      {/* Search + role filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-2 bg-[var(--muted)] rounded-lg border border-[var(--border)] text-sm flex-1 max-w-md">
          <Search size={14} className="text-[var(--muted-foreground)] shrink-0" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent outline-none text-sm w-full"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {visibleFilters.map(f => (
            <button
              key={f.value}
              onClick={() => setRoleFilter(f.value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border',
                roleFilter === f.value
                  ? 'bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/30'
                  : 'text-[var(--muted-foreground)] border-[var(--border)] hover:text-[var(--foreground)]'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_0.8fr_0.8fr] gap-2 px-5 py-3 border-b border-[var(--border)] text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
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
          <div className="py-12 text-center">
            <p className="text-sm text-[var(--muted-foreground)]">
              {searchQuery || roleFilter !== 'all' ? 'No members match your filters.' : 'No members yet.'}
            </p>
          </div>
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
                  className={cn(
                    'grid grid-cols-[2fr_1fr_1fr_1fr_1fr_0.8fr_0.8fr] gap-2 px-5 py-3.5 items-center cursor-pointer transition-colors hover:bg-[var(--muted)]/50',
                    isExpanded && 'bg-[var(--muted)]/30'
                  )}
                >
                  {/* Name + email */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-sm font-bold text-[var(--accent)] shrink-0">
                      {member.displayName[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{member.displayName}</p>
                      <p className="text-[11px] text-[var(--muted-foreground)] truncate">{member.email}</p>
                    </div>
                  </div>

                  {/* Role */}
                  <span className="text-sm capitalize">{member.role}</span>

                  {/* Compliance */}
                  <span className="text-sm text-center">{Math.round(member.compliance)}%</span>

                  {/* P&L */}
                  <span className={cn(
                    'text-sm font-medium text-center',
                    member.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'
                  )}>
                    {member.totalPnL >= 0 ? '+' : '-'}${Math.abs(member.totalPnL).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>

                  {/* Win Rate */}
                  <span className="text-sm text-center">{Math.round(member.winRate)}%</span>

                  {/* Trades */}
                  <span className="text-sm text-center">{member.totalTrades}</span>

                  {/* Risk + actions */}
                  <div className="flex items-center justify-center gap-2">
                    <RiskBadge level={risk} />
                  </div>
                </div>

                {/* Expanded detail row */}
                {isExpanded && (
                  <div className="px-5 py-4 border-t border-[var(--border)] bg-[var(--muted)]/20">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                      <div>
                        <p className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider">Status</p>
                        <p className="text-sm font-semibold mt-0.5">Active</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider">Cohorts</p>
                        <p className="text-sm font-semibold mt-0.5">&mdash;</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider">Accounts</p>
                        <p className="text-sm font-semibold mt-0.5">0 linked</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider">Wins / Losses</p>
                        <p className="text-sm font-semibold mt-0.5">{wins} / {losses}</p>
                      </div>
                    </div>

                    {/* Actions row */}
                    {canManage && member.role !== 'owner' && (
                      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-[var(--border)]">
                        {/* Role selector */}
                        <select
                          defaultValue={member.role}
                          className="px-3 py-1.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-xs font-medium"
                          onClick={e => e.stopPropagation()}
                        >
                          <option value="admin">Admin</option>
                          <option value="coach">Coach</option>
                          <option value="member">Member</option>
                        </select>
                        <button
                          onClick={(e) => { e.stopPropagation(); }}
                          className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-yellow-400 hover:bg-yellow-500/10 transition-colors"
                          title="Ban member"
                        >
                          <Ban size={16} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemove(member.userId, member.displayName); }}
                          className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Remove member"
                        >
                          <XIcon size={16} />
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-[var(--muted)] transition-colors"
        >
          <XIcon size={18} className="text-[var(--muted-foreground)]" />
        </button>

        <h3 className="text-lg font-bold mb-4">Add Member</h3>

        {/* Tab switcher */}
        <div className="flex rounded-xl border border-[var(--border)] overflow-hidden mb-4">
          <button
            onClick={() => { setTab('existing'); setError(''); }}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-colors',
              tab === 'existing'
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            )}
          >
            <UserPlus size={14} />
            Add Existing User
          </button>
          <button
            onClick={() => { setTab('invite'); setError(''); }}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-colors',
              tab === 'invite'
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            )}
          >
            <Search size={14} />
            Invite
          </button>
        </div>

        {/* Role selector (shared) */}
        <div className="mb-4">
          <select
            value={role}
            onChange={e => setRole(e.target.value as 'admin' | 'coach' | 'member')}
            className="w-full px-3 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-xl text-sm outline-none focus:border-[var(--accent)] appearance-none cursor-pointer"
          >
            <option value="member">Member</option>
            <option value="coach">Coach</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {/* Tab content */}
        {tab === 'existing' ? (
          <div className="space-y-3">
            {/* Search input */}
            <div className="flex items-center gap-2 px-3 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-xl text-sm">
              <Search size={14} className="text-[var(--muted-foreground)] shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Search by username or email..."
                className="bg-transparent outline-none text-sm w-full"
                autoFocus
              />
            </div>

            {/* Search results */}
            {searchQuery.trim().length < 2 ? (
              <p className="text-center text-xs text-[var(--muted-foreground)] py-4">
                Type at least 2 characters to search
              </p>
            ) : searching ? (
              <p className="text-center text-xs text-[var(--muted-foreground)] py-4">
                Searching...
              </p>
            ) : searchResults.length === 0 ? (
              <p className="text-center text-xs text-[var(--muted-foreground)] py-4">
                No users found
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1">
                {searchResults.map(user => {
                  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
                  const isSelected = selectedUser?.id === user.id;
                  return (
                    <button
                      key={user.id}
                      onClick={() => setSelectedUser(isSelected ? null : user)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors',
                        isSelected
                          ? 'bg-[var(--accent)]/15 border border-[var(--accent)]/30'
                          : 'hover:bg-[var(--muted)] border border-transparent'
                      )}
                    >
                      {user.imageUrl ? (
                        <img src={user.imageUrl} alt="" className="w-8 h-8 rounded-full shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-xs font-bold text-[var(--accent)] shrink-0">
                          {(fullName || user.email)[0]?.toUpperCase() ?? '?'}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        {fullName && <p className="text-sm font-medium truncate">{fullName}</p>}
                        <p className="text-[11px] text-[var(--muted-foreground)] truncate">{user.email}</p>
                      </div>
                      {isSelected && (
                        <span className="text-[var(--accent)] text-xs font-semibold shrink-0">Selected</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {error && <p className="text-xs text-red-400">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 border border-[var(--border)] text-sm font-medium rounded-xl hover:bg-[var(--muted)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddExisting}
                disabled={loading || !selectedUser}
                className="flex-1 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Add Member'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleInvite} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Display Name</label>
              <input
                type="text"
                value={inviteDisplayName}
                onChange={e => setInviteDisplayName(e.target.value)}
                placeholder="John Doe"
                required
                className="w-full px-3 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-xl text-sm outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Email</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="john@example.com"
                required
                className="w-full px-3 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-xl text-sm outline-none focus:border-[var(--accent)]"
              />
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 border border-[var(--border)] text-sm font-medium rounded-xl hover:bg-[var(--muted)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
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
