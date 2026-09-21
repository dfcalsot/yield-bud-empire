import React, { useId } from 'react';
import './logo.css';
import { RING_BOTTOM, RING_BOTTOM_DOTS, RING_TOP, WORD_EMPIRE, WORD_YIELD_BUD } from './logoText';

/**
 * Yield Bud Empire — the brand mark.
 *
 * A crowned cannabis leaf that grows out of a stack of coins (yield), over a sunburst (empire), inside a seal with the
 * name. Everything is vector paths (the lettering is outlined), so it needs no webfont and prints cleanly.
 *  - `YieldLogo`   full seal, colour or one-colour (`mono`, for screen printing / embroidery), optionally animated
 *  - `YieldMark`   the emblem without the lettering ring (small sizes: header, favicon, avatar)
 *  - `YieldLockup` horizontal-friendly stacked wordmark for chests and caps
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
  { a: -80, L: 52, W: 17 }, { a: 80, L: 52, W: 17 },
  { a: -52, L: 76, W: 23 }, { a: 52, L: 76, W: 23 },
  { a: -26, L: 94, W: 27 }, { a: 26, L: 94, W: 27 },
  { a: 0, L: 104, W: 30 },
].map((l, i) => ({ ...l, ...leaflet(l.L, l.W), i }));

const CROWN = 'M152 138 L154 98 L165 121 L177 107 L188 124 L200 84 L212 124 L223 107 L235 121 L246 98 L248 138Z';
const GEMS: Array<[number, number, number, string]> = [[154, 98, 5.2, '#f472b6'], [177, 107, 4.2, '#5eead4'], [200, 84, 6, '#c4b5fd'], [223, 107, 4.2, '#5eead4'], [246, 98, 5.2, '#f472b6']];
const STAR = 'M0 -8 Q1.6 -1.6 8 0 Q1.6 1.6 0 8 Q-1.6 1.6 -8 0 Q-1.6 -1.6 0 -8Z';
const SPARKS: Array<[number, number, number, number]> = [[98, 152, 0.9, 0], [304, 128, 1.1, 0.7], [112, 292, 0.7, 1.4], [292, 286, 0.9, 0.35], [206, 60, 0.6, 1.9]];
const HEX = (r: number) => Array.from({ length: 6 }, (_, i) => `${(r * Math.cos((Math.PI / 3) * i + Math.PI / 6)).toFixed(1)} ${(r * Math.sin((Math.PI / 3) * i + Math.PI / 6)).toFixed(1)}`).join(' L');

/* ───────────────────────────── the emblem ───────────────────────────── */

interface CommonProps { animated?: boolean; mono?: boolean; ink?: string; className?: string; title?: string; style?: React.CSSProperties }

const Defs: React.FC<{ id: string }> = ({ id }) => (
  <defs>
    <radialGradient id={`${id}disc`} cx="50%" cy="42%" r="70%"><stop offset="0" stopColor="#4a3a9a" /><stop offset=".55" stopColor="#241a5a" /><stop offset="1" stopColor={INK} /></radialGradient>
    <linearGradient id={`${id}leaf`} x1="0" y1="1" x2=".55" y2="0"><stop offset="0" stopColor="#4d9a12" /><stop offset=".5" stopColor="#8ddb2a" /><stop offset="1" stopColor="#d9f99d" /></linearGradient>
    <linearGradient id={`${id}gold`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff2b0" /><stop offset=".45" stopColor="#fcd34d" /><stop offset="1" stopColor="#d97706" /></linearGradient>
    <linearGradient id={`${id}coin`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#b45309" /><stop offset=".5" stopColor="#f5b400" /><stop offset="1" stopColor="#92400e" /></linearGradient>
    <radialGradient id={`${id}glow`} cx="50%" cy="50%" r="50%"><stop offset=".55" stopColor="#a78bfa" stopOpacity=".55" /><stop offset=".8" stopColor="#b8f35a" stopOpacity=".16" /><stop offset="1" stopColor="#b8f35a" stopOpacity="0" /></radialGradient>
    <linearGradient id={`${id}shine`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".85" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
    <clipPath id={`${id}disc-clip`}><circle cx="200" cy="200" r="140" /></clipPath>
    <clipPath id={`${id}crown-clip`}><path d={CROWN} /></clipPath>
  </defs>
);

/** the centre of the seal: rays, crowned leaf, coins, sparkles. `mono` draws it in one ink with knock-outs. */
const Art: React.FC<{ id: string; mono: boolean; ink: string; animated: boolean }> = ({ id, mono, ink, animated }) => {
  const line = mono ? ink : INK;
  const leafFill = mono ? ink : `url(#${id}leaf)`;
  return (
    <g>
      {/* sunburst (in one ink it leaves a halo around the leaf, crown and coins) */}
      <g clipPath={`url(#${id}disc-clip)`} mask={mono ? `url(#${id}rays-mask)` : undefined}>
        <g className="ybe-rays">
          <g transform="translate(200 200)" fill={mono ? 'none' : GOLD} fillOpacity={mono ? undefined : 0.2} stroke={mono ? ink : 'none'} strokeWidth={mono ? 2.2 : 0} strokeLinejoin="round">
            {Array.from({ length: 24 }, (_, i) => <path key={i} d={`M0 0 L${i % 2 ? 112 : 142} ${i % 2 ? -3.4 : -5} L${i % 2 ? 112 : 142} ${i % 2 ? 3.4 : 5}Z`} transform={`rotate(${i * 15})`} />)}
          </g>
        </g>
      </g>

      {/* coin stack */}
      <g mask={mono ? `url(#${id}coin-mask)` : undefined}>
        {[326, 316, 306].map((cy) => (
          <g key={cy}>
            <path d={`M166 ${cy} v8 a34 9 0 0 0 68 0 v-8Z`} fill={mono ? ink : `url(#${id}coin)`} stroke={line} strokeWidth="3.4" strokeLinejoin="round" />
            <ellipse cx="200" cy={cy} rx="34" ry="9" fill={mono ? ink : `url(#${id}gold)`} stroke={line} strokeWidth="3.4" />
          </g>
        ))}
      </g>

      {/* leaf */}
      <g className="ybe-leaf" mask={mono ? `url(#${id}leaf-mask)` : undefined}>
        <path d={`M${PIVOT.x} ${PIVOT.y + 2} L${PIVOT.x} 308`} stroke={line} strokeWidth="12" strokeLinecap="round" />
        <path d={`M${PIVOT.x} ${PIVOT.y + 2} L${PIVOT.x} 308`} stroke={mono ? ink : '#65b81a'} strokeWidth="6.6" strokeLinecap="round" />
        {LEAVES.map((l) => (
          <g key={l.i} transform={`translate(${PIVOT.x} ${PIVOT.y}) rotate(${l.a})`}>
            <g className="ybe-lf" style={{ ['--d' as string]: `${(l.i % 4) * -0.55}s` }}>
              <path d={l.full} fill={leafFill} stroke={line} strokeWidth="5" strokeLinejoin="round" />
              {!mono && <path d={l.half} fill="#053b1a" fillOpacity=".24" />}
            </g>
          </g>
        ))}
      </g>

      {/* crown */}
      <g className="ybe-crown" mask={mono ? `url(#${id}crown-mask)` : undefined}>
        <path d={CROWN} fill={mono ? ink : `url(#${id}gold)`} stroke={line} strokeWidth="4.4" strokeLinejoin="round" />
        <rect x="150" y="134" width="100" height="14" rx="4" fill={mono ? ink : `url(#${id}gold)`} stroke={line} strokeWidth="4.4" strokeLinejoin="round" />
        {GEMS.map(([x, y, r, c]) => <circle key={x} cx={x} cy={y - 8} r={r} fill={mono ? ink : c} stroke={mono ? 'none' : INK} strokeWidth="2.4" />)}
        {!mono && <path d="M200 135 l6 6 l-6 6 l-6 -6Z" fill="#f43f5e" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />}
        {animated && !mono && (
          <g clipPath={`url(#${id}crown-clip)`}><rect className="ybe-shine" x="-70" y="70" width="46" height="86" fill={`url(#${id}shine)`} transform="skewX(-20)" /></g>
        )}
      </g>

      {/* trichome sparkles */}
      {SPARKS.map(([x, y, s, d], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`}><path className="ybe-spark" d={STAR} fill={mono ? ink : '#fff7c2'} stroke={mono ? 'none' : GOLD} strokeWidth="1.2" style={{ animationDelay: `${d}s` }} /></g>
      ))}

      {mono && (
        <defs>
          <mask id={`${id}rays-mask`} maskUnits="userSpaceOnUse" x="0" y="0" width="400" height="400">
            <rect width="400" height="400" fill="#fff" />
            <g fill="#000" stroke="#000" strokeWidth="18" strokeLinejoin="round" strokeLinecap="round">
              {LEAVES.map((l) => <path key={l.i} d={l.full} transform={`translate(${PIVOT.x} ${PIVOT.y}) rotate(${l.a})`} />)}
              <path d={CROWN} /><rect x="150" y="134" width="100" height="14" rx="4" />
              <path d="M200 272 L200 308" strokeWidth="26" /><rect x="164" y="300" width="72" height="34" rx="12" />
            </g>
          </mask>
          <mask id={`${id}leaf-mask`} maskUnits="userSpaceOnUse" x="0" y="0" width="400" height="400">
            <rect width="400" height="400" fill="#fff" />
            {LEAVES.map((l) => (
              <g key={l.i} transform={`translate(${PIVOT.x} ${PIVOT.y}) rotate(${l.a})`} stroke="#000" strokeWidth="2.6" strokeLinecap="round" fill="none">
                <path d={`M0 -8 L0 ${-l.L * 0.86}`} />
                {[0.32, 0.52, 0.7].map((t) => <path key={t} d={`M0 ${-l.L * t} L${(l.W * 0.3).toFixed(1)} ${-l.L * (t + 0.1)} M0 ${-l.L * t} L${-(l.W * 0.3).toFixed(1)} ${-l.L * (t + 0.1)}`} />)}
              </g>
            ))}
          </mask>
          <mask id={`${id}crown-mask`} maskUnits="userSpaceOnUse" x="0" y="0" width="400" height="400">
            <rect width="400" height="400" fill="#fff" />
            <path d="M200 135 l6 6 l-6 6 l-6 -6Z" fill="#000" /><path d="M154 132 H246" stroke="#000" strokeWidth="2.6" />
          </mask>
          <mask id={`${id}coin-mask`} maskUnits="userSpaceOnUse" x="0" y="0" width="400" height="400">
            <rect width="400" height="400" fill="#fff" />
            {[326, 316, 306].map((cy) => <ellipse key={cy} cx="200" cy={cy} rx="23" ry="5.4" fill="none" stroke="#000" strokeWidth="2.4" />)}
          </mask>
        </defs>
      )}
    </g>
  );
};

/** Full seal with the lettering ring. */
export const YieldLogo: React.FC<CommonProps & { size?: number | string }> = ({ size = 240, animated = false, mono = false, ink = '#ffffff', className = '', title = 'Yield Bud Empire', style }) => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg viewBox="0 0 400 400" width={size} height={size} role="img" aria-label={title} className={`ybe-logo ${animated ? 'ybe-anim' : ''} ${className}`} style={{ overflow: 'visible', ...style }}>
      <title>{title}</title>
      <Defs id={id} />
      {animated && !mono && <circle className="ybe-glow" cx="200" cy="200" r="206" fill={`url(#${id}glow)`} />}
      {/* ring band + disc */}
      {mono ? (
        <g fill="none" stroke={ink}><circle cx="200" cy="200" r="190" strokeWidth="7" /><circle cx="200" cy="200" r="150" strokeWidth="3.4" /><circle cx="200" cy="200" r="141" strokeWidth="2" /></g>
      ) : (
        <g>
          <circle cx="200" cy="200" r="190" fill={INK} stroke={`url(#${id}gold)`} strokeWidth="7" />
          <circle cx="200" cy="200" r="150" fill={`url(#${id}disc)`} stroke={GOLD} strokeWidth="3.4" />
          <circle cx="200" cy="200" r="141" fill="none" stroke={GOLD} strokeOpacity=".55" strokeWidth="1.6" />
          {animated && <circle className="ybe-chase" cx="200" cy="200" r="190" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeDasharray="70 1123" />}
        </g>
      )}
      <Art id={id} mono={mono} ink={ink} animated={animated} />
      {/* lettering (outlined) */}
      <path d={RING_TOP} fill={mono ? ink : `url(#${id}gold)`} />
      <path d={RING_BOTTOM} fill={mono ? ink : LIME} />
      {RING_BOTTOM_DOTS.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3.4" fill={mono ? ink : LIME} />)}
      {/* hexagon studs at 3 and 9 o'clock (molecule / block) */}
      {[27, 373].map((x) => (
        <g key={x} transform={`translate(${x} 200)`}>
          <path d={`M${HEX(12)}Z`} fill={mono ? 'none' : LIME} stroke={mono ? ink : INK} strokeWidth={mono ? 3 : 2.6} strokeLinejoin="round" />
          {!mono && <path d={`M${HEX(5.4)}Z`} fill={INK} />}
        </g>
      ))}
    </svg>
  );
};

/** The emblem only (no lettering ring): headers, favicon, avatars. */
export const YieldMark: React.FC<CommonProps & { size?: number | string }> = ({ size = 40, animated = false, mono = false, ink = '#ffffff', className = '', title = 'Yield Bud Empire', style }) => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg viewBox="46 46 308 308" width={size} height={size} role="img" aria-label={title} className={`ybe-logo ${animated ? 'ybe-anim' : ''} ${className}`} style={{ overflow: 'visible', ...style }}>
      <title>{title}</title>
      <Defs id={id} />
      {animated && !mono && <circle className="ybe-glow" cx="200" cy="200" r="168" fill={`url(#${id}glow)`} />}
      {mono ? <circle cx="200" cy="200" r="146" fill="none" stroke={ink} strokeWidth="8" /> : (
        <g><circle cx="200" cy="200" r="150" fill={`url(#${id}disc)`} stroke={`url(#${id}gold)`} strokeWidth="9" />
          {animated && <circle className="ybe-chase" cx="200" cy="200" r="150" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeDasharray="60 883" />}</g>
      )}
      <Art id={id} mono={mono} ink={ink} animated={animated} />
    </svg>
  );
};

/** Stacked wordmark (YIELD BUD over EMPIRE, framed by crown-lines): chest prints, caps, banners. */
export const YieldLockup: React.FC<CommonProps & { width?: number | string }> = ({ width = 420, animated = false, mono = false, ink = '#ffffff', className = '', title = 'Yield Bud Empire', style }) => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg viewBox="0 0 660 250" width={width} role="img" aria-label={title} className={`ybe-logo ${animated ? 'ybe-anim' : ''} ${className}`} style={{ overflow: 'visible', ...style }}>
      <title>{title}</title>
      <defs>
        <linearGradient id={`${id}w`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e4ff9c" /><stop offset="1" stopColor="#8ddb2a" /></linearGradient>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff2b0" /><stop offset=".5" stopColor="#fcd34d" /><stop offset="1" stopColor="#d97706" /></linearGradient>
      </defs>
      <g transform="translate(330 112)">
        <path d={WORD_YIELD_BUD.d} fill="none" stroke={mono ? 'none' : INK} strokeWidth="14" strokeLinejoin="round" transform="translate(0 4)" />
        <path d={WORD_YIELD_BUD.d} fill={mono ? ink : `url(#${id}w)`} />
      </g>
      <g transform="translate(330 214) scale(.92)">
        <path d={WORD_EMPIRE.d} fill="none" stroke={mono ? 'none' : INK} strokeWidth="14" strokeLinejoin="round" transform="translate(0 4)" />
        <path d={WORD_EMPIRE.d} fill={mono ? ink : `url(#${id}g)`} />
      </g>
      <g stroke={mono ? ink : GOLD} strokeWidth="6" strokeLinecap="round" fill="none">
        <path d="M22 192 H88 M22 208 H74" /><path d="M638 192 H572 M638 208 H586" />
      </g>
    </svg>
  );
};
