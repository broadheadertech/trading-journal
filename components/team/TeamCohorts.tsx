'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Plus, X, Layers, MoreHorizontal, ChevronDown } from 'lucide-react';
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

interface TeamCohortsProps {
  workspaceId: string;
  memberStats: MemberStat[];
  members: WorkspaceMember[];
  myRole: string;
}

export default function TeamCohorts({ workspaceId, memberStats, members, myRole }: TeamCohortsProps) {
  const cohorts = useQuery(api.workspaces.getCohorts, { workspaceId });
  const createCohort = useMutation(api.workspaces.createCohort);
  const addCohortMember = useMutation(api.workspaces.addCohortMember);
  const removeCohortMember = useMutation(api.workspaces.removeCohortMember);
  const deleteCohort = useMutation(api.workspaces.deleteCohort);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');

  const canManage = myRole === 'owner' || myRole === 'admin' || myRole === 'coach';

  const handleCreate = async () => {
    if (!newName.trim() || !newCode.trim()) return;
    try {
      await createCohort({ workspaceId, name: newName.trim(), code: newCode.trim().toUpperCase() });
      setNewName('');
      setNewCode('');
      setShowCreateForm(false);
    } catch { /* */ }
  };

  const handleDelete = async (cohortId: string) => {
    if (!confirm('Delete this cohort?')) return;
    await deleteCohort({ workspaceId, cohortId });
  };

  const cohortList = cohorts ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Cohorts</h2>
          <p className="text-sm text-[var(--muted-foreground)]">{cohortList.length} cohort{cohortList.length !== 1 ? 's' : ''}</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl text-sm font-semibold transition-colors"
          >
            <Plus size={16} />
            New Cohort
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-end">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5 block">
                Cohort Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Alpha Futures"
                className="w-full px-3 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5 block">
                Code
              </label>
              <input
                type="text"
                value={newCode}
                onChange={e => setNewCode(e.target.value)}
                placeholder="ALPHA-2025"
                className="w-full px-3 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm outline-none focus:border-[var(--accent)] max-w-[160px]"
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || !newCode.trim()}
              className="px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
            >
              Create
            </button>
            <button
              onClick={() => { setShowCreateForm(false); setNewName(''); setNewCode(''); }}
              className="p-2.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Cohort cards */}
      <div className="space-y-4">
        {cohortList.length === 0 && !showCreateForm && (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-12 text-center">
            <Layers size={32} className="mx-auto text-[var(--muted-foreground)] mb-3" />
            <p className="text-sm text-[var(--muted-foreground)]">No cohorts yet. Create one to group your students.</p>
          </div>
        )}

        {cohortList.map(cohort => (
          <CohortCard
            key={cohort.id}
            cohort={cohort}
            workspaceId={workspaceId}
            memberStats={memberStats}
            members={members}
            canManage={canManage}
            onAddMember={(userId) => addCohortMember({ workspaceId, cohortId: cohort.id, userId })}
            onRemoveMember={(userId) => removeCohortMember({ workspaceId, cohortId: cohort.id, userId })}
            onDelete={() => handleDelete(cohort.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface CohortCardProps {
  cohort: { id: string; name: string; code: string; memberUserIds: string[] };
  workspaceId: string;
  memberStats: MemberStat[];
  members: WorkspaceMember[];
  canManage: boolean;
  onAddMember: (userId: string) => void;
  onRemoveMember: (userId: string) => void;
  onDelete: () => void;
}

function CohortCard({ cohort, memberStats, members, canManage, onAddMember, onRemoveMember, onDelete }: CohortCardProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const cohortStats = useMemo(() => {
    const cohortMembers = memberStats.filter(m => cohort.memberUserIds.includes(m.userId));
    const totalPnL = cohortMembers.reduce((sum, m) => sum + m.totalPnL, 0);
    const avgCompliance = cohortMembers.length > 0
      ? cohortMembers.reduce((sum, m) => sum + m.compliance, 0) / cohortMembers.length
      : 0;
    const avgWinRate = cohortMembers.length > 0
      ? cohortMembers.reduce((sum, m) => sum + m.winRate, 0) / cohortMembers.length
      : 0;
    const totalTrades = cohortMembers.reduce((sum, m) => sum + m.totalTrades, 0);
    return { totalPnL, avgCompliance, avgWinRate, totalTrades, count: cohortMembers.length };
  }, [cohort.memberUserIds, memberStats]);

  const cohortMemberDetails = members.filter(m => cohort.memberUserIds.includes(m.userId));
  const availableMembers = members.filter(m => !cohort.memberUserIds.includes(m.userId));

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
      {/* Cohort header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[var(--accent)]/15 flex items-center justify-center">
            <Layers size={18} className="text-[var(--accent)]" />
          </div>
          <div>
            <h3 className="font-bold">{cohort.name}</h3>
            <p className="text-[11px] text-[var(--muted-foreground)]">{cohort.code}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--muted-foreground)]">{cohortStats.count} members</span>
          {canManage && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1.5 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors"
              >
                <MoreHorizontal size={16} />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-xl py-1 min-w-[120px]">
                    <button
                      onClick={() => { setMenuOpen(false); onDelete(); }}
                      className="w-full px-3 py-2 text-left text-xs text-red-400 hover:bg-red-500/10"
                    >
                      Delete Cohort
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--muted-foreground)] hover:text-red-400 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        <div className="text-center">
          <p className={cn('text-lg font-bold', cohortStats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400')}>
            {cohortStats.totalPnL >= 0 ? '+' : '-'}${Math.abs(cohortStats.totalPnL).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          <p className="text-[10px] text-[var(--muted-foreground)]">P&L</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold">{Math.round(cohortStats.avgCompliance)}%</p>
          <p className="text-[10px] text-[var(--muted-foreground)]">Compliance</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold">{Math.round(cohortStats.avgWinRate)}%</p>
          <p className="text-[10px] text-[var(--muted-foreground)]">Win Rate</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold">{cohortStats.totalTrades}</p>
          <p className="text-[10px] text-[var(--muted-foreground)]">Trades</p>
        </div>
      </div>

      {/* Members section */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">Members</p>

        {cohortMemberDetails.length > 0 && (
          <div className="space-y-1.5 mb-3">
            {cohortMemberDetails.map(m => (
              <div key={m.userId} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-[var(--muted)]/50">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-[10px] font-bold text-[var(--accent)]">
                    {m.displayName[0]?.toUpperCase() ?? '?'}
                  </div>
                  <span className="text-sm">{m.displayName}</span>
                </div>
                {canManage && (
                  <button
                    onClick={() => onRemoveMember(m.userId)}
                    className="p-1 text-[var(--muted-foreground)] hover:text-red-400 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add member dropdown */}
        {canManage && (
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full flex items-center justify-between px-3 py-2 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm text-[var(--muted-foreground)]"
            >
              <span>+ Add member...</span>
              <ChevronDown size={14} />
            </button>
            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-xl py-1 max-h-48 overflow-y-auto">
                  <div className="px-3 py-2 text-xs font-semibold text-[var(--accent)] bg-[var(--accent)]/10">
                    + Add member...
                  </div>
                  {availableMembers.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-[var(--muted-foreground)]">
                      No available members
                    </div>
                  ) : (
                    availableMembers.map(m => (
                      <button
                        key={m.userId}
                        onClick={() => { onAddMember(m.userId); setDropdownOpen(false); }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--muted)] transition-colors"
                      >
                        {m.displayName}
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
