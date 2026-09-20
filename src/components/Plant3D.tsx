import React, { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GrowStage, PestKind } from '../types';

/**
 * The real 3D cannabis plant (public/models/fases-cannabis.glb: 5 growth stages laid side by side).
 *
 * The file has ~1 400 tiny meshes in the flowering stage, so each stage is baked once into one geometry per
 * material (≤ 10 draw calls), recentred on its soil and scaled to a fixed height. Wind sway and thirst droop
 * run in the vertex shader (no per-frame JS on the vertices); colours follow health, strain and trichome maturity.
 * The canvas renders at ~30 fps on demand — the target laptop has an integrated GPU.
 */

export const MODEL_URL = '/models/fases-cannabis.glb';

const STAGE_NAMES = ['etapa_01_germinacion', 'etapa_02_plantula', 'etapa_03_vegetativo', 'etapa_04_prefloracion', 'etapa_05_floracion'];
/** progress ranges (0..100) that show each model stage — the game's own stage switches are 15 / 50 / 95 */
const STAGE_RANGE: Array<[number, number]> = [[0, 6], [6, 15], [15, 50], [50, 68], [68, 100]];
/** on-screen height of each stage (world units) — compressed so the seed is still readable */
const TARGET_H = [0.38, 0.5, 0.66, 0.82, 1.0];

export const modelStageOf = (progress: number): number => STAGE_RANGE.findIndex(([, hi]) => progress < hi) === -1 ? 4 : STAGE_RANGE.findIndex(([, hi]) => progress < hi);

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

/* ───────────────────────────── model loading ───────────────────────────── */

let modelPromise: Promise<GLTF> | null = null;
let model: GLTF | null = null;

/** Fetch + parse the GLB once (also used to keep the SVG plant on screen until the model is ready). */
export const loadPlantModel = (): Promise<GLTF> => {
  if (!modelPromise) {
    modelPromise = new GLTFLoader().loadAsync(MODEL_URL).then((g) => (model = g)).catch((e) => { modelPromise = null; throw e; });
  }
  return modelPromise;
};

/* ───────────────────────────── stage baking ───────────────────────────── */

interface Part { name: string; color: THREE.Color; geometry: THREE.BufferGeometry }
interface StageAsset { parts: Part[]; height: number; extent: number; soilRadius: number }

const stageCache = new Map<number, StageAsset>();

/** Merge every mesh of one stage by material, in world space, recentred on the soil surface. */
function buildStage(root: THREE.Object3D, index: number): StageAsset {
  const cached = stageCache.get(index);
  if (cached) return cached;
  const group = root.getObjectByName(STAGE_NAMES[index]);
  if (!group) throw new Error(`Etapa ${STAGE_NAMES[index]} no encontrada en el modelo`);
  root.updateWorldMatrix(true, true);

  const buckets = new Map<string, { color: THREE.Color; meshes: THREE.Mesh[] }>();
  group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const mat = (Array.isArray(m.material) ? m.material[0] : m.material) as THREE.MeshStandardMaterial;
    const key = mat.name || 'default';
    let b = buckets.get(key);
    if (!b) { b = { color: mat.color.clone(), meshes: [] }; buckets.set(key, b); }
    b.meshes.push(m);
  });

  const v = new THREE.Vector3();
  const n = new THREE.Vector3();
  const nm = new THREE.Matrix3();
  const all = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity };
  const soil = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity, maxY: -Infinity };
  const raw: Array<{ name: string; color: THREE.Color; pos: Float32Array; nor: Float32Array }> = [];

  for (const [name, b] of buckets) {
    let count = 0;
    for (const m of b.meshes) count += m.geometry.index ? m.geometry.index.count : m.geometry.getAttribute('position').count;
    const pos = new Float32Array(count * 3);
    const nor = new Float32Array(count * 3);
    let o = 0;
    for (const m of b.meshes) {
      const g = m.geometry;
      const p = g.getAttribute('position');
      const nn = g.getAttribute('normal');
      const idx = g.index;
      nm.getNormalMatrix(m.matrixWorld);
      const len = idx ? idx.count : p.count;
      for (let i = 0; i < len; i++, o++) {
        const vi = idx ? idx.getX(i) : i;
        v.fromBufferAttribute(p, vi).applyMatrix4(m.matrixWorld);
        if (nn) n.fromBufferAttribute(nn, vi).applyMatrix3(nm).normalize(); else n.set(0, 1, 0);
        pos[o * 3] = v.x; pos[o * 3 + 1] = v.y; pos[o * 3 + 2] = v.z;
        nor[o * 3] = n.x; nor[o * 3 + 1] = n.y; nor[o * 3 + 2] = n.z;
        if (v.x < all.minX) all.minX = v.x;
        if (v.x > all.maxX) all.maxX = v.x;
        if (v.y < all.minY) all.minY = v.y;
        if (v.y > all.maxY) all.maxY = v.y;
        if (v.z < all.minZ) all.minZ = v.z;
        if (v.z > all.maxZ) all.maxZ = v.z;
        if (name === 'tierra') {
          if (v.x < soil.minX) soil.minX = v.x;
          if (v.x > soil.maxX) soil.maxX = v.x;
          if (v.z < soil.minZ) soil.minZ = v.z;
          if (v.z > soil.maxZ) soil.maxZ = v.z;
          if (v.y > soil.maxY) soil.maxY = v.y;
        }
      }
    }
    raw.push({ name, color: b.color, pos, nor });
  }

  const hasSoil = Number.isFinite(soil.minX);
  // germination is a cut-away soil block with the seed on one side: centre it on the whole model, not on the soil
  const onSoil = hasSoil && index > 0;
  const cx = onSoil ? (soil.minX + soil.maxX) / 2 : (all.minX + all.maxX) / 2;
  const cz = onSoil ? (soil.minZ + soil.maxZ) / 2 : (all.minZ + all.maxZ) / 2;
  // the germination sample sits on its base; the other stages stand on the soil surface
  const y0 = hasSoil && index > 0 ? soil.maxY : all.minY;

  const parts: Part[] = raw.map((r) => {
    for (let i = 0; i < r.pos.length; i += 3) { r.pos[i] -= cx; r.pos[i + 1] -= y0; r.pos[i + 2] -= cz; }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(r.pos, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(r.nor, 3));
    geometry.computeBoundingSphere();
    return { name: r.name, color: r.color, geometry };
  });

  const asset: StageAsset = {
    parts,
    height: Math.max(0.05, all.maxY - y0),
    extent: Math.max(0.05, all.maxY - Math.min(all.minY, y0)),
    soilRadius: hasSoil ? Math.max(soil.maxX - soil.minX, soil.maxZ - soil.minZ) / 2 : 0.1,
  };
  stageCache.set(index, asset);
  return asset;
}

function disposeStages() {
  stageCache.forEach((a) => a.parts.forEach((p) => p.geometry.dispose()));
  stageCache.clear();
}

/* ───────────────────────────── materials ───────────────────────────── */

interface Uniforms { time: { value: number }; droop: { value: number } }
const CFG: Record<string, { sway: number; rough: number; leaf?: boolean; double?: boolean }> = {
  tierra: { sway: 0, rough: 1 },
  tierra_corte: { sway: 0, rough: 1 },
  semilla: { sway: 0, rough: 0.55 },
  tallo: { sway: 0.35, rough: 0.7 },
  raiz: { sway: 0, rough: 0.8 },
  hoja_tierna: { sway: 1, rough: 0.5, leaf: true, double: true },
  hoja: { sway: 1, rough: 0.55, leaf: true, double: true },
  cogollo: { sway: 0.55, rough: 0.65 },
  pistilo_blanco: { sway: 0.8, rough: 0.5, double: true },
  pistilo_naranja: { sway: 0.8, rough: 0.5, double: true },
};

function makeMaterial(part: Part, u: Uniforms, height: number): THREE.MeshStandardMaterial {
  const cfg = CFG[part.name] ?? { sway: 0.3, rough: 0.7 };
  const mat = new THREE.MeshStandardMaterial({ color: part.color, roughness: cfg.rough, metalness: 0, side: cfg.double ? THREE.DoubleSide : THREE.FrontSide });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = u.time;
    shader.uniforms.uDroop = u.droop;
    shader.uniforms.uSway = { value: cfg.sway * height * 0.05 };
    shader.uniforms.uH = { value: height };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uDroop;\nuniform float uSway;\nuniform float uH;')
      .replace('#include <begin_vertex>', `vec3 transformed = vec3( position );
        float hh = clamp( position.y / uH, 0.0, 1.0 );
        float k = hh * hh;
        float ph = position.x * 9.0 + position.z * 7.0;
        transformed.x += ( sin( uTime * 1.3 + ph ) * 0.65 + sin( uTime * 2.7 + ph * 1.9 ) * 0.35 ) * uSway * k;
        transformed.z += cos( uTime * 1.05 + ph * 0.8 ) * uSway * 0.7 * k;
        transformed.y -= uDroop * k * ${cfg.leaf ? '1.0' : '0.25'};`);
  };
  mat.customProgramCacheKey = () => `cf-plant-${part.name}`;
  return mat;
}

const YELLOW = new THREE.Color('#8f8a22');
const ORANGE = new THREE.Color('#e8600a');
const PEST_TINT: Record<PestKind, THREE.Color> = { mites: new THREE.Color('#c9b437'), mold: new THREE.Color('#c3cdbb'), rot: new THREE.Color('#7a5a2a') };

/* ───────────────────────────── scene ───────────────────────────── */

export interface Plant3DProps {
  stage: GrowStage;
  progress: number;      // 0..100
  health: number;        // 0..100
  soilMoisture: number;  // 0..100
  strainColor: string;   // strain colorTheme (hex)
  amberPct: number;      // trichome maturity
  /** active plague: leaves and buds take its colour */
  pest?: PestKind;
  className?: string;
}

const easeOutBack = (t: number) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

const ShadowBlob: React.FC = () => {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0, 'rgba(0,0,0,0.7)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }, []);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.006, 0]}>
      <planeGeometry args={[1.5, 1.5]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} />
    </mesh>
  );
};

/** ~30 fps redraw loop (frameloop is on demand) that stops while the tab is hidden. */
const Ticker: React.FC = () => {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const id = window.setInterval(() => { if (!document.hidden) invalidate(); }, 33);
    return () => window.clearInterval(id);
  }, [invalidate]);
  return null;
};

const PlantModel: React.FC<Plant3DProps & { gltf: GLTF }> = ({ gltf, progress, health, soilMoisture, strainColor, amberPct, pest }) => {
  const stage = modelStageOf(progress);
  const [lo, hi] = STAGE_RANGE[stage];
  const within = clamp((progress - lo) / (hi - lo));
  const reduced = useMemo(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false, []);

  const asset = useMemo(() => buildStage(gltf.scene, stage), [gltf, stage]);
  const uniforms = useRef<Uniforms>({ time: { value: 0 }, droop: { value: 0 } }).current;
  const materials = useMemo(() => asset.parts.map((p) => makeMaterial(p, uniforms, asset.height)), [asset, uniforms]);
  useEffect(() => () => materials.forEach((m) => m.dispose()), [materials]);
  useEffect(() => () => disposeStages(), []);

  // colours follow the plant's state
  useEffect(() => {
    const strain = new THREE.Color(strainColor);
    const stress = clamp((72 - health) / 60);
    asset.parts.forEach((p, i) => {
      const c = materials[i].color.copy(p.color);
      if (p.name === 'hoja' || p.name === 'hoja_tierna' || p.name === 'tallo') c.lerp(strain, p.name === 'tallo' ? 0.05 : 0.12).lerp(YELLOW, stress * 0.85);
      else if (p.name === 'cogollo') c.lerp(strain, 0.22).lerp(YELLOW, stress * 0.5);
      else if (p.name === 'pistilo_blanco') c.lerp(ORANGE, clamp(amberPct / 60) * 0.85);
      if (pest && (p.name === 'hoja' || p.name === 'hoja_tierna' || p.name === 'tallo' || p.name === 'cogollo')) c.lerp(PEST_TINT[pest], p.name === 'cogollo' ? 0.35 : 0.5);
      // lifts the shadow side of leaves and buds (they are dark flat colours lit from one direction)
      if (CFG[p.name]?.leaf || p.name === 'cogollo' || p.name === 'tallo') materials[i].emissive.copy(c).multiplyScalar(0.32);
    });
  }, [asset, materials, strainColor, health, amberPct, pest]);

  // thirst droop
  uniforms.droop.value = clamp((38 - soilMoisture) / 30) * asset.height * 0.16 + clamp((60 - health) / 60) * asset.height * 0.05 + (pest === 'rot' ? asset.height * 0.12 : 0);

  const groupRef = useRef<THREE.Group>(null);
  const pop = useRef(0);
  useEffect(() => { pop.current = 0; }, [stage]);
  const base = (TARGET_H[stage] / asset.extent) * (0.9 + 0.1 * within);

  useFrame((state, dt) => {
    const g = groupRef.current;
    if (!g) return;
    if (!reduced) {
      uniforms.time.value = state.clock.elapsedTime;
      g.rotation.y += dt * 0.22;
    } else {
      g.rotation.y = 0.6;
    }
    pop.current = Math.min(1, pop.current + dt / 0.8);
    g.scale.setScalar(base * (reduced ? 1 : 0.5 + 0.5 * easeOutBack(pop.current)));
  });

  return (
    <group ref={groupRef}>
      {asset.parts.map((p, i) => <mesh key={p.name} geometry={p.geometry} material={materials[i]} frustumCulled={false} />)}
    </group>
  );
};

export const Plant3D: React.FC<Plant3DProps> = (props) => {
  if (!model) return null; // PlantView waits for loadPlantModel() before mounting this
  const flowering = modelStageOf(props.progress) >= 3;
  return (
    <Canvas
      className={props.className}
      frameloop="demand"
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 0.58, 2.15], fov: 30, near: 0.1, far: 20 }}
      onCreated={({ camera }) => camera.lookAt(0, 0.5, 0)}
    >
      <hemisphereLight args={[flowering ? '#ffe8f6' : '#e6fbff', '#16281c', 1.9]} />
      <directionalLight position={[1.6, 3.2, 2.2]} intensity={2.6} color={flowering ? '#ffd9ee' : '#f2fff4'} />
      <directionalLight position={[-2, 1.2, -1.5]} intensity={1.3} color="#7dd3fc" />
      <ShadowBlob />
      <PlantModel {...props} gltf={model} />
      <Ticker />
    </Canvas>
  );
};
