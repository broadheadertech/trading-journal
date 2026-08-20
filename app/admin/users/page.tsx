'use client';

import { useEffect, useMemo, useState } from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { useAdminUsers, useAdminUserActions } from '@/hooks/useAdminStore';
import AdminUserDetail from '@/components/admin/AdminUserDetail';

type ClerkInfo = { firstName: string; lastName: string; email: string };

export default function AdminUsersPage() {
  const users = useAdminUsers();
  const { banUser, unbanUser, overridePlan, resetUserData } = useAdminUserActions();
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [clerkById, setClerkById] = useState<Record<string, ClerkInfo>>({});

  type User = NonNullable<typeof users>[number];

  // Fetch Clerk profile data (name + email) for the loaded users
  useEffect(() => {
    if (!users || users.length === 0) return;
    const ids = users.map((u: User) => u.userId);
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/clerk/users-by-ids', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userIds: ids }),
        });
        if (!res.ok) return;
        const data = await res.json() as { users: { id: string; firstName: string; lastName: string; email: string }[] };
        if (cancelled) return;
        const map: Record<string, ClerkInfo> = {};
        for (const u of data.users) map[u.id] = { firstName: u.firstName, lastName: u.lastName, email: u.email };
        setClerkById(map);
      } catch {
        // silent — name column will fall back to "—"
      }
    })();
    return () => { cancelled = true; };
  }, [users]);

  const displayName = useMemo(() => (uid: string): string => {
    const info = clerkById[uid];
    if (!info) return '';
    const full = `${info.firstName} ${info.lastName}`.trim();
    return full || info.email || '';
  }, [clerkById]);

  const filtered = users?.filter((u: User) => {
    const q = search.toLowerCase();
    if (!q) return true;
    if (u.userId.toLowerCase().includes(q)) return true;
    const name = displayName(u.userId).toLowerCase();
    if (name.includes(q)) return true;
    const email = clerkById[u.userId]?.email?.toLowerCase() ?? '';
    if (email.includes(q)) return true;
    return false;
  });

  return (
    <div style={{ maxWidth: 1180 }}>
      <div className="phead" style={{ marginBottom: 24 }}>
        <p className="eyebrow" style={{ margin: '0 0 12px' }}>Accounts</p>
        <h2 style={{ fontSize: 34, lineHeight: '38px' }}>Users</h2>
        <p className="sub" style={{ marginTop: 14, fontSize: 14.5 }}>
          {users ? `${users.length} registered user${users.length !== 1 ? 's' : ''}` : 'Loading...'}
        </p>
      </div>

      {/* Search */}
      <div className="field" style={{ maxWidth: 420 }}>
        <label>SEARCH</label>
        <div className="box" style={{ gap: 12 }}>
          <MagnifyingGlass size={14} style={{ color: 'var(--muted-3)', flex: 'none' }} />
          <input
            type="text"
            placeholder="Search by name, email, or user ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1, minWidth: 0, height: '100%', border: 0, outline: 'none',
              background: 'transparent', fontSize: 13, color: 'var(--text)',
            }}
          />
        </div>
      </div>

      {/* Table */}
      {!filtered ? (
        <div className="animate-pulse" style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{ height: 44, background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: 2 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="empty-line">No users found.</p>
      ) : (
        <div className="card" style={{ marginTop: 24, padding: '19px 22px 12px' }}>
          <span className="accent" style={{ width: 56, background: 'var(--teal)' }} />
          <div className="overflow-x-auto" style={{ marginTop: 4 }}>
            <table className="w-full">
              <thead>
                <tr style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--muted-2)' }}>
                  <th className="text-left" style={{ padding: '0 16px 10px 0' }}>Name</th>
                  <th className="text-left" style={{ padding: '0 16px 10px 0' }}>User ID</th>
                  <th className="text-center" style={{ padding: '0 16px 10px' }}>Status</th>
                  <th className="text-right" style={{ padding: '0 16px 10px' }}>Trades</th>
                  <th className="text-right" style={{ padding: '0 16px 10px' }}>Capital</th>
                  <th className="text-left" style={{ padding: '0 16px 10px' }}>Last Active</th>
                  <th className="text-left" style={{ padding: '0 0 10px 16px' }}>Signed Up</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u: User) => {
                  const info = clerkById[u.userId];
                  const fullName = info ? `${info.firstName} ${info.lastName}`.trim() : '';
                  return (
                  <tr
                    key={u.userId}
                    onClick={() => setSelectedUserId(u.userId)}
                    className="cursor-pointer"
                    style={{ borderTop: '1px solid var(--hair)' }}
                  >
                    <td style={{ padding: '11px 16px 11px 0', color: 'var(--text)' }}>
                      {info ? (
                        <div className="flex flex-col">
                          <span style={{ fontSize: 12.5, fontWeight: 700 }}>{fullName || '—'}</span>
                          {info.email && <span style={{ fontSize: 10.5, color: 'var(--muted-2)' }}>{info.email}</span>}
                        </div>
                      ) : (
                        <span style={{ fontSize: 12.5, color: 'var(--muted-3)' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '11px 16px 11px 0', fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--text-2)' }}>
                      {u.userId.slice(0, 16)}...
                    </td>
                    <td className="text-center" style={{ padding: '11px 16px' }}>
                      {u.isBanned ? (
                        <span className="chip" style={{ height: 22, padding: '0 10px', fontSize: 10.5, color: 'var(--red)', borderColor: '#3a1218' }}>
                          Banned
                        </span>
                      ) : (
                        <span className="chip" style={{ height: 22, padding: '0 10px', fontSize: 10.5, color: 'var(--green)' }}>
                          Active
                        </span>
                      )}
                    </td>
                    <td className="text-right" style={{ padding: '11px 16px', fontFamily: 'var(--mono)', fontSize: 12.5, color: 'var(--text)' }}>{u.tradeCount}</td>
                    <td className="text-right" style={{ padding: '11px 16px', fontFamily: 'var(--mono)', fontSize: 12.5, color: 'var(--text)' }}>
                      {u.currency} {u.initialCapital.toLocaleString()}
                    </td>
                    <td style={{ padding: '11px 16px', fontSize: 12, color: 'var(--muted)' }}>
                      {u.lastActive ? new Date(u.lastActive).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '11px 0 11px 16px', fontSize: 12, color: 'var(--muted)' }}>
                      {new Date(u.signedUp).toLocaleDateString()}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selectedUserId && (
        <AdminUserDetail
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onBan={(uid, reason) => banUser({ userId: uid, reason })}
          onUnban={(uid) => unbanUser({ userId: uid })}
          onOverridePlan={(uid, planId) => overridePlan({ userId: uid, planId })}
          onResetData={(uid) => resetUserData({ userId: uid })}
        />
      )}
    </div>
  );
}
