import React, { useId } from 'react';
import type { StationId } from '../../lab/stations';

/**
 * Animated SVG scenes for the industrial lab stations.
 *
 * Motion model
 *  - `running` (class .is-run on the wrapper) switches the heavy animations (.lb-run) and the
 *    run-only layers (.lb-on) on; idle scenes just breathe (LEDs, glow).
 *  - Progress-dependent geometry (pool level, kief heap, cigar length, chromatogram trace…) is driven
 *    by the CSS variable --p (0..1) that LabFloor updates on the wrapper each frame — no React renders.
 *  - Everything animates opacity / transform / stroke-dashoffset only (see .lb-* in index.css).
 */

export interface CoaProfile { thc: number; cbd: number; cbn: number; cbg: number; terpenes: number }

interface SceneProps {
  running: boolean;
  variant: string;
  accent: string;
  profile?: CoaProfile | null;
}

const W = 640;
const H = 400;

/* ─────────────── shared bits ─────────────── */

const Defs: React.FC<{ id: string }> = ({ id }) => (
  <defs>
    <linearGradient id={`${id}metal`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#5f7673" /><stop offset="0.5" stopColor="#2f403e" /><stop offset="1" stopColor="#182322" />
    </linearGradient>
    <linearGradient id={`${id}steel`} x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stopColor="#1f2c2b" /><stop offset="0.35" stopColor="#8fa6a2" /><stop offset="0.55" stopColor="#d3e4e0" /><stop offset="1" stopColor="#1f2c2b" />
    </linearGradient>
    <linearGradient id={`${id}glass`} x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stopColor="#bfefff" stopOpacity="0.22" /><stop offset="0.5" stopColor="#bfefff" stopOpacity="0.06" /><stop offset="1" stopColor="#bfefff" stopOpacity="0.2" />
    </linearGradient>
    <linearGradient id={`${id}water`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#7ee7ff" stopOpacity="0.85" /><stop offset="1" stopColor="#0e7490" stopOpacity="0.9" />
    </linearGradient>
    <linearGradient id={`${id}amber`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#fde68a" /><stop offset="0.55" stopColor="#f59e0b" /><stop offset="1" stopColor="#b45309" />
    </linearGradient>
    <linearGradient id={`${id}bench`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#14201f" /><stop offset="1" stopColor="#060b0b" />
    </linearGradient>
    <linearGradient id={`${id}paper`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#f3e7c9" /><stop offset="0.6" stopColor="#c9a869" /><stop offset="1" stopColor="#8a6a36" />
    </linearGradient>
    <radialGradient id={`${id}glow`} cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stopColor="#fff" stopOpacity="0.9" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
    </radialGradient>
  </defs>
);

const Bench: React.FC<{ id: string; accent: string }> = ({ id, accent }) => (
  <g>
    <rect x="0" y="336" width={W} height={H - 336} fill={`url(#${id}bench)`} />
    <rect x="0" y="336" width={W} height="2" fill={accent} opacity="0.7" />
    {[80, 200, 320, 440, 560].map((x) => <line key={x} x1={x} y1="0" x2={x} y2="336" stroke="#fff" opacity="0.035" />)}
    {[70, 150, 230, 300].map((y) => <line key={y} x1="0" y1={y} x2={W} y2={y} stroke="#fff" opacity="0.03" />)}
  </g>
);

const Led: React.FC<{ x: number; y: number; color?: string; delay?: number }> = ({ x, y, color = '#34d399', delay = 0 }) => (
  <circle cx={x} cy={y} r="3" fill={color} className="lb-blink" style={{ animationDelay: `${delay}s`, filter: `drop-shadow(0 0 4px ${color})` }} />
);

const Gauge: React.FC<{ cx: number; cy: number; r?: number; accent: string; label?: string; speed?: number }> = ({ cx, cy, r = 32, accent, label, speed = 2.6 }) => (
  <g>
    <circle cx={cx} cy={cy} r={r} fill="#0b1413" stroke="#3b504d" strokeWidth="3" />
    <circle cx={cx} cy={cy} r={r - 5} fill="none" stroke={accent} strokeOpacity="0.35" strokeDasharray="2 5" />
    <g className="lb-run lb-needle" style={{ transformOrigin: `${cx}px ${cy}px`, animationDuration: `${speed}s` }}>
      <path d={`M${cx - 1.6} ${cy} L${cx} ${cy - r + 8} L${cx + 1.6} ${cy} Z`} fill="#fb7185" />
    </g>
    <circle cx={cx} cy={cy} r="3.4" fill="#cfe7e3" />
    {label && <text x={cx} y={cy + r + 14} textAnchor="middle" fontSize="10" fill={accent} fontFamily="monospace">{label}</text>}
  </g>
);

/** N staggered particles that fall / rise while the machine is running. */
const Drops: React.FC<{ xs: number[]; y: number; fall: number; color: string; r?: number; dur?: number; rise?: boolean }> = ({ xs, y, fall, color, r = 2.6, dur = 1.3, rise }) => (
  <g>
    {xs.map((x, i) => (
      <circle
        key={i}
        cx={x}
        cy={y}
        r={r}
        fill={color}
        className={`lb-run ${rise ? 'lb-rise' : 'lb-fall'}`}
        style={{ ['--fall' as string]: `${rise ? -fall : fall}px`, animationDuration: `${dur + (i % 3) * 0.25}s`, animationDelay: `${-(i * 0.37) % dur}s`, opacity: 0 }}
      />
    ))}
  </g>
);

/* ─────────────── 1 · Rosin press ─────────────── */

const RosinScene: React.FC<SceneProps> = ({ accent }) => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <g>
      <Defs id={id} />
      <Bench id={id} accent={accent} />
      {/* frame */}
      <rect x="196" y="316" width="248" height="22" rx="5" fill={`url(#${id}metal)`} />
      <rect x="216" y="66" width="18" height="254" rx="5" fill={`url(#${id}steel)`} />
      <rect x="406" y="66" width="18" height="254" rx="5" fill={`url(#${id}steel)`} />

      {/* moving ram: rod + heated top plate */}
      <g className="lb-run lb-press">
        <rect x="312" y="96" width="16" height="72" rx="3" fill={`url(#${id}steel)`} />
        <rect x="248" y="166" width="144" height="26" rx="5" fill={`url(#${id}metal)`} stroke={accent} strokeOpacity="0.6" />
        <rect x="256" y="187" width="128" height="3" rx="1.5" fill="#ff7a3d" className="lb-blink" />
      </g>
      {/* hydraulic cylinder (in front of the rod) */}
      <rect x="216" y="52" width="208" height="26" rx="8" fill={`url(#${id}metal)`} />
      <rect x="284" y="78" width="72" height="44" rx="8" fill={`url(#${id}steel)`} />
      <path d="M240 78 C240 100 284 96 284 110 M400 78 C400 100 356 96 356 110" fill="none" stroke="#3b6f7a" strokeWidth="5" strokeLinecap="round" className="lb-run lb-dash" />

      {/* lower plate, parchment, flower */}
      <rect x="248" y="252" width="144" height="30" rx="5" fill={`url(#${id}metal)`} stroke={accent} strokeOpacity="0.5" />
      <rect x="256" y="255" width="128" height="3" rx="1.5" fill="#ff7a3d" className="lb-blink" />
      <rect x="268" y="241" width="104" height="11" rx="2" fill="#f5efe0" />
      <g className="lb-tbb" style={{ transform: 'scaleY(calc(1 - 0.75 * var(--p, 0)))' }}>
        <ellipse cx="320" cy="238" rx="30" ry="10" fill="#3f8f3a" />
        <circle cx="306" cy="234" r="6" fill="#57b04a" /><circle cx="330" cy="235" r="6" fill="#2f7a2c" /><circle cx="318" cy="230" r="5" fill="#6dc45c" />
      </g>
      {/* rosin squeezing out */}
      <ellipse cx="320" cy="251" rx="52" ry="3.5" fill={`url(#${id}amber)`} className="lb-tb" style={{ transform: 'scaleX(var(--p, 0))' }} />
      <Drops xs={[276, 300, 340, 366]} y={253} fall={46} color="#f6b73c" r={3} dur={1.5} />

      {/* collection dish */}
      <ellipse cx="320" cy="302" rx="78" ry="11" fill="#0d1817" stroke="#3a4c49" strokeWidth="2" />
      <ellipse cx="320" cy="300" rx="62" ry="6" fill={`url(#${id}amber)`} className="lb-tb" style={{ transform: 'scale(var(--p, 0))' }} />

      {/* steam */}
      {[286, 320, 354].map((x, i) => (
        <path key={x} d={`M${x} 236 q -8 -14 0 -26 t 0 -26`} fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="3" strokeLinecap="round" className="lb-run lb-steam" style={{ animationDelay: `${i * 0.5}s`, opacity: 0 }} />
      ))}

      {/* input jar of flower (left) and finished rosin jars (right) */}
      <g>
        <rect x="70" y="252" width="86" height="82" rx="10" fill={`url(#${id}glass)`} stroke="#c6f4ff" strokeOpacity="0.55" strokeWidth="2.5" />
        <rect x="76" y="240" width="74" height="14" rx="4" fill="#2f403e" stroke="#5d7773" />
        {[[92, 300, 13], [118, 306, 14], [138, 296, 11], [104, 280, 12], [130, 278, 12]].map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill={i % 2 ? '#3f8f3a' : '#57b04a'} stroke="#245a22" />)}
        <text x="113" y="352" textAnchor="middle" fontSize="10" fontFamily="monospace" fill={accent}>flor seca</text>
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <rect x={470 + i * 44} y="290" width="34" height="44" rx="6" fill={`url(#${id}glass)`} stroke="#c6f4ff" strokeOpacity="0.5" />
            <rect x={473 + i * 44} y={318 - i * 6} width="28" height={13 + i * 6} rx="3" fill={`url(#${id}amber)`} opacity="0.9" />
            <rect x={472 + i * 44} y="284" width="30" height="8" rx="3" fill="#2f403e" />
          </g>
        ))}
      </g>

      {/* instruments */}
      <Gauge cx={512} cy={112} accent={accent} label="10 T" />
      <rect x="470" y="170" width="84" height="34" rx="6" fill="#07100f" stroke="#26403b" />
      <text x="512" y="193" textAnchor="middle" fontSize="18" fontFamily="monospace" fill="#ff9a5a">82°C</text>
      <Led x={92} y={90} /><Led x={110} y={90} color="#fbbf24" delay={0.5} /><Led x={128} y={90} color="#22d3ee" delay={1} />
    </g>
  );
};

/* ─────────────── 2 · Bubble hash washer ─────────────── */

const BubbleScene: React.FC<SceneProps> = ({ accent }) => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const bags = [{ x: 470, mesh: '190µ', lvl: 0.55 }, { x: 520, mesh: '120µ', lvl: 0.85 }, { x: 570, mesh: '73µ', lvl: 1 }];
  return (
    <g>
      <Defs id={id} />
      <Bench id={id} accent={accent} />
      <clipPath id={`${id}tank`}><rect x="236" y="108" width="168" height="216" rx="18" /></clipPath>

      {/* motor + shaft */}
      <rect x="286" y="60" width="68" height="44" rx="8" fill={`url(#${id}metal)`} stroke={accent} strokeOpacity="0.5" />
      <Led x={300} y={72} /><Led x={312} y={72} color="#22d3ee" delay={0.4} />
      <rect x="316" y="104" width="8" height="160" fill={`url(#${id}steel)`} />

      {/* tank */}
      <rect x="230" y="102" width="180" height="228" rx="22" fill={`url(#${id}glass)`} stroke="#9fd8e6" strokeOpacity="0.6" strokeWidth="3" />
      <g clipPath={`url(#${id}tank)`}>
        <rect x="236" y="156" width="168" height="170" fill={`url(#${id}water)`} />
        <path d="M150 158 q 21 -9 43 0 t 43 0 t 43 0 t 43 0 t 43 0 t 43 0 t 43 0 V 172 H 150 Z" fill="#a5f3fc" opacity="0.8" className="lb-run lb-wave" />
        {/* ice cubes */}
        {[[262, 190], [352, 200], [292, 222], [372, 236], [255, 262], [330, 176], [300, 284]].map(([x, y], i) => (
          <rect key={i} x={x} y={y} width="24" height="24" rx="5" fill="#e6fbff" fillOpacity="0.7" stroke="#fff" strokeOpacity="0.7" className="lb-run lb-bob" style={{ animationDelay: `${-i * 0.45}s`, animationDuration: `${1.6 + (i % 3) * 0.35}s` }} />
        ))}
        {/* trichome heads swirling loose */}
        <g className="lb-run lb-spin" style={{ transformOrigin: '320px 246px', animationDuration: '2.6s' }}>
          {Array.from({ length: 16 }, (_, i) => {
            const a = (i / 16) * Math.PI * 2;
            const r = 26 + (i % 4) * 14;
            return <circle key={i} cx={320 + r * Math.cos(a)} cy={246 + r * 0.45 * Math.sin(a)} r="2.6" fill="#ffe08a" />;
          })}
        </g>
        {/* paddles (seen edge-on: scaleX flips) */}
        {[236, 214].map((y, i) => (
          <ellipse key={y} cx="320" cy={y} rx="44" ry="8" fill="#cfe7ee" stroke="#5e7d85" className="lb-run lb-paddle" style={{ animationDelay: `${-i * 0.4}s` }} />
        ))}
      </g>
      <Drops xs={[264, 284, 304, 336, 358, 380, 296, 344]} y={318} fall={150} color="#e0fbff" r={4} dur={2.2} rise />
      <rect x="222" y="326" width="196" height="14" rx="6" fill={`url(#${id}metal)`} />

      {/* hose + filter bags */}
      <path d="M410 300 C450 300 452 240 470 214" fill="none" stroke="#3b7d8c" strokeWidth="6" strokeLinecap="round" />
      <path d="M410 300 C450 300 452 240 470 214" fill="none" stroke="#a5f3fc" strokeWidth="2" strokeDasharray="6 8" className="lb-run lb-dash" />
      {bags.map(({ x, mesh, lvl }) => (
        <g key={x}>
          <rect x={x - 22} y="196" width="44" height="6" rx="2" fill="#5a706d" />
          <path d={`M${x - 20} 202 L${x - 14} 300 Q${x} 312 ${x + 14} 300 L${x + 20} 202 Z`} fill="#dff7fb" fillOpacity="0.14" stroke="#9fd8e6" strokeOpacity="0.7" />
          {[218, 236, 254, 272].map((yy) => <line key={yy} x1={x - 16} y1={yy} x2={x + 16} y2={yy} stroke="#bff3ff" strokeOpacity="0.25" />)}
          <clipPath id={`${id}bag${x}`}><path d={`M${x - 20} 202 L${x - 14} 300 Q${x} 312 ${x + 14} 300 L${x + 20} 202 Z`} /></clipPath>
          <g clipPath={`url(#${id}bag${x})`}>
            <rect x={x - 22} y="200" width="44" height="112" fill="#e8c86a" className="lb-tbb" style={{ transform: `scaleY(calc(${lvl} * 0.5 * var(--p, 0)))` }} />
          </g>
          <text x={x} y="330" textAnchor="middle" fontSize="11" fill={accent} fontFamily="monospace">{mesh}</text>
        </g>
      ))}
    </g>
  );
};

/* ─────────────── 3 · Terpene soup ─────────────── */

const TerpSoupScene: React.FC<SceneProps> = ({ accent, variant }) => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const diamonds = variant === 'diamonds';
  return (
    <g>
      <Defs id={id} />
      <Bench id={id} accent={accent} />
      <clipPath id={`${id}beaker`}><path d="M254 118 L254 292 Q254 306 268 306 L372 306 Q386 306 386 292 L386 118 Z" /></clipPath>
      {/* hot plate */}
      <rect x="206" y="308" width="228" height="28" rx="8" fill={`url(#${id}metal)`} stroke={accent} strokeOpacity="0.4" />
      <ellipse cx="320" cy="309" rx="88" ry="5" fill="#ff5a2a" className="lb-blink" />
      <Led x={226} y={322} color="#f97316" /><Led x={244} y={322} delay={0.6} />

      {/* beaker */}
      <path d="M248 112 L254 118 L254 292 Q254 306 268 306 L372 306 Q386 306 386 292 L386 118 L392 112" fill={`url(#${id}glass)`} stroke="#c6f4ff" strokeOpacity="0.7" strokeWidth="3" />
      <g clipPath={`url(#${id}beaker)`}>
        <rect x="254" y="176" width="132" height="132" fill="#c9a227" opacity="0.9" />
        <rect x="254" y="176" width="132" height="132" fill="#4d7c0f" opacity="0.5" />
        <path d="M230 178 q 16 -8 33 0 t 33 0 t 33 0 t 33 0 t 33 0 V 190 H 230 Z" fill="#e9c94c" className="lb-run lb-wave" />
        {/* vortex rings */}
        {[[52, 12, 200], [44, 10, 224], [34, 8, 250], [24, 6, 272]].map(([rx, ry, cy], i) => (
          <ellipse key={i} cx="320" cy={cy} rx={rx} ry={ry} fill="none" stroke="#fff3b0" strokeOpacity="0.6" strokeWidth="2" className="lb-run lb-paddle" style={{ animationDelay: `${-i * 0.25}s`, animationDuration: '1.1s' }} />
        ))}
        {/* magnetic stir bar */}
        <rect x="298" y="292" width="44" height="10" rx="5" fill="#f4f7f7" className="lb-run lb-paddle" style={{ animationDuration: '0.5s' }} />
        {/* crystals / diamonds growing */}
        {[[276, 292, 9], [300, 296, 7], [340, 294, 11], [364, 296, 8], [322, 298, diamonds ? 10 : 5]].map(([x, y, s], i) => (
          <path key={i} d={`M${x} ${y - s} L${x + s * 0.8} ${y} L${x} ${y + s * 0.7} L${x - s * 0.8} ${y} Z`} fill="#fff4c2" stroke="#fde68a" className="lb-tbb" style={{ transform: `scale(calc(${diamonds ? 0.25 : 0.1} + ${diamonds ? 1.1 : 0.7} * var(--p, 0)))`, opacity: 0.95 }} />
        ))}
      </g>
      <Drops xs={[280, 300, 322, 344, 364, 310, 336]} y={300} fall={110} color="#fff3b0" r={4} dur={1.7} rise />

      {/* vapour curls + aroma waves */}
      {[290, 320, 350].map((x, i) => (
        <path key={x} d={`M${x} 106 q -10 -16 0 -30 t 0 -30`} fill="none" stroke="#d9f99d" strokeOpacity="0.6" strokeWidth="3" strokeLinecap="round" className="lb-run lb-steam" style={{ animationDelay: `${i * 0.55}s`, opacity: 0 }} />
      ))}
      <path d="M430 150 q 20 -18 40 0 t 40 0 t 40 0" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="6 8" className="lb-run lb-dash" opacity="0.8" />
      <path d="M430 176 q 20 -18 40 0 t 40 0 t 40 0" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="6 8" className="lb-run lb-dash" opacity="0.5" style={{ animationDelay: '-1s' }} />

      {/* thermometer probe */}
      <rect x="420" y="120" width="10" height="176" rx="5" fill="#0d1817" stroke="#3a4c49" />
      <rect x="422" y="150" width="6" height="146" rx="3" fill="#fb7185" className="lb-tbb" style={{ transform: 'scaleY(calc(0.35 + 0.6 * var(--p, 0)))' }} />
      <text x="425" y="112" textAnchor="middle" fontSize="11" fill="#fb7185" fontFamily="monospace">°C</text>
      <text x="470" y="240" fontSize="11" fill={accent} fontFamily="monospace">{diamonds ? 'THCa · cristalización' : 'live sauce · 42 °C'}</text>
    </g>
  );
};

/* ─────────────── 4 · Kief sifter ─────────────── */

const KiefScene: React.FC<SceneProps> = ({ accent }) => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <g>
      <Defs id={id} />
      <Bench id={id} accent={accent} />
      {/* motor with eccentric cam */}
      <rect x="92" y="236" width="86" height="90" rx="12" fill={`url(#${id}metal)`} stroke={accent} strokeOpacity="0.4" />
      <Led x={112} y={252} /><Led x={130} y={252} color="#fbbf24" delay={0.5} />
      <circle cx="135" cy="292" r="26" fill="#0b1413" stroke="#3b504d" strokeWidth="3" />
      <g className="lb-run lb-spin" style={{ transformOrigin: '135px 292px', animationDuration: '0.5s' }}>
        <circle cx="135" cy="276" r="6" fill={accent} />
        <line x1="135" y1="292" x2="135" y2="276" stroke="#8fa6a2" strokeWidth="4" />
      </g>
      <path d="M160 288 L228 200" stroke="#7d918e" strokeWidth="6" strokeLinecap="round" />

      {/* vibrating sieve */}
      <g className="lb-run lb-shake">
        <rect x="228" y="176" width="232" height="34" rx="8" fill={`url(#${id}steel)`} stroke="#5d7773" />
        <rect x="240" y="200" width="208" height="8" fill="#0b1413" />
        {Array.from({ length: 34 }, (_, i) => <line key={i} x1={244 + i * 6} y1="200" x2={244 + i * 6} y2="208" stroke="#9fb5b1" strokeWidth="0.8" />)}
        {/* plant material on the mesh */}
        <path d="M246 178 Q270 138 300 158 Q326 122 356 152 Q390 130 414 160 Q440 150 446 178 Z" fill="#3a6f2c" />
        {[[276, 160, 9], [314, 152, 11], [352, 156, 10], [394, 160, 9], [428, 168, 7]].map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill={i % 2 ? '#4f9a3a' : '#2f5f25'} />)}
        <rect x="336" y="160" width="14" height="6" rx="3" fill="#f5e6a3" opacity="0.8" />
      </g>

      {/* falling powder */}
      <Drops xs={[252, 272, 292, 312, 332, 352, 372, 392, 412, 432, 262, 302, 342, 382, 422]} y={210} fall={84} color="#f3d98b" r={1.9} dur={1.05} />

      {/* collection tray + kief heap */}
      <rect x="222" y="292" width="244" height="30" rx="7" fill={`url(#${id}metal)`} stroke="#5d7773" />
      <clipPath id={`${id}tray`}><rect x="230" y="200" width="228" height="94" /></clipPath>
      <g clipPath={`url(#${id}tray)`}>
        <path d="M250 294 Q344 214 438 294 Z" fill="#e8cf85" className="lb-tbb" style={{ transform: 'scaleY(calc(0.06 + 0.94 * var(--p, 0)))' }} />
      </g>
      {[300, 340, 384].map((x, i) => (
        <ellipse key={x} cx={x} cy="262" rx="20" ry="7" fill="#f3d98b" opacity="0.0" className="lb-run lb-steam" style={{ animationDelay: `${i * 0.45}s`, opacity: 0 }} />
      ))}
      <rect x="500" y="130" width="74" height="30" rx="8" fill="#07100f" stroke="#26403b" />
      <text x="537" y="150" textAnchor="middle" fontSize="14" fontFamily="monospace" fill={accent}>150 µm</text>
    </g>
  );
};

/* ─────────────── 5 · Rolling machine ─────────────── */

const RollerScene: React.FC<SceneProps> = ({ accent, variant }) => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const cigar = variant === 'cigar';
  const len = cigar ? 250 : 220;
  return (
    <g>
      <Defs id={id} />
      <Bench id={id} accent={accent} />
      {/* body */}
      <rect x="160" y="148" width="320" height="188" rx="22" fill={`url(#${id}metal)`} stroke={accent} strokeOpacity="0.45" strokeWidth="2" />
      {/* hopper with nugs */}
      <path d="M262 62 L378 62 L346 148 L294 148 Z" fill={`url(#${id}glass)`} stroke="#c6f4ff" strokeOpacity="0.6" strokeWidth="2" />
      {[[286, 100, 10], [316, 90, 12], [346, 104, 10], [304, 122, 9], [332, 126, 10]].map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill={i % 2 ? '#3f8f3a' : '#57b04a'} />)}
      <Drops xs={[312, 322, 330]} y={150} fall={52} color="#57b04a" r={5} dur={0.9} />

      {/* rollers */}
      <circle cx="268" cy="240" r="30" fill={`url(#${id}steel)`} stroke="#5d7773" strokeWidth="2" />
      <circle cx="372" cy="240" r="30" fill={`url(#${id}steel)`} stroke="#5d7773" strokeWidth="2" />
      {[268, 372].map((cx, k) => (
        <g key={cx} className="lb-run lb-spin" style={{ transformOrigin: `${cx}px 240px`, animationDuration: '1.4s', animationDirection: k ? 'reverse' : 'normal' }}>
          {[0, 60, 120].map((a) => <line key={a} x1={cx - 24} y1="240" x2={cx + 24} y2="240" stroke="#3d514f" strokeWidth="4" transform={`rotate(${a} ${cx} 240)`} />)}
          <circle cx={cx} cy="240" r="6" fill="#0b1413" />
        </g>
      ))}

      {/* the roll forming between the rollers */}
      <g className="lb-tbl" style={{ transform: `scaleX(calc(0.18 + 0.82 * var(--p, 0)))` }}>
        <rect x="190" y={cigar ? 228 : 231} width={len} height={cigar ? 26 : 20} rx={cigar ? 12 : 9} fill={`url(#${id}paper)`} stroke="#6b4f25" />
        <path d={`M196 ${cigar ? 232 : 234} l 20 ${cigar ? 18 : 12} M226 ${cigar ? 232 : 234} l 20 ${cigar ? 18 : 12} M256 ${cigar ? 232 : 234} l 20 ${cigar ? 18 : 12} M286 ${cigar ? 232 : 234} l 20 ${cigar ? 18 : 12} M316 ${cigar ? 232 : 234} l 20 ${cigar ? 18 : 12}`} stroke="#5b4220" strokeWidth="1.4" opacity="0.6" fill="none" className="lb-run lb-dash" />
        <rect x={190 + len - 8} y={cigar ? 230 : 233} width="10" height={cigar ? 22 : 16} rx="5" fill="#2a2a2a" />
      </g>

      {/* paper feed roll */}
      <circle cx="176" cy="200" r="16" fill="#efe3c3" stroke="#a48b54" />
      <path d="M176 216 Q176 236 190 240" stroke="#efe3c3" strokeWidth="6" fill="none" />
      {/* output tray with finished rolls */}
      <rect x="500" y="270" width="110" height="58" rx="8" fill={`url(#${id}metal)`} stroke="#5d7773" />
      {[280, 294, 308].map((y, i) => <rect key={y} x="512" y={y} width={cigar ? 84 : 74} height={cigar ? 11 : 9} rx="5" fill={`url(#${id}paper)`} stroke="#6b4f25" style={{ opacity: 0.35 + 0.3 * i }} />)}
      <Gauge cx={540} cy={150} r={26} accent={accent} speed={1.6} />
      <Led x={198} y={166} /><Led x={216} y={166} color="#fbbf24" delay={0.5} />
    </g>
  );
};

/* ─────────────── 6 · Rotavap (RSO / oils / gummies) ─────────────── */

const LIQUID: Record<string, string> = { rso: '#2a1607', oil: '#e0a21b', gummies: '#f472b6' };

const RotavapScene: React.FC<SceneProps> = ({ accent, variant }) => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const liquid = LIQUID[variant] ?? '#e0a21b';
  const gummies = variant === 'gummies';
  return (
    <g>
      <Defs id={id} />
      <Bench id={id} accent={accent} />
      <clipPath id={`${id}flask`}><circle cx="410" cy="238" r="56" /></clipPath>
      <clipPath id={`${id}recv`}><circle cx="226" cy="284" r="38" /></clipPath>

      {/* stand + motor head */}
      <rect x="150" y="66" width="10" height="266" rx="4" fill={`url(#${id}steel)`} />
      <rect x="120" y="326" width="150" height="12" rx="4" fill={`url(#${id}metal)`} />
      <rect x="150" y="60" width="150" height="44" rx="10" fill={`url(#${id}metal)`} stroke={accent} strokeOpacity="0.45" />
      <Gauge cx={112} cy={90} r={24} accent={accent} speed={3.4} />
      <Led x={172} y={74} /><Led x={190} y={74} color="#fbbf24" delay={0.5} />

      {/* vapour path (glass neck) */}
      <path d="M296 90 L372 194" stroke="#bfe9f3" strokeOpacity="0.55" strokeWidth="14" strokeLinecap="round" />
      <path d="M296 90 L372 194" stroke="#e8fbff" strokeOpacity="0.5" strokeWidth="2" strokeDasharray="5 9" strokeLinecap="round" className="lb-run lb-dash" />

      {/* condenser: glass tube with a cooling coil */}
      <rect x="196" y="106" width="60" height="118" rx="16" fill={`url(#${id}glass)`} stroke="#c6f4ff" strokeOpacity="0.6" strokeWidth="2.5" />
      <path d="M206 116 h40 c10 0 10 14 0 14 h-40 c-10 0 -10 14 0 14 h40 c10 0 10 14 0 14 h-40 c-10 0 -10 14 0 14 h40 c10 0 10 14 0 14 h-40" fill="none" stroke="#7ee7ff" strokeWidth="4" strokeLinecap="round" opacity="0.9" />
      <path d="M206 116 h40 c10 0 10 14 0 14 h-40 c-10 0 -10 14 0 14 h40 c10 0 10 14 0 14 h-40 c-10 0 -10 14 0 14 h40 c10 0 10 14 0 14 h-40" fill="none" stroke="#fff" strokeWidth="1.6" strokeDasharray="4 8" className="lb-run lb-dash" />
      <Drops xs={[226]} y={226} fall={36} color={liquid === '#2a1607' ? '#7a4a1f' : liquid} r={3.6} dur={0.8} />

      {/* receiving flask */}
      <circle cx="226" cy="284" r="40" fill={`url(#${id}glass)`} stroke="#c6f4ff" strokeOpacity="0.6" strokeWidth="3" />
      <g clipPath={`url(#${id}recv)`}>
        <rect x="186" y="246" width="80" height="80" fill={liquid} className="lb-tbb" style={{ transform: 'scaleY(calc(0.06 + 0.7 * var(--p, 0)))' }} opacity="0.95" />
      </g>
      <rect x="216" y="240" width="20" height="8" rx="2" fill="#7d918e" />

      {/* heating bath with the rotating boiling flask */}
      <rect x="338" y="284" width="152" height="50" rx="12" fill="#0c2a35" stroke="#2c6a7d" strokeWidth="2" />
      <rect x="344" y="288" width="140" height="8" rx="4" fill="#38bdf8" opacity="0.5" className="lb-blink" />
      <circle cx="410" cy="238" r="58" fill={`url(#${id}glass)`} stroke="#c6f4ff" strokeOpacity="0.65" strokeWidth="3" />
      <g clipPath={`url(#${id}flask)`}>
        <rect x="352" y="238" width="116" height="60" fill={liquid} opacity="0.92" />
        <g className="lb-run lb-spin" style={{ transformOrigin: '410px 238px', animationDuration: '3s' }}>
          {[0, 45, 90, 135].map((a) => <line key={a} x1="356" y1="238" x2="464" y2="238" stroke="#fff" strokeOpacity="0.12" strokeWidth="3" transform={`rotate(${a} 410 238)`} />)}
        </g>
        {[380, 400, 420, 440].map((x, i) => <circle key={x} cx={x} cy="280" r="4" fill="#fff" fillOpacity="0.7" className="lb-run lb-rise" style={{ ['--fall' as string]: '-34px', animationDelay: `${-i * 0.4}s`, animationDuration: '1.2s', opacity: 0 }} />)}
      </g>
      <rect x="392" y="176" width="36" height="14" rx="3" fill="#7d918e" />
      {[382, 410, 438].map((x, i) => (
        <path key={x} d={`M${x} 336 q -6 -10 0 -18 t 0 -18`} fill="none" stroke="#fb923c" strokeWidth="3" strokeLinecap="round" opacity="0" className="lb-run lb-steam" style={{ animationDelay: `${i * 0.35}s` }} />
      ))}

      {/* gummy moulds */}
      {gummies && (
        <g>
          <rect x="516" y="286" width="112" height="46" rx="8" fill="#241023" stroke="#7a3a76" />
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i} className="lb-on" style={{ transitionDelay: `${i * 0.6}s` }}>
              <rect x={524 + i * 21} y="294" width="16" height="30" rx="8" fill={['#f472b6', '#a3e635', '#fbbf24', '#f472b6', '#38bdf8'][i]} />
              <ellipse cx={532 + i * 21} cy="302" rx="4" ry="2.4" fill="#fff" opacity="0.5" />
            </g>
          ))}
        </g>
      )}
    </g>
  );
};

/* ─────────────── 7 · HPLC chromatograph ─────────────── */

const peak = (cx: number, h: number, w: number, base: number) =>
  ` L${cx - w} ${base} C${cx - w * 0.5} ${base} ${cx - w * 0.5} ${base - h} ${cx} ${base - h} C${cx + w * 0.5} ${base - h} ${cx + w * 0.5} ${base} ${cx + w} ${base}`;

const HplcScene: React.FC<SceneProps> = ({ accent, profile }) => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const p = profile ?? { thc: 24, cbd: 1, cbn: 0.4, cbg: 1.2, terpenes: 3 };
  const max = Math.max(p.thc, p.cbd, p.cbn, p.cbg, p.terpenes * 3, 1);
  const hgt = (v: number) => 14 + 118 * Math.pow(Math.max(v, 0) / max, 0.55);
  const base = 262;
  const peaks: Array<{ x: number; h: number; w: number; label: string; color: string }> = [
    { x: 418, h: hgt(p.cbg), w: 9, label: 'CBG', color: '#a3e635' },
    { x: 452, h: hgt(p.cbd), w: 10, label: 'CBD', color: '#22d3ee' },
    { x: 496, h: hgt(p.thc), w: 12, label: 'THC', color: '#34d399' },
    { x: 538, h: hgt(p.cbn), w: 9, label: 'CBN', color: '#fbbf24' },
    { x: 574, h: hgt(p.terpenes * 3), w: 11, label: 'TERP', color: '#f472b6' },
  ];
  const d = `M388 ${base}` + peaks.map((k) => peak(k.x, k.h, k.w, base)).join('') + ` L604 ${base}`;

  return (
    <g>
      <Defs id={id} />
      <Bench id={id} accent={accent} />
      {/* solvent bottles */}
      {[[56, '#38bdf8'], [92, '#a3e635'], [128, '#f472b6']].map(([x, c], i) => (
        <g key={i}>
          <rect x={Number(x) - 14} y="210" width="28" height="70" rx="6" fill={`url(#${id}glass)`} stroke="#c6f4ff" strokeOpacity="0.55" />
          <rect x={Number(x) - 12} y="236" width="24" height="42" rx="4" fill={String(c)} opacity="0.75" />
          <rect x={Number(x) - 6} y="200" width="12" height="12" rx="2" fill="#7d918e" />
          <path d={`M${x} 200 V 176 H 176`} fill="none" stroke="#7d918e" strokeWidth="3" />
        </g>
      ))}
      <path d="M56 176 H 176 M92 176 M128 176" stroke="#7ee7ff" strokeWidth="2" strokeDasharray="5 8" fill="none" className="lb-run lb-dash" />

      {/* instrument stack */}
      <rect x="160" y="150" width="200" height="184" rx="12" fill={`url(#${id}metal)`} stroke={accent} strokeOpacity="0.45" strokeWidth="2" />
      {[186, 236, 286].map((y) => <line key={y} x1="168" y1={y} x2="352" y2={y} stroke="#0b1413" strokeWidth="2" />)}
      <Led x={340} y={166} /><Led x={324} y={166} color="#22d3ee" delay={0.5} />
      {/* autosampler rack + moving arm */}
      {[184, 204, 224, 244, 264, 284, 304, 324].map((x, i) => <rect key={x} x={x - 6} y="196" width="12" height="28" rx="3" fill={['#22d3ee', '#a3e635', '#f472b6', '#fbbf24'][i % 4]} opacity="0.55" />)}
      <g className="lb-run lb-arm">
        <rect x="178" y="188" width="16" height="6" fill="#cfe7e3" />
        <rect x="184" y="182" width="4" height="34" fill="#cfe7e3" />
      </g>
      {/* column + flow */}
      <rect x="176" y="250" width="168" height="24" rx="12" fill="#0b1413" stroke="#5d7773" strokeWidth="2" />
      <rect x="182" y="256" width="156" height="12" rx="6" fill="#1a2f2c" />
      <rect x="182" y="259" width="156" height="6" rx="3" fill="none" stroke="#7ee7ff" strokeWidth="3" strokeDasharray="10 12" className="lb-run lb-dash" />
      <path d="M344 262 H 372" stroke="#7ee7ff" strokeWidth="3" strokeDasharray="4 6" className="lb-run lb-dash" />

      {/* monitor with the live chromatogram */}
      <rect x="376" y="84" width="240" height="196" rx="12" fill="#050b0a" stroke="#3b504d" strokeWidth="3" />
      {[0, 1, 2, 3, 4].map((i) => <line key={i} x1="388" y1={110 + i * 30} x2="604" y2={110 + i * 30} stroke="#14322d" />)}
      {[0, 1, 2, 3, 4, 5].map((i) => <line key={i} x1={388 + i * 43} y1="98" x2={388 + i * 43} y2="270" stroke="#14322d" />)}
      <path d={d} pathLength={1} fill="none" stroke="#34d399" strokeWidth="2.6" strokeLinejoin="round" style={{ strokeDasharray: 1, strokeDashoffset: 'calc(1 - var(--p, 0))', filter: 'drop-shadow(0 0 4px #34d399)' }} />
      {peaks.map((k, i) => (
        <text key={k.label} x={k.x} y={base - k.h - 8} textAnchor="middle" fontSize="11" fontFamily="monospace" fill={k.color} style={{ opacity: `clamp(0, calc((var(--p, 0) - ${0.18 + i * 0.15}) * 7), 1)` }}>{k.label}</text>
      ))}
      <text x="388" y="94" fontSize="10" fontFamily="monospace" fill="#5f7d78">HPLC-UV 228 nm · mAU</text>
      <rect x="470" y="288" width="96" height="10" rx="5" fill="#1b3529" />
      <rect x="470" y="288" width="96" height="10" rx="5" fill={accent} className="lb-tbl" style={{ transform: 'scaleX(var(--p, 0))' }} />
    </g>
  );
};

/* ─────────────── entry point ─────────────── */

export const StationScene: React.FC<SceneProps & { station: StationId; className?: string }> = ({ station, running, className, ...rest }) => {
  const Scene =
    station === 'rosin' ? RosinScene
    : station === 'bubble' ? BubbleScene
    : station === 'terpsoup' ? TerpSoupScene
    : station === 'kief' ? KiefScene
    : station === 'roller' ? RollerScene
    : station === 'rotavap' ? RotavapScene
    : HplcScene;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={`lb-scene ${running ? 'is-run' : ''} ${className ?? ''}`} role="img" aria-label={`Estación ${station}`}>
      <Scene running={running} {...rest} />
    </svg>
  );
};
