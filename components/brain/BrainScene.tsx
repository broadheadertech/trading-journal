'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { Stage } from '@/lib/types';
import { STAGE_COLORS, STAGE_ORDER } from '@/lib/stage-config';
import { BRAIN_VERTS, BRAIN_EDGES } from '@/lib/brain-mesh';

// ─── Seeded PRNG ────────────────────────────────────────────────────
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

// ─── HSL → Three.js Color ──────────────────────────────────────────
function hslToColor(hsl: string): THREE.Color {
  const m = hsl.match(/hsl\(\s*([\d.]+)[,\s]+([\d.]+)%[,\s]+([\d.]+)%/);
  if (!m) return new THREE.Color(0x6366f1);
  return new THREE.Color().setHSL(
    parseFloat(m[1]) / 360,
    parseFloat(m[2]) / 100,
    parseFloat(m[3]) / 100,
  );
}

// ─── Pre-compute full brain wireframe from real mesh ────────────────
const TOTAL_VERTS = BRAIN_VERTS.length / 3;
const TOTAL_EDGES = BRAIN_EDGES.length / 2;

// Full vertex positions array
const ALL_VERTEX_POS = new Float32Array(TOTAL_VERTS * 3);
for (let i = 0; i < TOTAL_VERTS; i++) {
  ALL_VERTEX_POS[i * 3] = BRAIN_VERTS[i * 3];
  ALL_VERTEX_POS[i * 3 + 1] = BRAIN_VERTS[i * 3 + 1];
  ALL_VERTEX_POS[i * 3 + 2] = BRAIN_VERTS[i * 3 + 2];
}

// Full edge positions array
const ALL_EDGE_POS = new Float32Array(TOTAL_EDGES * 6);
for (let i = 0; i < TOTAL_EDGES; i++) {
  const a = BRAIN_EDGES[i * 2];
  const b = BRAIN_EDGES[i * 2 + 1];
  ALL_EDGE_POS[i * 6] = BRAIN_VERTS[a * 3];
  ALL_EDGE_POS[i * 6 + 1] = BRAIN_VERTS[a * 3 + 1];
  ALL_EDGE_POS[i * 6 + 2] = BRAIN_VERTS[a * 3 + 2];
  ALL_EDGE_POS[i * 6 + 3] = BRAIN_VERTS[b * 3];
  ALL_EDGE_POS[i * 6 + 4] = BRAIN_VERTS[b * 3 + 1];
  ALL_EDGE_POS[i * 6 + 5] = BRAIN_VERTS[b * 3 + 2];
}

// ─── Stage-based subsampling: show subset of edges ──────────────────
function subsampleBrain(
  fraction: number,
  seed: number,
): {
  vertices: Float32Array;
  edgePositions: Float32Array;
  edgeColors: Float32Array;
  edgeCount: number;
} {
  if (fraction >= 1) {
    // Build colors for full mesh
    const fullColors = new Float32Array(TOTAL_EDGES * 6);
    for (let i = 0; i < TOTAL_EDGES; i++) {
      for (let v = 0; v < 2; v++) {
        const off = i * 6 + v * 3;
        const py = ALL_EDGE_POS[off + 1];
        const pz = ALL_EDGE_POS[off + 2];
        const hue = ((py + 1.8) / 3.6 * 0.55 + (pz + 1.8) / 3.6 * 0.45 + 0.55) % 1.0;
        const c = new THREE.Color().setHSL(hue, 0.55, 0.72);
        fullColors[off] = c.r;
        fullColors[off + 1] = c.g;
        fullColors[off + 2] = c.b;
      }
    }
    return {
      vertices: ALL_VERTEX_POS,
      edgePositions: ALL_EDGE_POS,
      edgeColors: fullColors,
      edgeCount: TOTAL_EDGES,
    };
  }

  const rand = seededRandom(seed);
  const targetEdges = Math.floor(TOTAL_EDGES * fraction);

  // Select random edges
  const selectedEdges: number[] = [];
  const usedVerts = new Set<number>();

  // Shuffle indices and pick first N
  const indices = Array.from({ length: TOTAL_EDGES }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  for (let i = 0; i < targetEdges; i++) {
    const ei = indices[i];
    selectedEdges.push(ei);
    usedVerts.add(BRAIN_EDGES[ei * 2]);
    usedVerts.add(BRAIN_EDGES[ei * 2 + 1]);
  }

  // Build edge positions
  const edgePositions = new Float32Array(selectedEdges.length * 6);
  for (let i = 0; i < selectedEdges.length; i++) {
    const src = selectedEdges[i] * 6;
    edgePositions[i * 6] = ALL_EDGE_POS[src];
    edgePositions[i * 6 + 1] = ALL_EDGE_POS[src + 1];
    edgePositions[i * 6 + 2] = ALL_EDGE_POS[src + 2];
    edgePositions[i * 6 + 3] = ALL_EDGE_POS[src + 3];
    edgePositions[i * 6 + 4] = ALL_EDGE_POS[src + 4];
    edgePositions[i * 6 + 5] = ALL_EDGE_POS[src + 5];
  }

  // Build vertex positions (only used vertices)
  const vertArr = Array.from(usedVerts);
  const vertices = new Float32Array(vertArr.length * 3);
  for (let i = 0; i < vertArr.length; i++) {
    const vi = vertArr[i];
    vertices[i * 3] = BRAIN_VERTS[vi * 3];
    vertices[i * 3 + 1] = BRAIN_VERTS[vi * 3 + 1];
    vertices[i * 3 + 2] = BRAIN_VERTS[vi * 3 + 2];
  }

  // Build iridescent vertex colors for edges (position-based rainbow)
  const edgeColors = new Float32Array(selectedEdges.length * 6);
  for (let i = 0; i < selectedEdges.length; i++) {
    for (let v = 0; v < 2; v++) {
      const off = i * 6 + v * 3;
      const py = edgePositions[off + 1]; // height
      const pz = edgePositions[off + 2]; // depth
      // Map position to hue — creates holographic band effect
      const hue = ((py + 1.8) / 3.6 * 0.55 + (pz + 1.8) / 3.6 * 0.45 + 0.55) % 1.0;
      const c = new THREE.Color().setHSL(hue, 0.55, 0.72);
      edgeColors[off] = c.r;
      edgeColors[off + 1] = c.g;
      edgeColors[off + 2] = c.b;
    }
  }

  return { vertices, edgePositions, edgeColors, edgeCount: selectedEdges.length };
}

// ─── Signal Pulses ──────────────────────────────────────────────────
function SignalPulses({
  edgePositions,
  edgeCount,
  signalCount,
  signalColor,
}: {
  edgePositions: Float32Array;
  edgeCount: number;
  signalCount: number;
  signalColor: THREE.Color;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const signalState = useRef<{ edge: number; t: number; speed: number }[]>([]);

  useMemo(() => {
    const rand = seededRandom(777);
    signalState.current = Array.from({ length: signalCount }, () => ({
      edge: Math.floor(rand() * edgeCount),
      t: rand(),
      speed: 0.4 + rand() * 0.8,
    }));
  }, [signalCount, edgeCount]);

  const positions = useMemo(
    () => new Float32Array(signalCount * 3),
    [signalCount],
  );

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.attributes.position;
    if (!posAttr) return;
    const arr = posAttr.array as Float32Array;

    for (let i = 0; i < signalState.current.length; i++) {
      const sig = signalState.current[i];
      sig.t += delta * sig.speed;
      if (sig.t >= 1) {
        sig.t = 0;
        sig.edge = (sig.edge + 1 + Math.floor(Math.random() * 3)) % edgeCount;
      }
      const bi = sig.edge * 6;
      if (bi + 5 >= edgePositions.length) continue;

      arr[i * 3] =
        edgePositions[bi] + (edgePositions[bi + 3] - edgePositions[bi]) * sig.t;
      arr[i * 3 + 1] =
        edgePositions[bi + 1] +
        (edgePositions[bi + 4] - edgePositions[bi + 1]) * sig.t;
      arr[i * 3 + 2] =
        edgePositions[bi + 2] +
        (edgePositions[bi + 5] - edgePositions[bi + 2]) * sig.t;
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={signalColor}
        size={0.08}
        sizeAttenuation
        transparent
        opacity={1}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// ─── Wireframe Brain ────────────────────────────────────────────────
function WireframeBrain({ stage }: { stage: Stage }) {
  const groupRef = useRef<THREE.Group>(null);
  const stageIndex = STAGE_ORDER.indexOf(stage);

  const accentColor = useMemo(
    () => hslToColor(STAGE_COLORS[stage].accent),
    [stage],
  );
  const innerColor = useMemo(
    () => new THREE.Color().setHSL(10 / 360, 0.9, 0.42 + stageIndex * 0.02),
    [stageIndex],
  );

  // Stage maturation: fraction of edges shown
  const edgeFraction = 0.06 + stageIndex * 0.14;  // 0.06 → 0.90
  const brainScale = 0.55 + stageIndex * 0.08;    // 0.55 → 1.03
  const edgeOpacity = 0.35 + stageIndex * 0.06;   // 0.35 → 0.71
  const signalCount = 6 + stageIndex * 12;         // 6 → 78
  const nodeSize = 0.03 + stageIndex * 0.004;      // 0.03 → 0.054

  const signalColor = useMemo(() => {
    const c = accentColor.clone();
    c.lerp(new THREE.Color(1, 1, 1), 0.35); // warmer accent, not washed out
    return c;
  }, [accentColor]);

  const { vertices, edgePositions, edgeColors, edgeCount } = useMemo(
    () => subsampleBrain(edgeFraction, 42),
    [edgeFraction],
  );

  useFrame(() => {
    if (groupRef.current) {
      const t = Date.now() * 0.001;
      const s = brainScale * (1 + Math.sin(t * 1.2) * 0.008);
      groupRef.current.scale.setScalar(s);
    }
  });

  return (
    <group ref={groupRef} scale={brainScale}>
      {/* Layer 1: Stage accent base wireframe (the dominant color) */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[edgePositions, 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color={accentColor}
          transparent
          opacity={edgeOpacity}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>

      {/* Layer 2: Iridescent rainbow shimmer (subtle overlay) */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[edgePositions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[edgeColors, 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={0.12 + stageIndex * 0.015}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>

      {/* Vertex nodes: accent-tinted with white highlight */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[vertices, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          color={accentColor}
          size={nodeSize}
          sizeAttenuation
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* Inner glow: stage accent */}
      <mesh>
        <sphereGeometry args={[0.45, 16, 16]} />
        <meshBasicMaterial
          color={accentColor}
          transparent
          opacity={0.05 + stageIndex * 0.01}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Atmospheric halo: stage accent */}
      <mesh>
        <sphereGeometry args={[2.0, 24, 24]} />
        <meshBasicMaterial
          color={accentColor}
          transparent
          opacity={0.02}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Signal pulses */}
      <SignalPulses
        edgePositions={edgePositions}
        edgeCount={edgeCount}
        signalCount={signalCount}
        signalColor={signalColor}
      />
    </group>
  );
}

// ─── Background Particles ───────────────────────────────────────────
function BackgroundParticles({ color }: { color: THREE.Color }) {
  const pointsRef = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const rand = seededRandom(99);
    const count = 250;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (rand() - 0.5) * 12;
      arr[i * 3 + 1] = (rand() - 0.5) * 12;
      arr[i * 3 + 2] = (rand() - 0.5) * 12;
    }
    return arr;
  }, []);

  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.012;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.02}
        sizeAttenuation
        transparent
        opacity={0.4}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// ─── Scene ──────────────────────────────────────────────────────────
function Scene({ stage }: { stage: Stage }) {
  const accentColor = useMemo(
    () => hslToColor(STAGE_COLORS[stage].accent),
    [stage],
  );

  return (
    <>
      <ambientLight intensity={0.05} />
      <pointLight
        position={[0, 0, 0]}
        intensity={0.25}
        color={0xddeeff}
        distance={5}
      />
      <pointLight
        position={[3, 2, 2]}
        intensity={0.2}
        color={accentColor}
        distance={8}
      />

      <WireframeBrain stage={stage} />
      <BackgroundParticles color={accentColor} />

      <OrbitControls
        enableZoom={false}
        enablePan={false}
      />

      <EffectComposer>
        <Bloom
          luminanceThreshold={0.15}
          luminanceSmoothing={0.9}
          intensity={1.3}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}

// ─── Exported Canvas Wrapper ────────────────────────────────────────
interface BrainSceneProps {
  stage: Stage;
  className?: string;
}

export default function BrainScene({ stage, className }: BrainSceneProps) {
  return (
    <div className={className} aria-hidden="true">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0.4, 3.8], fov: 50 }}
        style={{ background: 'transparent' }}
        gl={{ antialias: true, alpha: true }}
      >
        <Scene stage={stage} />
      </Canvas>
    </div>
  );
}
