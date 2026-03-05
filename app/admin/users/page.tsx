'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { useAdminUsers, useAdminUserActions } from '@/hooks/useAdminStore';
import AdminUserDetail from '@/components/admin/AdminUserDetail';

export default function AdminUsersPage() {
  const users = useAdminUsers();
  const { banUser, unbanUser, overridePlan, resetUserData } = useAdminUserActions();
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  type User = NonNullable<typeof users>[number];
  const filtered = users?.filter((u: User) =>
    u.userId.toLowerCase().includes(search.toLowerCase())
  );

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
          placeholder="Search by user ID..."
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
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-[var(--muted-foreground)]">User ID</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-[var(--muted-foreground)]">Status</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-[var(--muted-foreground)]">Trades</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-[var(--muted-foreground)]">Capital</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-[var(--muted-foreground)]">Last Active</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-[var(--muted-foreground)]">Signed Up</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u: User) => (
                  <tr
                    key={u.userId}
                    onClick={() => setSelectedUserId(u.userId)}
                    className="border-t border-[var(--border)] hover:bg-[var(--card-hover)] cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-2.5 text-xs text-[var(--foreground)]">
                      {u.userId.slice(0, 16)}...
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {u.isBanned ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[var(--red)]/10 text-[var(--red)]">
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
                ))}
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
