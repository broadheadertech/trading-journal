'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, AlertTriangle, TrendingUp,
  Flame, HeartPulse, ShieldAlert, Star,
} from 'lucide-react';
import type { CoachingMessage, CoachingCategory } from '@/lib/types';

// ─── Category Visual Config ────────────────────────────────────────

const CATEGORY_CONFIG: Record<CoachingCategory, {
  icon: typeof Trophy;
  color: string;
  glow: string;
  label: string;
}> = {
  reinforcement: {
    icon: Trophy,
    color: '#34d399',
    glow: 'rgba(52,211,153,0.2)',
    label: 'Great execution',
  },
  encouragement: {
    icon: TrendingUp,
    color: '#60a5fa',
    glow: 'rgba(96,165,250,0.2)',
    label: 'Keep improving',
  },
  correction: {
    icon: AlertTriangle,
    color: '#f87171',
    glow: 'rgba(248,113,113,0.2)',
    label: 'Needs attention',
  },
  streak: {
    icon: Flame,
    color: '#fbbf24',
    glow: 'rgba(251,191,36,0.2)',
    label: 'Streak bonus',
  },
  recovery: {
    icon: HeartPulse,
    color: '#a78bfa',
    glow: 'rgba(167,139,250,0.2)',
    label: 'Recovery mode',
  },
  anti_gaming: {
    icon: ShieldAlert,
    color: '#fb923c',
    glow: 'rgba(251,146,60,0.2)',
    label: 'Flagged',
  },
  transition: {
    icon: Star,
    color: '#e879f9',
    glow: 'rgba(232,121,249,0.25)',
    label: 'Stage transition',
  },
};

// ─── Component ─────────────────────────────────────────────────────

interface BrainCoachingCardProps {
  coaching: CoachingMessage | null | undefined;
  className?: string;
}

export default function BrainCoachingCard({ coaching, className = '' }: BrainCoachingCardProps) {
  return (
    <AnimatePresence mode="wait">
      {coaching && (
        <motion.div
          key={coaching.timestamp}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className={className}
          role="status"
          aria-live="polite"
        >
          <CoachingContent coaching={coaching} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CoachingContent({ coaching }: { coaching: CoachingMessage }) {
  const config = CATEGORY_CONFIG[coaching.category];
  const Icon = config.icon;

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-xl backdrop-blur-md border max-w-xl mx-auto"
      style={{
        background: 'rgba(5,5,16,0.7)',
        borderColor: `${config.color}33`,
        boxShadow: `0 0 20px ${config.glow}`,
      }}
    >
      <div
        className="flex-shrink-0 mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: `${config.color}15` }}
      >
        <Icon size={16} style={{ color: config.color }} aria-hidden="true" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: config.color }}>
            {config.label}
          </span>
        </div>
        <p className="text-sm text-white/85 leading-relaxed">
          {coaching.message}
        </p>
        <p className="text-[9px] text-white/25 mt-1.5 italic" aria-label="Disclaimer">
          {coaching.disclaimer}
        </p>
      </div>
    </div>
  );
}
