'use client';

import { useUser } from '@clerk/nextjs';
import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import AdminSidebar from './AdminSidebar';
import BrainMascot from '@/components/BrainMascot';

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="atlas-dash h-dvh flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <BrainMascot size={48} glow beat />
      </div>
    );
  }

  const adminId = process.env.NEXT_PUBLIC_ADMIN_USER_ID;
  const isAdmin = user?.id === adminId;

  if (!isAdmin) {
    return (
      <div className="atlas-dash h-dvh flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="blank" style={{ width: 'min(420px, 90vw)', padding: '52px 32px' }}>
          <span className="corner" style={{ left: -1, top: -1, borderRight: 0, borderBottom: 0 }} />
          <span className="corner" style={{ right: -1, bottom: -1, borderLeft: 0, borderTop: 0 }} />
          <div
            className="badge"
            style={{ border: '1px solid rgba(255,77,94,.4)', background: 'var(--panel-2)' }}
          >
            <ShieldAlert size={22} style={{ color: 'var(--red)' }} />
          </div>
          <h4>Access Denied</h4>
          <p>You don&apos;t have permission to access the admin panel.</p>
          <Link href="/" className="btn-a" style={{ marginTop: 26 }}>
            <ArrowLeft size={14} />
            Back to App
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="atlas-dash h-dvh flex" style={{ background: 'var(--bg)' }}>
      <AdminSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Admin header */}
        <header
          className="shrink-0 flex items-center justify-between"
          style={{
            height: 'var(--top)',
            padding: '0 24px',
            background: 'var(--bg)',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <div>
            <p className="lbl b95" style={{ margin: 0 }}>BACK OFFICE</p>
            <h1
              style={{
                margin: '6px 0 0',
                fontFamily: 'var(--display)',
                fontWeight: 700,
                fontSize: 14,
                lineHeight: '17px',
                color: 'var(--text)',
              }}
            >
              Atlas Admin
            </h1>
          </div>
          <div className="flex items-center" style={{ gap: 18 }}>
            <Link
              href="/"
              className="flex items-center"
              style={{ gap: 8, fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}
            >
              <ArrowLeft size={13} />
              Back to App
            </Link>
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto" style={{ padding: '32px 40px 64px' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
