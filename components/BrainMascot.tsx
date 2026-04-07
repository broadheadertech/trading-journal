'use client';

import Image from 'next/image';

interface BrainMascotProps {
  size?: number;
  glow?: boolean;
  beat?: boolean;
  className?: string;
}

export default function BrainMascot({ size = 32, glow = false, beat = false, className = '' }: BrainMascotProps) {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {glow && (
        <div
          className={`absolute rounded-full blur-2xl ${beat ? 'animate-[heartbeat_1.4s_ease-in-out_infinite]' : 'animate-pulse'}`}
          style={{ width: size * 1.8, height: size * 1.8, background: 'radial-gradient(circle, rgba(45,148,132,0.55), rgba(45,148,132,0.20) 60%, transparent 80%)' }}
        />
      )}
      <Image
        src="/logo.png"
        alt="Tradia"
        width={size}
        height={size}
        className={`relative ${beat ? 'animate-[heartbeat_1.4s_ease-in-out_infinite]' : ''}`}
        priority
      />
      <style jsx>{`
        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          15%      { transform: scale(1.15); }
          30%      { transform: scale(1); }
          45%      { transform: scale(1.10); }
          60%      { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
