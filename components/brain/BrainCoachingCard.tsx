'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Medal, Warning, TrendUp,
  Fire, ShieldWarning, Star, Lightning, Sparkle,
} from '@phosphor-icons/react';
import { Heartbeat as HeartPulse } from '@phosphor-icons/react';
import type { CoachingMessage, CoachingCategory } from '@/lib/types';

// ─── Category Visual Config ────────────────────────────────────────

/* ── ATLAS raw tokens (brain dimension is position:fixed — see BrainMiniWidget) ── */
const T = {
  panel2: '#0c1119',
  line: '#182432',
  text2: '#9fb0c2',
  muted2: '#5c6b7e',
  muted3: '#4a5867',
};

const CATEGORY_CONFIG: Record<CoachingCategory, {
  icon: typeof Medal;
  color: string;
  glow: string;
  label: string;
}> = {
  reinforcement: {
    icon: Medal,
    color: '#24c88a',
    glow: 'rgba(36,200,138,0.12)',
    label: 'Great execution',
  },
  encouragement: {
    icon: TrendUp,
    color: '#24c88a',
    glow: 'rgba(36,200,138,0.12)',
    label: 'Keep improving',
  },
  correction: {
    icon: Warning,
    color: '#ff4d5e',
    glow: 'rgba(255,77,94,0.12)',
    label: 'Needs attention',
  },
  streak: {
    icon: Fire,
    color: '#d99405',
    glow: 'rgba(217,148,5,0.12)',
    label: 'Streak bonus',
  },
  recovery: {
    icon: HeartPulse,
    color: '#d99405',
    glow: 'rgba(217,148,5,0.12)',
    label: 'Recovery mode',
  },
  anti_gaming: {
    icon: ShieldWarning,
    color: '#ff4d5e',
    glow: 'rgba(255,77,94,0.12)',
    label: 'Flagged',
  },
  transition: {
    icon: Star,
    color: '#d99405',
    glow: 'rgba(217,148,5,0.12)',
    label: 'Stage transition',
  },
  comeback: {
    icon: Lightning,
    color: '#d99405',
    glow: 'rgba(217,148,5,0.12)',
    label: 'Welcome back',
  },
  onboarding: {
    icon: Sparkle,
    color: '#d99405',
    glow: 'rgba(217,148,5,0.12)',
    label: 'Getting started',
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
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        maxWidth: 576,
        margin: '0 auto',
        border: `1px solid ${T.line}`,
        borderRadius: 2,
        background: T.panel2,
        padding: '13px 18px 15px',
      }}
    >
      {/* category accent rule — ATLAS card accent */}
      <span style={{ position: 'absolute', left: 0, top: -1, width: 44, height: 2.5, background: config.color }} />

      <div
        style={{
          flex: 'none',
          marginTop: 1,
          width: 28,
          height: 28,
          borderRadius: 2,
          border: `1px solid ${config.color}55`,
          background: config.glow,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={14} style={{ color: config.color }} aria-hidden="true" />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 9.5, letterSpacing: '.04em', textTransform: 'uppercase', color: config.color }}>
          {config.label}
        </p>
        <p style={{ margin: '7px 0 0', fontSize: 12.5, lineHeight: '19px', color: T.text2 }}>
          {coaching.message}
        </p>
        <p style={{ margin: '9px 0 0', fontSize: 10.5, lineHeight: '15px', color: T.muted3 }} aria-label="Disclaimer">
          {coaching.disclaimer}
        </p>
      </div>
    </div>
  );
}
