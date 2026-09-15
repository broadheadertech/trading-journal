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

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  Texture,
  TubeGeometry,
  Vector3,
} from 'three';
import Globe from '@/components/originkit/ui/hero-24/globe';
import { FlagArt, type FlagCode } from '@/components/landing/atlasFlagIcons';

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

/** Coordinate sanity check before a pairing is committed to the scene. The
 *  pool is a static table today, so this cannot currently fail — it is a guard
 *  against a future edit introducing a bad entry, because a single NaN
 *  propagates through the slerp into TubeGeometry and takes down the whole
 *  WebGL frame rather than just dropping one arc. */
function isValidArc(a: Country, b: Country): boolean {
  return [a.lat, a.lng, b.lat, b.lng].every((v) => typeof v === 'number' && Number.isFinite(v));
}

/** Picks a partner country that is not already an endpoint anywhere on the
 *  globe, so two concurrent routes never land a marker on the same coordinate
 *  — stacked dots read as one brighter dot and break the even landmass-dot
 *  texture the markers are meant to blend into. */
function pickUnused(used: Set<string>, exclude?: string): Country {
  const free = POOL.filter((c) => !used.has(c.code) && c.code !== exclude);
  return randomFrom(free.length ? free : POOL.filter((c) => c.code !== exclude));
}

/* Module-level — same object-identity-stability reasoning as Hero.tsx's own
   GLOBE_DOTS constant (see that file): these feed globe.tsx's scene-setup
   effect dependency array, so a fresh literal on every render would tear
   down and rebuild the whole WebGL scene. */
const GLOBE_DOTS = { color: GLOBE_LINE_COLOR, size: 5, density: 8, allDots: false };
/* Phone variant. globe.tsx maps density 1..10 onto a dot SPACING of 24..8px
   (mapDensityUiToSpacing), so a LOWER density means fewer, wider-spaced dots:
   8 -> 6 moves spacing 8px -> ~13.3px, which is roughly 2.8x fewer landmass
   dots to build and draw. Also module-level for the same reference-stability
   reason as GLOBE_DOTS above. */
const GLOBE_DOTS_MOBILE = { color: GLOBE_LINE_COLOR, size: 5, density: 6, allDots: false };
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
const ARC_STROKE = 0.35;          // thinner tube — was a much heavier 0.65
const ARC_BASE_OPACITY = 0.55;    // sits below the globe's own (fully opaque) lines
/* Halo pass. Glow comes from a second, wider tube at very low alpha drawn
   behind the core stroke — NOT from thickening the core, which would break the
   thin-wireframe line language the globe is built from. Same hex as the core;
   only the radius and alpha differ. */
const ARC_GLOW_STROKE = 1.0;
const ARC_GLOW_OPACITY = 0.12;
const ARC_SEGMENTS = 48;
const DASH_COUNT = 7;             // number of visible segments per route
const DASH_RATIO = 0.42;          // fraction of each dash+gap cycle that's visible
const ROUTE_PERIOD_MS = 7000;
const PACKET_LOOP_MS = 4500;      // slower, ambient — a fast dash reads as an alert, not a trade flow
/* The travelling packet was pure white at .9 alpha, which made it the single
   hottest thing on screen — three white dots read as the focal point, above
   the globe's own fully-opaque #D99405 lines. Moved onto the globe's hex at
   .85 so it is still the brightest point OF A ROUTE without outranking the
   globe itself. */
const PACKET_COLOR = GLOBE_LINE_COLOR;
const PACKET_OPACITY = 0.85;
const ENDPOINT_DOT_RADIUS = 0.012;  // ~landmass-dot scale
const ENDPOINT_GLOW_RADIUS = 0.03;
const ENDPOINT_GLOW_OPACITY = 0.22;
/* ---- planted flag pins ---------------------------------------------------
   Flags are permanent scene geometry standing on the sphere, not a DOM
   overlay: real Object3Ds parented to globeGroup, so they inherit the globe's
   rotation and are depth-tested against the ocean sphere for free — they slide
   round the limb and get occluded by the far side with no extra code, and they
   silhouette above the horizon exactly like pins on a physical globe.

   Sizes are fractions of globeRadius so they hold at any canvas size. Kept
   small deliberately: full-colour flags are the only non-amber element in the
   frame, so they earn their place by being pin-scale rather than badge-scale. */
const FLAG_POLE_LEN = 0.085;
const FLAG_POLE_RADIUS = 0.0022;
const FLAG_W = 0.085;
const FLAG_H = FLAG_W * (12 / 18);  // the art is authored in an 18x12 box
const FLAG_OPACITY = 0.95;
/* Sizes are fractions of globeRadius, so they shrink with the canvas. At the
   280px mobile hero globe that put a flag at ~9px wide — a coloured speck, not
   a flag. Phones get a bigger angular size so the art still reads. */
const FLAG_SCALE_MOBILE = 1.6;

/* Scratch objects for the per-frame billboard. Module-level and reused: the
   loop runs 6 pins x 60fps, and allocating fresh Vector3/Quaternion/Matrix4
   there would hand the GC ~2000 short-lived objects a second. */
const _wp = new Vector3();
const _up = new Vector3();
const _toCam = new Vector3();
const _right = new Vector3();
const _fwd = new Vector3();
const _m = new Matrix4();
const _q = new Quaternion();
const _worldQ = new Quaternion();

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
function buildDashMeshes(
  curve: CatmullRomCurve3,
  globeRadius: number,
  material: MeshBasicMaterial,
  stroke: number = ARC_STROKE,
): Mesh[] {
  const meshes: Mesh[] = [];
  const tubeRadius = stroke * 0.01 * globeRadius;
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

/* One Texture per country, built once and shared by every pin that needs it.
   The art comes from atlasFlagIcons.tsx — the same 15 flags, reused rather
   than redrawn: the component renders them into a hidden <svg> block, and this
   serialises those live nodes to a blob and decodes them into a texture. That
   keeps a single source of truth for the artwork. */
const flagTextures = new Map<string, Texture>();
const flagPending = new Map<string, Promise<Texture | null>>();

function loadFlagTexture(code: string, svg: SVGSVGElement): Promise<Texture | null> {
  const cached = flagPending.get(code);
  if (cached) return cached;

  const p = new Promise<Texture | null>((resolve) => {
    const markup = new XMLSerializer().serializeToString(svg);
    const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }));
    const img = new Image();
    img.onload = () => {
      // rasterise at a fixed size — the flags are ~40px on screen, so 144x96
      // is plenty and keeps all 15 textures tiny
      const canvas = document.createElement('canvas');
      canvas.width = 144;
      canvas.height = 96;
      const ctx = canvas.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(url); resolve(null); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const tex = new Texture(canvas);
      tex.colorSpace = SRGBColorSpace;
      tex.needsUpdate = true;
      flagTextures.set(code, tex);
      resolve(tex);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });

  flagPending.set(code, p);
  return p;
}

/** Pole + flag standing on the surface at `position`. Returned as a Group so
 *  the per-frame billboard only has to orient one object per endpoint. */
function makeFlagPin(globeRadius: number, position: Vector3, code: string, scale: number) {
  const pin = new Group();
  pin.position.copy(position);

  const poleLen = FLAG_POLE_LEN * globeRadius * scale;
  const poleR = FLAG_POLE_RADIUS * globeRadius * scale;
  const poleGeo = new CylinderGeometry(poleR, poleR, poleLen, 5);
  // CylinderGeometry is centred on its own origin and runs along +Y; shift it
  // so the base sits exactly on the sphere surface and it grows outward
  poleGeo.translate(0, poleLen / 2, 0);
  const poleMat = new MeshBasicMaterial({ color: new Color(GLOBE_LINE_COLOR), transparent: true, opacity: 0, depthTest: true });
  pin.add(new Mesh(poleGeo, poleMat));

  const w = FLAG_W * globeRadius * scale;
  const h = FLAG_H * globeRadius * scale;
  const flagGeo = new PlaneGeometry(w, h);
  // hang the cloth off one side of the pole rather than centring it on it
  flagGeo.translate(w / 2, poleLen - h / 2, 0);
  const flagMat = new MeshBasicMaterial({
    map: flagTextures.get(code) ?? null,
    transparent: true,
    opacity: 0,
    side: DoubleSide,      // readable from either side as the globe turns
    depthTest: true,
  });
  const flagMesh = new Mesh(flagGeo, flagMat);
  pin.add(flagMesh);

  return { pin, poleGeo, poleMat, flagGeo, flagMat, flagMesh, code };
}

type FlagPin = ReturnType<typeof makeFlagPin>;

type ArcLayer = {
  group: Group;
  dashMeshes: Mesh[];
  material: MeshBasicMaterial;
  glowDashMeshes: Mesh[];
  glowArcMaterial: MeshBasicMaterial;
  packet: Mesh;
  packetMaterial: MeshBasicMaterial;
  endpointMeshes: Mesh[];
  /** Endpoint positions in globeGroup-local space, tagged with the country
   *  they belong to — the lookup table the hover projection walks. */
  endpoints: { country: Country; position: Vector3 }[];
  flagPins: FlagPin[];
  dotMaterial: MeshBasicMaterial;
  glowMaterial: MeshBasicMaterial;
  curve: CatmullRomCurve3;
  startCode: string;
  endCode: string;
};

function makeArcLayer(globeGroup: Group, globeRadius: number, a: Country, b: Country, flagScale: number): ArcLayer {
  const curve = buildArcCurve(a, b, globeRadius);
  const group = new Group();

  /* Halo first, so the core stroke draws over it. Both passes keep
     depthTest:true, which is what lets the sphere mesh occlude the far half of
     every arc for free — the depth falloff in the brief needs no per-point
     work as long as the base alphas stay modest. */
  const glowArcMaterial = new MeshBasicMaterial({ color: new Color(GLOBE_LINE_COLOR), transparent: true, opacity: 0, depthTest: true });
  const glowDashMeshes = buildDashMeshes(curve, globeRadius, glowArcMaterial, ARC_GLOW_STROKE);
  glowDashMeshes.forEach((m) => group.add(m));

  const material = new MeshBasicMaterial({ color: new Color(GLOBE_LINE_COLOR), transparent: true, opacity: 0, depthTest: true });
  const dashMeshes = buildDashMeshes(curve, globeRadius, material);
  dashMeshes.forEach((m) => group.add(m));

  const packetMaterial = new MeshBasicMaterial({ color: new Color(PACKET_COLOR), transparent: true, opacity: 0, depthTest: true });
  const packet = new Mesh(new SphereGeometry(0.016 * globeRadius, 10, 10), packetMaterial);
  packet.position.copy(curve.getPointAt(0));
  group.add(packet);

  // endpoint dot + soft glow pair, at the same scale/color as the landmass dots
  const dotMaterial = new MeshBasicMaterial({ color: new Color(GLOBE_LINE_COLOR), transparent: true, opacity: 0, depthTest: true });
  const glowMaterial = new MeshBasicMaterial({ color: new Color(GLOBE_LINE_COLOR), transparent: true, opacity: 0, depthTest: true });
  const endpointMeshes: Mesh[] = [];
  const endpoints: { country: Country; position: Vector3 }[] = [];
  const flagPins: FlagPin[] = [];
  [curve.getPointAt(0), curve.getPointAt(1)].forEach((pos, i) => {
    const country = i === 0 ? a : b;
    endpoints.push({ country, position: pos.clone() });

    /* The pole must start at the SURFACE, but the arc endpoint is already
       lifted by the altitude curve — at t=0/t=1 that lift is zero, so this is
       the surface point. Normalising anyway keeps it exact if the curve ever
       gains end lift. */
    const surface = pos.clone().normalize().multiplyScalar(globeRadius);
    const flag = makeFlagPin(globeRadius, surface, country.code, flagScale);
    group.add(flag.pin);
    flagPins.push(flag);
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

  return { group, dashMeshes, material, glowDashMeshes, glowArcMaterial, packet, packetMaterial, endpointMeshes, endpoints, flagPins, dotMaterial, glowMaterial, curve, startCode: a.code, endCode: b.code };
}

function disposeArcLayer(layer: ArcLayer) {
  layer.group.parent?.remove(layer.group);
  layer.dashMeshes.forEach((m) => m.geometry.dispose());
  layer.material.dispose();
  layer.glowDashMeshes.forEach((m) => m.geometry.dispose());
  layer.glowArcMaterial.dispose();
  layer.packet.geometry.dispose();
  layer.packetMaterial.dispose();
  layer.endpointMeshes.forEach((m) => m.geometry.dispose());
  layer.dotMaterial.dispose();
  layer.glowMaterial.dispose();
  /* Geometry and materials are per-pin and must go; the flag TEXTURE is
     deliberately left alive in the shared module cache, since the same country
     reappears across swaps and re-rasterising it each time would be wasteful. */
  layer.flagPins.forEach((f) => {
    f.poleGeo.dispose();
    f.poleMat.dispose();
    f.flagGeo.dispose();
    f.flagMat.dispose();
  });
}

type SlotRuntime = {
  active: ArcLayer;
  fading: ArcLayer | null;
  fadeT0: number;
  /** Codes this slot has committed to but not yet swapped in. A swap picks its
   *  pairing at t and installs it at t+600ms, so without this the other slots
   *  would keep picking against the pre-swap state and could choose the same
   *  country — which is exactly how two concurrent routes both ended up on
   *  Germany in testing. */
  pending: [string, string] | null;
};

export default function GlobeRoutes() {
  /* Lazy initialiser, not an effect: the value has to be correct on the very
     first render or the scene-setup effect builds the dense globe and then
     tears the whole thing down to rebuild it. Safe to read matchMedia during
     render here because it feeds WebGL geometry only — it never changes the
     SSR'd markup, so there is nothing for hydration to mismatch on. */
  const [isMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
  );
  /* The hero has two different globe treatments, and `scale` has to match the
     one in play: globe.tsx derives apparent size from scale alone (radius =
     multiplier, cameraDistance = 2.5 / multiplier), independent of the box.
     9.5 was chosen for the centred stack's 380px container, where 8 filled
     only ~68% of the box. The restored desktop hero gives the globe the full
     right-hand column instead (835x900 at 1440px), and 9.5 there overflows and
     crops the sphere — 8 is the value that frames it in that column. Same
     lazy-read reasoning as isMobile above. */
  const [isWideHero] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1181px)').matches
  );
  /** Hidden <svg> source block the flag textures are rasterised from. */
  const flagSrcRef = useRef<HTMLDivElement | null>(null);

  const slotsRef = useRef<SlotRuntime[] | null>(null);
  const globeRadiusRef = useRef(0);
  const globeGroupRef = useRef<Group | null>(null);
  const reducedMotionRef = useRef(false);
  const mountTimeRef = useRef(0);

  /* Rasterise all 15 flags once on mount. The scene may already have built its
     pins by the time a texture resolves (makeArcLayer runs from onSceneReady,
     which can fire first), so each resolved texture is also back-filled onto
     any live pin waiting for it — otherwise the first three routes would show
     bare poles until their first swap. */
  useEffect(() => {
    const host = flagSrcRef.current;
    if (!host) return;
    let cancelled = false;

    host.querySelectorAll('svg[data-code]').forEach((node) => {
      const code = node.getAttribute('data-code');
      if (!code) return;
      loadFlagTexture(code, node as SVGSVGElement).then((tex) => {
        if (cancelled || !tex) return;
        slotsRef.current?.forEach((slot) => {
          [slot.active, slot.fading].forEach((layer) => {
            layer?.flagPins.forEach((f) => {
              if (f.code !== code || f.flagMat.map) return;
              f.flagMat.map = tex;
              f.flagMat.needsUpdate = true;
            });
          });
        });
      });
    });

    return () => { cancelled = true; };
  }, []);

  const onSceneReady = useCallback(
    ({ globeGroup, globeRadius }: { scene: Scene; camera: PerspectiveCamera; globeGroup: Group; globeRadius: number }) => {
      globeRadiusRef.current = globeRadius;
      globeGroupRef.current = globeGroup;
      mountTimeRef.current = performance.now();
      const flagScale = isMobile ? FLAG_SCALE_MOBILE : 1;

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      reducedMotionRef.current = reduced;

      /* Exactly 3 concurrent routes at every viewport, all seeded here on
         mount rather than populated over time. Slot 0 is permanently
         Philippines-anchored — only its partner ever rotates. Partners are
         drawn without replacement so no two routes share an endpoint. */
      const used = new Set<string>(['PH']);
      const take = (exclude?: string) => {
        const c = pickUnused(used, exclude);
        used.add(c.code);
        return c;
      };
      const initialPairs: [Country, Country][] = [
        [COUNTRY_AT.PH, take()],
        [take(), take()],
        [take(), take()],
      ];

      const slots: SlotRuntime[] = initialPairs
        .filter(([a, b]) => isValidArc(a, b))
        .map(([a, b]) => {
          const layer = makeArcLayer(globeGroup, globeRadius, a, b, flagScale);
          return { active: layer, fading: null, fadeT0: 0, pending: null };
        });
      slotsRef.current = slots;

      const swapTimers: ReturnType<typeof setTimeout>[] = [];
      const swapIntervals: ReturnType<typeof setInterval>[] = [];

      if (!reduced) {
        function triggerSwap(slotIndex: number) {
          const slot = slotsRef.current?.[slotIndex];
          const group = globeGroupRef.current;
          if (!slot || !group) return;

          /* Pick and VALIDATE the replacement pairing up front, before any
             fade starts. Doing it inside the timeout below would mean a
             rejected pairing aborts after `slot.active` has already been
             handed to `fading` and disposed, leaving the slot pointing at a
             dead layer and the route gone for good. Bailing here instead
             just leaves the current arc up until the next interval. */
          const inUse = new Set<string>(['PH']);
          slotsRef.current?.forEach((s, i) => {
            if (i === slotIndex) return;
            // a slot mid-swap has already claimed its next pairing
            const [sa, sb] = s.pending ?? [s.active.startCode, s.active.endCode];
            inUse.add(sa);
            inUse.add(sb);
          });

          let a: Country;
          let b: Country;
          if (slotIndex === 0) {
            a = COUNTRY_AT.PH; // Philippines stays anchored — only its partner rotates
            b = pickUnused(inUse, slot.active.endCode);
          } else {
            a = pickUnused(inUse);
            inUse.add(a.code);
            b = pickUnused(inUse, a.code);
          }
          if (!isValidArc(a, b)) return;

          slot.pending = [a.code, b.code];
          if (slot.fading) disposeArcLayer(slot.fading); // guard: shouldn't overlap at 7s intervals
          slot.fading = slot.active;
          slot.fadeT0 = performance.now();
          const t = setTimeout(() => {
            const slot2 = slotsRef.current?.[slotIndex];
            const group2 = globeGroupRef.current;
            if (!slot2 || !group2) return;
            slot2.active = makeArcLayer(group2, globeRadiusRef.current, a, b, flagScale);
            slot2.fadeT0 = performance.now();
            slot2.pending = null;
          }, SWAP_OUT_MS + SWAP_GAP_MS);
          swapTimers.push(t);
        }

        /* Index-driven rather than a hardcoded [0,1,2], and staggered: started
           together, all three routes blinked out and back on the same tick,
           which reads as the whole layer glitching rather than as routes
           rotating. Spreading them over the period also means only one arc is
           ever mid-fade. */
        slots.forEach((_, i) => {
          const offset = Math.round((ROUTE_PERIOD_MS / slots.length) * i);
          const startTimer = setTimeout(() => {
            triggerSwap(i);
            swapIntervals.push(setInterval(() => triggerSwap(i), ROUTE_PERIOD_MS));
          }, ROUTE_PERIOD_MS + offset);
          swapTimers.push(startTimer);
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
    // isMobile comes from a lazy useState and never changes after mount, so
    // this identity is still stable and cannot retrigger globe.tsx's setup
    [isMobile],
  );

  const onFrame = useCallback(({ camera, globeGroup }: { camera: PerspectiveCamera; globeGroup: Group }) => {
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
          slot.fading.glowArcMaterial.opacity = ARC_GLOW_OPACITY * mul;
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
      slot.active.glowArcMaterial.opacity = ARC_GLOW_OPACITY * activeOpacity;
      slot.active.packetMaterial.opacity = PACKET_OPACITY * activeOpacity;
      slot.active.dotMaterial.opacity = activeOpacity;
      slot.active.glowMaterial.opacity = ENDPOINT_GLOW_OPACITY * activeOpacity;

      if (!reduced) {
        const dashT = ((now - mountTimeRef.current) % PACKET_LOOP_MS) / PACKET_LOOP_MS;
        slot.active.packet.position.copy(slot.active.curve.getPointAt(dashT));
      }
    });

    /* ---- flag pins: constrained billboard --------------------------------
       Each pin keeps its pole along the surface normal (so it reads as planted
       in the ground, never tilted) while the cloth turns to face the camera —
       otherwise a flag whose normal pointed away would show as a zero-width
       sliver. Orientation is built in world space, then converted into
       globeGroup's local space, because that is the pins' parent.

       local = inverse(parentWorldQuat) * worldQuat */
    const invParent = globeGroup.getWorldQuaternion(_q).invert();

    // both layers: a fading route must keep billboarding while it fades out,
    // or its flags freeze mid-rotation for the 400ms they remain on screen
    const live: ArcLayer[] = [];
    slots.forEach((s) => { live.push(s.active); if (s.fading) live.push(s.fading); });

    live.forEach((layer) => {
      // the endpoint dot's alpha is already the layer's fade envelope
      const alpha = layer.dotMaterial.opacity;
      layer.flagPins.forEach((f) => {
        f.pin.getWorldPosition(_wp);
        // globe is centred on the origin, so the world position IS the normal
        _up.copy(_wp).normalize();
        _toCam.copy(camera.position).sub(_wp).normalize();
        _right.crossVectors(_up, _toCam);
        if (_right.lengthSq() < 1e-8) _right.set(1, 0, 0);
        _right.normalize();
        _fwd.crossVectors(_right, _up).normalize();
        _m.makeBasis(_right, _up, _fwd);
        _worldQ.setFromRotationMatrix(_m);
        f.pin.quaternion.copy(invParent).multiply(_worldQ);

        f.poleMat.opacity = alpha * 0.55;
        f.flagMat.opacity = alpha * FLAG_OPACITY;
      });
    });
  }, []);

  return (
    <div className="globe-wrap">
      {/* Texture source for the flag pins. Rendered into the DOM (hidden, and
          zero-size so it can never affect layout) rather than built as an SVG
          string, so the pins and the rest of the site share one definition of
          the artwork in atlasFlagIcons.tsx. Read once on mount, then inert. */}
      <div ref={flagSrcRef} aria-hidden="true" className="globe-flag-src">
        {COUNTRIES.map((c) => (
          <svg key={c.code} data-code={c.code} xmlns="http://www.w3.org/2000/svg" width="18" height="12" viewBox="0 0 18 12">
            <FlagArt code={c.code as FlagCode} />
          </svg>
        ))}
      </div>

      <Globe
        /* globe.tsx frames the sphere from scale alone: it sets
           globeRadius = scale-multiplier and cameraDistance = 2.5 / that same
           multiplier, so apparent size grows with the SQUARE of the multiplier
           and is completely independent of the container box. At scale 8 the
           sphere covered only ~68% of its container width (measured: 258px of
           a 380px box), which is why enlarging the CSS box alone still read as
           a small globe floating in dead space. 9.5 fills ~90% instead — but
           only for the centred stack's small box; see isWideHero above. */
        scale={isWideHero ? 8 : 9.5}
        stopOnHover
        initialLatitude={23}
        initialLongitude={-23}
        fill="dots"
        dots={isMobile ? GLOBE_DOTS_MOBILE : GLOBE_DOTS}
        showOutline
        outlineColor={GLOBE_LINE_COLOR}
        showGrid
        graticuleColor={GLOBE_LINE_COLOR}
        oceanColor="#05070c"
        style={GLOBE_STYLE}
        onSceneReady={onSceneReady}
        onFrame={onFrame}
      />
    </div>
  );
}