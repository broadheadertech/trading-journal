'use client';

import { type LucideIcon } from 'lucide-react';

interface AdminStatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subtitle?: string;
}

export default function AdminStatCard({ icon: Icon, label, value, subtitle }: AdminStatCardProps) {
  return (
    <div className="stat" style={{ height: 'auto', minHeight: 104 }}>
      <span className="accent" style={{ background: 'var(--amber)' }} />
      <div className="flex items-center" style={{ gap: 8 }}>
        <Icon size={13} style={{ color: 'var(--muted-3)', flex: 'none' }} />
        <b style={{ textTransform: 'uppercase' }}>{label}</b>
      </div>
      <em style={{ fontSize: 24, lineHeight: '32px', color: 'var(--text)' }}>{value}</em>
      {subtitle && (
        <small style={{ display: 'block', marginTop: 6, fontSize: 10.5, color: 'var(--muted-2)' }}>{subtitle}</small>
      )}
    </div>
  );
}
