'use client';

interface UsageBarProps {
  label: string;
  current: number;
  max: number;
  isUnlimited: boolean;
}

function getColor(percentage: number): string {
  if (percentage >= 95) return 'var(--red)';
  if (percentage >= 80) return 'var(--yellow)';
  if (percentage >= 60) return 'var(--yellow)';
  return 'var(--green)';
}

export default function UsageBar({ label, current, max, isUnlimited }: UsageBarProps) {
  const percentage = isUnlimited ? 0 : max > 0 ? Math.min(Math.round((current / max) * 100), 100) : 0;
  const color = getColor(percentage);

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-[var(--muted-foreground)]">{label}</span>
        <span className="font-medium text-[var(--foreground)]">
          {isUnlimited ? (
            <span className="text-[var(--green)]">{current} / &infin;</span>
          ) : (
            <span style={{ color: percentage >= 80 ? color : undefined }}>
              {current} / {max}
            </span>
          )}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-2 rounded-full bg-[var(--muted)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${percentage}%`, backgroundColor: color }}
          />
        </div>
      )}
    </div>
  );
}
