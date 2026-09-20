import React, { useEffect, useState } from 'react';

export type Mood = 'idle' | 'happy' | 'sad';

const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * "Doña Flora", the market keeper: breathes, blinks, swings her lantern and talks with a typewriter bubble.
 * `moodKey` restarts the reaction animation (hop when happy, head shake when sad) even if the mood repeats.
 */
export const Merchant: React.FC<{ text: string; mood: Mood; moodKey: number }> = ({ text, mood, moodKey }) => {
  const [shown, setShown] = useState(text);
  useEffect(() => {
    if (reduced()) { setShown(text); return; }
    setShown('');
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, 20);
    return () => window.clearInterval(id);
  }, [text]);

  const talking = shown.length < text.length;

  return (
    <div className="flex items-end gap-1 min-w-0">
      <div key={`${mood}-${moodKey}`} className={`mk-npc mk-npc--${mood} shrink-0`}>
        <svg viewBox="0 0 170 200" className="w-[128px] h-[150px] sm:w-[150px] sm:h-[176px]" aria-hidden>
          <defs>
            <linearGradient id="mkRobe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1f7a4a" /><stop offset="1" stopColor="#0f3d27" /></linearGradient>
            <radialGradient id="mkGlow" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#fde68a" stopOpacity=".9" /><stop offset="1" stopColor="#fde68a" stopOpacity="0" /></radialGradient>
          </defs>
          <ellipse cx="80" cy="192" rx="52" ry="7" fill="#000" opacity=".4" />
          <g className="mk-breath">
            {/* robe */}
            <path d="M34 192 Q34 122 80 110 Q126 122 126 192Z" fill="url(#mkRobe)" stroke="#0a2a1a" strokeWidth="1.5" />
            <path d="M80 112 V192" stroke="#0a2a1a" strokeWidth="1.2" opacity=".5" />
            <rect x="46" y="150" width="68" height="9" rx="4.5" fill="#7c4a22" />
            <rect x="72" y="148" width="16" height="13" rx="3" fill="#fbbf24" stroke="#92400e" />
            {/* pouch of coins */}
            <path d="M104 160 q10 4 8 18 q-10 4 -18 0 q-2 -14 10 -18Z" fill="#8a5a2b" stroke="#4a2a14" />
            <circle cx="103" cy="169" r="3.4" fill="#fbbf24" />
            {/* head */}
            <circle cx="80" cy="84" r="31" fill="#f3cfa4" stroke="#b98a5e" strokeWidth="1.2" />
            <path d="M46 84 Q46 42 80 40 Q114 42 114 84 Q100 62 80 62 Q60 62 46 84Z" fill="#166534" stroke="#0a2a1a" strokeWidth="1.5" />
            <path d="M42 96 Q46 60 80 56 Q114 60 118 96 Q112 70 80 68 Q48 70 42 96Z" fill="#14532d" opacity=".9" />
            {/* leaf emblem */}
            <g transform="translate(80 50)">
              {[-64, -32, 0, 32, 64].map((a) => <path key={a} d="M0 0 Q-3 -9 0 -18 Q3 -9 0 0Z" fill="#86efac" stroke="#166534" strokeWidth=".6" transform={`rotate(${a})`} />)}
            </g>
            {/* face */}
            <g className="mk-eyes">
              {mood === 'happy' ? (
                <>
                  <path d="M62 84 Q68 76 74 84" stroke="#3b2414" strokeWidth="3" fill="none" strokeLinecap="round" />
                  <path d="M86 84 Q92 76 98 84" stroke="#3b2414" strokeWidth="3" fill="none" strokeLinecap="round" />
                </>
              ) : (
                <>
                  <ellipse cx="68" cy="84" rx="4.2" ry={mood === 'sad' ? 4.6 : 5.2} fill="#3b2414" className="mk-eye" />
                  <ellipse cx="92" cy="84" rx="4.2" ry={mood === 'sad' ? 4.6 : 5.2} fill="#3b2414" className="mk-eye" />
                  <circle cx="69.5" cy="82.4" r="1.4" fill="#fff" /><circle cx="93.5" cy="82.4" r="1.4" fill="#fff" />
                </>
              )}
            </g>
            {mood === 'sad' && <path d="M60 76 l12 -3 M100 76 l-12 -3" stroke="#3b2414" strokeWidth="2.4" strokeLinecap="round" />}
            <circle cx="60" cy="96" r="5.4" fill="#f87171" opacity=".35" /><circle cx="100" cy="96" r="5.4" fill="#f87171" opacity=".35" />
            {mood === 'happy' && <path d="M68 96 Q80 114 92 96Z" fill="#7f1d1d" stroke="#3b2414" strokeWidth="1.4" strokeLinejoin="round" />}
            {mood === 'sad' && <path d="M71 104 Q80 96 89 104" stroke="#3b2414" strokeWidth="2.6" fill="none" strokeLinecap="round" />}
            {mood === 'idle' && <path d="M70 98 Q80 107 90 98" stroke="#3b2414" strokeWidth="2.6" fill="none" strokeLinecap="round" className={talking ? 'mk-mouth' : undefined} />}
            {/* arm holding the lantern */}
            <path d="M120 128 Q140 130 142 108" stroke="#166534" strokeWidth="13" fill="none" strokeLinecap="round" />
            <circle cx="142" cy="106" r="7" fill="#f3cfa4" />
          </g>
          {/* lantern */}
          <g className="mk-lantern" style={{ transformOrigin: '142px 100px' }}>
            <line x1="142" y1="100" x2="142" y2="118" stroke="#92400e" strokeWidth="2" />
            <circle cx="142" cy="136" r="26" fill="url(#mkGlow)" className="mk-flicker" />
            <rect x="133" y="118" width="18" height="24" rx="4" fill="#78350f" stroke="#451a03" />
            <rect x="136" y="122" width="12" height="16" rx="2.5" fill="#fde68a" className="mk-flicker" />
            <rect x="131" y="114" width="22" height="5" rx="2" fill="#451a03" />
          </g>
        </svg>
      </div>
      <div key={text} className="mk-bubble relative mb-6 sm:mb-10 px-3.5 py-2.5 text-[12.5px] leading-snug text-emerald-50 min-h-[3.2rem]">
        <span className="block text-[9.5px] font-mono uppercase tracking-[0.18em] text-emerald-300/70 mb-0.5">Doña Flora · Mercader</span>
        {shown}
        {talking && <span className="mk-caret" />}
      </div>
    </div>
  );
};
