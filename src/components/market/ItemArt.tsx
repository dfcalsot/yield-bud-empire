import React, { useId } from 'react';
import { RARITY_BY_TIER, type CatalogItem } from '../../economy/catalog';
import { RARITY_STYLE } from '../game/GameUI';

/**
 * Hand-drawn SVG art for every catalogue item. Each category has its own little animation (LEDs twinkle, drops fall,
 * the gauge needle swings, the wave in the bottle moves…). Animations are declared paused in index.css (`.mk-art .a-*`)
 * and only run while the item is hovered / selected / inside a `.mk-on` art, so a full shelf costs almost nothing.
 */

export const rarityColor = (it: CatalogItem): string => RARITY_STYLE[RARITY_BY_TIER[it.tier]].color;

const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const LIQUID = ['#84cc16', '#38bdf8', '#c084fc', '#fbbf24'];

type Art = (it: CatalogItem, u: string, rc: string) => React.ReactNode;

const lamp: Art = (it, u) => {
  const rows = Math.min(4, 1 + it.tier);
  const cols = 6;
  const h = 10 + rows * 9;
  return (
    <g>
      <path d="M30 2V20M70 2V20" stroke="#8a9a93" strokeWidth="2" strokeLinecap="round" />
      <path d={`M18 ${20 + h} L82 ${20 + h} L98 98 L2 98Z`} fill={`url(#c${u})`} className="a-cone" />
      <rect x="12" y="20" width="76" height={h} rx="6" fill={`url(#b${u})`} stroke="#0a100e" />
      <rect x="15" y="22" width="70" height="2.5" rx="1.2" fill="#ffffff" opacity=".18" />
      {range(rows).flatMap((r) => range(cols).map((c) => (
        <circle
          key={`${r}-${c}`} cx={22 + c * 11.2} cy={29 + r * 9} r="3"
          fill={(r + c) % 4 === 0 ? '#ff6b81' : it.tier >= 3 && (r + c) % 4 === 2 ? '#c084fc' : '#f4fbff'}
          className="a-tw" style={{ animationDelay: `${((r * cols + c) % 9) * 0.13}s` }}
        />
      )))}
    </g>
  );
};

const ac: Art = (it, u) => (
  <g>
    <rect x="8" y="16" width="84" height="36" rx="9" fill={`url(#b${u})`} stroke="#0a100e" />
    <rect x="14" y="22" width="72" height="5" rx="2.5" fill="#0d1512" />
    {range(4).map((i) => <rect key={i} x="16" y={33 + i * 4.5} width="50" height="2" rx="1" fill="#0d1512" />)}
    {it.tier >= 4 ? (
      <g>
        <circle cx="77" cy="38" r="11" fill="#0d1512" stroke="#8a9a93" />
        <g className="a-spin">
          {range(4).map((i) => <path key={i} d="M77 38 Q83 30 77 27 Q71 30 77 38Z" fill="#67e8f9" transform={`rotate(${i * 90} 77 38)`} />)}
        </g>
      </g>
    ) : (
      <g><circle cx="80" cy="40" r="4" fill="#0d1512" /><circle cx="80" cy="40" r="2" fill="#5eead4" className="a-blink" /></g>
    )}
    {range(3).map((i) => (
      <path key={i} d={`M${24 + i * 22} 58c-5 6 5 11 0 18`} stroke="#67e8f9" strokeWidth="2.6" fill="none" strokeLinecap="round" className="a-breeze" style={{ animationDelay: `${i * 0.35}s` }} />
    ))}
  </g>
);

const irrigation: Art = (it, u, rc) => {
  const hydro = it.id === 'irr_hydro';
  return (
    <g>
      <rect x="6" y="20" width="88" height="10" rx="5" fill={`url(#b${u})`} stroke="#0a100e" />
      <circle cx="24" cy="25" r="9" fill="#26332e" stroke={rc} strokeWidth="1.6" />
      <rect x="20" y="8" width="8" height="8" rx="2" fill="#94a3b8" />
      {[48, 64, 80].map((x, i) => (
        <g key={x}>
          <rect x={x - 2} y="30" width="4" height="9" rx="1.5" fill="#94a3b8" />
          <circle cx={x} cy="42" r="2.7" fill="#38bdf8" className="a-drip" style={{ animationDelay: `${i * 0.42}s` }} />
          {hydro
            ? <path d={`M${x} 74 q-8 -10 -3 -18 q6 6 3 18 q6 -12 12 -14 q-1 10 -12 14`} fill="#4ade80" />
            : <path d={`M${x - 8} 74 h16 l-2.5 15 h-11Z`} fill="#8a5230" stroke="#4a2a14" />}
        </g>
      ))}
      {hydro && <rect x="6" y="74" width="88" height="12" rx="3" fill="#134e4a" stroke="#2dd4bf" strokeOpacity=".5" />}
    </g>
  );
};

const co2: Art = (it, u, rc) => it.id === 'co2_mycelium' ? (
  <g>
    <path d="M30 34 Q26 82 38 90 H64 Q76 82 70 34Z" fill="#e6dcc3" stroke="#8a7a5a" strokeWidth="1.5" />
    <path d="M32 34 h36" stroke="#8a7a5a" strokeWidth="2" strokeDasharray="3 2.5" />
    {[[42, 60], [58, 52], [50, 74], [38, 78], [62, 72]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.4" fill="#c7b98f" />)}
    {[40, 51, 62].map((x, i) => <circle key={x} cx={x} cy="28" r="4" fill="#86efac" opacity=".75" className="a-puff" style={{ animationDelay: `${i * 0.5}s` }} />)}
  </g>
) : (
  <g>
    <rect x="34" y="30" width="30" height="60" rx="13" fill={`url(#b${u})`} stroke="#0a100e" />
    <rect x="43" y="22" width="12" height="10" rx="2" fill="#6b7c75" />
    <rect x="39" y="16" width="20" height="7" rx="3.5" fill={rc} />
    <rect x="38" y="50" width="22" height="14" rx="3" fill="#0d1512" stroke={rc} strokeOpacity=".6" />
    <text x="49" y="60.5" textAnchor="middle" fontSize="8" fontFamily="monospace" fill="#86efac">CO₂</text>
    <circle cx="80" cy="34" r="11" fill="#0d1512" stroke="#8a9a93" strokeWidth="1.6" />
    <path d="M72 38 a9 9 0 0 1 16 0" stroke="#34d399" strokeWidth="1.6" fill="none" />
    <line x1="80" y1="34" x2="80" y2="26" stroke="#fca5a5" strokeWidth="1.8" strokeLinecap="round" className="a-needle" style={{ transformOrigin: '80px 34px', transformBox: 'view-box' } as React.CSSProperties} />
    <path d="M64 24 h8 q8 0 8 8" stroke="#94a3b8" strokeWidth="2.5" fill="none" />
    {[49, 44, 54].map((x, i) => <circle key={i} cx={x} cy="12" r="3" fill="#86efac" opacity=".7" className="a-puff" style={{ animationDelay: `${i * 0.55}s` }} />)}
  </g>
);

const meter: Art = (it, u, rc) => it.id.includes('par') ? (
  <g>
    <path d="M20 96 q30 -16 60 0" stroke="#64748b" strokeWidth="2.4" fill="none" />
    <rect x="34" y="62" width="32" height="14" rx="4" fill={`url(#b${u})`} stroke="#0a100e" />
    <path d="M30 62 a20 20 0 0 1 40 0Z" fill="#e2e8f0" opacity=".9" />
    <path d="M36 58 a15 15 0 0 1 12 -10" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" opacity=".8" />
    <g className="a-spinslow">
      {range(8).map((i) => <line key={i} x1="50" y1="14" x2="50" y2="22" stroke="#fde047" strokeWidth="2.2" strokeLinecap="round" transform={`rotate(${i * 45} 50 44)`} />)}
    </g>
  </g>
) : (
  <g>
    <rect x="32" y="8" width="36" height="62" rx="9" fill={`url(#b${u})`} stroke="#0a100e" />
    <rect x="37" y="14" width="26" height="24" rx="3.5" fill="#06231b" stroke={rc} strokeOpacity=".5" />
    <path d="M39 30 q3.2 -10 6.4 0 t6.4 0 t6.4 0" stroke="#34d399" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeDasharray="60" className="a-sweep" />
    <text x="50" y="24" textAnchor="middle" fontSize="7" fontFamily="monospace" fill="#a7f3d0">{it.id.includes('ph') ? 'pH 6.2' : 'EC 1.8'}</text>
    <circle cx="42" cy="50" r="3.6" fill="#334155" /><circle cx="58" cy="50" r="3.6" fill={rc} />
    <rect x="47" y="70" width="6" height="20" rx="2" fill="#cbd5e1" />
    <circle cx="50" cy="92" r="3.6" fill={rc} className="a-blink" />
  </g>
);

const solar: Art = (it, u) => {
  const n = it.tier >= 3 ? 2 : 1;
  const w = n === 2 ? 38 : 66;
  return (
    <g>
      <g className="a-spinslow">
        <circle cx="84" cy="16" r="7" fill="#facc15" />
        {range(8).map((i) => <line key={i} x1="84" y1="3" x2="84" y2="7" stroke="#fde047" strokeWidth="2" strokeLinecap="round" transform={`rotate(${i * 45} 84 16)`} />)}
      </g>
      <defs><clipPath id={`k${u}`}><rect x="6" y="36" width="88" height="50" /></clipPath></defs>
      {range(n).map((i) => {
        const x = n === 2 ? 8 + i * 44 : 17;
        return (
          <g key={i}>
            <path d={`M${x + 8} 42 H${x + w + 8} L${x + w} 78 H${x - 4}Z`} fill="#0b2a55" stroke="#93c5fd" strokeWidth="1.4" />
            {range(3).map((k) => <line key={`v${k}`} x1={x + 8 + ((k + 1) * w) / 4} y1="42" x2={x - 4 + ((k + 1) * w) / 4} y2="78" stroke="#60a5fa" strokeOpacity=".5" />)}
            {range(2).map((k) => <line key={`h${k}`} x1={x + 5 - k * 2} y1={54 + k * 12} x2={x + w + 5 - k * 2} y2={54 + k * 12} stroke="#60a5fa" strokeOpacity=".5" />)}
            <path d={`M${x + w / 2} 78 V90 M${x + w / 2 - 8} 90 H${x + w / 2 + 8}`} stroke="#94a3b8" strokeWidth="2.6" />
          </g>
        );
      })}
      <g clipPath={`url(#k${u})`}><rect x="-30" y="34" width="14" height="60" fill="#fff" opacity=".35" transform="skewX(-20)" className="a-glint" /></g>
    </g>
  );
};

const nutrient: Art = (it, u, rc) => {
  const color = LIQUID[Math.min(3, it.tier - 1)];
  const big = it.tier >= 4;
  const bx = big ? 26 : 32, bw = big ? 48 : 36, by = big ? 30 : 34;
  return (
    <g>
      <defs><clipPath id={`n${u}`}><rect x={bx + 2} y={by + 2} width={bw - 4} height={86 - by - 4} rx="9" /></clipPath></defs>
      <rect x={bx} y={by} width={bw} height={86 - by} rx="11" fill="#0d2420" stroke="#94a3b8" strokeOpacity=".7" strokeWidth="1.6" />
      <g clipPath={`url(#n${u})`}>
        <g className="a-wave">
          <path d={`M${bx - 40} 52 q10 -6 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 V90 H${bx - 40}Z`} fill={color} opacity=".9" />
        </g>
        {[0, 1, 2].map((i) => <circle key={i} cx={bx + 10 + i * (bw / 4)} cy="80" r="2" fill="#fff" opacity=".7" className="a-bub" style={{ animationDelay: `${i * 0.6}s` }} />)}
      </g>
      <rect x={bx + 6} y={by + 12} width={bw - 12} height="20" rx="3" fill="#f8fafc" opacity=".92" />
      <rect x={bx + 6} y={by + 12} width={bw - 12} height="5" rx="2" fill={rc} />
      <text x={bx + bw / 2} y={by + 27} textAnchor="middle" fontSize="7.5" fontWeight="700" fontFamily="monospace" fill="#0f172a">N·P·K</text>
      <rect x={bx + bw / 2 - 9} y={by - 9} width="18" height="10" rx="2.5" fill={rc} />
      <rect x={bx + bw / 2 - 5} y={by - 13} width="10" height="5" rx="1.5" fill="#94a3b8" />
      <path d={`M${bx + 4} ${by + 8} v36`} stroke="#fff" strokeWidth="2" opacity=".18" strokeLinecap="round" />
    </g>
  );
};

const water: Art = (it, u, rc) => {
  const t = it.tier;
  const box = t === 1 ? { x: 30, y: 30, w: 40, h: 58, r: 14 } : t === 2 ? { x: 24, y: 24, w: 52, h: 66, r: 10 } : { x: 14, y: 28, w: 72, h: 60, r: 4 };
  return (
    <g>
      <defs><clipPath id={`w${u}`}><rect x={box.x + 2} y={box.y + 2} width={box.w - 4} height={box.h - 4} rx={box.r} /></clipPath></defs>
      <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={box.r} fill="#0b2a3a" stroke="#7dd3fc" strokeOpacity=".8" strokeWidth="1.6" />
      <g clipPath={`url(#w${u})`}>
        <g className="a-wave"><path d={`M${box.x - 40} ${box.y + 22} q10 -6 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 V96 H${box.x - 40}Z`} fill="#38bdf8" opacity=".85" /></g>
        <rect x={box.x + 6} y={box.y + 6} width="4" height={box.h - 14} rx="2" fill="#fff" opacity=".16" />
      </g>
      {t === 1 && <><rect x="40" y="20" width="20" height="11" rx="3" fill={rc} /><path d="M70 42 q12 4 0 22" stroke="#7dd3fc" strokeWidth="3" fill="none" /></>}
      {t === 2 && <>{[42, 62].map((y) => <rect key={y} x="22" y={y} width="56" height="4" rx="1.5" fill="#64748b" />)}<rect x="44" y="16" width="12" height="9" rx="2" fill={rc} /></>}
      {t === 3 && <>{range(4).map((i) => <line key={i} x1={26 + i * 16} y1="28" x2={26 + i * 16} y2="88" stroke="#94a3b8" strokeOpacity=".7" />)}{range(3).map((i) => <line key={i} x1="14" y1={43 + i * 15} x2="86" y2={43 + i * 15} stroke="#94a3b8" strokeOpacity=".7" />)}<rect x="10" y="88" width="80" height="7" rx="1.5" fill="#8a5a2b" /></>}
      <circle cx={t === 1 ? 50 : 50} cy="10" r="3" fill="#38bdf8" className="a-drip" />
    </g>
  );
};

const energy: Art = (it, u, rc) => {
  const n = it.tier;
  const cw = n === 1 ? 32 : n === 2 ? 28 : 24;
  const gap = 4;
  const total = n * cw + (n - 1) * gap;
  const x0 = 50 - total / 2;
  return (
    <g>
      {range(n).map((i) => {
        const x = x0 + i * (cw + gap);
        return (
          <g key={i}>
            <rect x={x + cw / 2 - 5} y="20" width="10" height="7" rx="2" fill="#94a3b8" />
            <rect x={x} y="26" width={cw} height="62" rx="7" fill={`url(#b${u})`} stroke="#0a100e" />
            {range(3).map((k) => <rect key={k} x={x + 4} y={72 - k * 14} width={cw - 8} height="9" rx="2.5" fill={rc} className="a-charge" style={{ animationDelay: `${(i * 0.3 + k * 0.35).toFixed(2)}s` }} />)}
            <path d={`M${x + cw / 2 + 2} 32 l-8 15 h6 l-3 11 9 -15 h-6Z`} fill="#fef08a" stroke="#a16207" strokeWidth=".8" />
          </g>
        );
      })}
      {[[12, 22], [88, 30], [16, 70], [86, 64]].map(([x, y], i) => (
        <path key={i} d={`M${x} ${y - 4} l1.6 2.4 2.4 1.6 -2.4 1.6 -1.6 2.4 -1.6 -2.4 -2.4 -1.6 2.4 -1.6Z`} fill="#fde047" className="a-spark" style={{ animationDelay: `${i * 0.35}s` }} />
      ))}
    </g>
  );
};

const license: Art = (it, u, rc) => {
  const glyph = (it.specs[0]?.value ?? 'L').trim().charAt(0).toUpperCase();
  return (
    <g>
      <path d="M32 78 l-4 16 8 -5 6 7 4 -18Z M62 78 l4 16 -8 -5 -6 7 -4 -18Z" fill={rc} />
      <rect x="22" y="14" width="56" height="66" rx="3" fill="#eadfc4" stroke="#a89468" strokeWidth="1.2" />
      <ellipse cx="50" cy="14" rx="30" ry="5" fill="#d6c79f" stroke="#a89468" />
      <ellipse cx="50" cy="80" rx="30" ry="5" fill="#d6c79f" stroke="#a89468" />
      <rect x="30" y="24" width="40" height="3.6" rx="1.8" fill="#7c6a44" opacity=".8" />
      {range(3).map((i) => <rect key={i} x="30" y={58 + i * 5} width={i === 2 ? 22 : 34} height="2" rx="1" fill="#7c6a44" opacity=".55" />)}
      <circle cx="50" cy="42" r="12" fill="none" stroke={rc} strokeWidth="2" />
      <text x="50" y="47.5" textAnchor="middle" fontSize="15" fontWeight="800" fontFamily="serif" fill="#3f3320">{glyph}</text>
      <circle cx="66" cy="74" r="9" fill="#b91c1c" stroke="#7f1d1d" strokeWidth="1.5" />
      <path d="M61 74 l3.4 3.4 6 -7" stroke="#fecaca" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <defs><clipPath id={`s${u}`}><rect x="22" y="14" width="56" height="66" rx="3" /></clipPath></defs>
      <g clipPath={`url(#s${u})`}><rect x="-30" y="10" width="12" height="80" fill="#fff" opacity=".5" transform="skewX(-20)" className="a-glint" /></g>
    </g>
  );
};

const pest: Art = (it, u, rc) => {
  const color = it.id === 'pest_neem' ? '#a3e635' : it.id === 'pest_bacillus' ? '#38bdf8' : it.id === 'pest_tricho' ? '#d6a35c' : '#c084fc';
  return (
    <g>
      <defs><clipPath id={`p${u}`}><rect x="31" y="42" width="34" height="46" rx="8" /></clipPath></defs>
      <rect x="31" y="42" width="34" height="46" rx="8" fill="#0d2420" stroke="#94a3b8" strokeOpacity=".7" strokeWidth="1.6" />
      <g clipPath={`url(#p${u})`}>
        <g className="a-wave"><path d="M-9 62 q10 -6 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 V92 H-9Z" fill={color} opacity=".9" /></g>
        {[0, 1].map((i) => <circle key={i} cx={42 + i * 14} cy="82" r="2" fill="#fff" opacity=".7" className="a-bub" style={{ animationDelay: `${i * 0.7}s` }} />)}
      </g>
      <rect x="35" y="55" width="26" height="18" rx="3" fill="#f8fafc" opacity=".93" />
      <rect x="35" y="55" width="26" height="5" rx="2" fill={rc} />
      <text x="48" y="69.5" textAnchor="middle" fontSize="7" fontWeight="800" fontFamily="monospace" fill="#0f172a">BIO</text>
      <rect x="39" y="34" width="18" height="9" rx="2" fill="#64748b" />
      <path d="M34 34 h24 l6 -5 h12 q4 0 4 4 v3 h-12 l-5 5 h-29Z" fill={rc} stroke="#0a100e" strokeWidth="1" />
      <path d="M52 40 q4 8 8 8" stroke="#334155" strokeWidth="3" fill="none" strokeLinecap="round" />
      {[[86, 26], [92, 20], [90, 33], [95, 28]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.8" fill={color} opacity=".75" className="a-puff" style={{ animationDelay: `${i * 0.35}s` }} />)}
    </g>
  );
};

const service: Art = (it, u, rc) => (
  <g>
    <path d="M24 44 q-16 0 -16 18 q0 14 16 14" stroke="#94a3b8" strokeWidth="5" fill="none" strokeLinecap="round" />
    <path d="M26 40 h40 v40 q0 8 -8 8 h-24 q-8 0 -8 -8Z" fill={`url(#b${u})`} stroke="#0a100e" />
    <path d="M66 52 L86 32 l5 5 L68 66Z" fill={`url(#b${u})`} stroke="#0a100e" />
    <ellipse cx="90" cy="33" rx="8" ry="4" transform="rotate(-42 90 33)" fill="#6b7c75" stroke="#0a100e" />
    {[[96, 44], [92, 52], [98, 57]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.6" fill="#38bdf8" className="a-drip" style={{ animationDelay: `${i * 0.4}s` }} />)}
    <rect x="30" y="56" width="32" height="16" rx="4" fill={rc} />
    <text x="46" y="67.5" textAnchor="middle" fontSize="9" fontWeight="800" fontFamily="monospace" fill="#0b1210">{it.amount} d</text>
    <g transform="translate(46 24)">
      {[-60, -30, 0, 30, 60].map((a) => <path key={a} d="M0 0 Q-2.6 -8 0 -15 Q2.6 -8 0 0Z" fill="#86efac" stroke="#166534" strokeWidth=".5" transform={`rotate(${a})`} />)}
    </g>
    {it.gardener === 2 && [[14, 26], [70, 14]].map(([x, y], i) => (
      <path key={i} d={`M${x} ${y - 4} l1.6 2.4 2.4 1.6 -2.4 1.6 -1.6 2.4 -1.6 -2.4 -2.4 -1.6 2.4 -1.6Z`} fill="#fde047" className="a-spark" style={{ animationDelay: `${i * 0.5}s` }} />
    ))}
  </g>
);

const ART: Record<string, Art> = { lamp, ac, irrigation, co2, meter, solar, nutrient, water, energy, pest, service, license };

export const ItemArt: React.FC<{ item: CatalogItem; className?: string; live?: boolean }> = ({ item, className = '', live }) => {
  const u = useId().replace(/[^a-zA-Z0-9]/g, '');
  const rc = rarityColor(item);
  return (
    <svg viewBox="0 0 100 100" className={`mk-art ${live ? 'mk-on' : ''} ${className}`} style={{ ['--rc' as string]: rc }} aria-hidden>
      <defs>
        <linearGradient id={`b${u}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#62756d" /><stop offset="1" stopColor="#222d29" /></linearGradient>
        <linearGradient id={`c${u}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={rc} stopOpacity=".5" /><stop offset="1" stopColor={rc} stopOpacity="0" /></linearGradient>
      </defs>
      {(ART[item.category] ?? license)(item, u, rc)}
    </svg>
  );
};
