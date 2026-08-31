'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './AtlasWorldMap.module.css';
import { FlagArt, type FlagCode } from './atlasFlagIcons';

/* ------------------------------------------------------------------
   ATLAS hero world map.

   A dot-matrix equirectangular world lying on a plane tilted 30deg
   backwards, scrolling westward on a seamless 44s loop. Trade routes
   arc above the surface and drop flat shadows onto it. Everything is
   generated from coordinates — there are no image files or external
   assets involved.
   ------------------------------------------------------------------ */

const W = 1600;
const H = 900;

/* Equirectangular, cropped to 84N .. 58S (142 degrees of latitude). */
const px = (lon: number) => ((lon + 180) / 360) * W;
const py = (lat: number) => ((84 - lat) / 142) * H;

/* Continents as overlapping ellipses in lon/lat space:
   [centerLon, centerLat, radiusLon, radiusLat] */
const LAND: [number, number, number, number][] = [
  [-150, 63, 13, 7], [-100, 58, 33, 13], [-98, 41, 23, 9], [-102, 24, 9, 7], [-84, 13, 8, 4],
  [-42, 73, 13, 8], [-62, -4, 15, 13], [-63, -30, 10, 15], [-69, -46, 5, 8],
  [20, 52, 22, 11], [17, 63, 10, 7], [4, 42, 13, 6],
  [15, 20, 25, 15], [24, -15, 13, 17], [42, 9, 8, 6], [46, 23, 10, 9],
  [90, 60, 55, 14], [75, 43, 30, 12], [105, 33, 18, 12], [78, 21, 10, 11],
  [104, 13, 12, 9], [118, -3, 16, 5], [139, 37, 4, 7],
  [134, -25, 17, 10], [173, -42, 3, 5],
];

const isLand = (lon: number, lat: number) =>
  LAND.some(([cLon, cLat, rLon, rLat]) => {
    const dx = (lon - cLon) / rLon;
    const dy = (lat - cLat) / rLat;
    return dx * dx + dy * dy <= 1;
  });

const STEP = 2.6;

/* One <path> per latitude row rather than one <circle> per dot: radius and
   opacity only vary with y, and y is quantised by the latitude step, so a
   whole row shares both. ~55 paths instead of ~2,300 nodes, twice over. */
type DotRow = { d: string; opacity: number };

function buildDotRows(): DotRow[] {
  const rows: DotRow[] = [];
  for (let lat = 84; lat >= -58; lat -= STEP) {
    const y = py(lat);
    const t = y / H; // 0 = far/back edge of the plane, 1 = near/front edge
    const r = 1.5 + t * 1.5;
    const rs = r.toFixed(2);
    let d = '';
    for (let lon = -180; lon <= 180; lon += STEP) {
      if (!isLand(lon, lat)) continue;
      const x = px(lon);
      d += `M${(x - r).toFixed(1)} ${y.toFixed(1)}`
        + `a${rs} ${rs} 0 1 0 ${(r * 2).toFixed(1)} 0`
        + `a${rs} ${rs} 0 1 0 ${(-r * 2).toFixed(1)} 0`;
    }
    if (d) rows.push({ d, opacity: 0.45 + t * 0.55 });
  }
  return rows;
}

const MERIDIANS = Array.from({ length: 13 }, (_, i) => px(-180 + i * 30));
const PARALLELS = Array.from({ length: 6 }, (_, i) => py(60 - i * 20));

type Venue = { id: string; lon: number; lat: number };

const NODES: Venue[] = [
  { id: 'NYSE', lon: -74, lat: 40.7 },
  { id: 'TSX', lon: -79.4, lat: 43.7 },
  { id: 'B3', lon: -46.6, lat: -23.5 },
  { id: 'LSE', lon: -0.1, lat: 51.5 },
  { id: 'FWB', lon: 8.7, lat: 50.1 },
  { id: 'JSE', lon: 28, lat: -26.2 },
  { id: 'DFM', lon: 55.3, lat: 25.2 },
  { id: 'NSE', lon: 72.8, lat: 19.1 },
  { id: 'SGX', lon: 103.8, lat: 1.3 },
  { id: 'HKEX', lon: 114.2, lat: 22.3 },
  { id: 'TSE', lon: 139.7, lat: 35.7 },
  { id: 'ASX', lon: 151.2, lat: -33.9 },
];

const NODE_AT = Object.fromEntries(NODES.map((n) => [n.id, n])) as Record<string, Venue>;

/** How far the node floats above the plane. */
const LIFT = 14;

const CLASSES = [
  { name: 'Long', color: '#24C88A' },
  { name: 'Short', color: '#F0485E' },
  { name: 'Crypto', color: '#A855F7' },
  { name: 'FX', color: '#D99405' },
  { name: 'Indices', color: '#33EDC8' },
  { name: 'Commods', color: '#E0479E' },
  { name: 'Bonds', color: '#4D8DF0' },
];

const CORRIDORS: [string, string][] = [
  ['NYSE', 'LSE'], ['LSE', 'TSE'], ['NYSE', 'TSE'], ['SGX', 'FWB'],
  ['HKEX', 'ASX'], ['B3', 'JSE'], ['DFM', 'NSE'], ['TSX', 'FWB'],
];

/** Arc lift constant — raise for taller, more dramatic corridors. */
const ARC_LIFT = 90;

/* Hero load-in timing. The spec's reference numbers (0.60s/0.82s/1.04s for
   routes, 1.45s/1.55s/1.65s for nodes) assume 3 routes and 3 nodes; this map
   has 8 corridors and 12 exchanges, so the same per-item stagger interval
   (0.22s / 0.10s) is carried forward across the real counts instead of
   compressing everything into the original 3-item window. */
const ROUTE_REVEAL_DELAY_START = 0.6;
const ROUTE_REVEAL_DELAY_STEP = 0.22;
const ROUTE_REVEAL_DURATION = 2.1;
const NODE_REVEAL_DELAY_START = 1.45;
const NODE_REVEAL_DELAY_STEP = 0.1;

const routeRevealDelay = (i: number) => ROUTE_REVEAL_DELAY_START + i * ROUTE_REVEAL_DELAY_STEP;
const nodeRevealDelay = (i: number) => NODE_REVEAL_DELAY_START + i * NODE_REVEAL_DELAY_STEP;

/* Once every one-shot route reveal has finished, the map hands control back
   to the pre-existing ambient redraw loop (see .frame.settled in the CSS
   module) — this is when that handoff happens. */
const HERO_SETTLE_MS = Math.ceil(
  (routeRevealDelay(CORRIDORS.length - 1) + ROUTE_REVEAL_DURATION) * 1000,
) + 60;

type Route = { arc: string; chord: string; color: string; name: string };

function buildRoutes(classIndices: number[]): Route[] {
  return CORRIDORS.map(([fromId, toId], i) => {
    const from = NODE_AT[fromId];
    const to = NODE_AT[toId];
    const x1 = px(from.lon);
    const y1 = py(from.lat) - LIFT;
    const x2 = px(to.lon);
    const y2 = py(to.lat) - LIFT;
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2 - (ARC_LIFT + dist * 0.2);
    const cls = CLASSES[classIndices[i]];
    return {
      arc: `M${x1.toFixed(1)} ${y1.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`,
      // the shadow tracks the straight chord on the plane — that mismatch
      // against the curve is what sells the arc as lifted off the surface
      chord: `M${x1.toFixed(1)} ${(y1 + LIFT).toFixed(1)}L${x2.toFixed(1)} ${(y2 + LIFT).toFixed(1)}`,
      color: cls.color,
      name: cls.name,
    };
  });
}

/* ------------------------------------------------------------------
   Flag-route layer (additive on top of the 8 static corridors above).

   A rotating set of 3 country-to-country routes with flag markers at each
   end, cycling every 7s per route (staggered 0s/2.3s/4.6s so they never
   all swap together). Philippines is pinned to one route at all times;
   its partner — and both ends of the other two routes — rotate randomly
   from FLAG_COUNTRIES, reusing the exact same arc math and 7-class color
   palette as the static corridors above so this reads as one system.
   ------------------------------------------------------------------ */

type FlagCountry = { name: string; code: FlagCode; lat: number; lon: number };

const FLAG_COUNTRIES: FlagCountry[] = [
  { name: 'Philippines', code: 'PH', lat: 14.5995, lon: 120.9842 },
  { name: 'United States', code: 'US', lat: 38.9072, lon: -77.0369 },
  { name: 'Japan', code: 'JP', lat: 35.6762, lon: 139.6503 },
  { name: 'United Kingdom', code: 'GB', lat: 51.5074, lon: -0.1278 },
  { name: 'Singapore', code: 'SG', lat: 1.3521, lon: 103.8198 },
  { name: 'Germany', code: 'DE', lat: 52.5200, lon: 13.4050 },
  { name: 'Australia', code: 'AU', lat: -33.8688, lon: 151.2093 },
  { name: 'Brazil', code: 'BR', lat: -23.5505, lon: -46.6333 },
  { name: 'India', code: 'IN', lat: 19.0760, lon: 72.8777 },
  { name: 'South Africa', code: 'ZA', lat: -26.2041, lon: 28.0473 },
  { name: 'UAE', code: 'AE', lat: 25.2048, lon: 55.2708 },
  { name: 'Canada', code: 'CA', lat: 43.6532, lon: -79.3832 },
  { name: 'South Korea', code: 'KR', lat: 37.5665, lon: 126.9780 },
  { name: 'Mexico', code: 'MX', lat: 19.4326, lon: -99.1332 },
  { name: 'Nigeria', code: 'NG', lat: 6.5244, lon: 3.3792 },
];

const FLAG_AT = Object.fromEntries(FLAG_COUNTRIES.map((c) => [c.code, c])) as Record<FlagCode, FlagCountry>;

/* Countries whose static horizontal position falls outside the 10%-90%
   band are excluded from ever being picked — that band is where the
   canvas's own edge vignette (.canvas mask-image, ~22%/88%) starts
   dissolving the map, so a flag spawning there would render half-faded.
   Of the 15, this excludes only Australia (~92%). PH is always within
   band and never filtered even when it's someone else's random partner. */
const FLAG_ELIGIBLE = FLAG_COUNTRIES.filter((c) => {
  const pct = ((c.lon + 180) / 360) * 100;
  return pct >= 10 && pct <= 90;
});
const FLAG_POOL = FLAG_ELIGIBLE.filter((c) => c.code !== 'PH');

/** How far a flag marker floats above the plane — same 2D fake-elevation
 *  trick as the exchange nodes' LIFT, just a different constant per spec. */
const FLAG_LIFT = 16;

let flagRouteIdSeed = 0;
const nextFlagRouteId = () => flagRouteIdSeed++;

const randomFrom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

type FlagRoute = { id: number; fromCode: FlagCode; toCode: FlagCode; colorIdx: number };

/** Picks a fresh route for one slot, avoiding any country already active
 *  in the OTHER currently-active slots (`others`) so the 3 concurrent
 *  routes never repeat a country between them. Slot 0 always keeps PH
 *  fixed at one end. */
function nextFlagRoute(slotIndex: number, others: FlagRoute[]): FlagRoute {
  const usedElsewhere = new Set(others.flatMap((r) => [r.fromCode, r.toCode]));
  const colorIdx = Math.floor(Math.random() * CLASSES.length);

  if (slotIndex === 0) {
    const pool = FLAG_POOL.filter((c) => !usedElsewhere.has(c.code));
    const partner = randomFrom(pool.length ? pool : FLAG_POOL);
    return { id: nextFlagRouteId(), fromCode: 'PH', toCode: partner.code, colorIdx };
  }

  const pool1 = FLAG_POOL.filter((c) => !usedElsewhere.has(c.code));
  const a = randomFrom(pool1.length ? pool1 : FLAG_POOL);
  const usedElsewhere2 = new Set([...usedElsewhere, a.code]);
  const pool2 = FLAG_POOL.filter((c) => !usedElsewhere2.has(c.code));
  const b = randomFrom(pool2.length ? pool2 : FLAG_POOL.filter((c) => c.code !== a.code));
  return { id: nextFlagRouteId(), fromCode: a.code, toCode: b.code, colorIdx };
}

/** Reduced-motion fallback: 3 static routes picked once, same no-repeat
 *  rule, never cycled. */
function buildStaticFlagRoutes(): FlagRoute[] {
  const result: FlagRoute[] = [];
  for (let i = 0; i < 3; i++) result.push(nextFlagRoute(i, result));
  return result;
}

type FlagArc = { arc: string; chord: string; color: string };

function buildFlagArc(route: FlagRoute): FlagArc {
  const from = FLAG_AT[route.fromCode];
  const to = FLAG_AT[route.toCode];
  const x1 = px(from.lon);
  const y1 = py(from.lat) - FLAG_LIFT;
  const x2 = px(to.lon);
  const y2 = py(to.lat) - FLAG_LIFT;
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2 - (ARC_LIFT + dist * 0.2);
  return {
    arc: `M${x1.toFixed(1)} ${y1.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`,
    chord: `M${x1.toFixed(1)} ${(y1 + FLAG_LIFT).toFixed(1)}L${x2.toFixed(1)} ${(y2 + FLAG_LIFT).toFixed(1)}`,
    color: CLASSES[route.colorIdx].color,
  };
}

/** Flag + ISO code label, riser and floor shadow — the same depth cues as
 *  the exchange nodes above. The billboard group (flag + label only) is
 *  nested apart from the riser/shadow specifically so it alone can carry
 *  a CSS `rotateX(-30deg)` counter-transform (see .flagBillboard) that
 *  cancels .stage's rotateX(30deg) tilt and faces the camera — an SVG
 *  `transform` attribute and a CSS `transform` on the SAME element don't
 *  compose (the CSS one wins outright), so position (attribute) and
 *  counter-rotation (CSS class) are kept on separate nested <g>s. */
function FlagMarker({ country, color }: { country: FlagCountry; color: string }) {
  const x = px(country.lon);
  const groundY = py(country.lat);
  const liftedY = groundY - FLAG_LIFT;
  return (
    <g className={styles.flagMarker}>
      <ellipse cx={x} cy={groundY} rx={6} ry={2} fill="#000000" opacity={0.5} />
      <line x1={x} y1={groundY} x2={x} y2={liftedY} stroke={color} strokeWidth={1} opacity={0.35} />
      <g transform={`translate(${x.toFixed(1)} ${liftedY.toFixed(1)})`}>
        <g className={styles.flagBillboard}>
          <g transform="translate(-9 -12)">
            <g clipPath="url(#atlasFlagClip)">
              <FlagArt code={country.code} />
            </g>
            <rect width={18} height={12} rx={1} fill="none" stroke="rgba(255,255,255,.2)" strokeWidth={1} />
            <text x={9} y={20} textAnchor="middle" className={styles.flagIso}>{country.code}</text>
          </g>
        </g>
      </g>
    </g>
  );
}

function FlagRouteLayer({ routes, animated }: { routes: (FlagRoute | null)[]; animated: boolean }) {
  return (
    <>
      {routes.map((route) => {
        if (!route) return null;
        const { arc, chord, color } = buildFlagArc(route);
        return (
          <g key={route.id}>
            <path d={chord} pathLength={1} strokeDasharray={1} stroke="#000000" strokeWidth={3} fill="none" className={styles.flagRouteShadow} />
            <path d={arc} pathLength={1} strokeDasharray={1} stroke={color} strokeWidth={5} fill="none" filter="url(#atlasRouteBlur)" className={styles.flagRouteGlow} />
            <path d={arc} pathLength={1} strokeDasharray={1} stroke={color} strokeWidth={1.6} fill="none" strokeLinecap="round" className={styles.flagRouteLine} />
            {animated && (
              <g className={styles.flagPacket}>
                <circle r={4} fill={color} filter="url(#atlasRouteBlur)" opacity={0.7}>
                  <animateMotion dur="1.85s" begin="1.8s" repeatCount="2" path={arc} />
                </circle>
                <circle r={1.8} fill="#ffffff">
                  <animateMotion dur="1.85s" begin="1.8s" repeatCount="2" path={arc} />
                </circle>
              </g>
            )}
            <FlagMarker country={FLAG_AT[route.fromCode]} color={color} />
            <FlagMarker country={FLAG_AT[route.toCode]} color={color} />
          </g>
        );
      })}
    </>
  );
}

/* The surface — graticule and dot field. It is defined once and stamped
   twice with <use>, which keeps the duplicated copy out of the markup;
   nothing in here animates, so there is no shadow-tree styling to worry
   about. */
function MapSurface({ rows }: { rows: DotRow[] }) {
  return (
    <g id="atlasSurface">
      {/* graticule — flat beneath the dots */}
      <g stroke="#0D1520" strokeWidth={1}>
        {MERIDIANS.map((x, i) => (
          <line key={`m${i}`} x1={x} y1={0} x2={x} y2={H} />
        ))}
        {PARALLELS.map((y, i) => (
          <line key={`p${i}`} x1={0} y1={y} x2={W} y2={y} />
        ))}
      </g>

      {/* landmass dot field — smaller and dimmer toward the far edge */}
      <g fill="#1D3149">
        {rows.map((row, i) => (
          <path key={`d${i}`} d={row.d} opacity={row.opacity} />
        ))}
      </g>
    </g>
  );
}

function MapContent({
  routes,
  flagRoutes,
  flagAnimated,
}: {
  routes: Route[];
  flagRoutes: (FlagRoute | null)[];
  flagAnimated: boolean;
}) {
  return (
    <>
      {/* route shadows lie flat on the plane, under everything */}
      <g fill="none" stroke="#000000" strokeWidth={3}>
        {routes.map((r, i) => (
          <path
            key={`rs${i}`}
            d={r.chord}
            pathLength={1}
            strokeDasharray={1}
            className={styles.routeShadow}
            style={{ '--ambient-delay': `${-i * 0.62}s`, '--route-delay': `${routeRevealDelay(i)}s` } as React.CSSProperties}
          />
        ))}
      </g>

      {/* the arcs themselves — blurred glow, then the hairline */}
      <g fill="none" strokeLinecap="round">
        {routes.map((r, i) => (
          <path
            key={`rg${i}`}
            d={r.arc}
            stroke={r.color}
            strokeWidth={5}
            pathLength={1}
            strokeDasharray={1}
            filter="url(#atlasRouteBlur)"
            className={styles.routeGlow}
            style={{ '--ambient-delay': `${-i * 0.62}s`, '--route-delay': `${routeRevealDelay(i)}s` } as React.CSSProperties}
          />
        ))}
        {routes.map((r, i) => (
          <path
            key={`rl${i}`}
            d={r.arc}
            stroke={r.color}
            strokeWidth={1.6}
            pathLength={1}
            strokeDasharray={1}
            className={styles.routeLine}
            style={{ '--ambient-delay': `${-i * 0.62}s`, '--route-delay': `${routeRevealDelay(i)}s` } as React.CSSProperties}
          />
        ))}
      </g>

      {/* exchange nodes: ground shadow, riser, pulse ring, core */}
      {NODES.map((n, i) => {
        const x = px(n.lon);
        const y = py(n.lat);
        return (
          <g
            key={n.id}
            className={styles.nodeGroup}
            style={{ '--node-delay': `${nodeRevealDelay(i)}s` } as React.CSSProperties}
          >
            <ellipse cx={x} cy={y} rx={7} ry={2.4} fill="#000000" opacity={0.55} />
            <line x1={x} y1={y} x2={x} y2={y - LIFT} stroke="#D99405" strokeWidth={1} opacity={0.28} />
            <circle
              cx={x}
              cy={y - LIFT}
              fill="none"
              stroke="#D99405"
              strokeWidth={1}
              className={styles.pulse}
              style={{ animationDelay: `${-i * 0.28}s` }}
            />
            <circle cx={x} cy={y - LIFT} r={2.8} fill="#D99405" />
          </g>
        );
      })}

      {/* flag-route layer — additive, drawn on top of the static corridors
          and nodes above so its arcs/markers never sit underneath them */}
      <FlagRouteLayer routes={flagRoutes} animated={flagAnimated} />
    </>
  );
}

export default function AtlasWorldMap() {
  const rows = useMemo(() => buildDotRows(), []);

  /* Route classes are randomised per page load. They are picked in an effect
     rather than during render so the server and first client render agree —
     a random assignment on both sides would be a hydration mismatch. This is
     a one-shot seed, not a cascading render. */
  const [classIndices, setClassIndices] = useState<number[] | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setClassIndices(CORRIDORS.map(() => Math.floor(Math.random() * CLASSES.length)));
  }, []);

  const routes = useMemo(
    () => (classIndices ? buildRoutes(classIndices) : []),
    [classIndices],
  );

  /* Flag-route layer: 3 slots cycling every 7s, staggered 0s/2.3s/4.6s so
     they never all swap together. Slot 0 is pinned to Philippines and
     activates immediately (t=0) so PH is guaranteed active from the first
     frame; slots 1/2 activate at their own offset and then repeat every
     7s from there. State starts empty and is seeded client-side only, for
     the same hydration-mismatch reason as classIndices above. Reduced
     motion swaps this whole scheme for a single static pick with no
     interval and no travelling packet (see the JSX below and the
     `no-preference`-gated CSS animations in the stylesheet). */
  const [flagRoutes, setFlagRoutes] = useState<(FlagRoute | null)[]>([null, null, null]);
  const [flagAnimated, setFlagAnimated] = useState(true);
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFlagAnimated(!reduced);

    if (reduced) {
      setFlagRoutes(buildStaticFlagRoutes());
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    const intervals: ReturnType<typeof setInterval>[] = [];

    function activate(slotIndex: number) {
      setFlagRoutes((prev) => {
        const next = prev.slice() as (FlagRoute | null)[];
        const others = next.filter((r, i) => i !== slotIndex && r) as FlagRoute[];
        next[slotIndex] = nextFlagRoute(slotIndex, others);
        return next;
      });
    }

    [0, 2300, 4600].forEach((offset, slotIndex) => {
      const start = () => {
        activate(slotIndex);
        intervals.push(setInterval(() => activate(slotIndex), 7000));
      };
      if (offset === 0) start();
      else timers.push(setTimeout(start, offset));
    });

    return () => {
      timers.forEach(clearTimeout);
      intervals.forEach(clearInterval);
    };
  }, []);

  /* Component-mount lifecycle, not a session flag: a hard refresh remounts
     this and replays the hero reveal; client-side nav that keeps the map
     mounted does not re-trigger it. */
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSettled(true), HERO_SETTLE_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={`${styles.frame} ${settled ? styles.settled : ''}`} aria-hidden="true" role="presentation">
      <div className={styles.canvas}>
        <div className={styles.stage}>
          <svg
            className={styles.map}
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="xMidYMid slice"
            focusable="false"
          >
            <defs>
              <filter id="atlasRouteBlur" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation={4} />
              </filter>
              {/* shared 18x12 rounded-rect clip for every flag marker, so
                  the flag art never draws outside its own border */}
              <clipPath id="atlasFlagClip">
                <rect width={18} height={12} rx={1} />
              </clipPath>
              <MapSurface rows={rows} />
            </defs>

            {/* Rendered twice, one canvas width apart, and translated left by
                exactly one canvas width per cycle — the second copy lands where
                the first began, so the loop has no seam. */}
            <g className={styles.scroll}>
              <g>
                <use href="#atlasSurface" />
                <MapContent routes={routes} flagRoutes={flagRoutes} flagAnimated={flagAnimated} />
              </g>
              <g transform={`translate(${W} 0)`}>
                <use href="#atlasSurface" />
                <MapContent routes={routes} flagRoutes={flagRoutes} flagAnimated={flagAnimated} />
              </g>
            </g>

            {/* meridian wash — occasional atmospheric shimmer, never foreground */}
            <g stroke="#33EDC8" strokeWidth={1}>
              {Array.from({ length: 5 }, (_, i) => {
                const x = (i + 0.5) * (W / 5);
                return (
                  <line
                    key={`w${i}`}
                    x1={x}
                    y1={0}
                    x2={x}
                    y2={H}
                    className={styles.meridian}
                    style={{ animationDelay: `${-i * 1.1}s` }}
                  />
                );
              })}
            </g>
          </svg>
        </div>

        <div className={styles.depthWash} />
        <div className={styles.edgeFade} />
      </div>

      <div className={`${styles.chrome} ${styles.stat}`}>
        <b className={styles.statValue}>128,326+</b>
        <span className={styles.statLabel}>Traders Worldwide</span>
      </div>
    </div>
  );
}
