import React from 'react';

/**
 * Trial "level 1" animation of the 3D-mascot portraits: two layers (the scene without the character, and the character cut out)
 * that move a little differently, plus a small effect per character. No blinking or lip-sync yet (that needs extra frames).
 */
type Fx = 'sparkles' | 'glint' | 'neon' | 'bubbles' | 'dna' | 'sun';
const FX: Record<string, { fx: Fx[]; at?: [number, number] }> = {
  foreman: { fx: ['glint'], at: [37, 54] },
  flora: { fx: ['neon'] },
  floro: { fx: ['neon'] },
  farmer: { fx: ['sun', 'glint'], at: [91, 60] },
  scientist: { fx: ['bubbles'], at: [86, 50] },
  geneticist: { fx: ['dna'], at: [8, 45] },
  budtender: { fx: ['neon'] },
};

const SPARKS: Array<[number, number, number]> = [[12, 18, 0], [84, 14, 0.7], [90, 62, 1.4], [8, 70, 2.1], [70, 88, 0.4], [26, 90, 1.8], [52, 6, 1.1]];

/** `cutout`: only the character (no backdrop, no frame), for when the panel behind already paints the scene */
export const Portrait3d: React.FC<{ id: string; talking: boolean; className?: string; cutout?: boolean }> = ({ id, talking, className = '', cutout }) => {
  const def = FX[id] ?? { fx: [] };
  const at = def.at ?? [50, 50];
  return (
    <div className={`p3d p3d--${id} ${cutout ? 'p3d--cutout' : ''} ${talking ? 'p3d--talk' : ''} ${def.fx.map((f) => `p3d-fx-${f}`).join(' ')} ${className}`}>
      {!cutout && <div className="p3d-bg" style={{ backgroundImage: `url(/npc3d/${id}-bg.webp)` }} />}
      {!cutout && def.fx.includes('sun') && <div className="p3d-sun" />}
      {def.fx.includes('dna') && <div className="p3d-glow" style={{ left: `${at[0]}%`, top: `${at[1]}%` }} />}
      <img className="p3d-fg" src={`/npc3d/${id}-fg.webp`} alt="" draggable={false} />
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
