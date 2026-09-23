import React, { useId, useMemo } from 'react';
import type { GrowStage } from '../types';
import { t as tr } from '../i18n';

/**
 * Procedural, fully animated cannabis plant (SVG).
 *
 * Everything is derived from the plant's real state: height and node count follow
 * progress, leaflet count grows 1→3→5→7→9 with node age, serrated fan leaves droop
 * and yellow when the plant is stressed, colas swell with resin and pistils shift
 * from white to amber as trichomes mature. Motion is CSS-only (sway, wind, twinkle).
 */
export interface CannabisPlantProps {
  seedKey: string;          // stable per plant → same silhouette every render
  stage: GrowStage;
  progress: number;         // 0..100
  health: number;           // 0..100
  soilMoisture: number;     // 0..100
  vpdOptimal: boolean;
  strainColor: string;      // strain colorTheme (hex)
  amberPct: number;         // trichome maturity
  className?: string;
}

const BASE_X = 300;
const BASE_Y = 632;

/* ───────────────────────────── helpers ───────────────────────────── */

const hash = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const makeRng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t), 2);

const hsl = (h: number, s: number, l: number) => `hsl(${h.toFixed(0)} ${s.toFixed(0)}% ${l.toFixed(0)}%)`;

/** Mix two #rrggbb colours. */
const mixHex = (a: string, b: string, t: number): string => {
  const pa = /^#?([0-9a-f]{6})$/i.exec(a)?.[1] ?? '15803d';
  const pb = /^#?([0-9a-f]{6})$/i.exec(b)?.[1] ?? '15803d';
  const ch = (p: string, i: number) => parseInt(p.slice(i, i + 2), 16);
  const c = (i: number) => Math.round(lerp(ch(pa, i), ch(pb, i), t)).toString(16).padStart(2, '0');
  return `#${c(0)}${c(2)}${c(4)}`;
};

/** Hue (0-360) of a #rrggbb colour. */
const hueOf = (hex: string): number => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)?.[1];
  if (!m) return 140;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (d === 0) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
};

/** Serrated lanceolate leaflet along +x from (0,0) to (len,0). */
const leafletPath = (len: number, width: number, teeth: number): string => {
  const half = (u: number) => width * Math.sin(Math.PI * Math.pow(u, 0.72)) * (1 - 0.18 * u);
  const upper: string[] = [];
  const lower: string[] = [];
  for (let k = 1; k <= teeth; k++) {
    const uv = 0.06 + 0.9 * ((k - 0.55) / teeth);
    const ut = 0.06 + 0.9 * (k / teeth);
    const hv = half(uv) * 0.8;
    const ht = half(ut) * 1.05;
    const xv = (uv * len).toFixed(1);
    const xt = Math.min(len * 0.985, ut * len + len * 0.03).toFixed(1);
    upper.push(`${xv} ${(-hv).toFixed(1)} ${xt} ${(-ht).toFixed(1)}`);
    lower.unshift(`${xt} ${ht.toFixed(1)} ${xv} ${hv.toFixed(1)}`);
  }
  const up = upper.join(' ').split(' ');
  const lo = lower.join(' ').split(' ');
  const pts = (arr: string[]) => {
    const out: string[] = [];
    for (let i = 0; i < arr.length; i += 2) out.push(`L${arr[i]} ${arr[i + 1]}`);
    return out.join('');
  };
  return `M0 0${pts(up)}L${len.toFixed(1)} 0${pts(lo)}Z`;
};

const FAN_ANGLES: Record<number, number[]> = {
  1: [0],
  3: [-38, 0, 38],
  5: [-72, -38, 0, 38, 72],
  7: [-98, -66, -33, 0, 33, 66, 98],
  9: [-118, -90, -62, -31, 0, 31, 62, 90, 118],
};

/* ───────────────────────────── fan leaf ───────────────────────────── */

interface FanLeafProps {
  count: number;
  scale: number;
  hubX: number;
  hubY: number;
  angle: number;
  droop: number;
  amp: number;
  dur: number;
  delay: number;
  gradientId: string;
  veinColor: string;
  edgeColor: string;
}

const FanLeaf: React.FC<FanLeafProps> = ({ count, scale, hubX, hubY, angle, droop, amp, dur, delay, gradientId, veinColor, edgeColor }) => {
  const rng = makeRng(Math.round(hubX * 13 + hubY * 7 + count * 101)); // deterministic per leaf → no jitter between renders
  const petiole = (count === 1 ? 10 : 24 + count * 4) * scale;
  const angles = FAN_ANGLES[count] ?? FAN_ANGLES[3];
  const baseLen = (count === 1 ? 44 : 78) * scale;
  const leaflets = angles.map((a) => {
    const f = 1 - 0.55 * Math.pow(Math.abs(a) / 120, 1.3);
    const len = baseLen * f * (0.94 + rng() * 0.12);
    const w = (count === 1 ? 11 : 10.5) * scale * (0.72 + 0.28 * f);
    return { a, len, w, d: leafletPath(len, w, count === 1 ? 7 : 8 + Math.round(f * 2)) };
  });

  return (
    <g transform={`translate(${hubX.toFixed(1)} ${hubY.toFixed(1)}) rotate(${angle.toFixed(1)})`}>
      <g className="cf-sway" style={{ ['--amp' as string]: `${amp}deg`, animationDuration: `${dur}s`, animationDelay: `${-delay}s` }}>
        <g style={{ transform: `rotate(${droop.toFixed(1)}deg)`, transition: 'transform 1.6s ease' }}>
          <path d={`M0 0Q${petiole * 0.5} ${-petiole * 0.14} ${petiole} 0`} stroke="#3f6b21" strokeWidth={Math.max(1.4, 3.2 * scale)} fill="none" strokeLinecap="round" />
          <g transform={`translate(${petiole.toFixed(1)} 0)`}>
            {leaflets.map(({ a, len, d }) => (
              <g key={a} transform={`rotate(${a})`}>
                <path d={d} fill={`url(#${gradientId})`} stroke={edgeColor} strokeWidth="0.7" strokeLinejoin="round" />
                <path d={`M0 0L${(len * 0.92).toFixed(1)} 0`} stroke={veinColor} strokeWidth="0.9" opacity="0.55" />
              </g>
            ))}
          </g>
        </g>
      </g>
    </g>
  );
};

/* ───────────────────────────── cola (flower) ───────────────────────────── */

interface ColaProps {
  x: number;
  y: number;
  size: number;      // 0..1
  ripeness: number;  // 0..1  (pistils white → amber)
  color: string;
  delay: number;
  seed: number;
  showFrost: boolean;
  frostId?: string;
  tilt?: number;
  tint?: number;     // 0..1 how much of the strain colour shows through the greens
}

const PISTIL_COLORS = ['#fffbeb', '#fed7aa', '#fb923c', '#ea580c', '#b45309'];

const Cola: React.FC<ColaProps> = ({ x, y, size, ripeness, color, delay, seed, showFrost, frostId = 'cfFrost', tilt = 0, tint = 0.3 }) => {
  const rng = makeRng(seed);
  const height = 36 + 118 * size;
  const maxW = 14 + 34 * size;
  const n = 8 + Math.round(size * 16);
  const shades = ['#2a6a1e', '#3b8626', '#55a336'].map((g) => mixHex(g, color, tint));
  const calyxes = Array.from({ length: n }, (_, k) => {
    const t = k / (n - 1);
    const env = 0.5 + 0.5 * Math.sin(Math.PI * (0.12 + 0.88 * t));
    const w = maxW * env;
    return {
      cx: (rng() - 0.5) * w * 0.8,
      cy: -t * height,
      r: w * (0.5 + rng() * 0.22),
      rot: (rng() - 0.5) * 50,
      shade: shades[Math.floor(rng() * shades.length)],
    };
  });
  const pistilCount = Math.min(36, Math.round(10 + 30 * size));
  const pistils = Array.from({ length: pistilCount }, () => {
    const c = calyxes[Math.floor(rng() * calyxes.length)];
    const len = 7 + rng() * 11 * (0.6 + size * 0.6);
    const dir = (rng() - 0.5) * 2.4;
    const colorIdx = Math.min(PISTIL_COLORS.length - 1, Math.floor(clamp(ripeness + (rng() - 0.5) * 0.35) * PISTIL_COLORS.length));
    return {
      d: `M${c.cx.toFixed(1)} ${(c.cy - c.r * 0.5).toFixed(1)}q${(dir * 8).toFixed(1)} ${(-len * 0.6).toFixed(1)} ${(dir * 14).toFixed(1)} ${(-len).toFixed(1)}`,
      color: PISTIL_COLORS[colorIdx],
    };
  });
  const sparkles = Array.from({ length: 2 + Math.round(size * 7) }, () => {
    const c = calyxes[Math.floor(rng() * calyxes.length)];
    return { x: c.cx + (rng() - 0.5) * c.r, y: c.cy + (rng() - 0.5) * c.r, r: 1 + rng() * 1.3, delay: rng() * 2.6 };
  });
  const sugar = [-1, 1].map((side) => leafletPath(22 + 20 * size, 5 + 3 * size, 6)).map((d, i) => ({ d, rot: i === 0 ? 200 : -20 }));

  return (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${tilt})`}>
      <g className="cf-breeze" style={{ animationDelay: `${-delay}s` }}>
        {sugar.map((s, i) => (
          <g key={i} transform={`translate(0 ${(-height * 0.1).toFixed(1)}) rotate(${s.rot + 20})`} opacity="0.9">
            <path d={s.d} fill="#2f8f4a" stroke="#14532d" strokeWidth="0.6" />
          </g>
        ))}
        {calyxes.map((c, i) => (
          <g key={i}>
            <ellipse cx={c.cx} cy={c.cy} rx={c.r} ry={c.r * 1.18} fill={c.shade} stroke="#0b2e17" strokeWidth="0.6" transform={`rotate(${c.rot.toFixed(0)} ${c.cx.toFixed(1)} ${c.cy.toFixed(1)})`} />
            <ellipse cx={c.cx - c.r * 0.25} cy={c.cy - c.r * 0.3} rx={c.r * 0.45} ry={c.r * 0.35} fill="#ffffff" opacity="0.05" />
          </g>
        ))}
        {showFrost && <ellipse cx="0" cy={-height * 0.5} rx={maxW * 0.95} ry={height * 0.62} fill={`url(#${frostId})`} opacity={0.25 + 0.45 * ripeness} />}
        {pistils.map((p, i) => (
          <path key={i} d={p.d} stroke={p.color} strokeWidth="1.3" fill="none" strokeLinecap="round" />
        ))}
        {sparkles.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fffbe6" className="cf-twinkle" style={{ animationDelay: `${-s.delay}s` }} />
        ))}
      </g>
    </g>
  );
};

/* ───────────────────────────── plant ───────────────────────────── */

const CannabisPlantImpl: React.FC<CannabisPlantProps> = ({
  seedKey, stage, progress, health, soilMoisture, vpdOptimal, strainColor, amberPct, className,
}) => {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const idOld = `cfLeafOld${uid}`;
  const idNew = `cfLeafNew${uid}`;
  const idFrost = `cfFrost${uid}`;
  const idFabric = `cfFabric${uid}`;

  const scene = useMemo(() => {
    const rng = makeRng(hash(seedKey));
    const growth = easeOut(Math.min(progress, 60) / 60);
    const stretch = clamp((progress - 50) / 45);
    const flowerT = clamp((progress - 50) / 45);
    const stalkH = 38 + 330 * growth + 70 * stretch;
    const nodeCount = clamp(Math.round(1 + (progress / 100) * 9), 1, 10);
    const bend = (rng() - 0.5) * 16;
    const stalkX = (yFrac: number) => BASE_X + bend * Math.sin(yFrac * Math.PI * 0.9);

    // stress → drooping + yellowing
    const stress = clamp((100 - health) / 60) * 0.7 + (vpdOptimal ? 0 : 0.35) + (soilMoisture < 30 ? 0.4 : 0);
    const droop = clamp(stress) * 34;

    const leaves: Array<FanLeafProps & { key: string }> = [];
    for (let i = 0; i < nodeCount; i++) {
      const t = (i + 0.6) / (nodeCount + 0.2) * 0.92;           // 0 bottom … ~0.92 top
      const y = BASE_Y - t * stalkH;
      const x = stalkX(t);
      const ageSteps = nodeCount - 1 - i;
      let count = [3, 5, 7, 9][Math.min(3, ageSteps)];
      if (progress < 9) count = 1;
      else if (progress < 18) count = Math.min(count, 3);
      if (stage !== 'vegetative' && stage !== 'seedling' && t > 0.72) count = Math.min(count, 3);
      const leafScale = lerp(1.22, 0.5, t) * (0.42 + 0.58 * easeOut(Math.min(progress, 55) / 55));
      const elev = lerp(6, 46, t) + rng() * 10;
      for (const side of ['L', 'R'] as const) {
        leaves.push({
          key: `${i}${side}`,
          count,
          scale: leafScale * (0.92 + rng() * 0.16),
          hubX: x + (side === 'R' ? 3 : -3),
          hubY: y,
          angle: side === 'R' ? -elev : 180 + elev,
          droop: side === 'R' ? droop * (1.1 - t * 0.6) : -droop * (1.1 - t * 0.6),
          amp: 1.6 + rng() * 2.6,
          dur: 3.6 + rng() * 2.6,
          delay: rng() * 5,
          gradientId: t > 0.55 ? 'NEW' : 'OLD',
          veinColor: '#c7f9cc',
          edgeColor: '#0a2e14',
        });
      }
    }

    const topT = 0.92;
    const topY = BASE_Y - topT * stalkH;
    const topX = stalkX(topT);
    const ripeness = clamp(flowerT * 0.55 + (amberPct / 40) * 0.6);
    const colas: ColaProps[] = [];
    const branches: string[] = [];
    if (stage === 'flowering' || stage === 'maturation' || stage === 'ready_harvest') {
      // green strains stay green; purple / pink / gold strains show their colour as the flowers ripen
      const hue = hueOf(strainColor);
      const isGreenish = hue > 85 && hue < 185;
      const tint = isGreenish ? 0.12 + 0.13 * flowerT : 0.28 + 0.4 * flowerT;
      colas.push({ x: topX, y: topY + 6, size: 0.5 + 0.5 * flowerT, ripeness, color: strainColor, delay: rng() * 4, seed: hash(seedKey + 'apex'), showFrost: flowerT > 0.35, tint });
      const sideNodes = Math.min(5, nodeCount - 2);
      for (let k = 0; k < sideNodes; k++) {
        const t = ((nodeCount - 2 - k) + 0.6) / (nodeCount + 0.2) * 0.92;
        const y0 = BASE_Y - t * stalkH;
        const x0 = stalkX(t);
        const size = clamp(flowerT * (0.9 - k * 0.11));
        if (size < 0.08) continue;
        for (const side of [-1, 1]) {
          const reach = 30 + 15 * k + 34 * size;
          const x1 = x0 + side * reach;
          const y1 = y0 - (12 + 18 * size);
          branches.push(`M${x0.toFixed(1)} ${y0.toFixed(1)}Q${(x0 + side * reach * 0.6).toFixed(1)} ${(y0 + 3).toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`);
          colas.push({
            x: x1,
            y: y1 + 4,
            size,
            ripeness: clamp(ripeness - k * 0.05),
            color: strainColor,
            delay: rng() * 4,
            seed: hash(`${seedKey}${k}${side}`),
            showFrost: flowerT > 0.5,
            tilt: side * 9,
            tint,
          });
        }
      }
    }
    // Auto-frame: young plants are zoomed in (smoothly, via a CSS transition) so the plant always fills the scene
    const apexSize = colas.length ? colas[0].size : 0;
    const extent = stalkH + (colas.length ? 70 + 100 * apexSize : 50) + 40;
    const zoom = clamp(505 / extent, 1, 2.1);
    return { stalkH, stalkX, leaves, colas, branches, topX, topY, stress, zoom };
  }, [seedKey, stage, Math.round(progress * 2), Math.round(health / 5), Math.round(soilMoisture / 10), vpdOptimal, strainColor, Math.round(amberPct / 5)]); // eslint-disable-line react-hooks/exhaustive-deps

  const { stalkH, stalkX, leaves, colas, branches, topX, topY, stress, zoom } = scene;

  // Leaf colours: healthy deep green → stressed yellow-olive
  const hue = lerp(148, 62, clamp(stress));
  const sat = lerp(62, 48, clamp(stress));
  const oldA = hsl(hue, sat, lerp(15, 20, clamp(stress)));
  const oldB = hsl(hue - 6, sat + 6, lerp(30, 38, clamp(stress)));
  const newA = hsl(hue + 4, sat + 4, lerp(24, 30, clamp(stress)));
  const newB = hsl(hue - 10, sat + 8, lerp(46, 52, clamp(stress)));

  const stalkPath = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      pts.push(`${i === 0 ? 'M' : 'L'}${stalkX(t * 0.95).toFixed(1)} ${(BASE_Y - t * stalkH).toFixed(1)}`);
    }
    return pts.join('');
  }, [stalkH, stalkX]);

  const stalkW = lerp(3, 11, easeOut(progress / 60));
  const showSeed = stage === 'seed' || progress < 2;
  const soilColor = soilMoisture > 50 ? '#1d3a2a' : soilMoisture > 30 ? '#2a2216' : '#3a2412';

  return (
    <svg viewBox="0 0 600 730" className={className} role="img" aria-label={tr('Planta de cannabis')}>
      <defs>
        <linearGradient id={idOld} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={oldA} />
          <stop offset="1" stopColor={oldB} />
        </linearGradient>
        <linearGradient id={idNew} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={newA} />
          <stop offset="1" stopColor={newB} />
        </linearGradient>
        <radialGradient id={idFrost} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <pattern id={idFabric} width="6" height="6" patternUnits="userSpaceOnUse">
          <path d="M0 3H6M3 0V6" stroke="#2f2b2b" strokeWidth="0.8" />
        </pattern>
      </defs>

      <g style={{ transform: `scale(${zoom.toFixed(3)})`, transformOrigin: '300px 716px', transition: 'transform 1.4s ease' }}>
      {/* contact shadow + smart pot */}
      <ellipse cx="300" cy="716" rx="128" ry="12" fill="#000" opacity="0.55" />
      <ellipse cx="300" cy="706" rx="112" ry="13" fill="#131010" stroke="#2c2828" strokeWidth="2" />
      <path d="M198 640 L216 704 Q300 720 384 704 L402 640 Z" fill="#1d1a1a" stroke="#3a3535" strokeWidth="2.5" />
      <path d="M198 640 L216 704 Q300 720 384 704 L402 640 Z" fill={`url(#${idFabric})`} opacity="0.7" />
      <ellipse cx="300" cy="640" rx="102" ry="19" fill="#2a2626" stroke="#4b4646" strokeWidth="2" />
      <ellipse cx="300" cy="642" rx="94" ry="14" fill={soilColor} style={{ transition: 'fill 1.5s ease' }} />
      {[[262, 641], [318, 645], [296, 646], [340, 640], [244, 645]].map(([cx, cy]) => (
        <circle key={cx} cx={cx} cy={cy} r="1.5" fill="#efefef" opacity="0.8" />
      ))}

      <g className="cf-wind">
        {showSeed ? (
          <g className="animate-pulse">
            <ellipse cx="300" cy="636" rx="9" ry="6.5" fill="#7c5a2c" stroke="#a37a3c" strokeWidth="1.5" />
            <path d="M292 634q4 3 9 0M296 638q3 2 8 0" stroke="#3b2a12" strokeWidth="1" fill="none" />
            <path d="M301 640Q303 654 310 662" stroke="#f4ecd2" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          </g>
        ) : (
          <>
            {/* stalk */}
            <path d={stalkPath} stroke="#274d12" strokeWidth={stalkW + 2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <path d={stalkPath} stroke="#5a8f2c" strokeWidth={stalkW} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <path d={stalkPath} stroke="#8fd05a" strokeWidth={Math.max(1, stalkW * 0.28)} fill="none" strokeLinecap="round" opacity="0.5" />

            {/* cotyledons on very young plants */}
            {progress < 20 && (
              <g>
                <ellipse cx={stalkX(0.18) - 17} cy={BASE_Y - stalkH * 0.18} rx="15" ry="7" fill="#7fcf3a" stroke="#3f7a12" strokeWidth="1" transform={`rotate(-14 ${stalkX(0.18) - 17} ${BASE_Y - stalkH * 0.18})`} />
                <ellipse cx={stalkX(0.18) + 17} cy={BASE_Y - stalkH * 0.18} rx="15" ry="7" fill="#7fcf3a" stroke="#3f7a12" strokeWidth="1" transform={`rotate(14 ${stalkX(0.18) + 17} ${BASE_Y - stalkH * 0.18})`} />
              </g>
            )}

            {branches.map((d, i) => (
              <path key={i} d={d} stroke="#4a7a26" strokeWidth={Math.max(2, stalkW * 0.4)} fill="none" strokeLinecap="round" />
            ))}

            {/* fan leaves: back to front so upper leaves overlap lower ones */}
            {leaves.map(({ key, gradientId, ...p }) => (
              <FanLeaf key={key} gradientId={gradientId === 'NEW' ? idNew : idOld} {...p} />
            ))}

            {/* apical shoot before flowering */}
            {colas.length === 0 && (
              <g transform={`translate(${topX.toFixed(1)} ${(topY + 4).toFixed(1)})`}>
                <g className="cf-breeze">
                  {[-28, 0, 28].map((a) => (
                    <path key={a} d={leafletPath(18 + 16 * Math.min(1, progress / 40), 4.2, 5)} transform={`rotate(${a - 90})`} fill={`url(#${idNew})`} stroke="#0a2e14" strokeWidth="0.6" />
                  ))}
                </g>
              </g>
            )}

            {/* flowers */}
            {colas.map((c, i) => (
              <Cola key={i} {...c} frostId={idFrost} />
            ))}
          </>
        )}
      </g>
      </g>
    </svg>
  );
};

export const CannabisPlant = React.memo(CannabisPlantImpl);
