'use client';

interface BrainMascotProps {
  size?: number;
  glow?: boolean;
  className?: string;
}

export default function BrainMascot({ size = 32, glow = false, className = '' }: BrainMascotProps) {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Glow backdrop */}
      {glow && (
        <div
          className="absolute rounded-full bg-indigo-500/20 blur-xl animate-pulse"
          style={{ width: size * 1.5, height: size * 1.5 }}
        />
      )}

      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative"
      >
        <defs>
          <linearGradient id="brain-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
          <linearGradient id="brain-inner" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>
        </defs>

        {/* Brain outer shape — left hemisphere */}
        <path
          d="M30 8C22 8 16 12 14 18C10 19 7 23 7 28C7 32 9 35 12 37C11 39 10 42 11 45C12 49 16 52 20 53C22 56 26 58 30 58C31 58 32 57.5 32 57.5"
          stroke="url(#brain-grad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Brain outer shape — right hemisphere */}
        <path
          d="M34 8C42 8 48 12 50 18C54 19 57 23 57 28C57 32 55 35 52 37C53 39 54 42 53 45C52 49 48 52 44 53C42 56 38 58 34 58C33 58 32 57.5 32 57.5"
          stroke="url(#brain-grad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Central fissure */}
        <line x1="32" y1="10" x2="32" y2="56" stroke="url(#brain-grad)" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.6" />

        {/* Left hemisphere folds */}
        <path d="M18 22C22 24 26 22 30 24" stroke="url(#brain-inner)" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.7" />
        <path d="M14 32C19 30 24 33 30 31" stroke="url(#brain-inner)" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.7" />
        <path d="M16 42C21 40 25 43 30 41" stroke="url(#brain-inner)" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.7" />

        {/* Right hemisphere folds */}
        <path d="M46 22C42 24 38 22 34 24" stroke="url(#brain-inner)" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.7" />
        <path d="M50 32C45 30 40 33 34 31" stroke="url(#brain-inner)" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.7" />
        <path d="M48 42C43 40 39 43 34 41" stroke="url(#brain-inner)" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.7" />

        {/* Neural nodes — connection points */}
        <circle cx="20" cy="18" r="2" fill="url(#brain-grad)" opacity="0.8" />
        <circle cx="44" cy="18" r="2" fill="url(#brain-grad)" opacity="0.8" />
        <circle cx="12" cy="32" r="2" fill="url(#brain-grad)" opacity="0.8" />
        <circle cx="52" cy="32" r="2" fill="url(#brain-grad)" opacity="0.8" />
        <circle cx="16" cy="46" r="1.5" fill="url(#brain-grad)" opacity="0.6" />
        <circle cx="48" cy="46" r="1.5" fill="url(#brain-grad)" opacity="0.6" />
        <circle cx="32" cy="14" r="1.5" fill="url(#brain-grad)" opacity="0.5" />
        <circle cx="32" cy="50" r="1.5" fill="url(#brain-grad)" opacity="0.5" />

        {/* Spark / unlock effect at top */}
        <path d="M28 4L30 7L32 4L34 7L36 4" stroke="#a855f7" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
      </svg>
    </div>
  );
}
