import React, { useEffect, useState } from 'react';

/**
 * Trial "level 1" animation of the 3D-mascot portraits: two layers (the scene without the character, and the character cut out)
 * that move a little differently, plus a small effect per character. No blinking or lip-sync yet (that needs extra frames).
 */
type Fx = 'sparkles' | 'glint' | 'neon' | 'bubbles' | 'dna' | 'sun';
const FX: Record<string, { fx: Fx[]; at?: [number, number] }> = {
  chrono: { fx: ['sparkles'] },
  flora: { fx: ['neon'] },
  floro: { fx: ['neon'] },
  farmer: { fx: ['sun', 'glint'], at: [86, 47] },   // the glint sits on his magnifying glass
  scientist: { fx: ['bubbles'], at: [86, 50] },
  geneticist: { fx: ['dna'], at: [8, 45] },
  budtender: { fx: ['neon'] },
};

/**
 * Characters with expression frames (`public/npc3d/<id>/<frame>.webp`, all cut from the same square so they line up): the base face,
 * the mouth open to flap while talking, a blink, and one face per mood. Any frame a character lacks falls back to `base`.
 */
type Frame = 'base' | 'talk' | 'blink' | 'happy' | 'think' | 'alert';
const EXPR: Record<string, Frame[]> = {
  floro: ['base', 'talk', 'blink', 'happy', 'think', 'alert'],
  farmer: ['base', 'talk', 'blink', 'happy', 'think', 'alert'],
};
const MOOD_FRAME: Record<string, Frame> = { happy: 'happy', wave: 'happy', think: 'think', busy: 'think', sad: 'think' };

/** which frame shows now: mouth flaps while talking, a blink every few seconds, otherwise the mood's face */
function useExpression(id: string, talking: boolean, mood?: string): Frame | null {
  const frames = EXPR[id];
  const [flap, setFlap] = useState(false);
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    if (!frames || !talking) { setFlap(false); return; }
    const i = window.setInterval(() => setFlap((f) => !f), 150);
    return () => window.clearInterval(i);
  }, [frames, talking]);
  useEffect(() => {
    if (!frames) return;
    let t = 0;
    const next = () => { t = window.setTimeout(() => { setBlink(true); t = window.setTimeout(() => { setBlink(false); next(); }, 140); }, 2600 + Math.random() * 2600); };
    next();
    return () => window.clearTimeout(t);
  }, [frames]);
  if (!frames) return null;
  const has = (f: Frame) => frames.includes(f);
  if (talking) return flap && has('talk') ? 'talk' : 'base';
  const face = (mood && MOOD_FRAME[mood]) || 'base';
  if (blink && face !== 'happy' && has('blink')) return 'blink';
  return has(face) ? face : 'base';
}

const SPARKS: Array<[number, number, number]> = [[12, 18, 0], [84, 14, 0.7], [90, 62, 1.4], [8, 70, 2.1], [70, 88, 0.4], [26, 90, 1.8], [52, 6, 1.1]];

/** `cutout`: only the character (no backdrop, no frame), for when the panel behind already paints the scene */
export const Portrait3d: React.FC<{ id: string; talking: boolean; className?: string; cutout?: boolean; mood?: string }> = ({ id, talking, className = '', cutout, mood }) => {
  const def = FX[id] ?? { fx: [] };
  const frame = useExpression(id, talking, mood);
  const at = def.at ?? [50, 50];
  return (
    <div className={`p3d p3d--${id} ${cutout ? 'p3d--cutout' : ''} ${talking ? 'p3d--talk' : ''} ${def.fx.map((f) => `p3d-fx-${f}`).join(' ')} ${className}`}>
      {!cutout && <div className="p3d-bg" style={{ backgroundImage: `url(/npc3d/${id}-bg.webp)` }} />}
      {!cutout && def.fx.includes('sun') && <div className="p3d-sun" />}
      {def.fx.includes('dna') && <div className="p3d-glow" style={{ left: `${at[0]}%`, top: `${at[1]}%` }} />}
      {frame ? (
        // every frame stays loaded; only the current one is visible, so switching never flickers
        <div className="p3d-fg">
          {EXPR[id].map((f) => <img key={f} className="p3d-frame" src={`/npc3d/${id}/${f}.webp`} alt="" draggable={false} style={{ opacity: f === frame ? 1 : 0 }} />)}
        </div>
      ) : <img className="p3d-fg" src={`/npc3d/${id}-fg.webp`} alt="" draggable={false} />}
      {def.fx.includes('glint') && <div className="p3d-glint" style={{ left: `${at[0]}%`, top: `${at[1]}%` }} />}
      {def.fx.includes('bubbles') && (
        <div className="p3d-bubbles" style={{ left: `${at[0]}%`, top: `${at[1]}%` }}>
          {[0, 1, 2, 3, 4].map((i) => <i key={i} style={{ animationDelay: `${i * 0.55}s`, marginLeft: `${(i % 3) * 5 - 5}px` }} />)}
        </div>
      )}
      {def.fx.includes('sparkles') && SPARKS.map(([x, y, d], i) => <i key={i} className="p3d-spark" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${d}s` }} />)}
    </div>
  );
};
