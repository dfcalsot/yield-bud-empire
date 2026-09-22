import React from 'react';
import '../hud/hud.css';

/**
 * Decorative banner for the Forge tab: an anvil under a hanging rack of the materials it
 * produces, with a light spark loop. Pure presentation — no game state, no NPC, no logic.
 */
export const ForgeScene: React.FC = () => (
  <div className="fj-scene" aria-hidden="true">
    <div className="fj-glow" />
    <svg viewBox="0 0 320 96" className="fj-rig" preserveAspectRatio="xMidYMax slice">
      <path d="M0 90h320" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      {/* hanging rack with drying materials */}
      <path d="M18 8h60M240 8h62" stroke="#5b4a2e" strokeWidth="3" strokeLinecap="round" />
      {[26, 40, 54].map((x, i) => (
        <g key={`l-${x}`} className="fj-hang" style={{ animationDelay: `${i * 0.6}s` }}>
          <path d={`M${x} 8v10`} stroke="#8a6a3a" strokeWidth="1.5" />
          <circle cx={x} cy={21} r="6" fill={i % 2 ? '#84af28' : '#b9dc55'} opacity="0.85" />
        </g>
      ))}
      {[248, 262, 276, 290].map((x, i) => (
        <g key={`r-${x}`} className="fj-hang" style={{ animationDelay: `${0.3 + i * 0.5}s` }}>
          <path d={`M${x} 8v9`} stroke="#8a6a3a" strokeWidth="1.5" />
          <rect x={x - 4} y={17} width="8" height="10" rx="2" fill="#fbbf24" opacity="0.8" />
        </g>
      ))}
      {/* anvil */}
      <g transform="translate(160 92) scale(1.15)" className="fj-anvil">
        <path d="M-30 0h60l-6-8H-24Z" fill="#2a2f3d" stroke="#0a0716" strokeWidth="1.5" />
        <path d="M-24 -8h48v-6c0-4-4-7-9-7h-30c-5 0-9 3-9 7Z" fill="#3b4152" stroke="#0a0716" strokeWidth="1.5" />
        <path d="M15 -18h14c3 0 4 2 2 4l-6 5h-10Z" fill="#3b4152" stroke="#0a0716" strokeWidth="1.5" />
        <rect x="-6" y="-27" width="12" height="6" rx="1.5" fill="#4b5163" stroke="#0a0716" strokeWidth="1.5" />
      </g>
      {/* sparks */}
      <g className="fj-sparks">
        <circle cx="164" cy="60" r="1.6" fill="#fbbf24" />
        <circle cx="172" cy="55" r="1.2" fill="#fde68a" />
        <circle cx="156" cy="57" r="1" fill="#fbbf24" />
      </g>
    </svg>
  </div>
);
