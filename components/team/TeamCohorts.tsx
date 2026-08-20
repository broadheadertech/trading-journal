'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Plus, X, Stack, DotsThree, CaretDown } from '@phosphor-icons/react';

// shared ATLAS input chrome (markup-level styling only)
const inputBox: React.CSSProperties = {
  width: '100%', height: 42, padding: '0 14px', borderRadius: 2,
  border: '1px solid var(--line)', background: 'var(--panel-2)',
  fontSize: 13, color: 'var(--text)', outline: 'none',
};

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
    <div>
      {/* Header */}
      <div className="phead pwrap" style={{ marginBottom: 24 }}>
        <p className="eyebrow" style={{ margin: '0 0 12px' }}>Groups</p>
        <h2 style={{ fontSize: 34, lineHeight: '38px' }}>Cohorts</h2>
        <p className="sub" style={{ marginTop: 14, fontSize: 14.5 }}>
          {cohortList.length} cohort{cohortList.length !== 1 ? 's' : ''} in this workspace
        </p>
        {canManage && (
          <div className="actions">
            <button onClick={() => setShowCreateForm(true)} className="btn-a" style={{ height: 44 }}>
              <Plus size={14} />
              New Cohort
            </button>
          </div>
        )}
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
          <h3>New Cohort</h3>
          <p className="sub">Name and code for the new group</p>
          <div className="flex items-end gap-3 flex-wrap" style={{ marginTop: 18 }}>
            <div className="field" style={{ flex: '1 1 220px', minWidth: 200 }}>
              <label>COHORT NAME</label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Alpha Futures"
                style={inputBox}
              />
            </div>
            <div className="field" style={{ width: 180 }}>
              <label>CODE</label>
              <input
                type="text"
                value={newCode}
                onChange={e => setNewCode(e.target.value)}
                placeholder="ALPHA-2025"
                style={inputBox}
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || !newCode.trim()}
              className={!newName.trim() || !newCode.trim() ? 'btn-d' : 'btn-a'}
              style={{ height: 42 }}
            >
              Create
            </button>
            <button
              onClick={() => { setShowCreateForm(false); setNewName(''); setNewCode(''); }}
              className="flex items-center justify-center"
              style={{ width: 42, height: 42, borderRadius: 2, border: '1px solid var(--line-2)', color: 'var(--muted)' }}
              title="Cancel"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Cohort cards */}
      <div className="flex flex-col gap-4">
        {cohortList.length === 0 && !showCreateForm && (
          <div className="blank" style={{ padding: '48px 32px' }}>
            <span className="corner" style={{ left: 0, top: 0, borderRight: 0, borderBottom: 0 }} />
            <span className="corner" style={{ right: 0, top: 0, borderLeft: 0, borderBottom: 0 }} />
            <span className="corner" style={{ left: 0, bottom: 0, borderRight: 0, borderTop: 0 }} />
            <span className="corner" style={{ right: 0, bottom: 0, borderLeft: 0, borderTop: 0 }} />
            <span className="badge" style={{ border: '1px solid var(--line-2)', color: 'var(--amber)', marginBottom: 20 }}>
              <Stack size={22} />
            </span>
            <h4>No cohorts yet</h4>
            <p>Create one to group your students.</p>
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
    <div className="card">
      <span className="accent" style={{ width: 56, background: 'var(--teal)' }} />

      {/* Cohort header */}
      <div className="cardhead">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center shrink-0"
            style={{
              width: 32, height: 32, borderRadius: 2, background: 'var(--panel-2)',
              border: '1px solid var(--line)', color: 'var(--amber)',
            }}
          >
            <Stack size={16} />
          </div>
          <div>
            <h3>{cohort.name}</h3>
            <p className="sub" style={{ marginTop: 5, fontFamily: 'var(--mono)' }}>{cohort.code}</p>
          </div>
        </div>
        <div className="flex items-center gap-2" style={{ marginLeft: 'auto' }}>
          <span className="chip" style={{ height: 26, padding: '0 10px', fontSize: 11 }}>
            {cohortStats.count} members
          </span>
          {canManage && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center justify-center"
                style={{ width: 28, height: 28, borderRadius: 2, border: '1px solid var(--line-2)', color: 'var(--muted)' }}
              >
                <DotsThree size={15} />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div
                    className="absolute right-0 top-full z-50"
                    style={{
                      marginTop: 6, minWidth: 140, borderRadius: 2,
                      border: '1px solid var(--line-2)', background: '#080d14',
                    }}
                  >
                    <button
                      onClick={() => { setMenuOpen(false); onDelete(); }}
                      className="w-full text-left"
                      style={{ padding: '9px 12px', fontSize: 12, fontWeight: 700, color: 'var(--red)' }}
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
            className="flex items-center justify-center"
            style={{ width: 28, height: 28, borderRadius: 2, border: '1px solid var(--line-2)', color: 'var(--red)' }}
            title="Delete cohort"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" style={{ marginTop: 20 }}>
        <div className="inset">
          <p className="lbl">P&amp;L</p>
          <p style={{
            margin: '7px 0 0', fontFamily: 'var(--mono)', fontSize: 18, lineHeight: '22px',
            color: cohortStats.totalPnL >= 0 ? 'var(--green)' : 'var(--red)',
          }}>
            {cohortStats.totalPnL >= 0 ? '+' : '-'}${Math.abs(cohortStats.totalPnL).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="inset">
          <p className="lbl">COMPLIANCE</p>
          <p style={{ margin: '7px 0 0', fontFamily: 'var(--mono)', fontSize: 18, lineHeight: '22px' }}>
            {Math.round(cohortStats.avgCompliance)}%
          </p>
        </div>
        <div className="inset">
          <p className="lbl">WIN RATE</p>
          <p style={{ margin: '7px 0 0', fontFamily: 'var(--mono)', fontSize: 18, lineHeight: '22px' }}>
            {Math.round(cohortStats.avgWinRate)}%
          </p>
        </div>
        <div className="inset">
          <p className="lbl">TRADES</p>
          <p style={{ margin: '7px 0 0', fontFamily: 'var(--mono)', fontSize: 18, lineHeight: '22px' }}>
            {cohortStats.totalTrades}
          </p>
        </div>
      </div>

      {/* Members section */}
      <div style={{ marginTop: 22 }}>
        <p className="lbl">MEMBERS</p>

        {cohortMemberDetails.length > 0 && (
          <div style={{ marginTop: 10, marginBottom: 14 }}>
            {cohortMemberDetails.map(m => (
              <div key={m.userId} className="mrow">
                <div
                  className="flex items-center justify-center shrink-0"
                  style={{
                    width: 24, height: 24, borderRadius: 2, background: 'var(--panel-2)',
                    border: '1px solid var(--line)', fontSize: 10, fontWeight: 700, color: 'var(--amber)',
                  }}
                >
                  {m.displayName[0]?.toUpperCase() ?? '?'}
                </div>
                <span className="lb" style={{ marginLeft: 12 }}>{m.displayName}</span>
                {canManage && (
                  <button
                    onClick={() => onRemoveMember(m.userId)}
                    className="flex items-center justify-center"
                    style={{ marginLeft: 'auto', width: 24, height: 24, borderRadius: 2, border: '1px solid var(--line-2)', color: 'var(--red)' }}
                    title="Remove from cohort"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add member dropdown */}
        {canManage && (
          <div className="relative" style={{ marginTop: 12 }}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full flex items-center justify-between"
              style={{
                height: 38, padding: '0 14px', borderRadius: 2,
                border: '1px solid var(--line)', background: 'var(--panel-2)',
                fontSize: 12.5, color: 'var(--muted)',
              }}
            >
              <span>+ Add member...</span>
              <CaretDown size={14} />
            </button>
            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                <div
                  className="absolute left-0 right-0 top-full z-50"
                  style={{
                    marginTop: 6, maxHeight: 200, overflowY: 'auto', borderRadius: 2,
                    border: '1px solid var(--line-2)', background: '#080d14',
                  }}
                >
                  <div className="lbl" style={{ padding: '10px 12px', color: 'var(--amber)', borderBottom: '1px solid var(--hair)' }}>
                    ADD MEMBER
                  </div>
                  {availableMembers.length === 0 ? (
                    <p className="empty-line" style={{ padding: '18px 0', fontSize: 12.5 }}>
                      No available members
                    </p>
                  ) : (
                    availableMembers.map(m => (
                      <button
                        key={m.userId}
                        onClick={() => { onAddMember(m.userId); setDropdownOpen(false); }}
                        className="w-full text-left"
                        style={{ padding: '9px 12px', fontSize: 12.5, color: 'var(--text-2)', borderBottom: '1px solid var(--hair)' }}
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
