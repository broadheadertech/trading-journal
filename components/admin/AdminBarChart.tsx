'use client';

interface AdminBarChartProps {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
}

export default function AdminBarChart({ data, color = 'var(--amber)', height = 160 }: AdminBarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex items-end" style={{ height, gap: 6 }}>
      {data.map((d) => {
        const barHeight = (d.value / maxValue) * 100;
        return (
          <div key={d.label} className="flex-1 flex flex-col items-center" style={{ gap: 5 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted-2)' }}>{d.value}</span>
            <div
              className="w-full"
              style={{
                height: `${barHeight}%`,
                minHeight: d.value > 0 ? 3 : 0,
                backgroundColor: color,
                borderRadius: 1,
                opacity: 0.85,
              }}
            />
            <span
              className="truncate w-full text-center"
              style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.03em', color: 'var(--muted-3)' }}
            >
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
