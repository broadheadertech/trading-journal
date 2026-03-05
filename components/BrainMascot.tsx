'use client';

import Image from 'next/image';

interface BrainMascotProps {
  size?: number;
  glow?: boolean;
  className?: string;
}

export default function BrainMascot({ size = 32, glow = false, className = '' }: BrainMascotProps) {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {glow && (
        <div
          className="absolute rounded-full blur-xl animate-pulse"
          style={{ width: size * 1.5, height: size * 1.5, background: 'rgba(45, 148, 132, 0.2)' }}
        />
      )}
      <Image
        src="/logo.png"
        alt="Tradia"
        width={size}
        height={size}
        className="relative"
        priority
      />
    </div>
  );
}
