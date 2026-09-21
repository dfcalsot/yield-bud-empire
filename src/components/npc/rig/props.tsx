import React from 'react';
import { Leaf, OUTLINE } from './parts';

/** Props of the cannabis industry, drawn in the same style as the characters (dark outline, light top-left, one shade layer). */

/** Mason jar full of flower (or seeds). Origin = centre of the jar body. */
export const Jar: React.FC<{ x: number; y: number; s?: number; content?: 'buds' | 'seeds'; label?: string }> = ({ x, y, s = 1, content = 'buds', label = '#fff7e0' }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x="-12" y="-11" width="24" height="30" rx="6" fill="#bfe6f5" fillOpacity=".22" stroke={OUTLINE} strokeWidth="2.2" />
    {content === 'buds' ? (
      <g>
        <path d="M-9 17 q-5 -9 0 -14 q5 -4 8 1 q3 -6 8 0 q5 -2 8 4 q3 6 -2 9 q-10 4 -22 0Z" fill="#84cc16" stroke="#3f6212" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M-2 16 q-4 -6 0 -11 q5 -3 8 1 q3 4 -1 9 q-3 2 -7 1Z" fill="#a3e635" />
        <g stroke="#f97316" strokeWidth="1.3" strokeLinecap="round"><path d="M-6 6 l-2 -2 M4 4 l2 -3 M8 10 l3 -1 M-3 12 l-3 1 M2 8 l1 -3" /></g>
        <g fill="#fff" opacity=".7"><circle cx="-4" cy="9" r=".9" /><circle cx="5" cy="13" r=".9" /><circle cx="1" cy="5" r=".8" /></g>
      </g>
    ) : (
      <g fill="#a16207" stroke="#451a03" strokeWidth="1">
        {[[-6, 14], [0, 16], [6, 13], [-3, 9], [4, 8], [-7, 8], [8, 17], [1, 12]].map(([cx, cy], i) => <ellipse key={i} cx={cx} cy={cy} rx="3.2" ry="2.2" transform={`rotate(${i * 37} ${cx} ${cy})`} />)}
      </g>
    )}
    <path d="M-8 -6 q-2 12 0 22" stroke="#fff" strokeOpacity=".55" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    <rect x="-9" y="-1" width="18" height="10" rx="2" fill={label} stroke="#8a7346" strokeWidth="1.2" />
    <Leaf x={0} y={7} s={0.34} light="#bef264" dark="#4d7c0f" />
    <rect x="-13" y="-17" width="26" height="8" rx="3" fill="#fbbf24" stroke={OUTLINE} strokeWidth="2.2" />
    <path d="M-10 -14 h20" stroke="#fff" strokeOpacity=".5" strokeWidth="1.4" />
  </g>
);

/** Pruning shears (tijeras de podar). Origin = pivot. */
export const Shears: React.FC<{ x: number; y: number; rot?: number; s?: number }> = ({ x, y, rot = 0, s = 1 }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    {[['M0 0 L18 -27', 'M0 0 L28 -14'], ['M0 0 L-10 13', 'M0 0 L-16 5']].map(([a, b], k) => (
      <g key={k} strokeLinecap="round" fill="none">
        <path d={a} stroke={OUTLINE} strokeWidth={k ? 7.2 : 6.2} /><path d={b} stroke={OUTLINE} strokeWidth={k ? 7.2 : 6.2} />
        <path d={a} stroke={k ? '#dc2626' : '#e2e8f0'} strokeWidth={k ? 4.4 : 3.4} /><path d={b} stroke={k ? '#ef4444' : '#cbd5e1'} strokeWidth={k ? 4.4 : 3.4} />
      </g>
    ))}
    <circle r="3" fill="#fbbf24" stroke={OUTLINE} strokeWidth="1.6" />
  </g>
);

/** Jeweler's loupe used to read trichomes. */
export const Loupe: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <circle r="7.4" fill="#bfe6f5" fillOpacity=".4" stroke="#b45309" strokeWidth="3.2" />
    <circle r="7.4" fill="none" stroke={OUTLINE} strokeWidth=".9" />
    <path d="M-4 -3 q1 -3 4 -3.4" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity=".9" />
  </g>
);

/** Erlenmeyer flask with amber extract that bubbles. Origin = centre of the flask body. */
export const Flask: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-5 -19 h10 v9 l11 20 q3 9 -6 9 h-20 q-9 0 -6 -9 l11 -20Z" fill="#bfe6f5" fillOpacity=".25" stroke={OUTLINE} strokeWidth="2.2" strokeLinejoin="round" />
    <path d="M-12 8 q6 -4 12 0 q6 4 12 0 l3 4 q3 9 -6 9 h-20 q-9 0 -6 -9Z" fill="#fbbf24" stroke="#b45309" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M-12 8 q6 -4 12 0 q6 4 12 0" stroke="#fef3c7" strokeWidth="1.8" fill="none" opacity=".8" />
    <g fill="#fef3c7" stroke="#b45309" strokeWidth=".8">
      <circle className="v2-bub" cx="-3" cy="14" r="2.2" /><circle className="v2-bub v2-bub2" cx="3" cy="12" r="1.7" /><circle className="v2-bub v2-bub3" cx="0" cy="16" r="1.3" />
    </g>
    <path d="M-7 -14 v9 l-9 17" stroke="#fff" strokeOpacity=".55" strokeWidth="2" fill="none" strokeLinecap="round" />
    <rect x="-6.5" y="-23" width="13" height="5" rx="2" fill="#a3a3a3" stroke={OUTLINE} strokeWidth="2" />
  </g>
);

/** Hexagonal cannabinoid molecule that floats. */
export const Molecule: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}><g className="v2-float">
    <path d="M0 -13 L11.3 -6.5 L11.3 6.5 L0 13 L-11.3 6.5 L-11.3 -6.5Z" fill="#a78bfa" fillOpacity=".22" stroke="#ddd6fe" strokeWidth="2.2" strokeLinejoin="round" />
    <path d="M0 -13 V-22 M11.3 6.5 L19 11 M-11.3 6.5 L-19 11" stroke="#ddd6fe" strokeWidth="2" strokeLinecap="round" />
    <circle cx="0" cy="-23" r="3.2" fill="#f472b6" stroke={OUTLINE} strokeWidth="1.2" /><circle cx="20" cy="12" r="3.2" fill="#34d399" stroke={OUTLINE} strokeWidth="1.2" /><circle cx="-20" cy="12" r="3.2" fill="#fbbf24" stroke={OUTLINE} strokeWidth="1.2" />
  </g></g>
);

/** Rotating DNA helix (faked in 2D with a scaleX wobble). */
export const Dna: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <g className="v2-dna">
      <path d="M-9 -22 C9 -12 9 -4 -9 6 C-27 16 -9 24 -9 30 M9 -22 C-9 -12 -9 -4 9 6 C27 16 9 24 9 30" transform="translate(0 -4)" stroke="#a3e635" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M9 -22 C-9 -12 -9 -4 9 6" transform="translate(0 -4)" stroke="#c4b5fd" strokeWidth="3" fill="none" strokeLinecap="round" />
      <g stroke="#fde68a" strokeWidth="1.8" strokeLinecap="round"><path d="M-6 -22 H6 M-8 -14 H8 M-4 -6 H4 M4 6 H-4 M8 14 H-8 M6 22 H-6" transform="translate(0 -4)" /></g>
    </g>
  </g>
);

/** Pre-roll tucked behind an ear. */
export const PreRoll: React.FC<{ x: number; y: number; rot?: number }> = ({ x, y, rot = -28 }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot})`}>
    <path d="M-2 -2.8 L22 -1.5 L22 1.5 L-2 2.8Z" fill="#fff7ed" stroke="#a8a29e" strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M-2 -2.8 L-6 0 L-2 2.8" fill="#e7e5e4" stroke="#a8a29e" strokeWidth="1" strokeLinejoin="round" />
    <rect x="19" y="-1.6" width="4" height="3.2" rx="1" fill="#92400e" />
    <path d="M6 -2 L7 2 M12 -2 L13 2" stroke="#d6d3d1" strokeWidth=".8" />
  </g>
);

/** A little potted plant with flowering colas (the outdoor grower's companion). Origin = base of the pot. */
export const MiniPlant: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}><g className="v2-mini">
    <path d="M0 -22 V-62" stroke={OUTLINE} strokeWidth="6.4" strokeLinecap="round" /><path d="M0 -22 V-62" stroke="#16a34a" strokeWidth="3.4" strokeLinecap="round" />
    <Leaf x={0} y={-30} s={0.95} rot={-58} /><Leaf x={0} y={-30} s={0.95} rot={58} />
    <Leaf x={0} y={-44} s={0.85} rot={-38} /><Leaf x={0} y={-44} s={0.85} rot={38} />
    <path d="M-6 -58 q-3 -13 6 -20 q9 7 6 20 q-6 4 -12 0Z" fill="#a3e635" stroke="#4d7c0f" strokeWidth="1.6" strokeLinejoin="round" />
    <g stroke="#f97316" strokeWidth="1.3" strokeLinecap="round"><path d="M-3 -70 l-3 -3 M2 -74 l1 -4 M4 -66 l4 -2 M-2 -62 l-4 1" /></g>
    <path d="M-16 -16 h32 l-4 16 h-24Z" fill="#b45309" stroke={OUTLINE} strokeWidth="2.2" strokeLinejoin="round" />
    <path d="M-16 -16 h32 l-1 4 h-30Z" fill="#d97706" stroke={OUTLINE} strokeWidth="2" strokeLinejoin="round" />
  </g></g>
);
