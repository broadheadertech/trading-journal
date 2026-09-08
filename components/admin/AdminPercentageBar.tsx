'use client';

interface AdminPercentageBarProps {
  items: { label: string; value: number; percentage: number; color: string }[];
}

export default function AdminPercentageBar({ items }: AdminPercentageBarProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {items.map((item) => (
        <div key={item.label}>
          <div className="flex justify-between items-baseline" style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{item.label}</span>
            <span style={{ fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 12.5, color: 'var(--text)' }}>
              {item.value} ({item.percentage}%)
            </span>
          </div>
          <div style={{ height: 2, background: 'var(--rail)', position: 'relative' }}>
            <div
              style={{
                position: 'absolute', left: 0, top: 0, bottom: 0,
                width: `${item.percentage}%`, background: item.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
