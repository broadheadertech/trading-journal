'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './AtlasWorldMap.module.css';

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

function MapContent({ routes }: { routes: Route[] }) {
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
              <MapSurface rows={rows} />
            </defs>

            {/* Rendered twice, one canvas width apart, and translated left by
                exactly one canvas width per cycle — the second copy lands where
                the first began, so the loop has no seam. */}
            <g className={styles.scroll}>
              <g>
                <use href="#atlasSurface" />
                <MapContent routes={routes} />
              </g>
              <g transform={`translate(${W} 0)`}>
                <use href="#atlasSurface" />
                <MapContent routes={routes} />
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
