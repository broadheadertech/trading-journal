'use client';

interface AdminPercentageBarProps {
  items: { label: string; value: number; percentage: number; color: string }[];
}

export default function AdminPercentageBar({ items }: AdminPercentageBarProps) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[var(--foreground)] font-medium">{item.label}</span>
            <span className="text-[var(--muted-foreground)]">
              {item.value} ({item.percentage}%)
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-[var(--muted)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
