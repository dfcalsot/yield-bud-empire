import React, { useEffect, useRef, useState } from 'react';

/**
 * Shared pieces of the NPC rig (v2). Every character is layered SVG lit from the top-left:
 * flat base colour + one cel-shade layer (bottom-right) + a rim light (top-left) + a consistent dark outline.
 * Faces are built from the same parts so the whole cast feels like one game: eyes that blink and follow the
 * cursor, brows that carry the mood and a mouth that lip-syncs to the letters being typed.
 */
export type Mood2 = 'idle' | 'happy' | 'sad' | 'busy' | 'think' | 'wave';
export type Viseme = 'closed' | 'a' | 'e' | 'o' | 'm';

export const OUTLINE = '#0b1f17';
export const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Letter → mouth shape while the speech bubble types it. */
export function visemeOf(ch: string | undefined): Viseme {
  if (!ch) return 'closed';
  const c = ch.toLowerCase();
  if ('aáàä'.includes(c)) return 'a';
  if ('eéiíyè'.includes(c)) return 'e';
  if ('oóuúw'.includes(c)) return 'o';
  if ('mbp'.includes(c)) return 'm';
  if (' .,;:!?¡¿…'.includes(c)) return 'closed';
  return 'e';
}

/** Where the cursor is relative to the character (unit vector scaled 0..1) so the eyes can follow it. */
export function useLook(ref: React.RefObject<Element | null>) {
  const [look, setLook] = useState({ x: 0, y: 0 });
  const last = useRef({ x: 0, y: 0 });
  useEffect(() => {
    if (reducedMotion()) return;
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height * 0.42);
        const d = Math.hypot(dx, dy) || 1;
        const k = Math.min(1, d / 320);
        const next = { x: Math.round((dx / d) * k * 20) / 20, y: Math.round((dy / d) * k * 20) / 20 };
        if (next.x !== last.current.x || next.y !== last.current.y) { last.current = next; setLook(next); }
      });
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => { window.removeEventListener('mousemove', onMove); cancelAnimationFrame(raf); };
  }, [ref]);
  return look;
}

/* ───────────────────────────── face parts ───────────────────────────── */

interface EyeSpec { cx: number; cy: number; rx: number; ry: number }

/** Glossy eyes: dark eye, coloured iris that follows `look`, two catch-lights and a blink layer. */
export const Eyes: React.FC<{ left: EyeSpec; right: EyeSpec; iris: string; look: { x: number; y: number }; mood: Mood2; lashes?: boolean; delay?: number; sclera?: string }> = ({ left, right, iris, look, mood, lashes, delay = 0, sclera }) => {
  const squint = mood === 'busy' ? 0.72 : mood === 'sad' ? 1.05 : 1;
  const one = (e: EyeSpec, key: string) => {
    const ox = look.x * e.rx * 0.34, oy = look.y * e.ry * 0.3;
    const happy = mood === 'happy';
    return (
      <g key={key}>
        {happy ? (
          <path d={`M${e.cx - e.rx} ${e.cy + 2} Q${e.cx} ${e.cy - e.ry * 1.25} ${e.cx + e.rx} ${e.cy + 2}`} stroke={OUTLINE} strokeWidth="3.2" fill="none" strokeLinecap="round" />
        ) : (
          <g className="v2-blink" style={{ animationDelay: `${delay}s`, transformOrigin: `${e.cx}px ${e.cy}px` }}>
            <ellipse cx={e.cx} cy={e.cy} rx={e.rx} ry={e.ry * squint} fill={sclera ?? '#0a1512'} stroke={sclera ? OUTLINE : undefined} strokeWidth={sclera ? 1.6 : undefined} />
            <ellipse cx={e.cx + ox} cy={e.cy + oy + 0.6} rx={e.rx * (sclera ? 0.62 : 0.72)} ry={e.ry * squint * (sclera ? 0.86 : 0.78)} fill={iris} />
            <ellipse cx={e.cx + ox} cy={e.cy + oy + 0.8} rx={e.rx * (sclera ? 0.34 : 0.38)} ry={e.ry * squint * (sclera ? 0.5 : 0.5)} fill="#04100c" />
            <circle cx={e.cx + ox - e.rx * 0.34} cy={e.cy + oy - e.ry * 0.34} r={e.rx * 0.27} fill="#fff" />
            <circle cx={e.cx + ox + e.rx * 0.3} cy={e.cy + oy + e.ry * 0.36} r={e.rx * 0.13} fill="#fff" opacity=".85" />
            {mood === 'sad' && <path d={`M${e.cx - e.rx} ${e.cy - e.ry * 0.55} Q${e.cx} ${e.cy - e.ry * 1.1} ${e.cx + e.rx} ${e.cy - e.ry * 0.55}`} stroke={OUTLINE} strokeWidth="1.6" fill="none" opacity=".55" />}
          </g>
        )}
        {lashes && !happy && <path d={key === 'l' ? `M${e.cx - e.rx} ${e.cy - 2.4} l-3.4 -2.2` : `M${e.cx + e.rx} ${e.cy - 2.4} l3.4 -2.2`} stroke={OUTLINE} strokeWidth="1.7" strokeLinecap="round" />}
      </g>
    );
  };
  return <g>{one(left, 'l')}{one(right, 'r')}</g>;
};

/** Brows carry most of the mood. `dy` lifts them for characters with a bigger forehead. */
export const Brows: React.FC<{ lx: number; rx: number; y: number; w?: number; mood: Mood2; color?: string }> = ({ lx, rx, y, w = 10, mood, color = OUTLINE }) => {
  const cfg: Record<Mood2, [number, number, number, number]> = {
    // [left lift, right lift, left tilt, right tilt]; positive tilt = inner end up (worried), negative = inner end down (focused)
    idle: [0, 0, -0.4, -0.4],
    happy: [3, 3, -0.6, -0.6],
    sad: [1, 1, 3.4, 3.4],
    busy: [-1, -1, -3.2, -3.2],
    think: [4, -1.5, -0.4, -2],
    wave: [2, 2, -0.4, -0.4],
  };
  const [ll, rl, lt, rt] = cfg[mood];
  return (
    <g stroke={color} strokeWidth="2.8" fill="none" strokeLinecap="round">
      <path d={`M${lx - w} ${y + lt - ll} Q${lx} ${y - 3 - ll} ${lx + w} ${y - lt - ll}`} className="v2-brow" />
      <path d={`M${rx - w} ${y - rt - rl} Q${rx} ${y - 3 - rl} ${rx + w} ${y + rt - rl}`} className="v2-brow" />
    </g>
  );
};

/** Mouth: rest shape follows the mood; while talking it follows the viseme of the letter being typed. */
export const Mouth: React.FC<{ cx: number; cy: number; s?: number; mood: Mood2; talking: boolean; viseme: Viseme }> = ({ cx, cy, s = 1, mood, talking, viseme }) => {
  const T = `translate(${cx} ${cy}) scale(${s})`;
  const open = (d: string, tongue = true) => (
    <g transform={T}>
      <path d={d} fill="#5b1220" stroke={OUTLINE} strokeWidth="2.2" strokeLinejoin="round" />
      {tongue && <ellipse cx="0" cy="6" rx="4.4" ry="2.4" fill="#f0708a" />}
    </g>
  );
  if (talking) {
    switch (viseme) {
      case 'a': return open('M-8 -1 Q0 -3 8 -1 Q7 11 0 11 Q-7 11 -8 -1Z');
      case 'e': return open('M-9 0 Q0 -2 9 0 Q6 6 0 6 Q-6 6 -9 0Z', false);
      case 'o': return open('M-4.5 -2 Q0 -5 4.5 -2 Q6 4 0 8 Q-6 4 -4.5 -2Z', false);
      case 'm': return <path transform={T} d="M-7 1 H7" stroke={OUTLINE} strokeWidth="2.8" strokeLinecap="round" />;
      default: return <path transform={T} d="M-6 1 Q0 3 6 1" stroke={OUTLINE} strokeWidth="2.6" fill="none" strokeLinecap="round" />;
    }
  }
  if (mood === 'happy' || mood === 'wave') return open('M-11 -2 Q0 -3 11 -2 Q9 13 0 13 Q-9 13 -11 -2Z');
  if (mood === 'sad') return <path transform={T} d="M-8 5 Q0 -3 8 5" stroke={OUTLINE} strokeWidth="2.6" fill="none" strokeLinecap="round" />;
  if (mood === 'busy') return <path transform={T} d="M-6 2 Q0 4 6 2" stroke={OUTLINE} strokeWidth="2.6" fill="none" strokeLinecap="round" />;
  if (mood === 'think') return <path transform={T} d="M-4 3 Q2 0 8 -1" stroke={OUTLINE} strokeWidth="2.6" fill="none" strokeLinecap="round" />;
  return <path transform={T} d="M-8 0 Q0 7 8 0" stroke={OUTLINE} strokeWidth="2.6" fill="none" strokeLinecap="round" />;
};

export const Cheeks: React.FC<{ y: number; lx: number; rx: number; r?: number; color?: string; o?: number }> = ({ y, lx, rx, r = 6, color = '#fb7185', o = 0.38 }) => (
  <g fill={color} opacity={o}><ellipse cx={lx} cy={y} rx={r} ry={r * 0.7} /><ellipse cx={rx} cy={y} rx={r} ry={r * 0.7} /></g>
);

/** Five-leaflet cannabis leaf drawn with light/shadow halves so it reads as a solid shape, not a flat sticker. */
export const Leaf: React.FC<{ x: number; y: number; s?: number; rot?: number; light?: string; dark?: string; className?: string }> = ({ x, y, s = 1, rot = 0, light = '#bef264', dark = '#22a34a', className }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} className={className}>
    {[-68, -36, 0, 36, 68].map((a, i) => {
      const len = [15, 20, 24, 20, 15][i];
      return (
        <g key={a} transform={`rotate(${a})`}>
          <path d={`M0 0 Q-${len * 0.3} -${len * 0.5} 0 -${len} Q${len * 0.3} -${len * 0.5} 0 0Z`} fill={dark} stroke={OUTLINE} strokeWidth="1.3" strokeLinejoin="round" />
          <path d={`M0 0 Q-${len * 0.3} -${len * 0.5} 0 -${len} Q-${len * 0.06} -${len * 0.5} 0 0Z`} fill={light} />
        </g>
      );
    })}
  </g>
);

/** The gradients / clip every character needs; ids are namespaced so several NPCs can share a page. */
export const RigDefs: React.FC = () => (
  <defs>
    <radialGradient id="v2Seed" cx="34%" cy="26%" r="90%"><stop offset="0" stopColor="#d1fae5" /><stop offset=".38" stopColor="#5eead4" /><stop offset=".78" stopColor="#10b981" /><stop offset="1" stopColor="#047857" /></radialGradient>
    <radialGradient id="v2Skin" cx="36%" cy="30%" r="85%"><stop offset="0" stopColor="#fde8cd" /><stop offset=".6" stopColor="#f3cfa4" /><stop offset="1" stopColor="#e0a878" /></radialGradient>
    <linearGradient id="v2Hood" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#22a34a" /><stop offset=".6" stopColor="#166534" /><stop offset="1" stopColor="#0f4a26" /></linearGradient>
    <linearGradient id="v2Robe" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2f9d63" /><stop offset=".55" stopColor="#1a6e45" /><stop offset="1" stopColor="#0e4a2e" /></linearGradient>
    <linearGradient id="v2Apron" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff7e6" /><stop offset="1" stopColor="#ead9b8" /></linearGradient>
    <radialGradient id="v2Glow" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#fde68a" stopOpacity=".95" /><stop offset=".5" stopColor="#fbbf24" stopOpacity=".35" /><stop offset="1" stopColor="#fbbf24" stopOpacity="0" /></radialGradient>
    <radialGradient id="v2Halo" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#fde68a" stopOpacity=".22" /><stop offset="1" stopColor="#fde68a" stopOpacity="0" /></radialGradient>
    <clipPath id="v2SeedClip"><path d="M80 44 C118 68 130 118 113 160 C104 182 56 182 47 160 C30 118 42 68 80 44Z" /></clipPath>
    <radialGradient id="v2SkinTan" cx="36%" cy="30%" r="85%"><stop offset="0" stopColor="#f1cfa6" /><stop offset=".6" stopColor="#dca877" /><stop offset="1" stopColor="#b57b4c" /></radialGradient>
    <radialGradient id="v2SkinBrown" cx="36%" cy="30%" r="85%"><stop offset="0" stopColor="#d9a274" /><stop offset=".6" stopColor="#b57847" /><stop offset="1" stopColor="#8a5530" /></radialGradient>
    <radialGradient id="v2SkinPale" cx="36%" cy="30%" r="85%"><stop offset="0" stopColor="#fdeede" /><stop offset=".6" stopColor="#f6d5bd" /><stop offset="1" stopColor="#e2ad8d" /></radialGradient>
    <radialGradient id="v2SkinRuddy" cx="36%" cy="30%" r="85%"><stop offset="0" stopColor="#f7d2ae" /><stop offset=".6" stopColor="#e5a978" /><stop offset="1" stopColor="#c47f4c" /></radialGradient>
    <linearGradient id="v2HairDark" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#5a3a26" /><stop offset="1" stopColor="#1f1108" /></linearGradient>
    <linearGradient id="v2Purple" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#9d7bf7" /><stop offset=".55" stopColor="#6d3fe0" /><stop offset="1" stopColor="#43209a" /></linearGradient>
    <linearGradient id="v2Olive" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8a9a48" /><stop offset="1" stopColor="#56642a" /></linearGradient>
    <linearGradient id="v2Flannel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e05252" /><stop offset=".55" stopColor="#b91c1c" /><stop offset="1" stopColor="#7a1414" /></linearGradient>
    <linearGradient id="v2Vest" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#b08a4e" /><stop offset="1" stopColor="#7a5a2c" /></linearGradient>
    <linearGradient id="v2Straw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f3d98a" /><stop offset="1" stopColor="#cfa64a" /></linearGradient>
    <linearGradient id="v2Coat" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset=".6" stopColor="#e2e8f0" /><stop offset="1" stopColor="#b6c2d2" /></linearGradient>
    <linearGradient id="v2Burg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#b23a5e" /><stop offset=".55" stopColor="#8a2444" /><stop offset="1" stopColor="#561430" /></linearGradient>
    <linearGradient id="v2Polo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#374151" /><stop offset="1" stopColor="#111827" /></linearGradient>
    <linearGradient id="v2Teal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2bb8a6" /><stop offset="1" stopColor="#0d766b" /></linearGradient>
    <clipPath id="v2TorsoClip"><path d="M30 194 Q28 130 80 112 Q132 130 130 194Z" /></clipPath>
  </defs>
);
