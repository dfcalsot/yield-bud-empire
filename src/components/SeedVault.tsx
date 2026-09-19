import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { SeedBankItem } from '../types';
import { HudPanel, NeonButton, StatBar } from './game/GameUI';
import { ColdChamber, ColdThermometer, Seed, Trichome } from './icons/CannabisIcons';

/* ───────────────────────────── helpers ───────────────────────────── */

const hash = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Educational Weibull model of seed viability (not a guarantee). */
const viabilityAfter = (years: number, tempC: number): number => {
  const eta = clamp(4 * Math.pow(2, (22 - tempC) / 6), 0.3, 80);
  return 100 * Math.exp(-Math.pow(years / eta, 2.2));
};

/* ─────────────────── seed geometry / material (shared) ─────────────────── */

let seedGeometry: THREE.LatheGeometry | null = null;
const getSeedGeometry = (): THREE.LatheGeometry => {
  if (!seedGeometry) {
    // Ovoid with a pointed micropyle tip (+Y), like a real cannabis seed.
    const profile: Array<[number, number]> = [
      [0, -0.5], [0.13, -0.47], [0.27, -0.38], [0.37, -0.22], [0.41, 0],
      [0.38, 0.2], [0.29, 0.36], [0.15, 0.47], [0.05, 0.54], [0, 0.57],
    ];
    seedGeometry = new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 24);
    seedGeometry.computeVertexNormals();
  }
  return seedGeometry;
};

const seedMaterials = new Map<string, THREE.MeshStandardMaterial>();
const getSeedMaterial = (tint: string): THREE.MeshStandardMaterial => {
  const cached = seedMaterials.get(tint);
  if (cached) return cached;

  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d')!;
  const base = new THREE.Color(tint).lerp(new THREE.Color('#a8844c'), 0.9);
  g.fillStyle = `#${base.getHexString()}`;
  g.fillRect(0, 0, 256, 128);

  const r = rng(hash(tint));
  for (let i = 0; i < 46; i++) {
    // dark, elongated "tiger" mottling along the seed's long axis
    g.save();
    g.translate(r() * 256, r() * 128);
    g.rotate(Math.PI / 2 + (r() - 0.5) * 0.6);
    const len = 12 + r() * 38;
    const grd = g.createRadialGradient(0, 0, 0, 0, 0, len);
    grd.addColorStop(0, `rgba(30,18,8,${0.5 + r() * 0.35})`);
    grd.addColorStop(1, 'rgba(30,18,8,0)');
    g.fillStyle = grd;
    g.scale(1, (4 + r() * 9) / len);
    g.beginPath();
    g.arc(0, 0, len, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  for (let i = 0; i < 140; i++) {
    g.fillStyle = `rgba(255,236,190,${0.05 + r() * 0.12})`;
    g.fillRect(r() * 256, r() * 128, 1 + r() * 2, 1 + r() * 2);
  }

  const map = new THREE.CanvasTexture(c);
  map.wrapS = THREE.RepeatWrapping;
  map.repeat.set(2, 1);
  map.colorSpace = THREE.SRGBColorSpace;

  const mat = new THREE.MeshStandardMaterial({
    map,
    roughness: 0.3,
    metalness: 0.08,
    emissive: new THREE.Color(tint),
    emissiveIntensity: 0,
  });
  seedMaterials.set(tint, mat);
  return mat;
};

const makeLabelTexture = (name: string, sub: string, tint: string): THREE.CanvasTexture => {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 170;
  const g = c.getContext('2d')!;
  g.fillStyle = 'rgba(6,16,14,0.88)';
  g.fillRect(0, 0, 256, 170);
  g.strokeStyle = tint;
  g.lineWidth = 6;
  g.strokeRect(3, 3, 250, 164);
  g.fillStyle = tint;
  g.fillRect(3, 3, 250, 16);
  g.fillStyle = '#e8fff6';
  g.font = '700 30px sans-serif';
  g.textAlign = 'center';
  const words = name.split(' ');
  const lines = [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')].filter(Boolean);
  lines.forEach((line, i) => g.fillText(line.slice(0, 16), 128, 62 + i * 34));
  g.fillStyle = '#9ec9bb';
  g.font = '500 22px monospace';
  g.fillText(sub, 128, 152);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};

const makeSoftSprite = (inner: string, outer: string, size = 128): THREE.CanvasTexture => {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, inner);
  grd.addColorStop(1, outer);
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
};

const makeFrostTexture = (): THREE.CanvasTexture => {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(size / 2, size / 2, size * 0.32, size / 2, size / 2, size * 0.72);
  grd.addColorStop(0, 'rgba(210,240,255,0)');
  grd.addColorStop(1, 'rgba(225,245,255,0.9)');
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  const r = rng(77);
  for (let i = 0; i < 900; i++) {
    const x = r() * size;
    const y = r() * size;
    const d = Math.hypot(x - size / 2, y - size / 2) / (size * 0.7);
    if (d < 0.5) continue;
    g.fillStyle = `rgba(255,255,255,${0.15 + r() * 0.5 * d})`;
    g.beginPath();
    g.arc(x, y, 0.6 + r() * 2.2, 0, Math.PI * 2);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};

/* ─────────────────────────── 3D: cold chamber ─────────────────────────── */

const COLS = 4;
const SPACING = 1.95;
const ROW_H = 1.95;
const VIAL_SCALE = 1.3;
const Y_OFF = -0.4; // sink shelves so vials + headroom are centred in the cabinet
const CABINET_W = COLS * SPACING + 0.4;

interface VialProps {
  item: SeedBankItem;
  owned: number;
  position: [number, number, number];
  selected: boolean;
  onSelect: () => void;
}

const Vial: React.FC<VialProps> = ({ item, owned, position, selected, onSelect }) => {
  const group = useRef<THREE.Group>(null);
  const hovered = useRef(false);
  const tint = item.strainTemplate.colorTheme || '#34d399';
  const seedCount = Math.min(owned, 14);

  const label = useMemo(
    () => makeLabelTexture(item.name, owned > 0 ? `x${owned}` : 'vacío', tint),
    [item.name, owned, tint],
  );
  useEffect(() => () => label.dispose(), [label]);

  const seedsRef = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = seedsRef.current;
    if (!mesh) return;
    const r = rng(hash(item.id));
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    for (let i = 0; i < seedCount; i++) {
      const layer = Math.floor(i / 4);
      const a = r() * Math.PI * 2;
      const rad = 0.06 + r() * 0.15;
      e.set(r() * Math.PI, r() * Math.PI, r() * Math.PI);
      q.setFromEuler(e);
      const s = 0.2 + r() * 0.03;
      m.compose(
        new THREE.Vector3(Math.cos(a) * rad, -0.36 + layer * 0.1 + r() * 0.03, Math.sin(a) * rad),
        q,
        new THREE.Vector3(s, s, s),
      );
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [seedCount, item.id]);

  useFrame((state, dt) => {
    const grp = group.current;
    if (!grp) return;
    const targetY = position[1] + (selected ? 0.16 : hovered.current ? 0.06 : 0);
    grp.position.y += (targetY - grp.position.y) * Math.min(1, dt * 8);
    const targetS = VIAL_SCALE * (hovered.current || selected ? 1.05 : 1);
    grp.scale.setScalar(grp.scale.x + (targetS - grp.scale.x) * Math.min(1, dt * 8));
    grp.rotation.y = selected ? Math.sin(state.clock.elapsedTime * 0.8) * 0.12 : 0;
  });

  return (
    <group
      ref={group}
      position={position}
      scale={VIAL_SCALE}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        hovered.current = true;
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        hovered.current = false;
        document.body.style.cursor = '';
      }}
    >
      {/* glass body */}
      <mesh>
        <cylinderGeometry args={[0.38, 0.38, 0.96, 28, 1, true]} />
        <meshStandardMaterial color="#bfefff" transparent opacity={0.16} roughness={0.05} metalness={0.1} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, -0.48, 0]}>
        <cylinderGeometry args={[0.38, 0.38, 0.03, 28]} />
        <meshStandardMaterial color="#bfefff" transparent opacity={0.3} roughness={0.1} />
      </mesh>
      {/* lid */}
      <mesh position={[0, 0.53, 0]}>
        <cylinderGeometry args={[0.4, 0.4, 0.12, 28]} />
        <meshStandardMaterial color="#111c1c" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.41, 0.41, 0.02, 28]} />
        <meshBasicMaterial color={tint} />
      </mesh>
      {/* label */}
      <mesh position={[0, -0.02, 0.385]}>
        <planeGeometry args={[0.6, 0.4]} />
        <meshBasicMaterial map={label} transparent />
      </mesh>
      {/* seeds */}
      {seedCount > 0 && (
        <instancedMesh key={seedCount} ref={seedsRef} args={[getSeedGeometry(), getSeedMaterial(tint), seedCount]} />
      )}
      {/* base glow ring */}
      <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.36, 0.46, 32]} />
        <meshBasicMaterial color={tint} transparent opacity={owned > 0 ? (selected ? 0.95 : 0.5) : 0.12} />
      </mesh>
      {selected && <pointLight color={tint} intensity={3.5} distance={3} position={[0, 0.1, 0.9]} />}
    </group>
  );
};

/** Renders on demand at a fixed rate instead of every display refresh (60–144 Hz): halves GPU/CPU cost. */
const FrameLimiter: React.FC<{ fps: number; active: boolean }> = ({ fps, active }) => {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (!active) return;
    invalidate();
    const id = window.setInterval(() => invalidate(), 1000 / fps);
    return () => window.clearInterval(id);
  }, [fps, active, invalidate]);
  return null;
};

const CameraRig: React.FC<{ rows: number }> = ({ rows }) => {
  const { camera, size, pointer } = useThree();
  useFrame((_, dt) => {
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / size.height;
    const halfFov = THREE.MathUtils.degToRad(cam.fov / 2);
    const needW = (CABINET_W / 2 + 0.25) / (Math.tan(halfFov) * aspect);
    const needH = (rows * ROW_H * 0.5 + 0.5) / Math.tan(halfFov);
    const z = Math.max(needW, needH, 5) + 0.6;
    const k = Math.min(1, dt * 3);
    cam.position.x += (pointer.x * 0.55 - cam.position.x) * k;
    cam.position.y += (pointer.y * 0.3 - cam.position.y) * k;
    cam.position.z += (z - cam.position.z) * k;
    cam.lookAt(0, 0, 0);
  });
  return null;
};

const ChamberScene: React.FC<{
  items: SeedBankItem[];
  inventory: Record<string, number>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  tempRef: React.MutableRefObject<number>;
}> = ({ items, inventory, selectedId, onSelect, tempRef }) => {
  const rows = clamp(Math.ceil(items.length / COLS), 2, 3);
  const slots = items.slice(0, rows * COLS);
  const height = rows * ROW_H + 0.5;

  const lightRef = useRef<THREE.PointLight>(null);
  const stripRef = useRef<THREE.MeshBasicMaterial>(null);
  const frostRef = useRef<THREE.MeshBasicMaterial>(null);
  const mistRefs = useRef<Array<THREE.Sprite | null>>([]);
  const pointsRef = useRef<THREE.Points>(null);
  const pointsMatRef = useRef<THREE.PointsMaterial>(null);

  const frostTex = useMemo(() => makeFrostTexture(), []);
  const mistTex = useMemo(() => makeSoftSprite('rgba(200,235,255,0.9)', 'rgba(200,235,255,0)'), []);
  const dotTex = useMemo(() => makeSoftSprite('rgba(255,255,255,1)', 'rgba(255,255,255,0)', 64), []);

  const flakes = useMemo(() => {
    const n = 140;
    const arr = new Float32Array(n * 3);
    const r = rng(4242);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = (r() - 0.5) * (CABINET_W - 0.6);
      arr[i * 3 + 1] = (r() - 0.5) * height;
      arr[i * 3 + 2] = (r() - 0.5) * 1.7;
    }
    return arr;
  }, [height]);

  const cold = useMemo(() => new THREE.Color('#8fe3ff'), []);
  const warm = useMemo(() => new THREE.Color('#ffc98a'), []);
  const tmp = useMemo(() => new THREE.Color(), []);

  useFrame((state, dt) => {
    const temp = tempRef.current;
    const coldness = clamp((22 - temp) / 40, 0, 1);
    tmp.lerpColors(warm, cold, clamp((26 - temp) / 30, 0, 1));
    if (lightRef.current) lightRef.current.color.copy(tmp);
    if (stripRef.current) stripRef.current.color.copy(tmp);
    if (frostRef.current) frostRef.current.opacity = clamp(coldness * 0.95 - 0.1, 0, 0.7);

    mistRefs.current.forEach((sp, i) => {
      if (!sp) return;
      sp.position.x = Math.sin(state.clock.elapsedTime * 0.12 + i * 2) * 1.6;
      (sp.material as THREE.SpriteMaterial).opacity = coldness * 0.28 * (0.6 + 0.4 * Math.sin(state.clock.elapsedTime * 0.5 + i));
    });

    if (pointsMatRef.current) pointsMatRef.current.opacity = 0.08 + coldness * 0.5;
    if (pointsRef.current) {
      const pos = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const a = pos.array as Float32Array;
      const fall = (0.05 + coldness * 0.18) * dt;
      for (let i = 0; i < a.length; i += 3) {
        a[i + 1] -= fall;
        a[i] += Math.sin(state.clock.elapsedTime * 0.6 + i) * 0.0006;
        if (a[i + 1] < -height / 2) a[i + 1] = height / 2;
      }
      pos.needsUpdate = true;
    }
  });

  const W = CABINET_W;
  return (
    <>
      <CameraRig rows={rows} />
      <ambientLight intensity={0.5} color="#a8dcff" />
      <directionalLight position={[2.5, 4, 6]} intensity={1.6} color="#dff6ff" />
      <pointLight ref={lightRef} position={[0, height / 2 - 0.4, 0.6]} intensity={22} distance={14} decay={1.6} color="#8fe3ff" />

      {/* cabinet shell */}
      <mesh position={[0, 0, -0.95]}>
        <planeGeometry args={[W, height]} />
        <meshStandardMaterial color="#0c191b" metalness={0.65} roughness={0.5} />
      </mesh>
      <mesh position={[-W / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[2, height]} />
        <meshStandardMaterial color="#0a1416" metalness={0.6} roughness={0.55} />
      </mesh>
      <mesh position={[W / 2, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[2, height]} />
        <meshStandardMaterial color="#0a1416" metalness={0.6} roughness={0.55} />
      </mesh>
      <mesh position={[0, -height / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, 2]} />
        <meshStandardMaterial color="#0d1d20" metalness={0.8} roughness={0.25} />
      </mesh>
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[W, 0.16, 2]} />
        <meshStandardMaterial color="#14262a" metalness={0.8} roughness={0.35} />
      </mesh>
      {/* LED strip */}
      <mesh position={[0, height / 2 - 0.1, 0.75]}>
        <boxGeometry args={[W - 0.6, 0.05, 0.08]} />
        <meshBasicMaterial ref={stripRef} color="#8fe3ff" />
      </mesh>

      {/* shelves */}
      {Array.from({ length: rows }, (_, row) => {
        const y = (row - (rows - 1) / 2) * ROW_H + Y_OFF;
        return (
          <group key={row} position={[0, y, 0]}>
            <mesh>
              <boxGeometry args={[W - 0.2, 0.06, 1.5]} />
              <meshStandardMaterial color="#a9c0c4" metalness={0.92} roughness={0.22} />
            </mesh>
            <mesh position={[0, 0.032, 0.74]}>
              <boxGeometry args={[W - 0.2, 0.01, 0.02]} />
              <meshBasicMaterial color="#5eead4" />
            </mesh>
          </group>
        );
      })}

      {/* vials */}
      {slots.map((item, i) => {
        const row = Math.floor(i / COLS);
        const inRow = Math.min(COLS, slots.length - row * COLS);
        const col = i - row * COLS;
        const x = (col - (inRow - 1) / 2) * SPACING;
        const y = (row - (rows - 1) / 2) * ROW_H + Y_OFF + 0.03 + 0.5 * VIAL_SCALE;
        return (
          <Vial
            key={item.id}
            item={item}
            owned={inventory[item.id] || 0}
            position={[x, y, 0]}
            selected={selectedId === item.id}
            onSelect={() => onSelect(item.id)}
          />
        );
      })}

      {/* cold mist along the floor */}
      {[0, 1, 2].map((i) => (
        <sprite
          key={i}
          ref={(el) => { mistRefs.current[i] = el; }}
          position={[0, -height / 2 + 0.35 + i * 0.12, 0.3 - i * 0.3]}
          scale={[6, 1.4, 1]}
          raycast={() => null}
        >
          <spriteMaterial map={mistTex} transparent depthWrite={false} opacity={0} />
        </sprite>
      ))}

      {/* drifting frost flakes */}
      <points ref={pointsRef} raycast={() => null}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[flakes, 3]} />
        </bufferGeometry>
        <pointsMaterial ref={pointsMatRef} map={dotTex} size={0.035} sizeAttenuation transparent depthWrite={false} blending={THREE.AdditiveBlending} color="#d8f3ff" />
      </points>

      {/* frosted door glass */}
      <mesh position={[0, 0, 1.0]} raycast={() => null}>
        <planeGeometry args={[W + 0.4, height + 0.3]} />
        <meshBasicMaterial ref={frostRef} map={frostTex} transparent opacity={0} depthWrite={false} />
      </mesh>
    </>
  );
};

/* ─────────────────────── 3D: seed inspector + germination ─────────────────────── */

const SEED_S = 1.25;
const TIP_Y = 0.57 * SEED_S;

const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

const InspectorScene: React.FC<{
  tint: string;
  germ: React.MutableRefObject<number>;
  drag: React.MutableRefObject<{ x: number; y: number }>;
  tempRef: React.MutableRefObject<number>;
}> = ({ tint, germ, drag, tempRef }) => {
  const root = useRef<THREE.Group>(null);
  const seed = useRef<THREE.Group>(null);
  const root1 = useRef<THREE.Mesh>(null);
  const coty = useRef<THREE.Group>(null);
  const rimRef = useRef<THREE.PointLight>(null);
  const rimCold = useMemo(() => new THREE.Color('#8fe3ff'), []);
  const rimWarm = useMemo(() => new THREE.Color('#ffc98a'), []);

  useFrame((state, dt) => {
    const t = germ.current;
    const temp = tempRef.current;
    if (rimRef.current) rimRef.current.color.lerpColors(rimWarm, rimCold, clamp((26 - temp) / 30, 0, 1));

    if (root.current) {
      // idle spin + drag; slows once the root emerges
      root.current.rotation.y += dt * (0.7 * (1 - easeOut(t * 2))) + drag.current.x;
      root.current.rotation.x = clamp(root.current.rotation.x + drag.current.y, -0.9, 0.9);
      drag.current.x *= 0.9;
      drag.current.y *= 0.9;
      root.current.position.y = 0.32 * easeOut(t * 2) + Math.sin(state.clock.elapsedTime * 1.4) * 0.04 * (1 - t);
    }
    if (seed.current) {
      // tip (+Y) turns downward as the radicle emerges (gravitropism)
      const tilt = easeOut(t * 3) * Math.PI;
      seed.current.rotation.z += (tilt - seed.current.rotation.z) * Math.min(1, dt * 6);
    }
    if (root1.current) {
      const grow = easeOut((t - 0.12) / 0.55);
      const len = Math.max(0.001, grow * 1.7);
      root1.current.scale.set(1, len, 1);
      root1.current.position.y = TIP_Y + len / 2;
    }
    if (coty.current) {
      const s = easeOut((t - 0.6) / 0.35);
      coty.current.scale.setScalar(Math.max(0.001, s));
      coty.current.visible = s > 0.01;
    }
  });

  return (
    <>
      <ambientLight intensity={0.7} color="#cfe9ff" />
      <directionalLight position={[2, 3, 4]} intensity={2.2} />
      <pointLight ref={rimRef} position={[-2.5, 1, -1.5]} intensity={14} distance={9} color="#8fe3ff" />
      <pointLight position={[0, -0.6, 2]} intensity={2.5} distance={6} color={tint} />
      <group ref={root}>
        <group ref={seed}>
          <mesh geometry={getSeedGeometry()} material={getSeedMaterial(tint)} scale={SEED_S} />
          {/* radicle / taproot */}
          <mesh ref={root1} position={[0, TIP_Y, 0]} scale={[1, 0.001, 1]}>
            <cylinderGeometry args={[0.012, 0.045, 1, 12]} />
            <meshStandardMaterial color="#f4ecd2" emissive="#f4ecd2" emissiveIntensity={0.25} roughness={0.6} />
          </mesh>
          {/* cotyledons appear at the opposite end */}
          <group ref={coty} position={[0, -0.5 * SEED_S - 0.02, 0]} scale={0.001} visible={false}>
            <mesh position={[0.16, -0.08, 0]} rotation={[0, 0, 0.7]} scale={[0.5, 1.1, 0.16]}>
              <sphereGeometry args={[0.2, 20, 16]} />
              <meshStandardMaterial color="#4ade80" emissive="#22c55e" emissiveIntensity={0.5} roughness={0.5} />
            </mesh>
            <mesh position={[-0.16, -0.08, 0]} rotation={[0, 0, -0.7]} scale={[0.5, 1.1, 0.16]}>
              <sphereGeometry args={[0.2, 20, 16]} />
              <meshStandardMaterial color="#4ade80" emissive="#22c55e" emissiveIntensity={0.5} roughness={0.5} />
            </mesh>
          </group>
        </group>
      </group>
    </>
  );
};

/* ─────────────────────────── thermostat gauge ─────────────────────────── */

const T_MIN = -25;
const T_MAX = 35;
const CX = 120;
const CY = 112;
const R = 92;

const polar = (deg: number, r = R) => {
  const rad = (Math.PI / 180) * deg;
  return [CX + r * Math.cos(rad), CY - r * Math.sin(rad)] as const;
};
const tempToDeg = (t: number) => 180 - ((clamp(t, T_MIN, T_MAX) - T_MIN) / (T_MAX - T_MIN)) * 180;
const arcPath = (t0: number, t1: number, r = R) => {
  const [x0, y0] = polar(tempToDeg(t0), r);
  const [x1, y1] = polar(tempToDeg(t1), r);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};

const Thermostat: React.FC<{ temp: number; ideal: boolean }> = ({ temp, ideal }) => {
  const needle = -90 + ((clamp(temp, T_MIN, T_MAX) - T_MIN) / (T_MAX - T_MIN)) * 180;
  const color = ideal ? '#34d399' : temp > 15 ? '#fb923c' : '#38bdf8';
  return (
    <svg viewBox="0 0 240 140" className="w-full max-w-[300px] mx-auto">
      <path d={arcPath(T_MIN, T_MAX)} stroke="#1b3529" strokeWidth="14" fill="none" strokeLinecap="round" />
      <path d={arcPath(4, 8)} stroke="#34d399" strokeWidth="14" fill="none" opacity="0.9" />
      <path d={arcPath(-22, -16)} stroke="#38bdf8" strokeWidth="14" fill="none" opacity="0.9" />
      <path d={arcPath(15, T_MAX)} stroke="#fb923c" strokeWidth="14" fill="none" opacity="0.28" />
      {[-20, -10, 0, 5, 10, 20, 30].map((t) => {
        const [x, y] = polar(tempToDeg(t), R + 15);
        return (
          <text key={t} x={x} y={y + 3} textAnchor="middle" fontSize="8" fill="#6d8479" fontFamily="monospace">
            {t}
          </text>
        );
      })}
      <g style={{ transform: `rotate(${needle}deg)`, transformOrigin: `${CX}px ${CY}px`, transition: 'transform 0.4s ease-out' }}>
        <path d={`M${CX - 3} ${CY} L${CX} ${CY - R + 10} L${CX + 3} ${CY} Z`} fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
      </g>
      <circle cx={CX} cy={CY} r="7" fill="#08130f" stroke={color} strokeWidth="2" />
      <text x={CX} y={CY - 30} textAnchor="middle" fontSize="26" fontWeight="700" fill={color} fontFamily="monospace">
        {temp.toFixed(1)}°C
      </text>
    </svg>
  );
};

/* ───────────────────────────── main component ───────────────────────────── */

const PRESETS = [
  { label: 'Ambiente', temp: 22 },
  { label: 'Refrigerador ideal', temp: 5 },
  { label: 'Congelador', temp: -18 },
];

interface SeedVaultProps {
  seeds: SeedBankItem[];
  inventory: Record<string, number>;
  onPlant?: (seedId: string) => void;
}

export const SeedVault: React.FC<SeedVaultProps> = ({ seeds, inventory, onPlant }) => {
  const [selectedId, setSelectedId] = useState<string | null>(seeds[0]?.id ?? null);
  const [setpoint, setSetpoint] = useState(5);
  const [shownTemp, setShownTemp] = useState(22);
  const tempRef = useRef(22);
  const setpointRef = useRef(setpoint);
  setpointRef.current = setpoint;

  // Compressor pull-down towards the setpoint, with a small hysteresis wobble.
  useEffect(() => {
    let tick = 0;
    const id = window.setInterval(() => {
      tick++;
      const target = setpointRef.current + Math.sin(tick / 9) * 0.25;
      tempRef.current += (target - tempRef.current) * 0.08;
      if (tick % 3 === 0) setShownTemp(tempRef.current);
    }, 100);
    return () => window.clearInterval(id);
  }, []);

  const selected = seeds.find((s) => s.id === selectedId) ?? null;
  const tint = selected?.strainTemplate.colorTheme || '#34d399';
  const owned = selected ? inventory[selected.id] || 0 : 0;

  const isShortIdeal = setpoint >= 4 && setpoint <= 8;
  const isLongIdeal = setpoint <= -15 && setpoint >= -22;
  const ideal = isShortIdeal || isLongIdeal;
  const verdict = isShortIdeal
    ? { text: 'Zona ideal: 4–8 °C, 20–30 % HR', tone: 'text-emerald-300' }
    : isLongIdeal
    ? { text: 'Ideal a largo plazo: −18 °C sellado con sílica', tone: 'text-cyan-300' }
    : setpoint > 15
    ? { text: 'Demasiado cálido: la viabilidad cae rápido', tone: 'text-orange-300' }
    : setpoint < -22 || (setpoint < 4 && setpoint > -15)
    ? { text: 'Zona intermedia: evita ciclos de descongelado', tone: 'text-amber-300' }
    : { text: 'Aceptable, pero no óptimo', tone: 'text-amber-300' };

  // Germination playback
  const germ = useRef(0);
  const [germPct, setGermPct] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const start = performance.now() - germ.current * 6000;
    const step = (now: number) => {
      germ.current = clamp((now - start) / 6000, 0, 1);
      setGermPct(germ.current);
      if (germ.current < 1) raf = requestAnimationFrame(step);
      else setPlaying(false);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing]);
  useEffect(() => {
    germ.current = 0;
    setGermPct(0);
    setPlaying(false);
  }, [selectedId]);

  // Stop both WebGL render loops while the vault is scrolled out of view or the tab is hidden
  const rootRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(!document.hidden);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: '120px' });
    io.observe(el);
    const onVis = () => setTabVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);
  const onScreen = inView && tabVisible;

  const drag = useRef({ x: 0, y: 0 });
  const lastPointer = useRef<{ x: number; y: number } | null>(null);

  const stageLabel =
    germPct === 0 ? 'Latente (dormancia)'
    : germPct < 0.15 ? 'Imbibición'
    : germPct < 0.6 ? 'Radícula emerge'
    : germPct < 1 ? 'Cotiledones abren'
    : 'Plántula lista';

  return (
    <div ref={rootRef} className="grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
      {/* ── 3D cold chamber ── */}
      <HudPanel
        title={<><ColdChamber className="w-4 h-4 text-cyan-300" /> Cámara fría 01 · Bóveda genética</>}
        accessory={
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${ideal ? 'border-emerald-400/50 text-emerald-300 bg-emerald-400/10' : 'border-amber-400/40 text-amber-300 bg-amber-400/10'}`}>
            {ideal ? '● TEMPERATURA IDEAL' : '● AJUSTAR TEMPERATURA'}
          </span>
        }
      >
        <div className="relative mx-3 mb-3 aspect-[3/2] sm:aspect-[16/10] rounded-xl overflow-hidden border border-cyan-300/15 bg-[#04100f]">
          <Canvas
            dpr={[1, 1.25]}
            frameloop="demand"
            camera={{ fov: 38, position: [0, 0, 9], near: 0.1, far: 60 }}
            gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          >
            <color attach="background" args={['#04100f']} />
            <FrameLimiter fps={30} active={onScreen} />
            <ChamberScene items={seeds} inventory={inventory} selectedId={selectedId} onSelect={setSelectedId} tempRef={tempRef} />
          </Canvas>
          <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-cyan-200/80">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse" />
            {shownTemp.toFixed(1)} °C · 25 % HR · sílica activa
          </div>
          <div className="pointer-events-none absolute left-3 bottom-3 hidden sm:block text-[10px] font-mono text-neutral-400">
            Clic en un frasco para inspeccionar · mueve el mouse para mirar dentro
          </div>
        </div>
      </HudPanel>

      {/* ── side column ── */}
      <div className="space-y-5 min-w-0">
        <HudPanel title={<><ColdThermometer className="w-4 h-4 text-cyan-300" /> Termostato de cámara</>}>
          <div className="px-4 pb-4 space-y-3">
            <Thermostat temp={shownTemp} ideal={ideal} />
            <p className={`text-center text-xs font-semibold ${verdict.tone}`}>{verdict.text}</p>

            <input
              type="range"
              min={T_MIN}
              max={T_MAX}
              step={1}
              value={setpoint}
              onChange={(e) => setSetpoint(Number(e.target.value))}
              className="w-full accent-emerald-400"
              aria-label="Temperatura objetivo de la cámara"
            />
            <div className="flex flex-wrap gap-2 justify-center">
              {PRESETS.map((p) => (
                <NeonButton key={p.label} tone={p.temp === setpoint ? 'emerald' : 'cyan'} onClick={() => setSetpoint(p.temp)} className="!py-1 !px-2.5 !text-[10px]">
                  {p.label} {p.temp}°
                </NeonButton>
              ))}
            </div>

            <div className="space-y-2 pt-1">
              {[1, 5, 10].map((y) => {
                const v = viabilityAfter(y, setpoint);
                return (
                  <StatBar
                    key={y}
                    label={`Viabilidad a ${y} ${y === 1 ? 'año' : 'años'}`}
                    valueLabel={`${v.toFixed(0)}%`}
                    value={v}
                    color={v > 80 ? '#34d399' : v > 40 ? '#fbbf24' : '#f87171'}
                  />
                );
              })}
              <p className="text-[10px] text-neutral-500 leading-snug">
                Modelo educativo: cada ~6 °C menos duplica la vida útil de la semilla. Guarda en frasco de vidrio hermético con sílica gel y a oscuras.
              </p>
            </div>
          </div>
        </HudPanel>

        <HudPanel title={<><Seed className="w-4 h-4 text-emerald-300" /> Inspector de semilla</>}>
          <div className="px-4 pb-4 space-y-3">
            {selected ? (
              <>
                <div
                  className="relative h-56 rounded-xl overflow-hidden border border-emerald-300/15 bg-[#04100f] cursor-grab active:cursor-grabbing touch-none"
                  onPointerDown={(e) => {
                    lastPointer.current = { x: e.clientX, y: e.clientY };
                    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
                  }}
                  onPointerMove={(e) => {
                    if (!lastPointer.current) return;
                    drag.current.x += (e.clientX - lastPointer.current.x) * 0.004;
                    drag.current.y += (e.clientY - lastPointer.current.y) * 0.003;
                    lastPointer.current = { x: e.clientX, y: e.clientY };
                  }}
                  onPointerUp={() => { lastPointer.current = null; }}
                >
                  <Canvas
                    dpr={[1, 1.5]}
                    frameloop="demand"
                    camera={{ fov: 32, position: [0, 0, 4.6] }}
                    gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
                  >
                    <FrameLimiter fps={30} active={onScreen} />
                    <InspectorScene tint={tint} germ={germ} drag={drag} tempRef={tempRef} />
                  </Canvas>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="pointer-events-none absolute left-3 bottom-2 text-[10px] font-mono text-emerald-200/80">
                    {stageLabel}
                  </div>
                  <div className="pointer-events-none absolute right-3 bottom-2 text-[10px] font-mono text-neutral-400">
                    arrastra para girar
                  </div>
                </div>

                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <h4 className="font-serif font-bold text-white text-base truncate">{selected.name}</h4>
                    <span className="text-[10px] font-mono text-neutral-400 shrink-0">{selected.seedType}</span>
                  </div>
                  <div className="text-[11px] font-mono text-neutral-500 truncate">{selected.lineage}</div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { k: 'THC', v: `${selected.thcPercentage}%`, c: 'text-emerald-300' },
                    { k: 'CBD', v: `${selected.cbdPercentage}%`, c: 'text-cyan-300' },
                    { k: 'En bóveda', v: `${owned}`, c: 'text-amber-300' },
                  ].map((s) => (
                    <div key={s.k} className="rounded-lg bg-neutral-950/70 border border-neutral-800 py-1.5">
                      <div className="text-[9px] uppercase tracking-wider text-neutral-500">{s.k}</div>
                      <div className={`font-mono font-bold text-sm ${s.c}`}>{s.v}</div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <NeonButton
                    tone="emerald"
                    className="flex-1"
                    onClick={() => {
                      if (germ.current >= 1) { germ.current = 0; setGermPct(0); }
                      setPlaying((p) => !p);
                    }}
                  >
                    <Trichome className="w-4 h-4" />
                    {playing ? 'Pausar' : germPct >= 1 ? 'Reiniciar' : germPct > 0 ? 'Continuar' : 'Ver germinación'}
                  </NeonButton>
                  {onPlant && (
                    <NeonButton tone="amber" disabled={owned <= 0} onClick={() => onPlant(selected.id)}>
                      <Seed className="w-4 h-4" />
                      Sembrar
                    </NeonButton>
                  )}
                </div>
              </>
            ) : (
              <p className="text-xs text-neutral-500">No hay genéticas en la bóveda.</p>
            )}
          </div>
        </HudPanel>
      </div>
    </div>
  );
};
