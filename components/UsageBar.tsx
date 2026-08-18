'use client';

interface UsageBarProps {
  label: string;
  current: number;
  max: number;
  isUnlimited: boolean;
}

function getColor(percentage: number): string {
  if (percentage >= 95) return 'var(--red)';
  if (percentage >= 80) return 'var(--amber)';
  if (percentage >= 60) return 'var(--amber)';
  return 'var(--green)';
}

export default function UsageBar({ label, current, max, isUnlimited }: UsageBarProps) {
  const percentage = isUnlimited ? 0 : max > 0 ? Math.min(Math.round((current / max) * 100), 100) : 0;
  const color = getColor(percentage);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 10,
          marginBottom: 7,
        }}
      >
        <span
          className="lbl"
          style={{
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: '.04em',
            textTransform: 'uppercase',
            color: 'var(--muted-2)',
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontFamily: 'var(--mono)',
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 700,
            fontSize: 11.5,
            letterSpacing: '.02em',
            color: isUnlimited ? 'var(--green)' : percentage >= 80 ? color : 'var(--text)',
          }}
        >
          {isUnlimited ? (
            <>{current} / &infin;</>
          ) : (
            <>
              {current} / {max}
            </>
          )}
        </span>
      </div>
      {!isUnlimited && (
        <div style={{ height: 2, background: 'var(--rail)', position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: `${percentage}%`,
              background: color,
              transition: 'width .3s ease',
            }}
          />
        </div>
      )}
    </div>
  );
}
