import React, { useEffect, useMemo, useState } from 'react';
import { REGIONS } from '../../sim/terroir';
import { proj } from './WorldMap';
import { t as tr } from '../../i18n';

/**
 * The life of the world map: cargo ships and sailboats on the sea lanes, aeroplanes crossing the sky with their contrails, a whale,
 * and once in a while a UFO that hovers over a region and beams something up (click it for a small prize). Everything is a tiny
 * SVG group moved by SMIL `animateMotion`, so it costs no JavaScript per frame; nothing is drawn for reduced motion.
 */
type LL = Array<[number, number]>;
const pathOf = (pts: LL): string => {
  const p = pts.map(([lo, la]) => proj(lo, la));
  if (p.length < 3) return `M${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)} L${p[1][0].toFixed(1)} ${p[1][1].toFixed(1)}`;
  // smooth through the points with quadratic curves through the midpoints
  let d = `M${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
  for (let i = 1; i < p.length - 1; i++) {
    const mx = (p[i][0] + p[i + 1][0]) / 2, my = (p[i][1] + p[i + 1][1]) / 2;
    d += ` Q${p[i][0].toFixed(1)} ${p[i][1].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }
  const l = p[p.length - 1];
  return d + ` L${l[0].toFixed(1)} ${l[1].toFixed(1)}`;
};

/* ───────────── icons (drawn from above, pointing +x; the motion path rotates them) ───────────── */
const Cargo: React.FC<{ tone: string }> = ({ tone }) => (
  <g>
    <path d="M-30 0 L-12 -3.2 M-30 0 L-12 3.2" stroke="#fff" strokeOpacity=".5" strokeWidth="1.4" fill="none" strokeLinecap="round" className="pl-wake" />
    <path d="M-12 0 L-9 -4 L9 -4 L14 0 L9 4 L-9 4Z" fill="#dbe4ee" stroke="#0a0716" strokeWidth="1" strokeLinejoin="round" />
    {[-7, -2.5, 2].map((x, i) => <rect key={x} x={x} y="-2.8" width="4" height="5.6" fill={['#ef4444', '#3b82f6', tone][i]} stroke="#0a0716" strokeWidth=".5" />)}
    <rect x="-10" y="-2.6" width="3" height="5.2" fill="#f8fafc" stroke="#0a0716" strokeWidth=".6" />
  </g>
);
const Sail: React.FC = () => (
  <g>
    <path d="M-16 0 L-6 -2 M-16 0 L-6 2" stroke="#fff" strokeOpacity=".5" strokeWidth="1.2" fill="none" strokeLinecap="round" className="pl-wake" />
    <path d="M-7 0 L-4 -2.6 L6 -2.6 L9 0 L6 2.6 L-4 2.6Z" fill="#a16207" stroke="#0a0716" strokeWidth=".9" strokeLinejoin="round" />
    <path d="M-3 0 L4 -7 L4 0Z M-3 0 L4 7 L4 0Z" fill="#fff7e6" stroke="#0a0716" strokeWidth=".6" opacity=".95" />
  </g>
);
const Plane: React.FC = () => (
  <g>
    <g transform="translate(5 7)" opacity=".28"><path d="M12 0 L4 -1.6 L-2 -9 L-5 -9 L-2 -1.6 L-8 -1.2 L-10 -4 L-12 -4 L-10 0 L-12 4 L-10 4 L-8 1.2 L-2 1.6 L-5 9 L-2 9 L4 1.6Z" fill="#000" /></g>
    {[-15, -21, -27, -33].map((x, i) => <circle key={x} cx={x} cy="0" r={1.7 - i * 0.28} fill="#fff" opacity={0.6 - i * 0.14} />)}
    <path d="M12 0 L4 -1.6 L-2 -9 L-5 -9 L-2 -1.6 L-8 -1.2 L-10 -4 L-12 -4 L-10 0 L-12 4 L-10 4 L-8 1.2 L-2 1.6 L-5 9 L-2 9 L4 1.6Z" fill="#f8fafc" stroke="#0a0716" strokeWidth=".8" strokeLinejoin="round" />
    <circle cx="-1" cy="-8.4" r="1" fill="#ef4444" className="pl-blink" /><circle cx="-1" cy="8.4" r="1" fill="#22c55e" className="pl-blink" style={{ animationDelay: '-.6s' }} />
  </g>
);

const SHIPS: Array<{ lane: LL; dur: number; at: number; kind: 'cargo' | 'sail'; tone?: string }> = [
  { lane: [[-76, 20], [-56, 33], [-30, 40], [-8, 46]], dur: 95, at: 0, kind: 'cargo', tone: '#f59e0b' },
  { lane: [[-8, 46], [-32, 36], [-56, 29], [-78, 21]], dur: 110, at: 40, kind: 'cargo', tone: '#22c55e' },
  { lane: [[-36, -10], [-18, -22], [0, -28], [10, -30]], dur: 80, at: 12, kind: 'cargo', tone: '#a855f7' },
  { lane: [[-172, 18], [-148, 12], [-124, 14], [-100, 8]], dur: 100, at: 30, kind: 'cargo', tone: '#f59e0b' },
  { lane: [[134, 10], [152, 18], [166, 24], [178, 28]], dur: 85, at: 5, kind: 'cargo', tone: '#22c55e' },
  { lane: [[58, 6], [76, -6], [92, -10], [104, -12]], dur: 90, at: 22, kind: 'cargo', tone: '#f59e0b' },
  { lane: [[-72, -54], [-30, -58], [10, -56], [60, -54]], dur: 140, at: 60, kind: 'cargo', tone: '#3b82f6' },
  { lane: [[-84, 16], [-78, 18], [-72, 16], [-80, 13], [-84, 16]], dur: 46, at: 10, kind: 'sail' },
  { lane: [[142, -6], [150, -12], [160, -20], [170, -28]], dur: 75, at: 18, kind: 'sail' },
];

const PLANES: Array<{ route: LL; dur: number; at: number }> = [
  { route: [[-80, 40], [-40, 56], [0, 50]], dur: 46, at: 0 },
  { route: [[8, 48], [60, 60], [116, 40]], dur: 58, at: 20 },
  { route: [[-70, -8], [-34, 6], [0, 8]], dur: 52, at: 8 },
  { route: [[112, 24], [128, 0], [146, -26]], dur: 44, at: 26 },
  { route: [[-120, 34], [-100, 46], [-76, 42]], dur: 40, at: 14 },
  { route: [[20, -4], [40, 22], [78, 28]], dur: 50, at: 33 },
];

const Whale: React.FC = () => {
  const [x, y] = proj(-138, -8);
  return (
    <g transform={`translate(${x} ${y})`} pointerEvents="none">
      <g className="pl-whale">
        <path d="M-9 0 Q-2 -5 6 -1 Q10 1 13 -3 L12 2 Q9 0 6 2 Q-2 5 -9 0Z" fill="#334e68" stroke="#0a0716" strokeWidth=".8" />
        <path d="M9 -1 Q11 -6 15 -6 Q13 -2 12 0Z" fill="#334e68" stroke="#0a0716" strokeWidth=".6" />
        <g className="pl-spout" stroke="#dbeafe" strokeWidth="1.2" strokeLinecap="round" fill="none"><path d="M-3 -3 L-3 -9 M-3 -9 L-6 -11 M-3 -9 L0 -11" /></g>
      </g>
    </g>
  );
};

/* ───────────── the UFO ───────────── */
interface Visit { id: number; from: [number, number]; to: [number, number]; away: [number, number]; region: string; what: string }
const LOOT = ['🐄', '🌿', '🚜', '📦', '🐓'];

const Ufo: React.FC<{ visit: Visit; onCatch: () => void }> = ({ visit, onCatch }) => {
  const [fx, fy] = visit.from, [tx, ty] = visit.to, [ax, ay] = visit.away;
  const d = `M${fx} ${fy} L${tx} ${ty - 26} L${ax} ${ay}`;
  const dur = 26;
  // the hover point is where the path bends, not at half its length
  const l1 = Math.hypot(tx - fx, ty - 26 - fy), l2 = Math.hypot(ax - tx, ay - (ty - 26));
  const f = (l1 / (l1 + l2)).toFixed(3);
  return (
    <g key={visit.id} style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); onCatch(); }} role="button" aria-label={tr('Un ovni: toca para saludar')} data-testid="ufo">
      <g>
        <animateMotion dur={`${dur}s`} fill="freeze" path={d} keyPoints={`0;${f};${f};1`} keyTimes="0;0.36;0.68;1" calcMode="linear" />
        <g transform="scale(1.6)"><g className="pl-ufo">
          <circle cx="0" cy="0" r="16" fill="transparent" />
          <ellipse cx="0" cy="3" rx="13" ry="4.4" fill="#94a3b8" stroke="#0a0716" strokeWidth="1" />
          <path d="M-6 1.5 Q0 -9 6 1.5Z" fill="#7dd3fc" fillOpacity=".85" stroke="#0a0716" strokeWidth=".9" />
          {[-8, -3, 2, 7].map((x, i) => <circle key={x} cx={x} cy="3.6" r="1.3" fill={['#fde047', '#f472b6', '#4ade80', '#fde047'][i]} className="pl-blink" style={{ animationDelay: `${-i * 0.3}s` }} />)}
        </g></g>
      </g>
      {/* the tractor beam and what it lifts, only while it hovers over the region */}
      <g transform={`translate(${tx} ${ty - 26}) scale(1.5)`} opacity="0" pointerEvents="none">
        <animate attributeName="opacity" dur={`${dur}s`} fill="freeze" values="0;0;0.9;0.9;0;0" keyTimes="0;0.36;0.42;0.64;0.68;1" />
        <path d="M-5 5 L5 5 L15 26 L-15 26Z" fill="url(#plBeam)" />
        <text x="0" y="22" fontSize="11" textAnchor="middle">{visit.what}<animateTransform attributeName="transform" type="translate" dur={`${dur}s`} fill="freeze" values="0 6;0 6;0 -14;0 -14;0 6;0 6" keyTimes="0;0.36;0.62;0.64;0.68;1" /></text>
      </g>
    </g>
  );
};

const useCalm = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** ships, aeroplanes and the whale: drawn under the region pins */
export const MapTraffic: React.FC = () => {
  const calm = useCalm();
  const paths = useMemo(() => ({ ships: SHIPS.map((s) => pathOf(s.lane)), planes: PLANES.map((p) => pathOf(p.route)) }), []);
  if (calm) return null;
  return (
    <g pointerEvents="none">
      {SHIPS.map((s, i) => (
        <g key={i}>
          <animateMotion dur={`${s.dur}s`} begin={`-${s.at}s`} repeatCount="indefinite" path={paths.ships[i]} rotate="auto" />
          {s.kind === 'cargo' ? <Cargo tone={s.tone ?? '#f59e0b'} /> : <Sail />}
        </g>
      ))}
      <Whale />
      {PLANES.map((p, i) => (
        <g key={i}>
          <animateMotion dur={`${p.dur}s`} begin={`-${p.at}s`} repeatCount="indefinite" path={paths.planes[i]} rotate="auto" />
          <Plane />
        </g>
      ))}
    </g>
  );
};

/** the UFO: drawn ABOVE the region pins so it can be clicked even when it hovers over one */
export const MapUfo: React.FC<{ onUfoCaught?: (region: string) => void }> = ({ onUfoCaught }) => {
  const calm = useCalm();
  const [visit, setVisit] = useState<Visit | null>(null);

  // a UFO now and then: the first one after ~50 s, then every 2–5 minutes; it never overlaps the previous one
  useEffect(() => {
    if (calm) return;
    let t: number, n = 0;
    const schedule = (ms: number) => {
      t = window.setTimeout(() => {
        if (document.hidden) { schedule(20000); return; }
        const r = REGIONS[Math.floor(Math.random() * REGIONS.length)];
        const [rx, ry] = proj(r.lon, r.lat);
        const side = Math.random() < 0.5 ? -1 : 1;
        setVisit({ id: ++n, region: r.name, what: LOOT[Math.floor(Math.random() * LOOT.length)], to: [rx, ry], from: [side < 0 ? -30 : 1030, ry - 120 - Math.random() * 40], away: [side < 0 ? 1030 : -30, ry - 140 - Math.random() * 60] });
        window.setTimeout(() => setVisit(null), 27000);
        schedule(120000 + Math.random() * 180000);
      }, ms);
    };
    schedule(50000 + Math.random() * 30000);
    return () => window.clearTimeout(t);
  }, [calm]);
  // (used by the e2e test to call a UFO on demand)
  useEffect(() => { (window as unknown as { __ybeUfo?: () => void }).__ybeUfo = () => { const r = REGIONS[3]; const [rx, ry] = proj(r.lon, r.lat); setVisit({ id: Date.now(), region: r.name, what: '🐄', to: [rx, ry], from: [-30, ry - 130], away: [1030, ry - 150] }); }; }, []);

  if (calm) return null;
  return (
    <>
      <defs><linearGradient id="plBeam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#bef264" stopOpacity=".85" /><stop offset="1" stopColor="#bef264" stopOpacity=".05" /></linearGradient></defs>
      {visit && <Ufo visit={visit} onCatch={() => { setVisit(null); onUfoCaught?.(visit.region); }} />}
    </>
  );
};
