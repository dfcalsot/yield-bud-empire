import React, { useId } from 'react';
import './logo.css';
import { EMPIRE, ONE_LINE, YIELD_BUD, type Letter, type Word } from './logoText';

/**
 * Yield Bud Empire — the brand.
 *
 * Drawn in the same language as the game itself: thick dark outlines, one shade layer, saturated colour, a bevelled
 * "video-game title" wordmark with a solid extrusion and a glossy top. A crowned cannabis leaf grows out of a stack of coins
 * (yield) in front of a sunburst (empire). Everything is vector paths (the lettering is outlined), so it needs no webfont
 * and prints cleanly.
 *  - `YieldLogo`   emblem + stacked title (the main logo); `size` is the width
 *  - `YieldMark`   the emblem in a round badge (header, favicon, avatar); `size` is the width and height
 *  - `YieldLockup` the stacked title alone (chest prints, caps); `width`
 *  - `YieldHeader` badge + one-line title, for the top bar; `height`
 * Each takes `mono` (one ink, with real gaps instead of gradients, for screen printing / embroidery) and `animated`.
 */

const INK = '#0a0716';
const GOLD = '#fcd34d';
const LIME = '#b8f35a';

/* ───────────────────────────── geometry ───────────────────────────── */

const width = (t: number, W: number) => (W / 2) * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.72)), 0.85);

/** A serrated leaflet pointing up from (0,0): the whole outline and its right (shaded) half. */
function leaflet(L: number, W: number, teeth = 6) {
  const right: Array<[number, number]> = [];
  for (let k = 0; k < teeth; k++) {
    const t0 = 0.06 + (k / teeth) * 0.9, t1 = 0.06 + ((k + 1) / teeth) * 0.9;
    right.push([width(t0, W) * 0.66, -L * t0]);
    right.push([width(t0 + (t1 - t0) * 0.55, W), -L * (t0 + (t1 - t0) * 0.78)]);
  }
  const left = right.map(([x, y]) => [-x, y] as [number, number]).reverse();
  const pts = (a: Array<[number, number]>) => a.map(([x, y]) => `L${x.toFixed(1)} ${y.toFixed(1)}`).join('');
  return { full: `M0 0${pts(right)}L0 ${-L}${pts(left)}Z`, half: `M0 0${pts(right)}L0 ${-L}Z` };
}

const PIVOT = { x: 200, y: 270 };
const LEAVES = [
  { a: -80, L: 52, W: 19 }, { a: 80, L: 52, W: 19 },
  { a: -52, L: 76, W: 25 }, { a: 52, L: 76, W: 25 },
  { a: -26, L: 94, W: 29 }, { a: 26, L: 94, W: 29 },
  { a: 0, L: 104, W: 32 },
].map((l, i) => ({ ...l, ...leaflet(l.L, l.W), i }));

const CROWN = 'M152 138 L154 98 L165 121 L177 107 L188 124 L200 84 L212 124 L223 107 L235 121 L246 98 L248 138Z';
const GEMS: Array<[number, number, number, string]> = [[154, 98, 5.6, '#f472b6'], [177, 107, 4.6, '#5eead4'], [200, 84, 6.4, '#c4b5fd'], [223, 107, 4.6, '#5eead4'], [246, 98, 5.6, '#f472b6']];
const STAR = 'M0 -8 Q1.6 -1.6 8 0 Q1.6 1.6 0 8 Q-1.6 1.6 -8 0 Q-1.6 -1.6 0 -8Z';
const SPARKS: Array<[number, number, number, number]> = [[98, 152, 0.95, 0], [304, 128, 1.15, 0.7], [112, 292, 0.75, 1.4], [292, 286, 0.95, 0.35], [206, 56, 0.65, 1.9]];

/* ───────────────────────────── shared defs ───────────────────────────── */

interface CommonProps { animated?: boolean; mono?: boolean; ink?: string; className?: string; title?: string; style?: React.CSSProperties }

const Defs: React.FC<{ id: string }> = ({ id }) => (
  <defs>
    <radialGradient id={`${id}disc`} cx="50%" cy="42%" r="70%"><stop offset="0" stopColor="#5a48c4" /><stop offset=".55" stopColor="#2c2070" /><stop offset="1" stopColor={INK} /></radialGradient>
    <linearGradient id={`${id}leaf`} x1="0" y1="1" x2=".55" y2="0"><stop offset="0" stopColor="#3f9a0c" /><stop offset=".5" stopColor="#8ee02a" /><stop offset="1" stopColor="#e2fba8" /></linearGradient>
    <linearGradient id={`${id}gold`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff5b8" /><stop offset=".45" stopColor="#fcd34d" /><stop offset="1" stopColor="#e08a0b" /></linearGradient>
    <linearGradient id={`${id}coin`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#b45309" /><stop offset=".5" stopColor="#f5b400" /><stop offset="1" stopColor="#92400e" /></linearGradient>
    <linearGradient id={`${id}wl`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f0ffb8" /><stop offset=".5" stopColor="#a3e635" /><stop offset="1" stopColor="#4d9a12" /></linearGradient>
    <linearGradient id={`${id}wg`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff5b8" /><stop offset=".5" stopColor="#fcd34d" /><stop offset="1" stopColor="#e08a0b" /></linearGradient>
    <radialGradient id={`${id}glow`} cx="50%" cy="50%" r="50%"><stop offset=".45" stopColor="#7c5cf0" stopOpacity=".55" /><stop offset=".75" stopColor="#fcd34d" stopOpacity=".16" /><stop offset="1" stopColor="#fcd34d" stopOpacity="0" /></radialGradient>
    <linearGradient id={`${id}shine`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".9" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
    <clipPath id={`${id}disc-clip`}><circle cx="200" cy="200" r="146" /></clipPath>
    <clipPath id={`${id}crown-clip`}><path d={CROWN} /></clipPath>
  </defs>
);

/* ───────────────────────────── the emblem ───────────────────────────── */

/** rays behind the emblem (a burst; in one ink it leaves a halo around the leaf, crown and coins) */
const Rays: React.FC<{ id: string; mono: boolean; ink: string }> = ({ id, mono, ink }) => (
  <g clipPath={`url(#${id}disc-clip)`} mask={mono ? `url(#${id}rays-mask)` : undefined}>
    <g className="ybe-rays">
      <g transform="translate(200 200)" fill={mono ? 'none' : GOLD} fillOpacity={mono ? undefined : 0.46} stroke={mono ? ink : 'none'} strokeWidth={mono ? 2.4 : 0} strokeLinejoin="round">
        {Array.from({ length: 16 }, (_, i) => <path key={i} d={`M0 0 L${i % 2 ? 118 : 150} ${i % 2 ? -7 : -11} L${i % 2 ? 118 : 150} ${i % 2 ? 7 : 11}Z`} transform={`rotate(${i * 22.5})`} />)}
      </g>
    </g>
  </g>
);

/** crowned leaf on coins, with the thick outline of the game's characters; `mono` draws it in one ink with knock-outs */
const Emblem: React.FC<{ id: string; mono: boolean; ink: string; animated: boolean; rays?: boolean }> = ({ id, mono, ink, animated, rays = true }) => {
  const line = mono ? ink : INK;
  const leafFill = mono ? ink : `url(#${id}leaf)`;
  return (
    <g>
      {rays && <Rays id={id} mono={mono} ink={ink} />}

      {/* coin stack */}
      <g mask={mono ? `url(#${id}coin-mask)` : undefined}>
        {[326, 316, 306].map((cy) => (
          <g key={cy}>
            <path d={`M166 ${cy} v8 a34 9 0 0 0 68 0 v-8Z`} fill={mono ? ink : `url(#${id}coin)`} stroke={line} strokeWidth="6" strokeLinejoin="round" />
            <ellipse cx="200" cy={cy} rx="34" ry="9" fill={mono ? ink : `url(#${id}gold)`} stroke={line} strokeWidth="6" />
          </g>
        ))}
      </g>

      {/* leaf */}
      <g className="ybe-leaf" mask={mono ? `url(#${id}leaf-mask)` : undefined}>
        <path d={`M${PIVOT.x} ${PIVOT.y + 2} L${PIVOT.x} 308`} stroke={line} strokeWidth="16" strokeLinecap="round" />
        <path d={`M${PIVOT.x} ${PIVOT.y + 2} L${PIVOT.x} 308`} stroke={mono ? ink : '#65b81a'} strokeWidth="7" strokeLinecap="round" />
        {LEAVES.map((l) => (
          <g key={l.i} transform={`translate(${PIVOT.x} ${PIVOT.y}) rotate(${l.a})`}>
            <g className="ybe-lf" style={{ ['--d' as string]: `${(l.i % 4) * -0.55}s` }}>
              <path d={l.full} fill={leafFill} stroke={line} strokeWidth="8.5" strokeLinejoin="round" />
              {!mono && <path d={l.half} fill="#053b1a" fillOpacity=".26" />}
            </g>
          </g>
        ))}
      </g>

      {/* crown */}
      <g className="ybe-crown" mask={mono ? `url(#${id}crown-mask)` : undefined}>
        <path d={CROWN} fill={mono ? ink : `url(#${id}gold)`} stroke={line} strokeWidth="7" strokeLinejoin="round" />
        <rect x="150" y="134" width="100" height="15" rx="5" fill={mono ? ink : `url(#${id}gold)`} stroke={line} strokeWidth="7" strokeLinejoin="round" />
        {GEMS.map(([x, y, r, c]) => <circle key={x} cx={x} cy={y - 8} r={r} fill={mono ? ink : c} stroke={mono ? 'none' : INK} strokeWidth="3" />)}
        {!mono && <path d="M200 135 l6 6 l-6 6 l-6 -6Z" fill="#f43f5e" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />}
        {animated && !mono && (
          <g clipPath={`url(#${id}crown-clip)`}><rect className="ybe-shine" x="-70" y="70" width="46" height="86" fill={`url(#${id}shine)`} transform="skewX(-20)" /></g>
        )}
      </g>

      {/* trichome sparkles */}
      {SPARKS.map(([x, y, s, d], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`}><path className="ybe-spark" d={STAR} fill={mono ? ink : '#fff7c2'} stroke={mono ? 'none' : GOLD} strokeWidth="1.4" style={{ animationDelay: `${d}s` }} /></g>
      ))}

      {mono && (
        <defs>
          <mask id={`${id}rays-mask`} maskUnits="userSpaceOnUse" x="0" y="0" width="400" height="400">
            <rect width="400" height="400" fill="#fff" />
            <g fill="#000" stroke="#000" strokeWidth="22" strokeLinejoin="round" strokeLinecap="round">
              {LEAVES.map((l) => <path key={l.i} d={l.full} transform={`translate(${PIVOT.x} ${PIVOT.y}) rotate(${l.a})`} />)}
              <path d={CROWN} /><rect x="150" y="134" width="100" height="15" rx="5" />
              <path d="M200 272 L200 308" strokeWidth="30" /><rect x="164" y="300" width="72" height="34" rx="12" />
            </g>
          </mask>
          <mask id={`${id}leaf-mask`} maskUnits="userSpaceOnUse" x="0" y="0" width="400" height="400">
            <rect width="400" height="400" fill="#fff" />
            {LEAVES.map((l) => (
              <g key={l.i} transform={`translate(${PIVOT.x} ${PIVOT.y}) rotate(${l.a})`} stroke="#000" strokeWidth="3" strokeLinecap="round" fill="none">
                <path d={`M0 -8 L0 ${-l.L * 0.86}`} />
                {[0.32, 0.52, 0.7].map((t) => <path key={t} d={`M0 ${-l.L * t} L${(l.W * 0.3).toFixed(1)} ${-l.L * (t + 0.1)} M0 ${-l.L * t} L${-(l.W * 0.3).toFixed(1)} ${-l.L * (t + 0.1)}`} />)}
              </g>
            ))}
          </mask>
          <mask id={`${id}crown-mask`} maskUnits="userSpaceOnUse" x="0" y="0" width="400" height="400">
            <rect width="400" height="400" fill="#fff" />
            <path d="M200 135 l6 6 l-6 6 l-6 -6Z" fill="#000" /><path d="M154 133 H246" stroke="#000" strokeWidth="3" />
          </mask>
          <mask id={`${id}coin-mask`} maskUnits="userSpaceOnUse" x="0" y="0" width="400" height="400">
            <rect width="400" height="400" fill="#fff" />
            {[326, 316, 306].map((cy) => <ellipse key={cy} cx="200" cy={cy} rx="23" ry="5.4" fill="none" stroke="#000" strokeWidth="2.8" />)}
          </mask>
        </defs>
      )}
    </g>
  );
};

/* ───────────────────────────── the wordmark ───────────────────────────── */

/**
 * A line of bevelled game-title letters. Each letter is: a dark silhouette (outline + extrusion), a two-step solid extrusion,
 * a dark edge line, the gradient face and a glossy top. In one ink the face is separated from the extrusion by a real gap.
 * `scale` sizes the whole word and `lift` is the extrusion depth in its own units.
 */
const Wordmark: React.FC<{
  id: string; gid: string; word: Word; x: number; y: number; scale?: number; palette: 'lime' | 'gold' | 'auto';
  mono: boolean; ink: string; animated: boolean; delay?: number;
}> = ({ id, gid, word, x, y, scale = 1, palette, mono, ink, animated, delay = 0 }) => {
  const lift = 9;
  const capH = word.bottom - word.top;
  const ext = (p: 'lime' | 'gold') => (p === 'lime' ? '#2f6b0f' : '#a35a06');
  const pal = (l: Letter): 'lime' | 'gold' => (palette === 'auto' ? (l.g ? 'gold' : 'lime') : palette);
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <defs>
        {word.letters.map((l, i) => <path key={i} id={`${id}L${i}`} d={l.d} />)}
        <clipPath id={`${id}tops`}><rect x={-word.width} y={word.top - 4} width={word.width * 2} height={capH * 0.46} /></clipPath>
        {mono && (
          <mask id={`${id}gap`} maskUnits="userSpaceOnUse" x={-word.width} y={word.top - 30} width={word.width * 2} height={capH + 80}>
            <rect x={-word.width} y={word.top - 30} width={word.width * 2} height={capH + 80} fill="#fff" />
            {word.letters.map((l, i) => <use key={i} href={`#${id}L${i}`} fill="#000" stroke="#000" strokeWidth="7" strokeLinejoin="round" />)}
          </mask>
        )}
        {animated && !mono && <clipPath id={`${id}shape`}>{word.letters.map((l, i) => <use key={i} href={`#${id}L${i}`} />)}</clipPath>}
      </defs>

      {mono ? (
        <g>
          <g mask={`url(#${id}gap)`}>
            {word.letters.map((l, i) => (
              <g key={i}>
                <use href={`#${id}L${i}`} transform={`translate(0 ${lift})`} fill={ink} stroke={ink} strokeWidth="9" strokeLinejoin="round" />
                <use href={`#${id}L${i}`} transform={`translate(0 ${lift / 2})`} fill={ink} stroke={ink} strokeWidth="9" strokeLinejoin="round" />
              </g>
            ))}
          </g>
          {word.letters.map((l, i) => <use key={i} href={`#${id}L${i}`} fill={ink} />)}
        </g>
      ) : (
        word.letters.map((l, i) => {
          const p = pal(l);
          return (
            <g key={i} className="ybe-ltr" style={{ ['--i' as string]: i + delay, transformOrigin: `${l.cx}px ${word.bottom}px`, transformBox: 'view-box' } as React.CSSProperties}>
              <use href={`#${id}L${i}`} transform={`translate(0 ${lift})`} fill={INK} stroke={INK} strokeWidth="17" strokeLinejoin="round" />
              <use href={`#${id}L${i}`} transform={`translate(0 ${lift})`} fill={ext(p)} stroke={ext(p)} strokeWidth="9" strokeLinejoin="round" />
              <use href={`#${id}L${i}`} transform={`translate(0 ${lift / 2})`} fill={ext(p)} stroke={ext(p)} strokeWidth="9" strokeLinejoin="round" />
              <use href={`#${id}L${i}`} fill={INK} stroke={INK} strokeWidth="8" strokeLinejoin="round" />
              <use href={`#${id}L${i}`} fill={`url(#${gid}${p === 'lime' ? 'wl' : 'wg'})`} />
              <g clipPath={`url(#${id}tops)`}><use href={`#${id}L${i}`} fill="#fff" fillOpacity=".3" /></g>
            </g>
          );
        })
      )}
      {animated && !mono && (
        <g clipPath={`url(#${id}shape)`} style={{ pointerEvents: 'none' }}>
          <rect className="ybe-wshine" x={-word.width / 2 - 120} y={word.top - 6} width="70" height={capH + 12} fill={`url(#${id}shine)`} transform={`skewX(-18)`} />
        </g>
      )}
    </g>
  );
};

/* ───────────────────────────── the logos ───────────────────────────── */

const useIds = () => useId().replace(/[^a-zA-Z0-9]/g, '');
const cls = (animated: boolean, className: string) => `ybe-logo ${animated ? 'ybe-anim' : ''} ${className}`;

/** Main logo: crowned leaf + stacked title. `size` is the width; the height follows the artwork. */
export const YieldLogo: React.FC<CommonProps & { size?: number | string }> = ({ size = 320, animated = false, mono = false, ink = '#ffffff', className = '', title = 'Yield Bud Empire', style }) => {
  const id = useIds();
  return (
    <svg viewBox="0 0 660 604" width={size} role="img" aria-label={title} className={cls(animated, className)} style={{ overflow: 'visible', ...style }}>
      <title>{title}</title>
      <Defs id={id} />
      {animated && !mono && <circle className="ybe-glow" cx="330" cy="198" r="226" fill={`url(#${id}glow)`} />}
      <g transform="translate(70 -63) scale(1.3)"><Emblem id={id} mono={mono} ink={ink} animated={animated} /></g>
      <Wordmark id={`${id}a`} gid={id} word={YIELD_BUD} x={330} y={458} palette="lime" mono={mono} ink={ink} animated={animated} />
      <Wordmark id={`${id}b`} gid={id} word={EMPIRE} x={330} y={580} palette="gold" mono={mono} ink={ink} animated={animated} delay={9} />
    </svg>
  );
};

/** The emblem in a round badge: header, favicon, avatars. `size` is the width and height. */
export const YieldMark: React.FC<CommonProps & { size?: number | string }> = ({ size = 40, animated = false, mono = false, ink = '#ffffff', className = '', title = 'Yield Bud Empire', style }) => {
  const id = useIds();
  return (
    <svg viewBox="40 40 320 320" width={size} height={size} role="img" aria-label={title} className={cls(animated, className)} style={{ overflow: 'visible', ...style }}>
      <title>{title}</title>
      <Defs id={id} />
      {animated && !mono && <circle className="ybe-glow" cx="200" cy="200" r="172" fill={`url(#${id}glow)`} />}
      {mono ? (
        <g fill="none" stroke={ink}><circle cx="200" cy="200" r="152" strokeWidth="11" /></g>
      ) : (
        <g>
          <circle cx="200" cy="200" r="154" fill={INK} />
          <circle cx="200" cy="200" r="146" fill={`url(#${id}disc)`} stroke={`url(#${id}gold)`} strokeWidth="10" />
          <circle cx="200" cy="200" r="152" fill="none" stroke={INK} strokeWidth="5" />
          {animated && <circle className="ybe-chase" cx="200" cy="200" r="146" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeDasharray="60 860" />}
        </g>
      )}
      <Emblem id={id} mono={mono} ink={ink} animated={animated} />
    </svg>
  );
};

/** The stacked title alone (no emblem): chest prints, caps, banners. */
export const YieldLockup: React.FC<CommonProps & { width?: number | string }> = ({ width = 420, animated = false, mono = false, ink = '#ffffff', className = '', title = 'Yield Bud Empire', style }) => {
  const id = useIds();
  return (
    <svg viewBox="0 0 660 262" width={width} role="img" aria-label={title} className={cls(animated, className)} style={{ overflow: 'visible', ...style }}>
      <title>{title}</title>
      <Defs id={id} />
      <Wordmark id={`${id}a`} gid={id} word={YIELD_BUD} x={330} y={88} palette="lime" mono={mono} ink={ink} animated={animated} />
      <Wordmark id={`${id}b`} gid={id} word={EMPIRE} x={330} y={228} palette="gold" mono={mono} ink={ink} animated={animated} delay={9} />
    </svg>
  );
};

/** Top-bar logo: the badge plus the title on one line (lime + gold). `height` is the height of the whole thing. */
export const YieldHeader: React.FC<CommonProps & { height?: number }> = ({ height = 44, animated = false, mono = false, ink = '#ffffff', className = '', title = 'Yield Bud Empire', style }) => {
  const id = useIds();
  const W = 132 + 590;
  return (
    <svg viewBox={`0 0 ${W} 120`} height={height} width={(height * W) / 120} role="img" aria-label={title} className={cls(animated, className)} style={{ overflow: 'visible', ...style }}>
      <title>{title}</title>
      <Defs id={id} />
      <g transform="translate(-16 -16) scale(0.38)">
        {mono ? <circle cx="200" cy="200" r="152" fill="none" stroke={ink} strokeWidth="11" /> : (
          <g><circle cx="200" cy="200" r="154" fill={INK} /><circle cx="200" cy="200" r="146" fill={`url(#${id}disc)`} stroke={`url(#${id}gold)`} strokeWidth="10" /></g>
        )}
        <Emblem id={id} mono={mono} ink={ink} animated={animated} />
      </g>
      <Wordmark id={`${id}w`} gid={id} word={ONE_LINE} x={132 + 295} y={78} palette="auto" mono={mono} ink={ink} animated={animated} />
    </svg>
  );
};
