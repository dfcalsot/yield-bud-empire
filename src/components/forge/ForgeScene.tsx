import React from 'react';
import '../hud/hud.css';

/**
 * Decorative banner for the Forge tab: an anvil under a hanging rack of the materials it
 * produces, with a light spark loop. Pure presentation — no game state, no NPC, no logic.
 *
 * The banner is a thin, very wide strip (viewport width x ~96px), so the viewBox mirrors that
 * ratio and uses `meet` (never `slice`): at this aspect ratio `slice` picks the width-driven
 * scale and blows the artwork up until only the anvil's base fills the frame, cropping the
 * rack and sparks out entirely. `meet` guarantees the whole scene is always visible, letting
 * the `.fj-scene` gradient show through as letterboxing on any width it doesn't exactly match.
 */
export const ForgeScene: React.FC = () => (
  <div className="fj-scene" aria-hidden="true">
    <div className="fj-glow" />
    <svg viewBox="0 0 1100 100" className="fj-rig" preserveAspectRatio="xMidYMid meet">
      <path d="M0 94h1100" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      {/* hanging rack with drying materials, split around the anvil */}
      <path d="M60 10h420M620 10h420" stroke="#5b4a2e" strokeWidth="3" strokeLinecap="round" />
      {[100, 175, 250, 325, 400, 475].map((x, i) => (
        <g key={`l-${x}`} className="fj-hang" style={{ animationDelay: `${i * 0.4}s` }}>
          <path d={`M${x} 10v14`} stroke="#8a6a3a" strokeWidth="1.5" />
          <circle cx={x} cy={30} r="8" fill={i % 2 ? '#84af28' : '#b9dc55'} opacity="0.85" />
        </g>
      ))}
      {[645, 715, 785, 855, 925, 995].map((x, i) => (
        <g key={`r-${x}`} className="fj-hang" style={{ animationDelay: `${0.25 + i * 0.4}s` }}>
          <path d={`M${x} 10v12`} stroke="#8a6a3a" strokeWidth="1.5" />
          <rect x={x - 6} y={22} width="12" height="14" rx="3" fill="#fbbf24" opacity="0.8" />
        </g>
      ))}
      {/* anvil */}
      <g transform="translate(550 96) scale(1.6)" className="fj-anvil">
        <path d="M-30 0h60l-6-8H-24Z" fill="#2a2f3d" stroke="#0a0716" strokeWidth="1.5" />
        <path d="M-24 -8h48v-6c0-4-4-7-9-7h-30c-5 0-9 3-9 7Z" fill="#3b4152" stroke="#0a0716" strokeWidth="1.5" />
        <path d="M15 -18h14c3 0 4 2 2 4l-6 5h-10Z" fill="#3b4152" stroke="#0a0716" strokeWidth="1.5" />
        <rect x="-6" y="-27" width="12" height="6" rx="1.5" fill="#4b5163" stroke="#0a0716" strokeWidth="1.5" />
      </g>
      {/* sparks */}
      <g className="fj-sparks">
        <circle cx="558" cy="52" r="2.4" fill="#fbbf24" />
        <circle cx="572" cy="44" r="1.8" fill="#fde68a" />
        <circle cx="544" cy="47" r="1.6" fill="#fbbf24" />
      </g>
    </svg>
  </div>
);
