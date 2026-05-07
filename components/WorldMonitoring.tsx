'use client';

import dynamic from 'next/dynamic';
import { Globe, ExternalLink, TrendingUp, Flame, Swords, Plane, Ship, Zap, Radio, BarChart3 } from 'lucide-react';

// SSR-safe dynamic import â€” react-simple-maps reads window during init
const WorldMap = dynamic(() => import('./WorldMap'), { ssr: false });
const WorldMonitorLive = dynamic(() => import('./WorldMonitorLive'), { ssr: false });

interface MonitorLink {
  title: string;
  desc: string;
  url: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tag: string;
}

const PRIMARY: MonitorLink[] = [
  {
    title: 'Stock Markets',
    desc: 'Live global equity indices and ticker streams across major exchanges.',
    url: 'https://finance.worldmonitor.app',
    icon: TrendingUp,
    tag: 'Markets',
  },
  {
    title: 'Oil & Energy',
    desc: 'Crude oil prices, refining margins, supply/demand maps.',
    url: 'https://energy.worldmonitor.app',
    icon: Flame,
    tag: 'Energy',
  },
  {
    title: 'Commodities',
    desc: 'Metals, agriculture, and soft commodities with price action.',
    url: 'https://commodity.worldmonitor.app',
    icon: BarChart3,
    tag: 'Commodities',
  },
];

const CONTEXT: MonitorLink[] = [
  {
    title: 'Conflict Tracker',
    desc: 'Live geopolitical conflict map â€” events that move oil, defense, and FX.',
    url: 'https://www.worldmonitor.app',
    icon: Swords,
    tag: 'Geopolitics',
  },
  {
    title: 'Aerospace (ADS-B)',
    desc: 'Real-time military and civilian flight tracking.',
    url: 'https://www.worldmonitor.app',
    icon: Plane,
    tag: 'Aerospace',
  },
  {
    title: 'Maritime (AIS)',
    desc: 'Ship tracking â€” tankers, container traffic, choke-point activity.',
    url: 'https://www.worldmonitor.app',
    icon: Ship,
    tag: 'Maritime',
  },
  {
    title: 'Infrastructure & Disasters',
    desc: 'Power outages, earthquakes, and critical infrastructure alerts.',
    url: 'https://www.worldmonitor.app',
    icon: Zap,
    tag: 'Infrastructure',
  },
  {
    title: 'Civil Unrest',
    desc: 'Protest tracking and civil unrest mapping by country.',
    url: 'https://www.worldmonitor.app',
    icon: Radio,
    tag: 'Civil',
  },
  {
    title: 'Tech & Innovation',
    desc: 'Tech sector signals, patents, and emerging market intelligence.',
    url: 'https://tech.worldmonitor.app',
    icon: Globe,
    tag: 'Tech',
  },
];

export default function WorldMonitoring() {
  return (
    <div className="relative space-y-10">
      <div className="hero-glow" />

      {/* Hero */}
      <header className="space-y-3 anim-fade-up">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-medium text-[var(--muted-foreground)]">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Powered by World Monitor Â· 190+ countries Â· 435+ sources
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[var(--foreground)]">
          World <span className="gradient-text">monitoring</span>
        </h1>
        <p className="text-base text-[var(--muted-foreground)] max-w-2xl">
          Real-time global intelligence â€” financial centers, central banks, trade routes, undersea cables, and pipelines.
          Toggle layers to explore.
        </p>
      </header>

      {/* 1. Layers â€” interactive world map */}
      <div className="anim-fade-up">
        <WorldMap />
      </div>

      {/* 2. Live data widgets */}
      <div className="anim-fade-up">
        <WorldMonitorLive />
      </div>

      {/* Markets section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Markets & Commodities</h2>
          <div className="flex-1 h-px bg-[var(--border)]" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PRIMARY.map((m, idx) => <Card key={m.title} m={m} idx={idx} />)}
        </div>
      </section>

      {/* Context section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Macro & Geopolitical Context</h2>
          <div className="flex-1 h-px bg-[var(--border)]" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CONTEXT.map((m, idx) => <Card key={m.title} m={m} idx={idx + PRIMARY.length} />)}
        </div>
      </section>

      {/* Footer attribution */}
      <div className="glass rounded-3xl p-6 flex items-center gap-4 flex-wrap">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500/20 to-emerald-500/10 flex items-center justify-center">
          <Globe size={20} className="text-pink-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[var(--foreground)]">Open intelligence by World Monitor</div>
          <div className="text-xs text-[var(--muted-foreground)]">
            All dashboards open in a new tab. We don&apos;t host or modify their data.
          </div>
        </div>
        <a
          href="https://www.worldmonitor.app"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-br from-pink-500 to-pink-700 text-white text-sm font-semibold shadow-lg shadow-teal-500/30 hover:shadow-teal-500/50 transition-all hover:-translate-y-0.5"
        >
          Open World Monitor <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
}

function Card({ m, idx }: { m: MonitorLink; idx: number }) {
  const Icon = m.icon;
  return (
    <a
      href={m.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{ animationDelay: `${idx * 60}ms` }}
      className="group glass rounded-3xl p-6 card-lift anim-fade-up flex flex-col"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500/20 to-emerald-500/10 flex items-center justify-center">
          <Icon size={20} className="text-pink-400" />
        </div>
        <ExternalLink size={14} className="text-[var(--muted-foreground)] group-hover:text-pink-400 transition-colors" />
      </div>
      <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400 font-medium self-start">{m.tag}</span>
      <h3 className="font-bold text-lg text-[var(--foreground)] tracking-tight mt-2">{m.title}</h3>
      <p className="text-sm text-[var(--muted-foreground)] mt-1 flex-1">{m.desc}</p>
      <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center gap-1 text-sm font-medium text-pink-400 group-hover:gap-2 transition-all">
        Open dashboard <ExternalLink size={12} />
      </div>
    </a>
  );
}
