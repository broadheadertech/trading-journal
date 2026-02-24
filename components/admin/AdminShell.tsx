'use client';

import { useUser } from '@clerk/nextjs';
import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import AdminSidebar from './AdminSidebar';

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="h-dvh flex items-center justify-center bg-[var(--background)]">
        <div className="animate-pulse text-[var(--muted-foreground)]">Loading...</div>
      </div>
    );
  }

  const adminId = process.env.NEXT_PUBLIC_ADMIN_USER_ID;
  const isAdmin = user?.id === adminId;

  if (!isAdmin) {
    return (
      <div className="h-dvh flex items-center justify-center bg-[var(--background)]">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-[var(--red)]/10 flex items-center justify-center">
            <ShieldAlert size={32} className="text-[var(--red)]" />
          </div>
          <h1 className="text-xl font-bold text-[var(--foreground)]">Access Denied</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            You don&apos;t have permission to access the admin panel.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors"
          >
            <ArrowLeft size={16} />
            Back to App
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh flex bg-[var(--background)]">
      <AdminSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Admin header */}
        <header className="shrink-0 h-14 border-b border-[var(--border)] bg-[var(--card)] flex items-center justify-between px-6">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Back Office</h2>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              <ArrowLeft size={14} />
              Back to App
            </Link>
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
