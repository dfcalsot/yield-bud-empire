import React, { useId } from 'react';
import '@fontsource-variable/syne';
import './logo.css';
import { YieldMark } from './YieldLogo';

/** gold crown that sits on the last E of EMPIRE (same as the promo site's logo) */
const Crown: React.FC = () => {
  const gid = `yblGold${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <svg viewBox="0 0 40 26" className="ybl-crown" aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff3b0" />
          <stop offset=".5" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#b45309" />
        </linearGradient>
      </defs>
      <path d="M3 22 L1 6 L11 13 L20 2 L29 13 L39 6 L37 22 Z" fill={`url(#${gid})`} stroke="#0a0716" strokeWidth="2.2" strokeLinejoin="round" />
      <rect x="3" y="20" width="34" height="5" rx="1.5" fill="#d97706" stroke="#0a0716" strokeWidth="2" />
      <circle cx="20" cy="2.5" r="2.6" fill="#b9dc55" stroke="#0a0716" strokeWidth="1.6" className="ybl-gem" />
      <circle cx="1.5" cy="6" r="2" fill="#f472b6" stroke="#0a0716" strokeWidth="1.4" />
      <circle cx="38.5" cy="6" r="2" fill="#22d3ee" stroke="#0a0716" strokeWidth="1.4" />
      <circle cx="20" cy="15" r="2.2" fill="#c084fc" stroke="#0a0716" strokeWidth="1.2" />
    </svg>
  );
};

/**
 * The promo site's logo, in the game: the animated emblem + YIELD BUD EMPIRE with a shimmer and a crown on the last E.
 * `variant="bar"` for the top bar, `"hero"` for the login screen (bigger, emblem on top).
 */
export const YieldBudWordmark: React.FC<{ variant?: 'bar' | 'hero'; className?: string }> = ({ variant = 'bar', className = '' }) => {
  const hero = variant === 'hero';
  return (
    <div className={`ybl ${hero ? 'ybl-hero flex flex-col items-center gap-3' : 'flex items-center gap-2.5'} select-none ${className}`}>
      <YieldMark size={hero ? 104 : 44} animated className="ybl-mark shrink-0 drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)]" />
      <div className={`ybl-text flex items-baseline gap-[0.45em] leading-none whitespace-nowrap ${hero ? 'text-[clamp(0.95rem,5vw,1.9rem)] pt-3' : 'text-[1.2rem] pt-2'}`}>
        {/* the crown splits the last E: screen readers read the whole name */}
        <span className="sr-only">Yield Bud Empire</span>
        <span aria-hidden="true" className="contents">
          <span className="ybl-word ybl-green">YIELD BUD</span>
          <span className="ybl-word ybl-gold relative">
            EMPIR
            <span className="ybl-word ybl-gold relative inline-block">
              E
              <Crown />
            </span>
          </span>
        </span>
      </div>
    </div>
  );
};
