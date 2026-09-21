import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { REGIONS } from '../../sim/terroir';
import type { RegionId } from '../../types';
import { CONTINENTS, proj } from './WorldMap';

/**
 * Optional 3D globe for the Planet (behind a toggle, lazy-loaded). Same data as the flat map: the seven regions, your
 * plots, ready-to-harvest flares, and a day/night terminator computed from the real UTC clock. Drag to spin, click a
 * region to select it; the globe turns to face the selection. It is the heavy option, so it never loads by default.
 */
interface Props {
  owned: Partial<Record<RegionId, number>>;
  ready?: Partial<Record<RegionId, number>>;
  selected: RegionId | null;
  onSelect: (id: RegionId) => void;
  onHover: (id: RegionId | null) => void;
  nowMs: number;
}

/** local position of (lat, lon) on a three.js SphereGeometry (texture u=0 at lon -180) */
const toVec = (lat: number, lon: number, r = 1) => {
  const phi = ((lon + 180) / 360) * Math.PI * 2, th = ((90 - lat) / 180) * Math.PI;
  return new THREE.Vector3(-r * Math.cos(phi) * Math.sin(th), r * Math.cos(th), r * Math.sin(phi) * Math.sin(th));
};

function makeTexture(): THREE.CanvasTexture {
  const W = 2048, H = 1024, k = W / 1000;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const ocean = g.createLinearGradient(0, 0, 0, H); ocean.addColorStop(0, '#0d3556'); ocean.addColorStop(0.5, '#0a2a47'); ocean.addColorStop(1, '#071a2e');
  g.fillStyle = ocean; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(125,211,252,.10)'; g.lineWidth = 1.2;
  for (let lo = -150; lo <= 180; lo += 30) { const [x] = proj(lo, 0); g.beginPath(); g.moveTo(x * k, 0); g.lineTo(x * k, H); g.stroke(); }
  for (let la = -60; la <= 60; la += 30) { const [, y] = proj(0, la); g.beginPath(); g.moveTo(0, y * k); g.lineTo(W, y * k); g.stroke(); }
  const land = g.createLinearGradient(0, 0, 0, H); land.addColorStop(0, '#2f9a63'); land.addColorStop(1, '#155238');
  CONTINENTS.forEach((pts) => {
    g.beginPath();
    pts.forEach(([lo, la], i) => { const [x, y] = proj(lo, la); if (i) g.lineTo(x * k, y * k); else g.moveTo(x * k, y * k); });
    g.closePath(); g.fillStyle = land; g.fill(); g.strokeStyle = 'rgba(190,242,100,.55)'; g.lineWidth = 2.4; g.lineJoin = 'round'; g.stroke();
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

const EARTH_VERT = 'varying vec2 vUv; varying vec3 vN; void main(){ vUv = uv; vN = normal; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const EARTH_FRAG = `uniform sampler2D map; uniform vec3 sunDir; varying vec2 vUv; varying vec3 vN;
void main(){
  vec3 tex = texture2D(map, vUv).rgb;
  float d = dot(normalize(vN), normalize(sunDir));
  float day = smoothstep(-0.14, 0.2, d);
  float twi = smoothstep(-0.25, 0.0, d) * (1.0 - smoothstep(0.0, 0.25, d));
  vec3 col = mix(tex * vec3(0.32, 0.36, 0.6), tex, day) + vec3(1.0, 0.45, 0.25) * twi * 0.2;
  gl_FragColor = vec4(col, 1.0);
}`;
const ATMO_VERT = 'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const ATMO_FRAG = 'varying vec3 vN; void main(){ float i = pow(0.72 - dot(vN, vec3(0.0, 0.0, 1.0)), 3.0); gl_FragColor = vec4(0.42, 0.75, 1.0, 1.0) * i; }';

interface Ctl { yaw: number; pitch: number; vy: number; dragging: boolean; dist: number; lx: number; ly: number; targetYaw: number | null; targetPitch: number }

const Scene: React.FC<Props & { ctl: React.MutableRefObject<Ctl> }> = ({ owned, ready = {}, selected, onSelect, onHover, nowMs, ctl }) => {
  const group = useRef<THREE.Group>(null);
  const halos = useRef<Array<THREE.Mesh | null>>([]);
  const texture = useMemo(makeTexture, []);
  useEffect(() => () => texture.dispose(), [texture]);
  const sunLon = -(((nowMs / 3600000) % 24) - 12) * 15;
  const uniforms = useMemo(() => ({ map: { value: texture }, sunDir: { value: new THREE.Vector3() } }), [texture]);
  uniforms.sunDir.value.copy(toVec(0, sunLon));
  const stars = useMemo(() => {
    const a = new Float32Array(450 * 3);
    for (let i = 0; i < 450; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(18); a.set([v.x, v.y, v.z], i * 3); }
    return a;
  }, []);

  useEffect(() => {
    const r = REGIONS.find((x) => x.id === selected);
    if (!r) { ctl.current.targetYaw = null; return; }
    const v = toVec(r.lat, r.lon);
    ctl.current.targetYaw = Math.atan2(-v.x, v.z);
    ctl.current.targetPitch = (r.lat * Math.PI) / 180 * 0.85;
  }, [selected, ctl]);

  useFrame((s, dt) => {
    const c = ctl.current, g = group.current;
    if (!g) return;
    if (!c.dragging) {
      if (c.targetYaw !== null) {
        const dy = Math.atan2(Math.sin(c.targetYaw - c.yaw), Math.cos(c.targetYaw - c.yaw));
        c.yaw += dy * Math.min(1, dt * 3.2);
        c.pitch += (c.targetPitch - c.pitch) * Math.min(1, dt * 3.2);
      } else { c.yaw += dt * 0.05 + c.vy; c.vy *= 0.94; }
    }
    g.rotation.order = 'XYZ';
    g.rotation.set(c.pitch, c.yaw, 0);
    const t = s.clock.elapsedTime;
    halos.current.forEach((m, i) => { if (m) { const k = 1 + 0.55 * ((t * 0.9 + i * 0.37) % 1); m.scale.setScalar(k); (m.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - ((t * 0.9 + i * 0.37) % 1)); } });
  });

  return (
    <>
      <points><bufferGeometry><bufferAttribute attach="attributes-position" args={[stars, 3]} /></bufferGeometry><pointsMaterial size={0.06} color="#e0e7ff" sizeAttenuation transparent opacity={0.8} /></points>
      <group ref={group}>
        <mesh><sphereGeometry args={[1, 96, 64]} /><shaderMaterial vertexShader={EARTH_VERT} fragmentShader={EARTH_FRAG} uniforms={uniforms} /></mesh>
        {REGIONS.map((r, i) => {
          const pos = toVec(r.lat, r.lon, 1.012);
          const sel = selected === r.id, n = owned[r.id] ?? 0, rd = ready[r.id] ?? 0;
          return (
            <group key={r.id} position={pos}>
              <mesh
                onClick={(e) => { e.stopPropagation(); if (ctl.current.dist < 6) onSelect(r.id); }}
                onPointerOver={(e) => { e.stopPropagation(); onHover(r.id); document.body.style.cursor = 'pointer'; }}
                onPointerOut={() => { onHover(null); document.body.style.cursor = ''; }}
              >
                <sphereGeometry args={[sel ? 0.05 : 0.036, 16, 16]} /><meshBasicMaterial color={r.color} />
              </mesh>
              <mesh ref={(m) => { halos.current[i] = m; }}><sphereGeometry args={[0.05, 12, 12]} /><meshBasicMaterial color={rd > 0 ? '#fbbf24' : r.color} transparent opacity={0.4} depthWrite={false} /></mesh>
              {n > 0 && <mesh position={[0, 0, 0]}><sphereGeometry args={[0.018, 10, 10]} /><meshBasicMaterial color="#fde68a" /></mesh>}
            </group>
          );
        })}
      </group>
      <mesh scale={1.09}><sphereGeometry args={[1, 64, 48]} /><shaderMaterial vertexShader={ATMO_VERT} fragmentShader={ATMO_FRAG} side={THREE.BackSide} blending={THREE.AdditiveBlending} transparent depthWrite={false} /></mesh>
    </>
  );
};

export const Globe3D: React.FC<Props> = (props) => {
  const ctl = useRef<Ctl>({ yaw: 0, pitch: 0.25, vy: 0, dragging: false, dist: 0, lx: 0, ly: 0, targetYaw: null, targetPitch: 0 });
  return (
    <div
      className="relative w-full h-[340px] sm:h-[440px] touch-none select-none cursor-grab active:cursor-grabbing"
      style={{ background: 'radial-gradient(70% 90% at 50% 50%, #0b2540 0%, #050b1a 70%, #030612 100%)' }}
      onPointerDown={(e) => { const c = ctl.current; c.dragging = true; c.dist = 0; c.lx = e.clientX; c.ly = e.clientY; c.targetYaw = null; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }}
      onPointerMove={(e) => { const c = ctl.current; if (!c.dragging) return; const dx = e.clientX - c.lx, dy = e.clientY - c.ly; c.lx = e.clientX; c.ly = e.clientY; c.dist += Math.abs(dx) + Math.abs(dy); c.yaw += dx * 0.0055; c.vy = dx * 0.0011; c.pitch = Math.max(-1.1, Math.min(1.1, c.pitch + dy * 0.0045)); }}
      onPointerUp={() => { ctl.current.dragging = false; }}
      onPointerCancel={() => { ctl.current.dragging = false; }}
    >
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 3.15], fov: 38 }} gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}>
        <Scene {...props} ctl={ctl} />
      </Canvas>
      <span className="pointer-events-none absolute left-3 bottom-2 text-[10px] font-mono text-sky-200/70">Arrastra para girar · toca una región</span>
    </div>
  );
};
