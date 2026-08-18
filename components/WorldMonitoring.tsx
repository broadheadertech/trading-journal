'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Globe, TrendingUp, Flame, Swords, Plane, Ship, Zap, Radio, BarChart3, Map as MapIcon } from 'lucide-react';

// SSR-safe dynamic imports — these touch window during init
const WorldMap = dynamic(() => import('./WorldMap'), { ssr: false });
const WorldGlobe = dynamic(() => import('./WorldGlobe'), { ssr: false });
const WorldMonitorLive = dynamic(() => import('./WorldMonitorLive'), { ssr: false });

type MapView = 'globe' | 'flat';

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
    desc: 'Live geopolitical conflict map — events that move oil, defense, and FX.',
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
    desc: 'Ship tracking — tankers, container traffic, choke-point activity.',
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

// Presentational only — maps an existing tag to its ATLAS accent colour.
const TAG_ACCENT: Record<string, string> = {
  Markets: '#2fd3c4',
  Energy: '#d99405',
  Commodities: '#d99405',
  Geopolitics: '#ff3d87',
  Aerospace: '#2fd3c4',
  Maritime: '#2fd3c4',
  Infrastructure: '#d99405',
  Civil: '#ff4d5e',
  Tech: '#24c88a',
};

export default function WorldMonitoring() {
  const [view, setView] = useState<MapView>('globe');
  return (
    <div>
      {/* Hero */}
      <div className="phead pwrap">
        <p className="eyebrow">
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: 1,
              background: 'var(--green)',
              display: 'inline-block',
              flex: 'none',
            }}
          />
          Powered by World Monitor · 190+ countries · 435+ sources
        </p>
        <h2>World monitoring</h2>
        <p className="sub">
          Real-time global intelligence — financial centers, central banks, trade routes, undersea cables, and pipelines.
          Toggle layers to explore.
        </p>
        <div className="actions" style={{ top: 34, gap: 8 }}>
          <button
            onClick={() => setView('globe')}
            className={view === 'globe' ? 'btn-a' : 'chip'}
            style={{ height: 34, padding: '0 18px', fontWeight: 700 }}
          >
            <Globe size={13} /> 3D Globe
          </button>
          <button
            onClick={() => setView('flat')}
            className={view === 'flat' ? 'btn-a' : 'chip'}
            style={{ height: 34, padding: '0 18px', fontWeight: 700 }}
          >
            <MapIcon size={13} /> Flat Map
          </button>
        </div>
      </div>

      {/* 1. Layers — interactive world map / 3D globe */}
      <div className="card" style={{ padding: '20px' }}>
        {view === 'globe' ? <WorldGlobe /> : <WorldMap />}
      </div>

      {/* 2. Live data widgets */}
      <div style={{ marginTop: 32 }}>
        <WorldMonitorLive />
      </div>

      {/* Markets section */}
      <p className="sect" style={{ marginTop: 38 }}>MARKETS &amp; COMMODITIES</p>
      <div className="split-3">
        {PRIMARY.map((m, idx) => <Card key={m.title} m={m} idx={idx} />)}
      </div>

      {/* Context section */}
      <p className="sect">MACRO &amp; GEOPOLITICAL CONTEXT</p>
      <div className="split-3">
        {CONTEXT.map((m, idx) => <Card key={m.title} m={m} idx={idx + PRIMARY.length} />)}
      </div>

      {/* Footer attribution */}
      <div className="srcbar">
        <span
          className="ic"
          style={{
            border: '1px solid rgba(47,211,196,.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Globe size={16} color="#2fd3c4" />
        </span>
        <div>
          <h4>Open intelligence by World Monitor</h4>
          <p>We don&apos;t host or modify their data.</p>
        </div>
      </div>
    </div>
  );
}

function Card({ m, idx }: { m: MonitorLink; idx: number }) {
  const Icon = m.icon;
  const accent = TAG_ACCENT[m.tag] ?? '#2fd3c4';
  return (
    <div className="domain" style={{ animationDelay: `${idx * 60}ms` }}>
      <span
        className="ic"
        style={{
          border: `1px solid ${accent}8c`,
          color: accent,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={16} />
      </span>
      <p className="kick" style={{ color: accent, textTransform: 'uppercase' }}>{m.tag}</p>
      <h4>{m.title}</h4>
      <p>{m.desc}</p>
    </div>
  );
}
