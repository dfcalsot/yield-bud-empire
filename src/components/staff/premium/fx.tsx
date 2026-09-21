import React from 'react';
import type { StaffRarity, StaffRole } from '../../../sim/staff';

export const RARITY_COLOR: Record<StaffRarity, string> = { common: '#94a3b8', rare: '#38bdf8', epic: '#c084fc', legendary: '#fbbf24' };
const hash = (n: number) => { const x = Math.sin(n * 91.7 + 13.1) * 43758.5453; return x - Math.floor(x); };

/** the place each role works in: a soft, out-of-focus scene behind the bust */
const SCENES: Record<StaffRole, { top: string; bottom: string; lamp: string }> = {
  foreman: { top: '#3b2a1a', bottom: '#12100c', lamp: '#ffb347' },
  farmer: { top: '#345a3a', bottom: '#101c14', lamp: '#f7e58a' },
  merchant: { top: '#4a2f3f', bottom: '#150e14', lamp: '#ffd08a' },
  scientist: { top: '#1f4a6a', bottom: '#0a1620', lamp: '#8ee7ff' },
  geneticist: { top: '#3a2a6a', bottom: '#0e0a1e', lamp: '#c4a3ff' },
  budtender: { top: '#1f5a55', bottom: '#0a1a18', lamp: '#7cf2d8' },
};

export const Scene: React.FC<{ id: string; role: StaffRole; rarity: StaffRarity }> = ({ id, role, rarity }) => {
  const s = SCENES[role];
  return (
    <g>
      <defs>
        <linearGradient id={`${id}bg`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={s.top} /><stop offset="1" stopColor={s.bottom} /></linearGradient>
        <radialGradient id={`${id}lamp`} cx="50%" cy="0%" r="80%"><stop offset="0" stopColor={s.lamp} stopOpacity=".55" /><stop offset="1" stopColor={s.lamp} stopOpacity="0" /></radialGradient>
        <radialGradient id={`${id}vig`} cx="50%" cy="45%" r="75%"><stop offset=".55" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".55" /></radialGradient>
      </defs>
      <rect width="240" height="300" fill={`url(#${id}bg)`} />
      <rect width="240" height="300" fill={`url(#${id}lamp)`} />
      {/* out-of-focus bokeh and role scenery */}
      {Array.from({ length: 9 }, (_, i) => <circle key={i} cx={hash(i) * 240} cy={20 + hash(i + 9) * 150} r={6 + hash(i + 18) * 14} fill={s.lamp} opacity={0.05 + hash(i + 27) * 0.09} />)}
      <g opacity=".22" fill="#000">
        {role === 'foreman' && [16, 210].map((x) => <rect key={x} x={x} y="60" width="14" height="200" />)}
        {role === 'farmer' && <path d="M0 210 C60 180 110 200 160 184 C200 172 226 190 240 184 L240 300 L0 300Z" />}
        {role === 'merchant' && [24, 60, 168, 204].map((x, i) => <rect key={x} x={x} y={70 + (i % 2) * 20} width="26" height="46" rx="6" />)}
        {role === 'scientist' && [22, 200].map((x) => <path key={x} d={`M${x} 90 h10 v20 l12 26 h-34 l12 -26Z`} />)}
        {role === 'geneticist' && <path d="M12 60 C40 90 40 110 12 140 C-10 170 20 190 20 210 M40 60 C12 90 12 110 40 140 C68 170 40 190 40 210" stroke="#fff" strokeWidth="3" fill="none" opacity=".5" />}
        {role === 'budtender' && [20, 58, 172, 208].map((x, i) => <rect key={x} x={x} y={84 + (i % 2) * 14} width="24" height="30" rx="5" />)}
      </g>
      <rect width="240" height="300" fill={`url(#${id}vig)`} />
      {rarity === 'common' && <rect width="240" height="300" fill="#000" opacity=".06" />}
    </g>
  );
};

/** effects behind the character */
export const RarityBack: React.FC<{ id: string; rarity: StaffRarity; animated: boolean; seed: number }> = ({ id, rarity, animated, seed }) => {
  if (rarity === 'common') return null;
  const c = RARITY_COLOR[rarity];
  return (
    <g>
      <defs><radialGradient id={`${id}aura`} cx="50%" cy="42%" r="55%"><stop offset="0" stopColor={c} stopOpacity=".55" /><stop offset="1" stopColor={c} stopOpacity="0" /></radialGradient></defs>
      <circle cx="120" cy="110" r="118" fill={`url(#${id}aura)`} className={animated ? 'pb-aura' : ''} />
      {rarity === 'legendary' && (
        <g className={animated ? 'pb-rays' : ''} style={{ transformOrigin: '120px 110px' }}>
          {Array.from({ length: 14 }, (_, i) => <path key={i} d="M120 110 L112 -30 L128 -30Z" fill={c} opacity=".22" transform={`rotate(${i * (360 / 14)} 120 110)`} />)}
        </g>
      )}
      {(rarity === 'epic' || rarity === 'legendary') && (
        <g className={animated ? 'pb-ring' : ''} style={{ transformOrigin: '120px 110px' }} fill="none" stroke={c} strokeLinecap="round">
          <circle cx="120" cy="110" r="96" strokeWidth="1.6" strokeDasharray="4 10" opacity=".8" />
          <circle cx="120" cy="110" r="106" strokeWidth="1" strokeDasharray="30 18" opacity=".55" />
        </g>
      )}
      {rarity === 'legendary' && <ellipse cx="120" cy="30" rx="34" ry="8" fill="none" stroke="#fff2b0" strokeWidth="2.6" opacity=".85" className={animated ? 'pb-halo' : ''} />}
      {rarity === 'rare' && <circle cx="120" cy="110" r="96" fill="none" stroke={c} strokeWidth="1.2" opacity=".45" />}
      {/* seeded motes */}
      {Array.from({ length: rarity === 'rare' ? 7 : rarity === 'epic' ? 12 : 18 }, (_, i) => (
        <circle key={i} cx={10 + hash(i + seed) * 220} cy={30 + hash(i + 40 + seed) * 230} r={1 + hash(i + 80) * 2} fill={rarity === 'legendary' ? '#fff2b0' : c} opacity={0.5 + hash(i + 120) * 0.4} className={animated ? 'pb-mote' : ''} style={{ animationDelay: `${-hash(i + 7) * 6}s` }} />
      ))}
    </g>
  );
};

/** effects in front: sparkles, a foil sweep over a legend, the glow of an epic hire's gear */
export const RarityFront: React.FC<{ id: string; rarity: StaffRarity; animated: boolean; glow?: string; seed: number }> = ({ id, rarity, animated, glow }) => {
  if (rarity === 'common' || rarity === 'rare') return null;
  const c = RARITY_COLOR[rarity];
  return (
    <g pointerEvents="none">
      <defs>
        <linearGradient id={`${id}foil`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".55" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
        <clipPath id={`${id}all`}><rect width="240" height="300" /></clipPath>
      </defs>
      {[[46, 56], [196, 70], [40, 200], [204, 216]].map(([x, y], i) => (
        <path key={i} d="M0 -8 Q1.6 -1.6 8 0 Q1.6 1.6 0 8 Q-1.6 1.6 -8 0 Q-1.6 -1.6 0 -8Z" transform={`translate(${x} ${y}) scale(${0.8 + i * 0.12})`} fill={rarity === 'legendary' ? '#fff7c2' : '#f5e1ff'} stroke={c} strokeWidth=".8" className={animated ? 'pb-spark' : ''} style={{ animationDelay: `${-i * 0.7}s` }} />
      ))}
      {rarity === 'legendary' && <g clipPath={`url(#${id}all)`}><rect className={animated ? 'pb-foil' : ''} x="-80" y="-20" width="60" height="340" fill={`url(#${id}foil)`} transform="skewX(-18)" style={{ mixBlendMode: 'screen' }} /></g>}
      {glow && rarity === 'epic' && <ellipse cx="120" cy="272" rx="74" ry="10" fill={glow} opacity=".16" filter={`url(#${id}blur)`} />}
    </g>
  );
};
