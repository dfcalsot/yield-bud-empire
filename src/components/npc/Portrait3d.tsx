import React, { useEffect, useRef, useState } from 'react';

/**
 * Trial "level 1" animation of the 3D-mascot portraits: two layers (the scene without the character, and the character cut out)
 * that move a little differently, plus a small effect per character. No blinking or lip-sync yet (that needs extra frames).
 */
type Fx = 'sparkles' | 'glint' | 'neon' | 'bubbles' | 'dna' | 'sun';
const FX: Record<string, { fx: Fx[]; at?: [number, number]; fullAt?: [number, number] }> = {
  chrono: { fx: ['sparkles'] },
  flora: { fx: ['neon'] },
  floro: { fx: ['neon'] },
  farmer: { fx: ['sun', 'glint'], at: [86, 47] },   // the glint sits on his magnifying glass
  scientist: { fx: ['bubbles'], at: [79, 52], fullAt: [86, 27] },   // the bubbles rise from her flask
  'scientist-lab': { fx: ['bubbles'], at: [88, 33] },                // from her test tube
  geneticist: { fx: ['dna'], at: [12, 40] },   // the glow sits on his DNA tube
  budtender: { fx: ['neon'] },
};

/**
 * Characters with expression frames (`public/npc3d/<id>/<frame>.webp`, all cut from the same square so they line up): the base face,
 * the mouth open to flap while talking, a blink, and one face per mood. Any frame a character lacks falls back to `base`.
 */
type Frame = 'base' | 'talk' | 'talko' | 'blink' | 'happy' | 'think' | 'alert';
const EXPR: Record<string, Frame[]> = {
  floro: ['base', 'talk', 'blink', 'happy', 'think', 'alert'],
  farmer: ['base', 'talk', 'blink', 'happy', 'think', 'alert'],
  // blink and talko ("o" mouth) are her base face with the eyes of the laughing shot / the mouth of the surprised one pasted in
  scientist: ['base', 'talk', 'talko', 'blink', 'happy', 'think', 'alert'],
  // her second pose, at the bench with a test tube (Nutrition → Mixing lab), so the lab doesn't repeat the one used everywhere else
  'scientist-lab': ['base', 'talk', 'talko', 'blink', 'happy', 'think', 'alert'],
  geneticist: ['base', 'talk', 'happy', 'think', 'alert'],  // talk = base with the open mouth of another shot pasted in (the arms differ)
};
/** frames drawn in another pose than `base` (arms elsewhere): they cross-fade slower and base is not kept underneath them */
const OTHER_POSE: Record<string, Frame[]> = { geneticist: ['happy', 'think'], farmer: ['think'] };

/** characters that also have whole-body frames (`<id>/full/`) */
const FULL_BODY = new Set(['scientist']);
const MOOD_FRAME: Record<string, Frame> = { happy: 'happy', wave: 'happy', think: 'think', busy: 'think', sad: 'think' };
/** the faces a quiet character pulls now and then, so it never looks frozen */
const GESTURES: Frame[] = ['think', 'happy'];

/**
 * Which frame shows now. Talking: the mouth follows the letter being typed (open for a/e, round for o/u when there is a frame for
 * it, closed on spaces and m/b/p), sampled a few times a second so it reads as speech. Quiet: the mood's face, a blink every few
 * seconds and, in a calm mood, a short gesture now and then.
 */
function useExpression(id: string, talking: boolean, mood?: string, viseme?: string): Frame | null {
  const frames = EXPR[id];
  const vis = useRef(viseme);
  vis.current = viseme;
  const [mouth, setMouth] = useState<Frame>('base');
  const [blink, setBlink] = useState(false);
  const [gesture, setGesture] = useState<Frame | null>(null);
  useEffect(() => {
    if (!frames || !talking) { setMouth('base'); return; }
    const has = (f: Frame) => frames.includes(f);
    const tick = () => {
      const v = vis.current;
      setMouth(v === 'o' && has('talko') ? 'talko' : v === 'a' || v === 'e' || v === 'o' ? (has('talk') ? 'talk' : 'base') : 'base');
    };
    tick();
    const i = window.setInterval(tick, 130);
    return () => window.clearInterval(i);
  }, [frames, talking]);
  useEffect(() => {
    if (!frames) return;
    let t = 0;
    const next = () => { t = window.setTimeout(() => { setBlink(true); t = window.setTimeout(() => { setBlink(false); next(); }, 140); }, 2600 + Math.random() * 2600); };
    next();
    return () => window.clearTimeout(t);
  }, [frames]);
  const calm = !mood || mood === 'idle';
  useEffect(() => {
    if (!frames || talking || !calm) { setGesture(null); return; }
    const pool = GESTURES.filter((f) => frames.includes(f));
    if (!pool.length) return;
    let t = 0;
    const next = () => { t = window.setTimeout(() => { setGesture(pool[Math.floor(Math.random() * pool.length)]); t = window.setTimeout(() => { setGesture(null); next(); }, 1400); }, 5000 + Math.random() * 4000); };
    next();
    return () => window.clearTimeout(t);
  }, [frames, talking, calm]);
  if (!frames) return null;
  const has = (f: Frame) => frames.includes(f);
  if (talking) return mouth;
  const face = gesture ?? ((mood && MOOD_FRAME[mood]) || 'base');
  if (blink && face !== 'happy' && has('blink')) return 'blink';
  return has(face) ? face : 'base';
}

const SPARKS: Array<[number, number, number]> = [[12, 18, 0], [84, 14, 0.7], [90, 62, 1.4], [8, 70, 2.1], [70, 88, 0.4], [26, 90, 1.8], [52, 6, 1.1]];

/** `cutout`: only the character (no backdrop, no frame), for when the panel behind already paints the scene */
/** `full`: the whole body (`public/npc3d/<id>/full/<frame>.webp`), for scenes where the character stands in the middle */
export const Portrait3d: React.FC<{ id: string; talking: boolean; className?: string; cutout?: boolean; mood?: string; full?: boolean; viseme?: string }> = ({ id, talking, className = '', cutout, mood, full, viseme }) => {
  const def = FX[id] ?? { fx: [] };
  const frame = useExpression(id, talking, mood, viseme);
  const dir = full && frame && FULL_BODY.has(id) ? `/npc3d/${id}/full` : `/npc3d/${id}`;
  const at = (full ? def.fullAt : undefined) ?? def.at ?? [50, 50];
  return (
    <div className={`p3d p3d--${id} ${full ? 'p3d--full' : ''} ${cutout ? 'p3d--cutout' : ''} ${talking ? 'p3d--talk' : ''} ${def.fx.map((f) => `p3d-fx-${f}`).join(' ')} ${className}`}>
      {!cutout && <div className="p3d-bg" style={{ backgroundImage: `url(/npc3d/${id}-bg.webp)` }} />}
      {!cutout && def.fx.includes('sun') && <div className="p3d-sun" />}
      {def.fx.includes('dna') && <div className="p3d-glow" style={{ left: `${at[0]}%`, top: `${at[1]}%` }} />}
      {frame ? (
        // every frame stays loaded; only the current one is visible, so switching never flickers
        <div className="p3d-fg">
          {EXPR[id].map((f) => {
            const other = OTHER_POSE[id] ?? [];
            // same-pose faces sit on top of base, which stays opaque below them: a fade never shows the scene through the character
            const on = f === frame || (f === 'base' && !other.includes(frame));
            const slow = other.includes(f) || other.includes(frame) || f === 'happy' || f === 'think' || f === 'alert';
            return <img key={f} className="p3d-frame" src={`${dir}/${f}.webp`} alt="" draggable={false} style={{ opacity: on ? 1 : 0, transitionDuration: slow ? '220ms' : '70ms' }} />;
          })}
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
