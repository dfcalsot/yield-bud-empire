import React, { useMemo } from 'react';
import { REGIONS } from '../../sim/terroir';
import type { RegionId } from '../../types';

/** Stylised world map (equirectangular 1000×500) with the seven regions, a live day/night terminator and drifting clouds. */

const proj = (lon: number, lat: number): [number, number] => [((lon + 180) / 360) * 1000, ((90 - lat) / 180) * 500];
const path = (pts: Array<[number, number]>) => 'M' + pts.map(([lo, la]) => proj(lo, la).map((v) => v.toFixed(1)).join(' ')).join(' L') + 'Z';

/** label placement per region so the crowded Caribbean stays readable */
const LABEL: Partial<Record<RegionId, { dx: number; dy: number; anchor: 'start' | 'middle' | 'end' }>> = {
  mexico: { dx: -16, dy: 4, anchor: 'end' },
  jamaica: { dx: 18, dy: -2, anchor: 'start' },
  central_america: { dx: -16, dy: 22, anchor: 'end' },
  south_america: { dx: 18, dy: 16, anchor: 'start' },
};

const CONTINENTS: Array<Array<[number, number]>> = [
  // North America
  [[-168, 66], [-160, 71], [-140, 70], [-125, 72], [-95, 72], [-80, 70], [-62, 66], [-55, 52], [-67, 44], [-76, 38], [-81, 31], [-80, 25], [-84, 30], [-90, 29], [-97, 26], [-98, 20], [-105, 20], [-110, 24], [-113, 31], [-118, 34], [-124, 40], [-125, 49], [-135, 58], [-150, 60], [-165, 60]],
  // Central America
  [[-98, 20], [-90, 21], [-87, 16], [-83, 10], [-78, 8], [-80, 7], [-86, 11], [-92, 14], [-96, 16], [-105, 20]],
  // South America
  [[-78, 8], [-72, 12], [-62, 10], [-52, 5], [-50, 0], [-35, -6], [-39, -15], [-48, -26], [-58, -38], [-65, -42], [-68, -52], [-72, -50], [-73, -38], [-71, -25], [-70, -18], [-76, -13], [-81, -5], [-80, 0], [-77, 4]],
  // Africa
  [[-17, 21], [-10, 30], [-5, 36], [10, 37], [22, 32], [32, 31], [35, 28], [43, 12], [51, 12], [42, -2], [40, -15], [35, -25], [27, -34], [18, -34], [12, -18], [9, -1], [9, 4], [-8, 4], [-14, 10], [-17, 15]],
  // Eurasia
  [[-10, 36], [-9, 43], [0, 44], [-4, 48], [8, 54], [20, 55], [30, 60], [28, 70], [45, 68], [70, 73], [100, 77], [140, 72], [170, 68], [180, 65], [160, 58], [140, 52], [135, 45], [122, 40], [122, 30], [110, 20], [106, 10], [100, 2], [98, 10], [93, 20], [88, 22], [80, 10], [73, 17], [67, 25], [57, 25], [57, 18], [43, 13], [35, 30], [28, 36], [22, 40], [15, 40], [12, 45], [3, 43]],
  // Australia + Greenland
  [[114, -22], [122, -18], [131, -12], [137, -12], [142, -11], [146, -19], [153, -27], [150, -37], [141, -38], [131, -32], [116, -35], [114, -26]],
  [[-55, 60], [-45, 60], [-20, 70], [-25, 82], [-60, 82], [-70, 76]],
];

export const WorldMap: React.FC<{
  owned: Partial<Record<RegionId, number>>;
  selected: RegionId | null;
  onSelect: (id: RegionId) => void;
  onHover: (id: RegionId | null) => void;
  nowMs: number;
}> = ({ owned, selected, onSelect, onHover, nowMs }) => {
  const land = useMemo(() => CONTINENTS.map(path), []);
  // sun is at local noon on the meridian where it is 12:00
  const utcH = (nowMs / 3600000) % 24;
  const sunLon = -((utcH - 12) * 15);
  const [nx] = proj(sunLon + 90, 0);
  return (
    <svg viewBox="0 0 1000 500" className="pl-map" role="img" aria-label="Mapa del planeta con las siete regiones de cultivo">
      <defs>
        <linearGradient id="plOcean" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0b2a44" /><stop offset="1" stopColor="#061626" /></linearGradient>
        <linearGradient id="plLand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1e6b45" /><stop offset="1" stopColor="#0f3d2a" /></linearGradient>
        <clipPath id="plClip"><rect width="1000" height="500" rx="16" /></clipPath>
      </defs>
      <g clipPath="url(#plClip)">
        <rect width="1000" height="500" fill="url(#plOcean)" />
        {[-60, -30, 0, 30, 60].map((la) => <line key={la} x1="0" x2="1000" y1={proj(0, la)[1]} y2={proj(0, la)[1]} stroke="#7dd3fc" strokeOpacity=".07" />)}
        {Array.from({ length: 11 }, (_, i) => -150 + i * 30).map((lo) => <line key={lo} y1="0" y2="500" x1={proj(lo, 0)[0]} x2={proj(lo, 0)[0]} stroke="#7dd3fc" strokeOpacity=".07" />)}
        {land.map((d, i) => <path key={i} d={d} fill="url(#plLand)" stroke="#34d399" strokeOpacity=".45" strokeWidth="1.2" strokeLinejoin="round" />)}
        {/* night side (a band 180° wide that wraps around the map) */}
        <rect x={nx} y="0" width="500" height="500" fill="#020617" opacity=".5" />
        <rect x={nx - 1000} y="0" width="500" height="500" fill="#020617" opacity=".5" />
        {/* clouds */}
        {[[60, 90, 70], [40, 250, 90], [20, 380, 60], [30, 160, 80]].map(([x, y, w], i) => (
          <g key={i} className="pl-cloud" style={{ animationDelay: `${-i * 15}s`, animationDuration: `${55 + i * 10}s` }}>
            <ellipse cx={x} cy={y} rx={w} ry={w / 5} fill="#fff" opacity=".07" />
            <ellipse cx={x + w * 0.4} cy={y - 8} rx={w * 0.55} ry={w / 6} fill="#fff" opacity=".06" />
          </g>
        ))}
        {REGIONS.map((r) => {
          const [x, y] = proj(r.lon, r.lat);
          const sel = selected === r.id;
          const n = owned[r.id] ?? 0;
          return (
            <g
              key={r.id} className="pl-marker" tabIndex={0} role="button" aria-label={`${r.name}: ${r.climate}`}
              onClick={() => onSelect(r.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(r.id); }}
              onMouseEnter={() => onHover(r.id)} onMouseLeave={() => onHover(null)} onFocus={() => onHover(r.id)} onBlur={() => onHover(null)}
            >
              <circle cx={x} cy={y} r="9" fill="none" stroke={r.color} strokeWidth="2" className="pl-ring" />
              <circle cx={x} cy={y} r="9" fill="none" stroke={r.color} strokeWidth="2" className="pl-ring" style={{ animationDelay: '-1.2s' }} />
              <circle cx={x} cy={y} r="26" fill={r.color} opacity={sel ? 0.28 : 0.12} />
              <circle cx={x} cy={y} r={sel ? 15 : 12} fill="#04121c" stroke={r.color} strokeWidth={sel ? 3.2 : 2} className="pl-dot" />
              <text x={x} y={y + 5} textAnchor="middle" fontSize={sel ? 16 : 14}>{r.emoji}</text>
              {(() => { const L = LABEL[r.id] ?? { dx: 0, dy: 30, anchor: 'middle' as const }; return (
                <text x={x + L.dx} y={y + L.dy} textAnchor={L.anchor} fontSize="12" fontWeight={sel ? 800 : 600} fill="#e2e8f0" stroke="#020617" strokeWidth="3" paintOrder="stroke" fontFamily="ui-monospace, monospace">{r.name}</text>
              ); })()}
              {n > 0 && (
                <g transform={`translate(${x + 12} ${y - 18})`}>
                  <rect x="-2" y="-11" width="28" height="15" rx="7.5" fill="#f59e0b" stroke="#78350f" />
                  <text x="12" y="0.5" textAnchor="middle" fontSize="10" fontWeight="800" fill="#1c1305" fontFamily="ui-monospace, monospace">★ {n}</text>
                </g>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
};
