import React, { useMemo } from 'react';
import { proj } from './WorldMap';

/** Terrain and scenery for the flat world map: coast glow, islands, deserts, forests, mountains, ice caps, waves, a compass and the lights of the cities that are in the dark. */
type LL = Array<[number, number]>;
const path = (pts: LL) => 'M' + pts.map(([lo, la]) => proj(lo, la).map((v) => v.toFixed(1)).join(' ')).join(' L') + 'Z';
const hash01 = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

export const ISLANDS: LL[] = [
  [[130, 32], [135, 34], [140, 38], [142, 44], [140, 42], [137, 36]],                     // Japan
  [[-5, 50], [1, 51], [-2, 58], [-6, 56]],                                                // Great Britain
  [[-10, 52], [-6, 52], [-6, 55], [-10, 54]],                                             // Ireland
  [[95, 5], [104, -3], [102, -5], [96, 2]], [[109, 1], [117, 7], [118, 0], [112, -3]], [[105, -6], [114, -8], [113, -7]], // Sumatra, Borneo, Java
  [[131, -1], [141, -3], [148, -8], [140, -8]],                                           // New Guinea
  [[172, -35], [178, -38], [174, -41]], [[168, -44], [174, -41], [171, -46]],            // New Zealand
  [[44, -13], [50, -16], [47, -25], [43, -22]],                                           // Madagascar
  [[-85, 22], [-77, 20], [-73, 19.5], [-77, 21.5]], [[-73, 19.8], [-68, 19], [-70, 18]],  // Cuba, Hispaniola
  [[-24, 65], [-14, 65], [-14, 63.5], [-22, 63.5]],                                       // Iceland
  [[80, 9], [82, 8], [81, 6], [80, 6]],                                                   // Sri Lanka
  [[-68, -53], [-65, -55], [-70, -55]],                                                   // Tierra del Fuego
];
const DESERTS: LL[] = [
  [[-12, 28], [0, 32], [20, 30], [30, 26], [25, 18], [0, 16], [-12, 18]],               // Sahara
  [[38, 28], [50, 26], [56, 18], [45, 14]],                                               // Arabia
  [[120, -22], [140, -20], [140, -30], [122, -30]],                                       // Outback
  [[90, 45], [110, 44], [108, 38], [92, 38]],                                             // Gobi
  [[-116, 34], [-108, 34], [-106, 28], [-114, 28]],                                       // Sonora
];
const FORESTS: Array<[number, number, number, number]> = [[-62, -4, 16, 26], [22, 0, 12, 20], [100, 14, 9, 14], [-100, 56, 20, 28], [-80, 52, 10, 12], [80, 62, 24, 26], [110, 60, 22, 24], [-52, -20, 6, 9], [-84, 9, 4, 6]];
const MOUNTAINS: LL = [[-118, 51], [-114, 47], [-110, 43], [-108, 38], [-106, 34], [-72, -10], [-70, -18], [-70, -27], [-71, -34], [-72, -42], [7, 46], [10, 46], [13, 46], [70, 36], [74, 34], [78, 32], [83, 28], [88, 28], [94, 28], [-6, 32], [0, 34], [58, 58], [59, 54], [36, 42], [42, 42], [-4, 43], [-100, 20], [-104, 22], [40, 8], [37, 4]];
const CITIES: LL = [[-74, 40], [-118, 34], [-99, 19], [-79, 9], [-77, 4], [-46, -23], [-58, -34], [-70, -33], [-0.1, 51], [2, 48], [13, 52], [37, 55], [31, 30], [3, 6], [28, -26], [36, -1], [77, 28], [72, 19], [116, 40], [121, 31], [139, 35], [103, 1], [106, -6], [151, -34], [-3, 40], [12, 42], [-43, -22], [51, 35], [67, 24], [126, 37]];

export const MapDetail: React.FC<{ nowMs: number; layer: 'ground' | 'lights' }> = ({ nowMs, layer }) => {
  const staticParts = useMemo(() => {
    const trees: Array<[number, number, number]> = [];
    FORESTS.forEach(([lo, la, rx, ry], k) => { for (let i = 0; i < 26; i++) { const a = hash01(k * 100 + i) * Math.PI * 2, r = Math.sqrt(hash01(k * 100 + i + 50)); const [x, y] = proj(lo + Math.cos(a) * rx * r, la + Math.sin(a) * ry * r * 0.6); trees.push([x, y, 1.6 + hash01(i + k) * 1.4]); } });
    const peaks = MOUNTAINS.map(([lo, la], i) => { const [x, y] = proj(lo + (hash01(i) - 0.5) * 3, la + (hash01(i + 9) - 0.5) * 3); return [x, y, 5 + hash01(i + 3) * 4] as [number, number, number]; });
    return { trees, peaks, islands: ISLANDS.map(path), deserts: DESERTS.map(path) };
  }, []);

  if (layer === 'ground') {
    return (
      <g pointerEvents="none">
        <defs>
          <filter id="plCoast" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="2.2" /></filter>
          <linearGradient id="plIce" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f0f9ff" /><stop offset="1" stopColor="#bae6fd" /></linearGradient>
        </defs>
        {/* islands share the land style */}
        {staticParts.islands.map((d, i) => <path key={i} d={d} fill="url(#plLand)" stroke="#34d399" strokeOpacity=".45" strokeWidth="1" strokeLinejoin="round" />)}
        {/* deserts, forests, mountains */}
        {staticParts.deserts.map((d, i) => <path key={i} d={d} fill="#c2913a" fillOpacity=".3" stroke="none" />)}
        {staticParts.trees.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill="#0e5a34" fillOpacity=".55" />)}
        {staticParts.peaks.map(([x, y, s], i) => (
          <g key={i} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
            <path d={`M${-s} 0 L0 ${-s * 1.1} L${s} 0Z`} fill="#3f6b57" stroke="#0a2a1c" strokeWidth=".6" strokeLinejoin="round" />
            <path d={`M${-s * 0.35} ${-s * 0.72} L0 ${-s * 1.1} L${s * 0.35} ${-s * 0.72} L0 ${-s * 0.55}Z`} fill="#eef6f2" fillOpacity=".9" />
          </g>
        ))}
        {/* polar caps */}
        <path d={path([[-180, -72], [-140, -76], [-90, -72], [-40, -75], [10, -71], [60, -68], [110, -70], [150, -72], [180, -72], [180, -90], [-180, -90]])} fill="url(#plIce)" fillOpacity=".85" stroke="#7dd3fc" strokeOpacity=".5" />
        <path d={path([[-180, 84], [-100, 82], [0, 83], [100, 82], [180, 84], [180, 90], [-180, 90]])} fill="url(#plIce)" fillOpacity=".55" />
        {/* waves */}
        {Array.from({ length: 34 }, (_, i) => {
          const [x, y] = proj(-175 + hash01(i * 3) * 350, -55 + hash01(i * 3 + 1) * 110);
          return <path key={i} className="pl-wave" d="M0 0 q3 -3 6 0 t6 0" transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`} fill="none" stroke="#a5d8ff" strokeOpacity=".22" strokeWidth="1" style={{ animationDelay: `${-hash01(i) * 6}s` }} />;
        })}
        {/* compass rose, bottom left over the sea */}
        <g transform="translate(58 424)" opacity=".7">
          <circle r="22" fill="#04121c" fillOpacity=".55" stroke="#7dd3fc" strokeOpacity=".5" />
          <path d="M0 -18 L4 0 L0 18 L-4 0Z" fill="#e2e8f0" fillOpacity=".8" /><path d="M-18 0 L0 -4 L18 0 L0 4Z" fill="#7dd3fc" fillOpacity=".6" />
          <path d="M0 -18 L4 0 L-4 0Z" fill="#f87171" />
          <text y="-24" textAnchor="middle" fontSize="8" fill="#e2e8f0" fontFamily="ui-monospace, monospace" fontWeight="700">N</text>
        </g>
      </g>
    );
  }

  // lights of the cities that are in the dark right now
  const utcH = (nowMs / 3600000) % 24;
  return (
    <g pointerEvents="none">
      {CITIES.map(([lo, la], i) => {
        const [x, y] = proj(lo, la);
        const local = (((utcH + lo / 15) % 24) + 24) % 24;
        const dark = local < 6.2 || local >= 18;
        return <g key={i} opacity={dark ? 1 : 0} style={{ transition: 'opacity 2s' }}><circle cx={x} cy={y} r="5" fill="#fde68a" opacity=".16" /><circle cx={x} cy={y} r="1.5" fill="#fde68a" className="pl-city" style={{ animationDelay: `${-(i % 5)}s` }} /></g>;
      })}
    </g>
  );
};
