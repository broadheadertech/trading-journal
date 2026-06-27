'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

// react-globe.gl touches window/three.js, so client-only.
const Globe = dynamic(() => import('react-globe.gl'), { ssr: false });

// A curated point set — major financial hubs in brand-aurora colors.
const POINTS = [
  { name: 'NYSE',         lat: 40.70,  lng: -74.00,  color: '#ff2eb3' },
  { name: 'NASDAQ',       lat: 40.80,  lng: -73.90,  color: '#ff2eb3' },
  { name: 'Chicago',      lat: 41.88,  lng: -87.63,  color: '#fb923c' },
  { name: 'Toronto',      lat: 43.65,  lng: -79.38,  color: '#22d3ee' },
  { name: 'São Paulo',    lat: -23.55, lng: -46.63,  color: '#ff2eb3' },
  { name: 'London',       lat: 51.51,  lng: -0.09,   color: '#22d3ee' },
  { name: 'Frankfurt',    lat: 50.11,  lng: 8.68,    color: '#22d3ee' },
  { name: 'Zurich',       lat: 47.37,  lng: 8.54,    color: '#34d399' },
  { name: 'Dubai',        lat: 25.20,  lng: 55.27,   color: '#fbbf24' },
  { name: 'Riyadh',       lat: 24.71,  lng: 46.67,   color: '#fbbf24' },
  { name: 'Mumbai',       lat: 18.93,  lng: 72.83,   color: '#d946ef' },
  { name: 'Singapore',    lat: 1.29,   lng: 103.85,  color: '#34d399' },
  { name: 'HKEX',         lat: 22.28,  lng: 114.16,  color: '#fb923c' },
  { name: 'Shanghai',     lat: 31.23,  lng: 121.47,  color: '#ff2eb3' },
  { name: 'Tokyo',        lat: 35.68,  lng: 139.77,  color: '#fb923c' },
  { name: 'Seoul',        lat: 37.55,  lng: 126.99,  color: '#d946ef' },
  { name: 'Sydney',       lat: -33.87, lng: 151.21,  color: '#34d399' },
  { name: 'Johannesburg', lat: -26.20, lng: 28.04,   color: '#22d3ee' },
];

const ARCS = [
  { startLat: 40.70,  startLng: -74.00,  endLat: 51.51,  endLng: -0.09  },
  { startLat: 51.51,  startLng: -0.09,   endLat: 35.68,  endLng: 139.77 },
  { startLat: 35.68,  startLng: 139.77,  endLat: 22.28,  endLng: 114.16 },
  { startLat: 22.28,  startLng: 114.16,  endLat: 1.29,   endLng: 103.85 },
  { startLat: 1.29,   startLng: 103.85,  endLat: -33.87, endLng: 151.21 },
  { startLat: 25.20,  startLng: 55.27,   endLat: 51.51,  endLng: -0.09  },
  { startLat: 40.70,  startLng: -74.00,  endLat: -23.55, endLng: -46.63 },
  { startLat: 41.88,  startLng: -87.63,  endLat: 25.20,  endLng: 55.27  },
  { startLat: 18.93,  startLng: 72.83,   endLat: 51.51,  endLng: -0.09  },
  { startLat: 50.11,  startLng: 8.68,    endLat: 40.70,  endLng: -74.00 },
  { startLat: 37.55,  startLng: 126.99,  endLat: 40.70,  endLng: -74.00 },
  { startLat: -26.20, startLng: 28.04,   endLat: 25.20,  endLng: 55.27  },
];

// Sonar-ping rings layered on every marker.
const RINGS = POINTS.map(p => ({ lat: p.lat, lng: p.lng, color: p.color }));

// ── Live trader counter — slow, organic, brand-consistent ───────────────
//
// Starts at 520,888 (per user spec) and ticks every ~4-7 seconds, adding
// 1-3 each tick — fast enough to be visibly alive when watched, slow enough
// to read as "growing platform" rather than "fake JS animation". Number
// format is locked to en-US so the comma separators look the same for every
// visitor regardless of locale.
const COUNTER_START = 127_739;
const COUNTER_MIN_DELAY_MS = 4_000;
const COUNTER_MAX_DELAY_MS = 7_000;
const COUNTER_MIN_DELTA = 1;
const COUNTER_MAX_DELTA = 3;
const NUMBER_FORMATTER = new Intl.NumberFormat('en-US');

function useLiveTraderCount() {
  const [count, setCount] = useState(COUNTER_START);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const scheduleNext = () => {
      const delta = COUNTER_MIN_DELTA + Math.floor(Math.random() * (COUNTER_MAX_DELTA - COUNTER_MIN_DELTA + 1));
      const delay = COUNTER_MIN_DELAY_MS + Math.random() * (COUNTER_MAX_DELAY_MS - COUNTER_MIN_DELAY_MS);
      timer = setTimeout(() => {
        setCount(prev => prev + delta);
        scheduleNext();
      }, delay);
    };
    scheduleNext();
    return () => clearTimeout(timer);
  }, []);

  return count;
}

function TraderCounterBadge() {
  const count = useLiveTraderCount();
  return (
    <div
      className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 inline-flex items-center gap-2.5 px-4 py-2 rounded-full glass shadow-[0_0_30px_-4px_rgba(255,46,179,0.55)]"
      aria-live="polite"
    >
      <span className="relative flex h-2 w-2" aria-hidden>
        <span className="absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75 animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-pink-500" />
      </span>
      <span className="text-sm tabular-nums font-extrabold bg-gradient-to-r from-pink-300 to-fuchsia-300 bg-clip-text text-transparent">
        {NUMBER_FORMATTER.format(count)}+
      </span>
      <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-[var(--muted-foreground)]">
        traders worldwide
      </span>
    </div>
  );
}

/**
 * Decorative auto-rotating 3D globe for the hero's right column.
 *
 * Intentionally chrome-less: transparent canvas, no card border, no labels,
 * no UI controls — the hero's blurred photo + aurora wash needs to show
 * through behind the globe.
 *
 * Visual recipe:
 *   • NASA blue-marble daytime texture (vibrant, lit globe)
 *   • Neon-orange atmosphere halo + radial-glow rim (CSS, not WebGL)
 *   • Saturated brand-color markers raised above the surface
 *   • Sonar-pinging rings on each marker
 *   • Animated dashed arcs in cyan→amber gradient
 *   • Live trader counter chip pinned to the bottom of the globe
 *
 * For the full interactive globe with layer toggles + tooltips, see
 * `components/WorldGlobe.tsx` (World Monitoring tab).
 */
export default function HeroGlobe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<unknown>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: Math.min(560, Math.max(380, el.clientHeight)) });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: Math.min(560, Math.max(380, el.clientHeight)) });
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      const g = globeRef.current as {
        controls?: () => { autoRotate: boolean; autoRotateSpeed: number; enableZoom: boolean };
        pointOfView?: (pov: { lat?: number; lng?: number; altitude?: number }, ms?: number) => void;
      } | null;
      if (!g) return;
      if (typeof g.controls === 'function') {
        const controls = g.controls();
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.35;
        controls.enableZoom = false;
      }
      if (typeof g.pointOfView === 'function') {
        g.pointOfView({ lat: 22, lng: -30, altitude: 2.0 }, 0);
      }
    }, 200);
    return () => clearTimeout(t);
  }, []);

  const points = useMemo(() => POINTS, []);
  const arcs = useMemo(() => ARCS, []);
  const rings = useMemo(() => RINGS, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-square sm:aspect-[4/5] lg:aspect-square max-h-[560px]"
    >
      {/* Outer aurora halo — orange/amber neon wash bleeding past the globe */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(255,46,179,0.28) 0%, rgba(34,211,238,0.14) 42%, transparent 68%)',
          filter: 'blur(40px)',
        }}
      />
      {/* Inner rim glow — tighter, warmer */}
      <div
        aria-hidden
        className="absolute inset-[10%] pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(217,70,239,0.22) 0%, transparent 60%)',
          filter: 'blur(24px)',
        }}
      />

      {size && (
        <Globe
          ref={globeRef as never}
          width={size.w}
          height={size.h}
          backgroundColor="rgba(0,0,0,0)"
          globeImageUrl="//cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg"
          bumpImageUrl="//cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png"
          // Neon pink atmosphere over the night-lights earth — a glowing "global network" look.
          atmosphereColor="#ff2eb3"
          atmosphereAltitude={0.32}
          showGlobe
          showAtmosphere
          /* ── Markers ───────────────────────────────────────────────── */
          pointsData={points}
          pointLat={(d: object) => (d as { lat: number }).lat}
          pointLng={(d: object) => (d as { lng: number }).lng}
          pointColor={(d: object) => (d as { color: string }).color}
          pointAltitude={0.04}
          pointRadius={0.55}
          pointLabel={() => ''}
          /* ── Pulsing sonar rings on each marker ────────────────────── */
          ringsData={rings}
          ringLat={(d: object) => (d as { lat: number }).lat}
          ringLng={(d: object) => (d as { lng: number }).lng}
          ringColor={(d: object) => () => (d as { color: string }).color}
          ringMaxRadius={4}
          ringPropagationSpeed={2.2}
          ringRepeatPeriod={1500}
          ringAltitude={0.005}
          /* ── Animated trade routes ─────────────────────────────────── */
          arcsData={arcs}
          arcStartLat={(d: object) => (d as (typeof ARCS)[number]).startLat}
          arcStartLng={(d: object) => (d as (typeof ARCS)[number]).startLng}
          arcEndLat={(d: object) => (d as (typeof ARCS)[number]).endLat}
          arcEndLng={(d: object) => (d as (typeof ARCS)[number]).endLng}
          // Pink → cyan neon so the routes read as a glowing global network.
          arcColor={() => ['#ff2eb3', '#22d3ee']}
          arcStroke={0.4}
          arcAltitudeAutoScale={0.55}
          arcDashLength={0.5}
          arcDashGap={0.18}
          arcDashAnimateTime={1800}
        />
      )}

      <TraderCounterBadge />
    </div>
  );
}
