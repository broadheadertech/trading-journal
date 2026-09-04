'use client';

/* ------------------------------------------------------------------
   Additive real-3D circulating-route layer for the hero globe.

   Wraps the untouched globe.tsx component and, via its onSceneReady hook
   (see that file's GlobeProps comment), parents real Three.js meshes onto
   the globe's own rotating group — so everything circles the sphere in
   sync with it automatically, and gets depth-tested against the sphere
   mesh for free (correct far-side occlusion, no manual angle math).

   Styling is deliberately matched to the globe's own visual vocabulary
   rather than treated as a separate overlay system:
   - same exact color as the globe's dots/outline/grid (#D99405), not a
     brighter or differently-saturated orange
   - each route is a row of short dash segments, not one continuous
     stroke — echoing the dot-matrix landmass instead of contrasting it
   - base opacity capped below the globe's own (opaque) lines, so the
     route reads as quieter than the sphere it's circling, not hotter
   - endpoint markers are small dot+glow pairs at the same scale as the
     landmass dots, not a distinct marker shape
   No custom fresnel shader: the real depth-tested occlusion already
   dims/hides the far side correctly (confirmed visually), which is the
   bulk of what a per-pixel view-angle falloff would add anyway. */

import { useCallback, useRef } from 'react';
import {
  CatmullRomCurve3,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  TubeGeometry,
  Vector3,
} from 'three';
import Globe from '@/components/originkit/ui/hero-24/globe';

/* The globe's own dot/outline/grid color, verbatim (see the dots/
   outlineColor/graticuleColor props passed to <Globe> below) — routes use
   this exact value, never a separate more-saturated orange. */
const GLOBE_LINE_COLOR = '#D99405';

type Country = { code: string; name: string; lat: number; lng: number };

const COUNTRIES: Country[] = [
  { code: 'PH', name: 'Philippines', lat: 14.5995, lng: 120.9842 },
  { code: 'US', name: 'United States', lat: 38.9072, lng: -77.0369 },
  { code: 'JP', name: 'Japan', lat: 35.6762, lng: 139.6503 },
  { code: 'GB', name: 'United Kingdom', lat: 51.5074, lng: -0.1278 },
  { code: 'SG', name: 'Singapore', lat: 1.3521, lng: 103.8198 },
  { code: 'DE', name: 'Germany', lat: 52.5200, lng: 13.4050 },
  { code: 'AU', name: 'Australia', lat: -33.8688, lng: 151.2093 },
  { code: 'BR', name: 'Brazil', lat: -23.5505, lng: -46.6333 },
  { code: 'IN', name: 'India', lat: 19.0760, lng: 72.8777 },
  { code: 'ZA', name: 'South Africa', lat: -26.2041, lng: 28.0473 },
  { code: 'AE', name: 'UAE', lat: 25.2048, lng: 55.2708 },
  { code: 'CA', name: 'Canada', lat: 43.6532, lng: -79.3832 },
  { code: 'KR', name: 'South Korea', lat: 37.5665, lng: 126.9780 },
  { code: 'MX', name: 'Mexico', lat: 19.4326, lng: -99.1332 },
  { code: 'NG', name: 'Nigeria', lat: 6.5244, lng: 3.3792 },
];
const COUNTRY_AT = Object.fromEntries(COUNTRIES.map((c) => [c.code, c])) as Record<string, Country>;
const POOL = COUNTRIES.filter((c) => c.code !== 'PH');

const randomFrom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

/* Module-level — same object-identity-stability reasoning as Hero.tsx's own
   GLOBE_DOTS constant (see that file): these feed globe.tsx's scene-setup
   effect dependency array, so a fresh literal on every render would tear
   down and rebuild the whole WebGL scene. */
const GLOBE_DOTS = { color: GLOBE_LINE_COLOR, size: 5, density: 8, allDots: false };
const GLOBE_STYLE = { width: '100%', height: '100%' };

/** Same conversion globe.tsx uses internally (it isn't exported, so this is
 *  a small deliberate duplicate — arcs have to land on the same unit
 *  sphere the dots/continents already use, or they won't line up). */
function latLngToVector3(lat: number, lng: number): Vector3 {
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  return new Vector3(
    Math.cos(latRad) * Math.sin(lngRad),
    Math.sin(latRad),
    Math.cos(latRad) * Math.cos(lngRad),
  );
}

/* Altitude scaled by the two points' actual angular distance (nearby
   countries get a low, subtle rise; only the longest routes bulge
   noticeably) — pulled down further from an earlier pass so routes hug
   the surface rather than reading as a separate floating layer. */
const ARC_ALTITUDE_MIN = 0.035;
const ARC_ALTITUDE_MAX = 0.12;
const ARC_STROKE = 0.4;           // thinner tube — was a much heavier 0.65
const ARC_BASE_OPACITY = 0.55;    // sits below the globe's own (fully opaque) lines
const ARC_SEGMENTS = 48;
const DASH_COUNT = 7;             // number of visible segments per route
const DASH_RATIO = 0.42;          // fraction of each dash+gap cycle that's visible
const ROUTE_PERIOD_MS = 7000;
const PACKET_LOOP_MS = 4500;      // slower, ambient — a fast dash reads as an alert, not a trade flow
const PACKET_OPACITY = 0.9;       // the one deliberately-brighter element, but not a full white blowout
const ENDPOINT_DOT_RADIUS = 0.012;  // ~landmass-dot scale
const ENDPOINT_GLOW_RADIUS = 0.03;
const ENDPOINT_GLOW_OPACITY = 0.22;
const SWAP_OUT_MS = 400;
const SWAP_GAP_MS = 200;
const SWAP_IN_MS = 400;

/** Great-circle path between two points, lifted into a bulge via spherical
 *  slerp + a sin() altitude curve — 0 lift at both endpoints, max at the
 *  midpoint. Real curve geometry, not a flat 2D arc. */
function buildArcCurve(a: Country, b: Country, globeRadius: number): CatmullRomCurve3 {
  const va = latLngToVector3(a.lat, a.lng);
  const vb = latLngToVector3(b.lat, b.lng);
  const angle = va.angleTo(vb) || 1e-6;
  const altitude = ARC_ALTITUDE_MIN + (angle / Math.PI) * (ARC_ALTITUDE_MAX - ARC_ALTITUDE_MIN);
  const points: Vector3[] = [];
  for (let i = 0; i <= ARC_SEGMENTS; i++) {
    const t = i / ARC_SEGMENTS;
    const s1 = Math.sin((1 - t) * angle) / Math.sin(angle);
    const s2 = Math.sin(t * angle) / Math.sin(angle);
    const dir = va.clone().multiplyScalar(s1).add(vb.clone().multiplyScalar(s2)).normalize();
    const lift = 1 + altitude * Math.sin(Math.PI * t);
    points.push(dir.multiplyScalar(globeRadius * lift));
  }
  return new CatmullRomCurve3(points);
}

/** Breaks the curve into DASH_COUNT short tube segments with gaps between
 *  them, all sharing one material — a broken, segmented line rather than
 *  one continuous stroke, closer to a string of connected points than a
 *  contrasting smooth band. */
function buildDashMeshes(curve: CatmullRomCurve3, globeRadius: number, material: MeshBasicMaterial): Mesh[] {
  const meshes: Mesh[] = [];
  const tubeRadius = ARC_STROKE * 0.01 * globeRadius;
  for (let i = 0; i < DASH_COUNT; i++) {
    const t0 = i / DASH_COUNT;
    const t1 = t0 + DASH_RATIO / DASH_COUNT;
    const steps = 6;
    const segPoints: Vector3[] = [];
    for (let s = 0; s <= steps; s++) {
      const t = Math.min(1, t0 + (t1 - t0) * (s / steps));
      segPoints.push(curve.getPointAt(t));
    }
    const segCurve = new CatmullRomCurve3(segPoints);
    const geometry = new TubeGeometry(segCurve, steps, tubeRadius, 6, false);
    meshes.push(new Mesh(geometry, material));
  }
  return meshes;
}

type ArcLayer = {
  group: Group;
  dashMeshes: Mesh[];
  material: MeshBasicMaterial;
  packet: Mesh;
  packetMaterial: MeshBasicMaterial;
  endpointMeshes: Mesh[];
  dotMaterial: MeshBasicMaterial;
  glowMaterial: MeshBasicMaterial;
  curve: CatmullRomCurve3;
  startCode: string;
  endCode: string;
};

function makeArcLayer(globeGroup: Group, globeRadius: number, a: Country, b: Country): ArcLayer {
  const curve = buildArcCurve(a, b, globeRadius);
  const group = new Group();

  const material = new MeshBasicMaterial({ color: new Color(GLOBE_LINE_COLOR), transparent: true, opacity: 0, depthTest: true });
  const dashMeshes = buildDashMeshes(curve, globeRadius, material);
  dashMeshes.forEach((m) => group.add(m));

  const packetMaterial = new MeshBasicMaterial({ color: new Color('#ffffff'), transparent: true, opacity: 0, depthTest: true });
  const packet = new Mesh(new SphereGeometry(0.016 * globeRadius, 10, 10), packetMaterial);
  packet.position.copy(curve.getPointAt(0));
  group.add(packet);

  // endpoint dot + soft glow pair, at the same scale/color as the landmass dots
  const dotMaterial = new MeshBasicMaterial({ color: new Color(GLOBE_LINE_COLOR), transparent: true, opacity: 0, depthTest: true });
  const glowMaterial = new MeshBasicMaterial({ color: new Color(GLOBE_LINE_COLOR), transparent: true, opacity: 0, depthTest: true });
  const endpointMeshes: Mesh[] = [];
  [curve.getPointAt(0), curve.getPointAt(1)].forEach((pos) => {
    const dot = new Mesh(new SphereGeometry(ENDPOINT_DOT_RADIUS * globeRadius, 8, 8), dotMaterial);
    dot.position.copy(pos);
    group.add(dot);
    endpointMeshes.push(dot);
    const glow = new Mesh(new SphereGeometry(ENDPOINT_GLOW_RADIUS * globeRadius, 8, 8), glowMaterial);
    glow.position.copy(pos);
    group.add(glow);
    endpointMeshes.push(glow);
  });

  globeGroup.add(group);

  return { group, dashMeshes, material, packet, packetMaterial, endpointMeshes, dotMaterial, glowMaterial, curve, startCode: a.code, endCode: b.code };
}

function disposeArcLayer(layer: ArcLayer) {
  layer.group.parent?.remove(layer.group);
  layer.dashMeshes.forEach((m) => m.geometry.dispose());
  layer.material.dispose();
  layer.packet.geometry.dispose();
  layer.packetMaterial.dispose();
  layer.endpointMeshes.forEach((m) => m.geometry.dispose());
  layer.dotMaterial.dispose();
  layer.glowMaterial.dispose();
}

type SlotRuntime = {
  active: ArcLayer;
  fading: ArcLayer | null;
  fadeT0: number;
};

export default function GlobeRoutes() {
  const slotsRef = useRef<SlotRuntime[] | null>(null);
  const globeRadiusRef = useRef(0);
  const globeGroupRef = useRef<Group | null>(null);
  const reducedMotionRef = useRef(false);
  const mountTimeRef = useRef(0);

  const onSceneReady = useCallback(
    ({ globeGroup, globeRadius }: { scene: Scene; camera: PerspectiveCamera; globeGroup: Group; globeRadius: number }) => {
      globeRadiusRef.current = globeRadius;
      globeGroupRef.current = globeGroup;
      mountTimeRef.current = performance.now();

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      reducedMotionRef.current = reduced;

      // Route 1 is always Philippines-anchored; the other two are fully random.
      const initialPairs: [Country, Country][] = [
        [COUNTRY_AT.PH, randomFrom(POOL)],
        [randomFrom(POOL), randomFrom(POOL)],
        [randomFrom(POOL), randomFrom(POOL)],
      ];

      const slots: SlotRuntime[] = initialPairs.map(([a, b]) => {
        const layer = makeArcLayer(globeGroup, globeRadius, a, b);
        return { active: layer, fading: null, fadeT0: 0 };
      });
      slotsRef.current = slots;

      const swapTimers: ReturnType<typeof setTimeout>[] = [];
      const swapIntervals: ReturnType<typeof setInterval>[] = [];

      if (!reduced) {
        function triggerSwap(slotIndex: number) {
          const slot = slotsRef.current?.[slotIndex];
          const group = globeGroupRef.current;
          if (!slot || !group) return;
          if (slot.fading) disposeArcLayer(slot.fading); // guard: shouldn't overlap at 7s intervals
          slot.fading = slot.active;
          slot.fadeT0 = performance.now();
          const t = setTimeout(() => {
            const slot2 = slotsRef.current?.[slotIndex];
            const group2 = globeGroupRef.current;
            if (!slot2 || !group2) return;
            let a: Country;
            let b: Country;
            if (slotIndex === 0) {
              a = COUNTRY_AT.PH; // Philippines stays anchored — only its partner rotates
              b = randomFrom(POOL.filter((c) => c.code !== slot2.active.endCode));
            } else {
              a = randomFrom(POOL);
              b = randomFrom(POOL.filter((c) => c.code !== a.code));
            }
            const layer = makeArcLayer(group2, globeRadiusRef.current, a, b);
            slot2.active = layer;
            slot2.fadeT0 = performance.now();
          }, SWAP_OUT_MS + SWAP_GAP_MS);
          swapTimers.push(t);
        }

        [0, 1, 2].forEach((i) => {
          swapIntervals.push(setInterval(() => triggerSwap(i), ROUTE_PERIOD_MS));
        });
      }

      return () => {
        swapTimers.forEach(clearTimeout);
        swapIntervals.forEach(clearInterval);
        const s = slotsRef.current;
        if (s) {
          s.forEach((slot) => {
            disposeArcLayer(slot.active);
            if (slot.fading) disposeArcLayer(slot.fading);
          });
        }
        slotsRef.current = null;
        globeGroupRef.current = null;
      };
    },
    [],
  );

  const onFrame = useCallback(() => {
    const slots = slotsRef.current;
    if (!slots) return;

    const now = performance.now();
    const reduced = reducedMotionRef.current;

    slots.forEach((slot) => {
      let activeOpacity = 1;
      if (!reduced) {
        if (slot.fading) {
          const outT = Math.min(1, (now - slot.fadeT0) / SWAP_OUT_MS);
          const mul = 1 - outT;
          slot.fading.material.opacity = ARC_BASE_OPACITY * mul;
          slot.fading.packetMaterial.opacity = PACKET_OPACITY * mul;
          slot.fading.dotMaterial.opacity = mul;
          slot.fading.glowMaterial.opacity = ENDPOINT_GLOW_OPACITY * mul;
          if (outT >= 1) {
            disposeArcLayer(slot.fading);
            slot.fading = null;
          }
        }
        const inElapsed = now - slot.fadeT0;
        activeOpacity = slot.fading ? 0 : Math.min(1, inElapsed / SWAP_IN_MS);
      }
      slot.active.material.opacity = ARC_BASE_OPACITY * activeOpacity;
      slot.active.packetMaterial.opacity = PACKET_OPACITY * activeOpacity;
      slot.active.dotMaterial.opacity = activeOpacity;
      slot.active.glowMaterial.opacity = ENDPOINT_GLOW_OPACITY * activeOpacity;

      if (!reduced) {
        const dashT = ((now - mountTimeRef.current) % PACKET_LOOP_MS) / PACKET_LOOP_MS;
        slot.active.packet.position.copy(slot.active.curve.getPointAt(dashT));
      }
    });
  }, []);

  return (
    <Globe
      scale={8}
      stopOnHover
      initialLatitude={23}
      initialLongitude={-23}
      fill="dots"
      dots={GLOBE_DOTS}
      showOutline
      outlineColor={GLOBE_LINE_COLOR}
      showGrid
      graticuleColor={GLOBE_LINE_COLOR}
      oceanColor="#05070c"
      style={GLOBE_STYLE}
      onSceneReady={onSceneReady}
      onFrame={onFrame}
    />
  );
}
