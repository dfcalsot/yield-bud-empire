import React, { useMemo } from 'react';
import './farm.css';
import type { RegionId } from '../../types';
import type { WeatherKind } from '../../sim/terroir';

/**
 * The view above a plot: sky, sun or moon at the region's LOCAL solar time, three parallax hill layers in the region's
 * colours with a silhouette that says where you are (mountains, palms, dunes, terraces, savanna), drifting clouds, and
 * butterflies by day / fireflies by night. Pure SVG + CSS transforms so it stays cheap.
 */
const hex = (h: string) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mix = (a: string, b: string, t: number) => { const [x, y, z] = hex(a), [p, q, r] = hex(b); const f = (u: number, v: number) => Math.round(u + (v - u) * t).toString(16).padStart(2, '0'); return `#${f(x, p)}${f(y, q)}${f(z, r)}`; };

const SKY: Array<[number, string, string]> = [
  [0, '#0b1030', '#1b1b4a'], [5, '#1a1f52', '#5a3a6e'], [6.5, '#3b5a9a', '#f0a070'], [9, '#4f8fd6', '#9fd0f0'],
  [15, '#4a86d0', '#a9d6f5'], [18, '#5a4a9a', '#f08a5a'], [19.5, '#1a1f52', '#4a2f6a'], [24, '#0b1030', '#1b1b4a'],
];
const skyAt = (h: number): [string, string] => {
  for (let i = 0; i < SKY.length - 1; i++) {
    const [h0, t0, b0] = SKY[i], [h1, t1, b1] = SKY[i + 1];
    if (h >= h0 && h <= h1) { const t = (h - h0) / (h1 - h0); return [mix(t0, t1, t), mix(b0, b1, t)]; }
  }
  return [SKY[0][1], SKY[0][2]];
};

type Decor = 'hills' | 'mountains' | 'andes' | 'palms' | 'jungle' | 'desert' | 'terraces' | 'savanna';
const DECOR: Record<RegionId, Decor> = { afghanistan: 'mountains', mexico: 'desert', jamaica: 'palms', central_america: 'jungle', south_america: 'andes', africa: 'savanna', asia: 'terraces' };

const Palm: React.FC<{ x: number; y: number; s?: number; c: string }> = ({ x, y, s = 1, c }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M0 0 Q4 -14 -2 -28" stroke="#2a1a10" strokeWidth="3" fill="none" strokeLinecap="round" />
    {[-70, -35, 0, 35, 70].map((a) => <path key={a} d="M-2 -28 Q6 -34 16 -26" fill="none" stroke={c} strokeWidth="3.2" strokeLinecap="round" transform={`rotate(${a} -2 -28)`} />)}
  </g>
);
const Cactus: React.FC<{ x: number; y: number; c: string }> = ({ x, y, c }) => (
  <g transform={`translate(${x} ${y})`} stroke={c} strokeWidth="4" fill="none" strokeLinecap="round"><path d="M0 0 V-22 M0 -10 H-7 V-17 M0 -14 H7 V-21" /></g>
);
const Acacia: React.FC<{ x: number; y: number; c: string }> = ({ x, y, c }) => (
  <g transform={`translate(${x} ${y})`}><path d="M0 0 V-16" stroke="#2a1a10" strokeWidth="3" /><ellipse cx="0" cy="-19" rx="18" ry="5" fill={c} /></g>
);

const Layers: React.FC<{ decor: Decor; color: string; night: number }> = ({ decor, color, night }) => {
  const dark = '#0a0716';
  const far = mix(mix(color, dark, 0.62), '#1b1636', night * 0.4), mid = mix(mix(color, dark, 0.45), '#120d2a', night * 0.4), near = mix(mix(color, dark, 0.28), '#0d0a20', night * 0.35);
  const treeC = mix(near, '#000000', 0.25);
  const ridge = (peaks: number[], h: number, base: number) => `M0 ${base} ${peaks.map((p, i) => `L${(i * 600) / (peaks.length - 1)} ${base - p * h}`).join(' ')} L600 ${base}Z`;
  return (
    <>
      <g className="fs-far">
        {decor === 'mountains' || decor === 'andes' ? <path d={ridge([0.5, 0.95, 0.55, 1, 0.6, 0.9, 0.5], 60, 100)} fill={far} /> : <path d="M-20 100 L-20 66 Q80 40 190 62 T400 58 T640 54 L640 100Z" fill={far} />}
        {decor === 'andes' && <path d="M100 42 l14 -1 l-7 -10Z M300 40 l14 0 l-7 -10Z M500 45 l12 0 l-6 -9Z" fill="#f1f5f9" opacity=".85" />}
      </g>
      <g className="fs-mid">
        {decor === 'mountains' ? <path d={ridge([0.35, 0.7, 0.4, 0.75, 0.45, 0.65], 44, 106)} fill={mid} /> : decor === 'terraces' ? (
          <g fill={mid}>{[0, 1, 2, 3].map((i) => <path key={i} d={`M-20 ${100 - i * 9} Q150 ${84 - i * 9} 320 ${92 - i * 9} T640 ${88 - i * 9} L640 110 L-20 110Z`} opacity={0.55 + i * 0.12} />)}</g>
        ) : decor === 'desert' ? <path d="M-20 106 Q90 74 200 96 T420 90 T640 94 L640 110 L-20 110Z" fill={mid} /> : <path d="M-20 110 L-20 84 Q100 58 230 80 T460 74 T640 78 L640 110Z" fill={mid} />}
        {decor === 'palms' && <rect x="-20" y="98" width="700" height="12" fill="#1d4ed8" opacity=".55" className="fs-sea" />}
      </g>
      <g>
        <path d="M-20 114 L-20 96 Q120 78 260 94 T520 90 T640 92 L640 114Z" fill={near} />
        {(decor === 'palms' || decor === 'jungle') && [70, 190, 380, 520].map((x, i) => <Palm key={x} x={x} y={100 - (i % 2) * 3} s={0.8 + (i % 3) * 0.15} c={treeC} />)}
        {decor === 'desert' && [90, 300, 470].map((x) => <Cactus key={x} x={x} y={98} c={treeC} />)}
        {decor === 'savanna' && [110, 320, 500].map((x) => <Acacia key={x} x={x} y={96} c={treeC} />)}
      </g>
      {decor === 'terraces' && <ellipse className="fs-mist" cx="300" cy="86" rx="260" ry="14" fill="#e2e8f0" opacity=".4" />}
    </>
  );
};

export const FarmScene: React.FC<{ regionId: RegionId; color: string; lon: number; nowMs: number; weather: WeatherKind }> = ({ regionId, color, lon, nowMs, weather }) => {
  const hour = (((nowMs / 3600000 + lon / 15) % 24) + 24) % 24;
  const day = hour >= 6 && hour < 18;
  const night = day ? 0 : 1;
  const [top, bottom] = skyAt(hour);
  const t = day ? (hour - 6) / 12 : ((hour - 18 + 24) % 24) / 12;
  const bx = 40 + t * 520, by = 92 - Math.sin(Math.PI * t) * 68;
  const stormy = weather === 'storm' || weather === 'rain', cloudy = stormy || weather === 'cloudy';
  const stars = useMemo(() => Array.from({ length: 26 }, (_, i) => ({ x: (i * 53) % 600, y: 6 + ((i * 29) % 56), r: 0.6 + (i % 3) * 0.4, d: (i * 0.37) % 3 })), []);
  const clouds = useMemo(() => [[40, 22, 46, 0], [220, 38, 60, -18], [420, 16, 52, -33]] as const, []);
  const id = `fs${regionId}`;
  return (
    <svg viewBox="0 0 600 118" preserveAspectRatio="xMidYMax slice" className="fs-scene" role="img" aria-label={`Paisaje de ${regionId}: ${day ? 'de día' : 'de noche'}`}>
      <defs>
        <linearGradient id={`${id}sky`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={top} /><stop offset="1" stopColor={bottom} /></linearGradient>
        <radialGradient id={`${id}sun`}><stop offset="0" stopColor="#fff7c2" /><stop offset=".45" stopColor="#fde047" stopOpacity=".9" /><stop offset="1" stopColor="#fde047" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="600" height="118" fill={`url(#${id}sky)`} />
      {!day && stars.map((s, i) => <circle key={i} className="fs-star" cx={s.x} cy={s.y} r={s.r} fill="#fff" style={{ animationDelay: `${s.d}s` }} />)}
      {/* sun or moon on its arc */}
      {day ? (
        <g opacity={cloudy ? 0.55 : 1}><circle cx={bx} cy={by} r="30" fill={`url(#${id}sun)`} /><circle cx={bx} cy={by} r="9" fill="#fff4b8" />
          <g className="fs-sunray" stroke="#fde68a" strokeWidth="1.6" strokeLinecap="round" opacity=".7">{Array.from({ length: 10 }, (_, i) => <line key={i} x1={bx} y1={by - 13} x2={bx} y2={by - 19} transform={`rotate(${i * 36} ${bx} ${by})`} />)}</g></g>
      ) : (
        <g><circle cx={bx} cy={by} r="15" fill="#e2e8f0" opacity=".2" /><circle cx={bx} cy={by} r="8.5" fill="#f1f5f9" /><circle cx={bx + 3.4} cy={by - 1.6} r="7.4" fill={top} /></g>
      )}
      {clouds.map(([x, y, w, delay], i) => (
        <g key={i} className="fs-cloud" style={{ animationDuration: `${70 + i * 18}s`, animationDelay: `${delay}s`, opacity: cloudy ? 0.95 : 0.4 }}>
          <ellipse cx={x} cy={y} rx={w} ry={w / 4.4} fill={stormy ? '#475569' : '#f1f5f9'} opacity=".85" />
          <ellipse cx={x + w * 0.45} cy={y - 6} rx={w * 0.56} ry={w / 5} fill={stormy ? '#334155' : '#ffffff'} opacity=".8" />
        </g>
      ))}
      <Layers decor={DECOR[regionId] ?? 'hills'} color={color} night={night} />
      {/* fauna */}
      {day && !stormy && [0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${60 + i * 170} ${72 + (i % 2) * 8})`}><g className="fs-bfly" style={{ animationDelay: `${-i * 3}s` }}>
          <g className="fs-wing"><ellipse cx="-3" cy="0" rx="3" ry="2.2" fill={['#fbbf24', '#f472b6', '#a78bfa'][i]} /><ellipse cx="3" cy="0" rx="3" ry="2.2" fill={['#f59e0b', '#ec4899', '#8b5cf6'][i]} /></g>
        </g></g>
      ))}
      {!day && [0, 1, 2, 3, 4, 5, 6].map((i) => <circle key={i} className="fs-fly" cx={50 + i * 82} cy={78 + (i % 3) * 9} r="1.9" fill="#d9f99d" style={{ animationDelay: `${(i * 0.55) % 2.2}s` }} />)}
    </svg>
  );
};
