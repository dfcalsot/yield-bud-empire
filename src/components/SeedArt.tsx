import React, { useId } from 'react';
import { t as tr } from '../i18n';

/**
 * Animated cannabis seed for the seed cards (replaces the static leaf inside the ring).
 *
 * - The seed "rolls": tiger stripes scroll across a clipped body with edge shading, which
 *   reads as a slow 3D rotation while the seed floats.
 * - Every ~10 s it germinates: a shake, the white taproot draws out of the tip and the two
 *   cotyledons open at the top, then everything resets.
 * - One tiny seed orbits the ring per pack owned (max 6). Epic / legendary get a halo.
 * Motion is CSS-only (opacity / transform / dashoffset) — see index.css (.sa-*).
 */
interface SeedArtProps {
  tint: string;          // strain colour (hex)
  rarityColor: string;   // ring / halo colour
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  owned?: number;
  className?: string;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mix = (a: string, b: string, t: number): string => {
  const pa = /^#?([0-9a-f]{6})$/i.exec(a)?.[1] ?? 'a8844c';
  const pb = /^#?([0-9a-f]{6})$/i.exec(b)?.[1] ?? 'a8844c';
  const ch = (p: string, i: number) => parseInt(p.slice(i, i + 2), 16);
  const c = (i: number) => Math.round(lerp(ch(pa, i), ch(pb, i), t)).toString(16).padStart(2, '0');
  return `#${c(0)}${c(2)}${c(4)}`;
};

// seed silhouette: broad shoulders, pointed micropyle at the bottom (local coords, centre 100,100)
const SEED = 'M100 28C132 30 150 66 146 100C143 130 118 164 100 176C82 164 57 130 54 100C50 66 68 30 100 28Z';

// one stripe "period" is 120 wide; three copies cover any window while the group slides by one period
const STRIPES = [
  'M8 22C22 58 2 92 16 150',
  'M34 18C50 56 30 96 44 152',
  'M60 26C72 62 52 100 68 156',
  'M86 20C100 60 80 98 94 150',
  'M108 30C118 64 104 104 114 148',
];

export const SeedArt: React.FC<SeedArtProps> = ({ tint, rarityColor, rarity, owned = 0, className }) => {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const body = mix(tint, '#a8844c', 0.9);
  const light = mix(body, '#ffe9b8', 0.35);
  const dark = mix(body, '#2a1a0a', 0.55);
  const orbiters = Math.max(0, Math.min(6, owned));
  const halo = rarity === 'epic' || rarity === 'legendary';

  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-label={tr('Semilla de cannabis')}>
      <defs>
        <linearGradient id={`b${uid}`} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor={light} />
          <stop offset="0.55" stopColor={body} />
          <stop offset="1" stopColor={dark} />
        </linearGradient>
        <radialGradient id={`s${uid}`} cx="0.42" cy="0.38" r="0.7">
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.55" />
        </radialGradient>
        <clipPath id={`c${uid}`}>
          <path d={SEED} />
        </clipPath>
      </defs>

      {halo && (
        <circle cx="100" cy="100" r="86" fill="none" stroke={rarityColor} strokeWidth="1.5" className="sa-halo" />
      )}

      {/* orbiting mini seeds: one per pack owned */}
      {orbiters > 0 && (
        <g className="sa-orbit">
          {Array.from({ length: orbiters }, (_, i) => {
            const a = (i / orbiters) * Math.PI * 2;
            const x = 100 + 84 * Math.cos(a);
            const y = 100 + 84 * Math.sin(a);
            return (
              <g key={i} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${((a * 180) / Math.PI + 90).toFixed(0)}) scale(0.15) translate(-100 -100)`}>
                <path d={SEED} fill={`url(#b${uid})`} stroke={dark} strokeWidth="6" />
              </g>
            );
          })}
        </g>
      )}

      <g className="sa-float">
        <g className="sa-shake" style={{ transformOrigin: '100px 100px' }}>
          {/* taproot (draws out of the tip) */}
          <path d="M100 172C102 184 98 192 104 199" fill="none" stroke="#f6efd6" strokeWidth="5" strokeLinecap="round" pathLength={1} className="sa-radicle" />

          {/* cotyledons (open at the top) */}
          <g transform="translate(100 34)">
            <ellipse cx="-16" cy="-6" rx="17" ry="8" fill="#6fd14a" stroke="#2f7a1c" strokeWidth="1.5" transform="rotate(-24 -16 -6)" className="sa-coty" />
            <ellipse cx="16" cy="-6" rx="17" ry="8" fill="#7fe05a" stroke="#2f7a1c" strokeWidth="1.5" transform="rotate(24 16 -6)" className="sa-coty" style={{ animationDelay: '0.12s' }} />
          </g>

          {/* seed body */}
          <path d={SEED} fill={`url(#b${uid})`} />
          <g clipPath={`url(#c${uid})`}>
            <g className="sa-roll">
              {[0, 120, 240].map((dx) => (
                <g key={dx} transform={`translate(${dx} 0)`}>
                  {STRIPES.map((d, i) => (
                    <path key={i} d={d} fill="none" stroke={dark} strokeWidth={6 + (i % 3) * 2} strokeLinecap="round" opacity={0.5 + (i % 2) * 0.15} />
                  ))}
                </g>
              ))}
            </g>
            <path d={SEED} fill={`url(#s${uid})`} />
          </g>
          <path d={SEED} fill="none" stroke={dark} strokeWidth="2" opacity="0.7" />
          {/* specular highlight (fixed: the light doesn't rotate with the seed) */}
          <ellipse cx="82" cy="64" rx="9" ry="16" fill="#fff" opacity="0.28" transform="rotate(-18 82 64)" />
        </g>
      </g>

      {[[46, 56], [158, 70], [150, 140], [50, 132]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={1.8} fill="#fffbe6" className="cf-twinkle" style={{ animationDelay: `${-i * 0.7}s` }} />
      ))}
    </svg>
  );
};
