'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
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
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-xl font-bold text-[var(--foreground)]">Users</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {users ? `${users.length} registered user${users.length !== 1 ? 's' : ''}` : 'Loading...'}
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
        <input
          type="text"
          placeholder="Search by name, email, or user ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--input-bg)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
        />
      </div>

      {/* Table */}
      {!filtered ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-[var(--muted)] rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)] py-8 text-center">No users found.</p>
      ) : (
        <div className="rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--muted)]">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-[var(--muted-foreground)]">Name</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-[var(--muted-foreground)]">User ID</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-[var(--muted-foreground)]">Status</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-[var(--muted-foreground)]">Trades</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-[var(--muted-foreground)]">Capital</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-[var(--muted-foreground)]">Last Active</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-[var(--muted-foreground)]">Signed Up</th>
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
                    className="border-t border-[var(--border)] hover:bg-[var(--card-hover)] cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-2.5 text-[var(--foreground)]">
                      {info ? (
                        <div className="flex flex-col">
                          <span className="text-xs font-medium">{fullName || '—'}</span>
                          {info.email && <span className="text-[10px] text-[var(--muted-foreground)]">{info.email}</span>}
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--muted-foreground)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[var(--foreground)]">
                      {u.userId.slice(0, 16)}...
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {u.isBanned ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-500/10 text-amber-400">
                          Banned
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[var(--green)]/10 text-[var(--green)]">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right text-[var(--foreground)]">{u.tradeCount}</td>
                    <td className="px-4 py-2.5 text-right text-[var(--foreground)]">
                      {u.currency} {u.initialCapital.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-[var(--muted-foreground)]">
                      {u.lastActive ? new Date(u.lastActive).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-[var(--muted-foreground)]">
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
