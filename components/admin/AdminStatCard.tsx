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
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-[var(--accent)]/10">
          <Icon size={20} className="text-[var(--accent)]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
          <p className="text-xl font-bold text-[var(--foreground)]">{value}</p>
          {subtitle && (
            <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}
