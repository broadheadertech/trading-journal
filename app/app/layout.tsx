import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PsychSync - Dashboard',
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
