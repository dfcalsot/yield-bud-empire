import React, { useId } from 'react';
import type { Mood2, Viseme } from '../../npc/rig/parts';
import type { StaffRarity, StaffRole } from '../../../sim/staff';
import { LOOKS, SKINS, type Look, type FaceShape } from './looks';
import { Hair, Gear, Glasses, BeardLayer } from './parts';
import { Outfit, PropArt } from './outfits';
import { Scene, RarityBack, RarityFront, RARITY_COLOR } from './fx';
import './premium.css';

/** darken a #rrggbb colour by mixing it with black */
const darken = (hex: string, k: number): string => { const n = parseInt(hex.slice(1), 16); const f = (v: number) => Math.round(v * (1 - k)); return `#${[f((n >> 16) & 255), f((n >> 8) & 255), f(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join('')}`; };

/**
 * A staff NFT as a premium bust portrait. Painterly and soft (gradients, rim light, detailed eyes and fabrics), on purpose nothing
 * like the chunky thick-outlined NPCs. What changes with the rarity is what surrounds and adorns the character: a plain background
 * for a common hire, a rim glow for a rare one, an energy ring and glowing gear for an epic one, and rays, a halo and foil for a legend.
 */
export const FACE: Record<FaceShape, string> = {
  oval: 'M120 58 C148 58 162 84 160 112 C158 142 142 168 120 170 C98 168 82 142 80 112 C78 84 92 58 120 58Z',
  square: 'M120 60 C150 60 160 82 160 108 L158 140 C156 160 140 171 120 171 C100 171 84 160 82 140 L80 108 C80 82 90 60 120 60Z',
  round: 'M120 60 C152 60 166 88 164 116 C162 148 144 170 120 170 C96 170 78 148 76 116 C74 88 88 60 120 60Z',
  long: 'M120 54 C144 54 156 80 154 110 C152 144 138 174 120 176 C102 174 88 144 86 110 C84 80 96 54 120 54Z',
};

interface Props {
  role: StaffRole; variant: number; rarity: StaffRarity;
  mood?: Mood2; talking?: boolean; viseme?: Viseme;
  /** animate the effects (breathing, blinking, glints); static when false (thumbnails, exports) */
  animated?: boolean;
  /** draw the character without its scene */
  bare?: boolean;
  className?: string;
  /** a stable seed so the two characters of a tier keep their tiny differences */
  seed?: number;
  /** fill a box of another shape by cropping the bottom instead of leaving bars */
  crop?: boolean;
}

export const PremiumBust: React.FC<Props> = ({ role, variant, rarity, mood = 'idle', talking = false, viseme = 'closed', animated = true, bare = false, className = '', seed = 0, crop = false }) => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const look: Look = LOOKS[role][Math.max(0, Math.min(5, variant))];
  const sk = SKINS[look.skin];
  const face = FACE[look.face];
  const g = (n: string) => `url(#${id}${n})`;
  const rc = RARITY_COLOR[rarity];

  // ── expression
  const happy = mood === 'happy' || mood === 'wave';
  const browTilt = mood === 'sad' ? -5 : mood === 'busy' ? 5 : 0;
  const thinkLift = mood === 'think' ? -4 : 0;
  const mouthOpen = talking ? (viseme === 'a' ? 7 : viseme === 'o' ? 5.5 : viseme === 'e' ? 3.6 : viseme === 'm' ? 0.6 : 2) : 0;
  const mouthCurve = happy ? 7 : mood === 'sad' ? -5 : mood === 'busy' ? 0.8 : mood === 'think' ? -1 : 2.6;
  const eyeSquint = happy ? 0.62 : mood === 'sad' ? 0.85 : 1;
  const lookDx = mood === 'think' ? 2.4 : 0;

  return (
    <svg viewBox="0 0 240 300" preserveAspectRatio={crop ? 'xMidYMin slice' : 'xMidYMid meet'} className={`pb ${animated ? 'pb-anim' : ''} ${className}`} role="img" aria-label={`${look.title}, ${role}`} style={{ ['--rc' as string]: rc }}>
      <defs>
        <linearGradient id={`${id}skin`} x1="0.1" y1="0" x2="0.9" y2="1"><stop offset="0" stopColor={sk.light} /><stop offset=".55" stopColor={sk.base} /><stop offset="1" stopColor={sk.shadow} /></linearGradient>
        <linearGradient id={`${id}hair`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={look.hairColor[1]} /><stop offset=".45" stopColor={look.hairColor[0]} /><stop offset="1" stopColor={look.hairColor[0]} /></linearGradient>
        <linearGradient id={`${id}shade`} x1="0" y1="0" x2="1" y2="0"><stop offset=".5" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#1a0a10" stopOpacity=".38" /></linearGradient>
        <radialGradient id={`${id}jaw`} cx="50%" cy="100%" r="60%"><stop offset="0" stopColor="#2a0f10" stopOpacity=".34" /><stop offset="1" stopColor="#2a0f10" stopOpacity="0" /></radialGradient>
        <linearGradient id={`${id}ga`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={look.colors[0]} /><stop offset="1" stopColor={darken(look.colors[0], 0.4)} /></linearGradient>
        <linearGradient id={`${id}gold`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff2b0" /><stop offset=".5" stopColor="#f5c542" /><stop offset="1" stopColor="#b8860b" /></linearGradient>
        <linearGradient id={`${id}gear`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={look.gearColor?.[0] ?? '#fff'} /><stop offset="1" stopColor={look.gearColor?.[1] ?? '#999'} /></linearGradient>
        <linearGradient id={`${id}glass`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".55" /><stop offset=".5" stopColor={look.glassColor ?? '#9ad'} stopOpacity=".28" /><stop offset="1" stopColor={look.glassColor ?? '#9ad'} stopOpacity=".5" /></linearGradient>
        <radialGradient id={`${id}iris`} cx="50%" cy="42%" r="60%"><stop offset="0" stopColor="#fff" stopOpacity=".55" /><stop offset=".35" stopColor={look.eye} /><stop offset="1" stopColor="#0d0a12" /></radialGradient>
        <linearGradient id={`${id}rim`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={rc} stopOpacity=".95" /><stop offset=".22" stopColor={rc} stopOpacity="0" /></linearGradient>
        <filter id={`${id}blur`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4" /></filter>
        <filter id={`${id}soft`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.1" /></filter>
        <filter id={`${id}glow`} x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2.6" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <clipPath id={`${id}face`}><path d={face} /></clipPath>
        <pattern id={`${id}plaid`} width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill={look.colors[0]} /><rect width="14" height="3.4" y="5" fill={look.colors[1]} opacity=".55" /><rect width="3.4" height="14" x="5" fill={look.colors[1]} opacity=".55" /><rect width="14" height="1" y="1" fill={look.colors[2]} opacity=".5" /></pattern>
      </defs>

      {!bare && <Scene id={id} role={role} rarity={rarity} />}
      {!bare && <RarityBack id={id} rarity={rarity} animated={animated} seed={seed} />}

      <g className="pb-body">
        {/* behind the head */}
        <Hair id={id} look={look} layer="back" />
        <Gear id={id} look={look} layer="back" />

        {/* neck, ears, outfit */}
        <ellipse cx="81" cy="118" rx="7" ry="12.5" fill={sk.ear} /><ellipse cx="159" cy="118" rx="7" ry="12.5" fill={sk.ear} />
        <path d="M103 148 L103 186 C103 198 111 204 120 204 C129 204 137 198 137 186 L137 148Z" fill={g('skin')} />
        <path d="M103 168 C112 180 128 180 137 168 L137 186 C137 198 129 204 120 204 C111 204 103 198 103 186Z" fill="#2a0f10" opacity=".26" />
        <Outfit id={id} look={look} rarity={rarity} />
        <PropArt id={id} look={look} rarity={rarity} animated={animated} />

        {/* head */}
        <path d={face} fill={g('skin')} />
        <g clipPath={g('face')}>
          <rect x="70" y="50" width="100" height="130" fill={g('shade')} />
          <rect x="70" y="50" width="100" height="130" fill={g('jaw')} />
          <ellipse cx="96" cy="100" rx="22" ry="34" fill={sk.light} opacity=".16" filter={g('blur')} />
          <ellipse cx="146" cy="124" rx="20" ry="26" fill={sk.shadow} opacity=".22" filter={g('blur')} />
          {/* cheeks, nose shadow, mouth area */}
          <ellipse cx="98" cy="134" rx="11" ry="7" fill={sk.blush} opacity=".28" filter={g('soft')} /><ellipse cx="142" cy="134" rx="11" ry="7" fill={sk.blush} opacity=".28" filter={g('soft')} />
          <path d="M120 116 C116 126 114 132 112 136 C116 140 124 140 128 136 C126 132 124 126 120 116Z" fill={sk.shadow} opacity=".2" />
          <path d="M113 137 C116 140 124 140 127 137" stroke={sk.shadow} strokeWidth="1.6" strokeLinecap="round" fill="none" opacity=".6" />
          {look.age && [[92, 100, 108, 98], [132, 98, 148, 100]].map(([x1, y1, x2, y2], i) => <path key={i} d={`M${x1} ${y1} Q${(x1 + x2) / 2} ${y1 - 3} ${x2} ${y2}`} stroke={sk.shadow} strokeWidth="1" fill="none" opacity=".55" />)}
          {look.age === 'old' && <><path d="M96 72 Q120 68 144 72" stroke={sk.shadow} strokeWidth="1" fill="none" opacity=".5" /><path d="M98 78 Q120 74 142 78" stroke={sk.shadow} strokeWidth=".9" fill="none" opacity=".4" /><path d="M86 118 l-5 3 M86 123 l-5 1 M154 118 l5 3 M154 123 l5 1" stroke={sk.shadow} strokeWidth=".9" opacity=".6" /></>}
          {look.freckles && Array.from({ length: 14 }, (_, i) => <circle key={i} cx={(i % 2 ? 134 : 96) + ((i * 7) % 15) - 4} cy={122 + ((i * 5) % 11)} r=".9" fill={sk.shadow} opacity=".6" />)}
        </g>
        {look.scar && <path d="M141 92 L134 118" stroke="#d68a7a" strokeWidth="1.8" strokeLinecap="round" opacity=".75" />}

        {/* eyes */}
        {[100, 140].map((cx, i) => (
          <g key={cx} className="pb-eye" style={{ transformOrigin: `${cx}px 112px` }}>
            <g transform={`translate(${cx} 112) scale(1 ${eyeSquint})`}>
              <path d="M-11 0 C-6 -6.5 6 -6.5 11 0 C6 6 -6 6 -11 0Z" fill="#f7f4ef" />
              <circle cx={lookDx} cy="0.4" r="5.6" fill={g('iris')} /><circle cx={lookDx} cy="0.4" r="2.3" fill="#0b0810" />
              <circle cx={lookDx - 1.8} cy="-1.7" r="1.5" fill="#fff" opacity=".95" /><circle cx={lookDx + 2} cy="1.8" r=".8" fill="#fff" opacity=".7" />
              <path d="M-11.5 .3 C-6 -7.4 6 -7.4 11.5 .3" stroke="#20120c" strokeWidth={look.lashes ? 2.4 : 1.7} fill="none" strokeLinecap="round" />
              {look.lashes && <path d={i ? 'M11 -1.4 l3.6 -2.6 M9 -4 l2.6 -3.4' : 'M-11 -1.4 l-3.6 -2.6 M-9 -4 l-2.6 -3.4'} stroke="#20120c" strokeWidth="1.4" strokeLinecap="round" />}
              <path d="M-9 4.6 C-4 7.2 4 7.2 9 4.6" stroke={sk.shadow} strokeWidth=".9" fill="none" opacity=".55" />
            </g>
            {/* brows */}
            <path d={i ? `M126 ${99 + thinkLift - browTilt * 0.4} Q141 ${92 + thinkLift + browTilt} 154 ${98 + browTilt}` : `M86 ${98 + browTilt} Q99 ${92 + browTilt} 114 ${99 - browTilt * 0.4}`} stroke={look.brow} strokeWidth={look.beard !== 'none' || look.age ? 4.4 : 3.6} strokeLinecap="round" fill="none" />
          </g>
        ))}

        {/* mouth */}
        <g>
          {mouthOpen > 1 ? (
            <g><path d={`M107 148 Q120 ${148 + mouthCurve * 0.4} 133 148 Q120 ${151 + mouthOpen * 2.2} 107 148Z`} fill="#4a1418" /><path d="M110 148.6 Q120 149.6 130 148.6" stroke="#f7f1e8" strokeWidth="2.2" fill="none" opacity=".9" /><ellipse cx="120" cy={150.5 + mouthOpen * 1.1} rx="5.5" ry="2" fill="#c8484f" opacity=".75" /></g>
          ) : (
            <g>
              <path d={`M107 147 Q120 ${147 + mouthCurve} 133 147`} stroke={look.lips ?? sk.shadow} strokeWidth="3" strokeLinecap="round" fill="none" />
              {happy && <path d="M110 148.4 Q120 155 130 148.4 Q120 152 110 148.4Z" fill="#f7f1e8" opacity=".92" />}
              <path d="M112 151.2 Q120 153.4 128 151.2" stroke={sk.blush} strokeWidth="1.6" strokeLinecap="round" fill="none" opacity=".45" />
            </g>
          )}
        </g>
        {look.prop === 'preroll' && <g transform="translate(70 104) rotate(-30)"><rect x="-2" y="-2.4" width="26" height="4.8" rx="2.4" fill="#f4efe2" stroke="#c8bfa8" strokeWidth=".6" /><rect x="20" y="-2.4" width="4" height="4.8" rx="1.6" fill="#b45f2a" /><path d="M6 -2.2 l1 4.4 M13 -2.2 l1 4.4" stroke="#d8cfba" strokeWidth=".6" /></g>}

        <BeardLayer id={id} look={look} />
        <Glasses id={id} look={look} animated={animated} />
        <Hair id={id} look={look} layer="front" />
        <Gear id={id} look={look} layer="front" rarity={rarity} />
      </g>

      {/* rim light from the left in the colour of the rarity, then the foil / glints */}
      <path d={face} fill="none" stroke={g('rim')} strokeWidth="3" opacity={rarity === 'common' ? 0.25 : 0.8} />
      <RarityFront id={id} rarity={rarity} animated={animated} glow={look.glow} seed={seed} />
    </svg>
  );
};
