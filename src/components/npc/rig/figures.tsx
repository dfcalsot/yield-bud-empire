import React from 'react';
import { Brows, Cheeks, Eyes, Leaf, Mouth, OUTLINE, type Mood2, type Viseme } from './parts';

export interface FigProps { mood: Mood2; talking: boolean; viseme: Viseme; look: { x: number; y: number } }
export type FigureV2 = React.FC<FigProps>;

const Tube: React.FC<{ d: string; outer: number; inner: number; fill: string; light?: string }> = ({ d, outer, inner, fill, light }) => (
  <g strokeLinecap="round" fill="none">
    <path d={d} stroke={OUTLINE} strokeWidth={outer} />
    <path d={d} stroke={fill} strokeWidth={inner} />
    {light && <path d={d} stroke={light} strokeWidth={Math.max(1.6, inner * 0.22)} opacity=".55" transform="translate(-1.6 -1.2)" />}
  </g>
);

/* ═════════════════════════ CHRONO — the guide ═════════════════════════
   A seed-spirit: a tiger-striped cannabis seed with a sprout on top and a little clock halo (Chrono = time). */
const SEED = 'M80 44 C118 68 130 118 113 160 C104 182 56 182 47 160 C30 118 42 68 80 44Z';

export const Chrono: FigureV2 = ({ mood, talking, viseme, look }) => (
  <g className="v2-tilt">
    <ellipse cx="80" cy="190" rx="42" ry="6" fill="#000" opacity=".38" />
    <g className="v2-breath">
      {/* clock halo behind the sprout */}
      <g>
        <circle cx="80" cy="27" r="25" fill="url(#v2Halo)" />
        <circle cx="80" cy="27" r="22" fill="none" stroke="#fde68a" strokeWidth="2.4" opacity=".95" />
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} x1="80" y1={i % 3 === 0 ? 8.5 : 9.6} x2="80" y2="11.6" stroke="#fde68a" strokeWidth={i % 3 === 0 ? 2.2 : 1.2} strokeLinecap="round" transform={`rotate(${i * 30} 80 27)`} />
        ))}
        <line className="v2-hour" x1="80" y1="27" x2="80" y2="17.5" stroke="#fbbf24" strokeWidth="2.4" strokeLinecap="round" />
        <line className="v2-min" x1="80" y1="27" x2="80" y2="12.5" stroke="#fef3c7" strokeWidth="1.7" strokeLinecap="round" />
        <circle cx="80" cy="27" r="2" fill="#fbbf24" />
      </g>

      {/* feet */}
      <ellipse cx="65" cy="177" rx="12" ry="6.8" fill="#047857" stroke={OUTLINE} strokeWidth="2.6" />
      <ellipse cx="95" cy="177" rx="12" ry="6.8" fill="#047857" stroke={OUTLINE} strokeWidth="2.6" />

      {/* sprout */}
      <g className="v2-sprout">
        <path d="M80 48 C77 38 83 30 80 22" stroke={OUTLINE} strokeWidth="7.4" fill="none" strokeLinecap="round" />
        <path d="M80 48 C77 38 83 30 80 22" stroke="#4ade80" strokeWidth="4.2" fill="none" strokeLinecap="round" />
        <Leaf x={80} y={20} s={1.02} />
        <path className="v2-cot-l" d="M78 45 C64 36 54 41 53 51 C64 56 75 53 78 45Z" fill="#86efac" stroke={OUTLINE} strokeWidth="2.2" strokeLinejoin="round" />
        <path className="v2-cot-r" d="M82 45 C96 36 106 41 107 51 C96 56 85 53 82 45Z" fill="#86efac" stroke={OUTLINE} strokeWidth="2.2" strokeLinejoin="round" />
      </g>

      {/* arms (behind the body so they never cover the face) */}
      <g className="v2-arm-l" style={{ transformOrigin: '52px 128px' }}>
        <Tube d="M53 128 Q35 132 31 152" outer={12} inner={8} fill="#34d399" light="#a7f3d0" />
        <circle cx="31" cy="153" r="7.2" fill="#5eead4" stroke={OUTLINE} strokeWidth="2.4" />
      </g>
      <g className="v2-arm-r" style={{ transformOrigin: '108px 128px' }}>
        <Tube d="M107 128 Q125 132 129 152" outer={12} inner={8} fill="#34d399" light="#a7f3d0" />
        <circle cx="129" cy="153" r="7.2" fill="#5eead4" stroke={OUTLINE} strokeWidth="2.4" />
      </g>

      {/* body */}
      <path d={SEED} fill="url(#v2Seed)" />
      <g clipPath="url(#v2SeedClip)">
        <g stroke="#047857" strokeWidth="3.6" fill="none" strokeLinecap="round" strokeDasharray="11 8" opacity=".3">
          <path d="M80 46 C68 84 62 122 70 172" /><path d="M80 46 C92 84 100 124 92 174" />
          <path d="M62 70 C50 100 50 132 60 164" /><path d="M98 70 C110 100 112 132 102 164" />
        </g>
        <ellipse cx="121" cy="142" rx="44" ry="76" fill="#022c22" opacity=".27" />
        <ellipse cx="60" cy="176" rx="34" ry="10" fill="#022c22" opacity=".14" />
      </g>
      <path d="M52 152 C38 118 46 78 76 52" stroke="#ecfdf5" strokeOpacity=".75" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <path d={SEED} fill="none" stroke={OUTLINE} strokeWidth="3.4" strokeLinejoin="round" />

      {/* face */}
      <Brows lx={63} rx={97} y={94} w={9} mood={mood} />
      <Eyes left={{ cx: 63, cy: 112, rx: 9.6, ry: 12 }} right={{ cx: 97, cy: 112, rx: 9.6, ry: 12 }} iris="#22c55e" look={look} mood={mood} />
      <Cheeks y={129} lx={50} rx={110} r={6.5} />
      <Mouth cx={80} cy={131} s={1.05} mood={mood} talking={talking} viseme={viseme} />
      {mood === 'think' && (
        <g>
          <Tube d="M48 150 Q58 160 72 152" outer={12} inner={8} fill="#34d399" light="#a7f3d0" />
          <circle cx="73" cy="151" r="7.2" fill="#5eead4" stroke={OUTLINE} strokeWidth="2.4" />
        </g>
      )}
    </g>
    {mood === 'think' && <g className="v2-dots" fill="#fde68a" stroke={OUTLINE} strokeWidth="1.2"><circle cx="128" cy="64" r="3" /><circle cx="137" cy="52" r="4" /><circle cx="148" cy="38" r="5.4" /></g>}
  </g>
);
