'use client';

interface AdminBarChartProps {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
}

export default function AdminBarChart({ data, color = 'var(--accent)', height = 160 }: AdminBarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {data.map((d) => {
        const barHeight = (d.value / maxValue) * 100;
        return (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] text-[var(--muted-foreground)]">{d.value}</span>
            <div
              className="w-full rounded-t-sm transition-all"
              style={{
                height: `${barHeight}%`,
                minHeight: d.value > 0 ? 4 : 0,
                backgroundColor: color,
                opacity: 0.8,
              }}
            />
            <span className="text-[9px] text-[var(--muted-foreground)] truncate w-full text-center">
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
