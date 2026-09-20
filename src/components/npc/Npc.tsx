import React, { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The cast: animated SVG characters that talk (typewriter bubble), react to what you do and idle with their own
 * little business (the farmer pours water, the scientist's flask bubbles…). One component, five figures.
 * Moods: idle · happy (hops) · sad (shakes its head) · busy (works faster).
 */
export type NpcKind = 'merchant' | 'farmer' | 'scientist' | 'geneticist' | 'budtender';
export type Mood = 'idle' | 'happy' | 'sad' | 'busy';

export const NPC_NAMES: Record<NpcKind, string> = {
  merchant: 'Doña Flora · Mercader',
  farmer: 'Don Tomás · Agricultor',
  scientist: 'Dra. Lucía · Científica',
  geneticist: 'Prof. Rafa · Genetista',
  budtender: 'Marta · Dispensaria',
};

const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Speech state for a character: `speak(text, mood)` restarts the reaction animation even when the mood repeats. */
export function useNpcSay(initial: string, mood: Mood = 'idle') {
  const [say, setSay] = useState<{ text: string; mood: Mood; key: number }>({ text: initial, mood, key: 0 });
  const speak = useCallback((text: string, m: Mood = 'idle') => setSay((s) => ({ text, mood: m, key: s.key + 1 })), []);
  return { say, speak };
}

/**
 * A character with its own memory: `speak` (reacting to something you did) and periodic tips drawn from `tips.current()`,
 * which the view reassigns on every render so the advice always reflects the current game state.
 */
export function useNpc(initial: string) {
  const { say, speak } = useNpcSay(initial);
  const last = useRef(Date.now());
  const tips = useRef<() => string[]>(() => []);
  const say2 = useCallback((text: string, m: Mood = 'idle') => { last.current = Date.now(); speak(text, m); }, [speak]);
  useEffect(() => {
    const tip = () => {
      if (Date.now() - last.current < 14000) return;
      const list = tips.current();
      if (list.length) speak(list[Math.floor(Math.random() * list.length)], 'idle');
    };
    const id = window.setInterval(tip, 10000);
    const first = window.setTimeout(tip, 7000);
    return () => { window.clearInterval(id); window.clearTimeout(first); };
  }, [speak]);
  return { say, speak: say2, tips };
}

/* ───────────────────────────── shared face ───────────────────────────── */

const Face: React.FC<{ mood: Mood; talking: boolean; cy?: number; ink?: string; cheeks?: string }> = ({ mood, talking, cy = 84, ink = '#3b2414', cheeks = '#f87171' }) => (
  <g>
    <g>
      {mood === 'happy' ? (
        <>
          <path d={`M62 ${cy} Q68 ${cy - 8} 74 ${cy}`} stroke={ink} strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d={`M86 ${cy} Q92 ${cy - 8} 98 ${cy}`} stroke={ink} strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <ellipse cx="68" cy={cy} rx="4.2" ry={mood === 'sad' ? 4.6 : mood === 'busy' ? 3.6 : 5.2} fill={ink} className="mk-eye" />
          <ellipse cx="92" cy={cy} rx="4.2" ry={mood === 'sad' ? 4.6 : mood === 'busy' ? 3.6 : 5.2} fill={ink} className="mk-eye" />
          <circle cx="69.5" cy={cy - 1.6} r="1.4" fill="#fff" /><circle cx="93.5" cy={cy - 1.6} r="1.4" fill="#fff" />
        </>
      )}
    </g>
    {mood === 'sad' && <path d={`M60 ${cy - 8} l12 -3 M100 ${cy - 8} l-12 -3`} stroke={ink} strokeWidth="2.4" strokeLinecap="round" />}
    {mood === 'busy' && <path d={`M61 ${cy - 9} l13 2 M99 ${cy - 9} l-13 2`} stroke={ink} strokeWidth="2.4" strokeLinecap="round" />}
    <circle cx="60" cy={cy + 12} r="5.4" fill={cheeks} opacity=".35" /><circle cx="100" cy={cy + 12} r="5.4" fill={cheeks} opacity=".35" />
    {mood === 'happy' && <path d={`M68 ${cy + 12} Q80 ${cy + 30} 92 ${cy + 12}Z`} fill="#7f1d1d" stroke={ink} strokeWidth="1.4" strokeLinejoin="round" />}
    {mood === 'sad' && <path d={`M71 ${cy + 20} Q80 ${cy + 12} 89 ${cy + 20}`} stroke={ink} strokeWidth="2.6" fill="none" strokeLinecap="round" />}
    {(mood === 'idle' || mood === 'busy') && <path d={`M70 ${cy + 14} Q80 ${cy + 23} 90 ${cy + 14}`} stroke={ink} strokeWidth="2.6" fill="none" strokeLinecap="round" className={talking ? 'mk-mouth' : undefined} />}
  </g>
);

const Leaf5: React.FC<{ x: number; y: number; s?: number; fill?: string }> = ({ x, y, s = 1, fill = '#86efac' }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    {[-64, -32, 0, 32, 64].map((a) => <path key={a} d="M0 0 Q-3 -9 0 -18 Q3 -9 0 0Z" fill={fill} stroke="#166534" strokeWidth=".6" transform={`rotate(${a})`} />)}
  </g>
);

/* ───────────────────────────── figures ───────────────────────────── */

type Fig = (mood: Mood, talking: boolean) => React.ReactNode;

const merchant: Fig = (mood, talking) => (
  <>
    <g className="mk-breath">
      <path d="M34 192 Q34 122 80 110 Q126 122 126 192Z" fill="url(#npcRobe)" stroke="#0a2a1a" strokeWidth="1.5" />
      <path d="M80 112 V192" stroke="#0a2a1a" strokeWidth="1.2" opacity=".5" />
      <rect x="46" y="150" width="68" height="9" rx="4.5" fill="#7c4a22" />
      <rect x="72" y="148" width="16" height="13" rx="3" fill="#fbbf24" stroke="#92400e" />
      <path d="M104 160 q10 4 8 18 q-10 4 -18 0 q-2 -14 10 -18Z" fill="#8a5a2b" stroke="#4a2a14" />
      <circle cx="103" cy="169" r="3.4" fill="#fbbf24" />
      <circle cx="80" cy="84" r="31" fill="#f3cfa4" stroke="#b98a5e" strokeWidth="1.2" />
      <path d="M46 84 Q46 42 80 40 Q114 42 114 84 Q100 62 80 62 Q60 62 46 84Z" fill="#166534" stroke="#0a2a1a" strokeWidth="1.5" />
      <path d="M42 96 Q46 60 80 56 Q114 60 118 96 Q112 70 80 68 Q48 70 42 96Z" fill="#14532d" opacity=".9" />
      <Leaf5 x={80} y={50} />
      <Face mood={mood} talking={talking} />
      <path d="M120 128 Q140 130 142 108" stroke="#166534" strokeWidth="13" fill="none" strokeLinecap="round" />
      <circle cx="142" cy="106" r="7" fill="#f3cfa4" />
    </g>
    <g className="mk-lantern" style={{ transformOrigin: '142px 100px' }}>
      <line x1="142" y1="100" x2="142" y2="118" stroke="#92400e" strokeWidth="2" />
      <circle cx="142" cy="136" r="26" fill="url(#npcGlow)" className="mk-flicker" />
      <rect x="133" y="118" width="18" height="24" rx="4" fill="#78350f" stroke="#451a03" />
      <rect x="136" y="122" width="12" height="16" rx="2.5" fill="#fde68a" className="mk-flicker" />
      <rect x="131" y="114" width="22" height="5" rx="2" fill="#451a03" />
    </g>
  </>
);

const farmer: Fig = (mood, talking) => (
  <>
    {/* sprout in a pot at his feet */}
    <g className="npc-sprout" style={{ transformOrigin: '24px 190px' }}>
      <path d="M14 178 h20 l-3 14 h-14Z" fill="#8a5230" stroke="#4a2a14" />
      <path d="M24 178 V162" stroke="#16a34a" strokeWidth="2.4" strokeLinecap="round" />
      <Leaf5 x={24} y={160} s={0.55} fill="#4ade80" />
    </g>
    <g className="mk-breath">
      <path d="M36 192 Q34 124 80 112 Q126 124 124 192Z" fill="#b91c1c" stroke="#450a0a" strokeWidth="1.5" />
      {[128, 146, 164].map((y) => <line key={y} x1="40" y1={y} x2="120" y2={y} stroke="#000" strokeOpacity=".16" strokeWidth="3" />)}
      {[58, 80, 102].map((x) => <line key={x} x1={x} y1="118" x2={x} y2="192" stroke="#000" strokeOpacity=".16" strokeWidth="3" />)}
      <path d="M52 192 L54 142 Q80 152 106 142 L108 192Z" fill="#2563eb" stroke="#172554" strokeWidth="1.5" />
      <path d="M56 142 L60 116 M104 142 L100 116" stroke="#2563eb" strokeWidth="7" strokeLinecap="round" />
      <circle cx="58" cy="132" r="3.2" fill="#fbbf24" /><circle cx="102" cy="132" r="3.2" fill="#fbbf24" />
      <rect x="66" y="156" width="28" height="15" rx="3" fill="#1d4ed8" stroke="#172554" />
      <circle cx="80" cy="84" r="30" fill="#e8b98c" stroke="#a9773f" strokeWidth="1.2" />
      <Face mood={mood} talking={talking} cheeks="#ef4444" />
      <path d="M67 95 Q80 89 93 95 Q80 100 67 95Z" fill="#5b3a1e" />
      <g className="npc-hat" style={{ transformOrigin: '80px 62px' }}>
        <ellipse cx="80" cy="62" rx="54" ry="11" fill="#e9c46a" stroke="#a67c00" strokeWidth="1.4" />
        <path d="M52 62 Q54 33 80 31 Q106 33 108 62Z" fill="#f4d58d" stroke="#a67c00" strokeWidth="1.2" />
        <rect x="52" y="53" width="56" height="8" fill="#7c4a22" />
        <path d="M30 60 q10 -5 22 -1 M108 59 q12 -4 22 1" stroke="#a67c00" strokeWidth="1" opacity=".5" fill="none" />
      </g>
      <path d="M120 130 Q142 132 146 112" stroke="#b91c1c" strokeWidth="13" fill="none" strokeLinecap="round" />
      <circle cx="146" cy="110" r="7" fill="#e8b98c" />
    </g>
    {/* watering can that tips and pours */}
    <g className="npc-can" style={{ transformOrigin: '150px 106px' }}>
      <rect x="138" y="90" width="26" height="22" rx="4" fill="#16a34a" stroke="#14532d" strokeWidth="1.4" />
      <path d="M138 96 q-9 0 -9 10 q0 8 9 8" stroke="#14532d" strokeWidth="3.5" fill="none" />
      <path d="M164 100 L184 84 l3 4 L166 108Z" fill="#16a34a" stroke="#14532d" />
      <ellipse cx="186" cy="85" rx="7" ry="3.4" transform="rotate(-42 186 85)" fill="#22c55e" stroke="#14532d" />
      {[0, 1, 2].map((i) => <circle key={i} cx={188 + i * 3} cy={92} r="2.4" fill="#38bdf8" className="npc-drop" style={{ animationDelay: `${i * 0.35}s` }} />)}
    </g>
  </>
);

const scientist: Fig = (mood, talking) => (
  <>
    <g className="mk-breath">
      <path d="M34 192 Q34 122 80 110 Q126 122 126 192Z" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.5" />
      <path d="M80 112 L62 142 L80 134 L98 142Z" fill="#0f766e" />
      <path d="M80 112 L66 132 L80 126Z" fill="#e2e8f0" /><path d="M80 112 L94 132 L80 126Z" fill="#e2e8f0" />
      <path d="M80 134 V192" stroke="#cbd5e1" strokeWidth="1.2" />
      <rect x="92" y="150" width="20" height="18" rx="2.5" fill="#f1f5f9" stroke="#94a3b8" />
      <line x1="98" y1="146" x2="98" y2="156" stroke="#2563eb" strokeWidth="2.4" strokeLinecap="round" /><line x1="104" y1="146" x2="104" y2="156" stroke="#dc2626" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="80" cy="84" r="30" fill="#f1c9a5" stroke="#b98a5e" strokeWidth="1.2" />
      <path d="M50 80 Q50 48 80 46 Q110 48 110 80 Q100 62 80 62 Q60 62 50 80Z" fill="#5b3a1e" stroke="#3b2414" />
      <circle cx="80" cy="42" r="13" fill="#5b3a1e" stroke="#3b2414" />
      {/* goggles pushed up */}
      <path d="M52 62 Q80 52 108 62" stroke="#0f766e" strokeWidth="4" fill="none" />
      <circle cx="68" cy="58" r="7.5" fill="#99f6e4" fillOpacity=".7" stroke="#0f766e" strokeWidth="2" /><circle cx="92" cy="58" r="7.5" fill="#99f6e4" fillOpacity=".7" stroke="#0f766e" strokeWidth="2" />
      <Face mood={mood} talking={talking} />
      <circle cx="68" cy="84" r="11" fill="#bae6fd" fillOpacity=".22" stroke="#334155" strokeWidth="1.8" /><circle cx="92" cy="84" r="11" fill="#bae6fd" fillOpacity=".22" stroke="#334155" strokeWidth="1.8" />
      <path d="M79 84 h2" stroke="#334155" strokeWidth="1.8" />
      <path d="M120 130 Q142 132 146 112" stroke="#f8fafc" strokeWidth="13" fill="none" strokeLinecap="round" />
      <path d="M120 130 Q142 132 146 112" stroke="#94a3b8" strokeWidth="1" fill="none" opacity=".5" />
      <circle cx="146" cy="110" r="7" fill="#f1c9a5" />
    </g>
    {/* bubbling flask */}
    <g className={`npc-flask ${mood === 'happy' ? 'is-glow' : ''}`} style={{ transformOrigin: '150px 96px' }}>
      <circle cx="152" cy="84" r="24" fill="#4ade80" opacity={mood === 'happy' ? 0.35 : 0.12} className="npc-glow" />
      <path d="M144 62 h14 v14 l14 24 q3 7 -4 7 h-34 q-7 0 -4 -7 l14 -24Z" fill="#0d2420" fillOpacity=".55" stroke="#94a3b8" strokeWidth="1.8" strokeLinejoin="round" />
      <clipPath id="npcFlaskClip"><path d="M144 62 h14 v14 l14 24 q3 7 -4 7 h-34 q-7 0 -4 -7 l14 -24Z" /></clipPath>
      <g clipPath="url(#npcFlaskClip)">
        <rect x="128" y="88" width="48" height="22" fill="#4ade80" opacity=".9" />
        {[[142, 100], [151, 96], [160, 101], [148, 93]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.2" fill="#fff" opacity=".8" className="npc-bub" style={{ animationDelay: `${i * 0.3}s` }} />)}
      </g>
      <rect x="142" y="58" width="18" height="6" rx="2" fill="#64748b" />
    </g>
  </>
);

const geneticist: Fig = (mood, talking) => (
  <>
    <g className="mk-breath">
      <path d="M34 192 Q34 122 80 110 Q126 122 126 192Z" fill="#d1fae5" stroke="#6ee7b7" strokeWidth="1.5" />
      <path d="M80 112 L64 140 L80 132 L96 140Z" fill="#047857" />
      <path d="M80 132 V192" stroke="#a7f3d0" strokeWidth="1.2" />
      <path d="M48 150 h18" stroke="#059669" strokeWidth="3" strokeLinecap="round" /><path d="M48 158 h12" stroke="#059669" strokeWidth="3" strokeLinecap="round" />
      <circle cx="80" cy="84" r="30" fill="#ecc79f" stroke="#b98a5e" strokeWidth="1.2" />
      {/* grey hair, tuft on top */}
      <path d="M50 78 Q48 46 80 44 Q112 46 110 78 Q102 60 80 60 Q58 60 50 78Z" fill="#cbd5e1" stroke="#94a3b8" />
      <path d="M62 46 q-6 -12 6 -14 M78 44 q0 -14 10 -12 M94 46 q8 -10 14 -2" stroke="#cbd5e1" strokeWidth="4" fill="none" strokeLinecap="round" />
      <Face mood={mood} talking={talking} />
      <circle cx="68" cy="84" r="12.5" fill="#fef9c3" fillOpacity=".18" stroke="#7c2d12" strokeWidth="2" /><circle cx="92" cy="84" r="12.5" fill="#fef9c3" fillOpacity=".18" stroke="#7c2d12" strokeWidth="2" />
      <path d="M80.5 84 h-1" stroke="#7c2d12" strokeWidth="2" />
      <path d="M67 96 Q80 92 93 96" stroke="#e2e8f0" strokeWidth="5" fill="none" strokeLinecap="round" opacity=".9" />
      <path d="M120 130 Q142 132 146 112" stroke="#d1fae5" strokeWidth="13" fill="none" strokeLinecap="round" />
      <circle cx="146" cy="110" r="7" fill="#ecc79f" />
    </g>
    {/* DNA helix */}
    <g className="npc-helix" style={{ transformOrigin: '156px 92px' }}>
      <path d="M146 60 C166 72 146 84 166 96 C146 108 166 118 146 128" stroke="#34d399" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M166 60 C146 72 166 84 146 96 C166 108 146 118 166 128" stroke="#a78bfa" strokeWidth="3" fill="none" strokeLinecap="round" />
      {[66, 78, 90, 102, 114, 126].map((y, i) => <line key={y} x1="148" y1={y} x2="164" y2={y} stroke="#f8fafc" strokeWidth="1.8" opacity=".85" className="npc-rung" style={{ animationDelay: `${i * 0.18}s`, transformOrigin: `156px ${y}px` }} />)}
    </g>
  </>
);

const budtender: Fig = (mood, talking) => (
  <>
    <g className="mk-breath">
      <path d="M36 192 Q34 124 80 112 Q126 124 124 192Z" fill="#1f2937" stroke="#0b1220" strokeWidth="1.5" />
      <path d="M50 192 L54 140 Q80 152 106 140 L110 192Z" fill="#7e22ce" stroke="#3b0764" strokeWidth="1.5" />
      <path d="M58 140 L62 116 M102 140 L98 116" stroke="#7e22ce" strokeWidth="6" strokeLinecap="round" />
      <rect x="66" y="158" width="28" height="14" rx="3" fill="#6b21a8" stroke="#3b0764" />
      <Leaf5 x={80} y={165} s={0.42} fill="#86efac" />
      <circle cx="80" cy="84" r="30" fill="#c68f66" stroke="#8a5a34" strokeWidth="1.2" />
      {/* beanie */}
      <path d="M50 76 Q50 40 80 38 Q110 40 110 76Z" fill="#16a34a" stroke="#14532d" strokeWidth="1.4" />
      <rect x="49" y="68" width="62" height="12" rx="6" fill="#15803d" stroke="#14532d" />
      {[58, 70, 82, 94, 106].map((x) => <line key={x} x1={x} y1="70" x2={x} y2="78" stroke="#14532d" strokeWidth="1.4" opacity=".6" />)}
      <circle cx="80" cy="36" r="5" fill="#bbf7d0" stroke="#14532d" />
      <Face mood={mood} talking={talking} ink="#2a1608" />
      <path d="M66 100 Q80 96 94 100 Q94 112 80 114 Q66 112 66 100Z" fill="#3b2414" opacity=".35" />
      <path d="M120 130 Q142 132 146 112" stroke="#1f2937" strokeWidth="13" fill="none" strokeLinecap="round" />
      <circle cx="146" cy="110" r="7" fill="#c68f66" />
    </g>
    {/* jar with a glowing bud */}
    <g className="npc-jar" style={{ transformOrigin: '150px 100px' }}>
      <circle cx="152" cy="92" r="22" fill="#a3e635" opacity=".16" className="npc-glow" />
      <rect x="138" y="76" width="28" height="30" rx="6" fill="#0d2420" fillOpacity=".6" stroke="#cbd5e1" strokeWidth="1.8" />
      <rect x="136" y="70" width="32" height="8" rx="3" fill="#a16207" stroke="#713f12" />
      <ellipse cx="152" cy="93" rx="9" ry="10" fill="#4d7c0f" stroke="#365314" />
      {[[147, 88], [156, 92], [150, 98], [158, 86]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.2" fill="#f97316" opacity=".9" />)}
      {[[135, 74], [170, 82], [140, 62]].map(([x, y], i) => <path key={i} d={`M${x} ${y - 4} l1.5 2.5 2.5 1.5 -2.5 1.5 -1.5 2.5 -1.5 -2.5 -2.5 -1.5 2.5 -1.5Z`} fill="#fde047" className="npc-spark" style={{ animationDelay: `${i * 0.5}s` }} />)}
    </g>
  </>
);

const FIGURES: Record<NpcKind, Fig> = { merchant, farmer, scientist, geneticist, budtender };

/* ───────────────────────────── the character ───────────────────────────── */

export const Npc: React.FC<{
  kind: NpcKind;
  text: string;
  mood: Mood;
  moodKey: number;
  /** figure only, no speech bubble (small corner cameo) */
  bare?: boolean;
  className?: string;
}> = ({ kind, text, mood, moodKey, bare, className = '' }) => {
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
    <div className={`flex items-end gap-1 min-w-0 ${className}`}>
      <div key={`${mood}-${moodKey}`} className={`mk-npc mk-npc--${mood} npc--${kind} shrink-0`}>
        <svg viewBox="-4 0 198 200" className={bare ? 'w-[92px] h-[92px]' : 'w-[132px] h-[150px] sm:w-[156px] sm:h-[176px]'} aria-hidden>
          <defs>
            <linearGradient id="npcRobe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1f7a4a" /><stop offset="1" stopColor="#0f3d27" /></linearGradient>
            <radialGradient id="npcGlow" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#fde68a" stopOpacity=".9" /><stop offset="1" stopColor="#fde68a" stopOpacity="0" /></radialGradient>
          </defs>
          <ellipse cx="80" cy="192" rx="54" ry="7" fill="#000" opacity=".4" />
          {FIGURES[kind](mood, talking)}
        </svg>
      </div>
      {!bare && (
        <div key={text} className="mk-bubble relative mb-6 sm:mb-10 px-3.5 py-2.5 text-[12.5px] leading-snug text-emerald-50 min-h-[3.2rem]">
          <span className="block text-[9.5px] font-mono uppercase tracking-[0.18em] text-emerald-300/70 mb-0.5">{NPC_NAMES[kind]}</span>
          {shown}
          {talking && <span className="mk-caret" />}
        </div>
      )}
    </div>
  );
};
